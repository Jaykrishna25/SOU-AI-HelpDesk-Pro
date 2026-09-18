import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can, normaliseRole } from "@/lib/policy";
import { audit } from "@/lib/audit";
import {
  analyseStudentFees, analyseInstitutionalFees, analyseFeeRows, parseStatement,
  type FeeRow,
} from "@/lib/finance";
import { askFinanceAgent, openingSummary, financeAiConfigured } from "@/lib/finance-agent";
import { issueStepUp, verifyStepUp, checkPassword, STEP_UP_MINUTES } from "@/lib/stepup";

/* ============================================================
   Fee assistant endpoints.

   Every handler asks the policy module before returning a figure.
   The institutional endpoints are additionally scoped: an HOD sees
   their own department and cannot widen that by passing a query
   parameter.
   ============================================================ */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/finance\/?/, "").split("/").filter(Boolean);
}

const MAX_STATEMENT_CHARS = 200_000;

/** An HOD is pinned to their own department; wider roles may filter freely. */
async function scopeDepartment(userId: string, role: string, requested?: string | null): Promise<string | null> {
  if (normaliseRole(role) !== "HOD") return requested || null;
  const f = await prisma.faculty.findUnique({
    where: { userId },
    select: { department: { select: { name: true } } },
  });
  return f?.department?.name ?? null;
}

/** Uploaded rows are held per chat session, never written to the fee table. */
function readUploaded(body: any): FeeRow[] | null {
  const raw = Array.isArray(body?.uploaded) ? body.uploaded : null;
  if (!raw || !raw.length) return null;
  return raw.slice(0, 40).map((r: any) => ({
    semester: Number(r.semester) || 0,
    totalFees: Number(r.totalFees) || 0,
    paidFees: Number(r.paidFees) || 0,
    status: String(r.status || "UNKNOWN").slice(0, 40),
    dueDate: r.dueDate ? new Date(r.dueDate) : null,
  })).filter((r: FeeRow) => r.semester > 0 && r.totalFees > 0);
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);

  if (p[0] === "status") {
    return json({
      configured: financeAiConfigured(),
      role: normaliseRole(s.role),
      canViewOwn: can(s, "finance.viewOwn"),
      canViewInstitutional: can(s, "finance.viewInstitutional"),
      canAnalyseStatement: can(s, "finance.analyseStatement"),
    });
  }

  /* ---- the signed-in user's own fee position ---- */
  if (p[0] === "me") {
    if (!can(s, "finance.viewOwn")) return json({ error: "Not permitted" }, 403);
    const a = await analyseStudentFees(s.userId);
    if (!a) return json({ analysis: null, reason: "no-student-record" });
    return json({ analysis: a });
  }

  /* ---- institution-wide aggregate ---- */
  if (p[0] === "institutional") {
    if (!can(s, "finance.viewInstitutional")) return json({ error: "Not permitted" }, 403);

    /* Holding the capability is not enough. Institutional money figures need
       proof that the person at the keyboard is still the account holder. */
    const step = await verifyStepUp(req, s);
    if (!step.ok) {
      return json({
        error: "Re-enter your password to view institutional financial figures.",
        stepUpRequired: true,
        reason: step.reason,
        minutes: STEP_UP_MINUTES,
      }, 401);
    }

    const requested = new URL(req.url).searchParams.get("department");
    const dept = await scopeDepartment(s.userId, s.role, requested);
    const a = await analyseInstitutionalFees(dept);
    await audit({
      action: "VIEW_CONFIDENTIAL", entity: "Fee", session: s, req,
      summary: "Viewed institutional fee position" + (dept ? " for " + dept : " (institution-wide)"),
    });
    return json({ analysis: a, scope: dept || "institution-wide" });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);
  const b = await req.json().catch(() => ({}));

  /* ---- parse an uploaded statement ---- */
  if (p[0] === "parse") {
    if (!can(s, "finance.analyseStatement")) return json({ error: "Not permitted" }, 403);

    const text = String(b.text || "").slice(0, MAX_STATEMENT_CHARS);
    if (!text.trim()) return json({ error: "The statement appears to be empty" }, 400);

    const { rows, skipped } = parseStatement(text);
    if (!rows.length) {
      return json({
        rows: [], skipped,
        error: "No fee rows could be read from that file. A statement needs at least a semester column " +
               "and a total amount column.",
      }, 422);
    }

    const analysis = analyseFeeRows(rows, "uploaded-statement");
    const { summary } = await openingSummary({ session: s, uploaded: rows });

    await audit({
      action: "CREATE", entity: "Fee", session: s, req,
      summary: "Analysed an uploaded fee statement (" + rows.length + " row(s), " + skipped + " skipped)",
    });

    return json({ rows, skipped, analysis, summary });
  }

  /* ---- opening summary for the portal's own record ---- */
  if (p[0] === "summary") {
    if (!can(s, "finance.viewOwn")) return json({ error: "Not permitted" }, 403);
    const uploaded = readUploaded(b);
    const { raw, summary } = await openingSummary({ session: s, uploaded });
    return json({ raw, summary });
  }

  /* ---- re-authenticate to unlock institutional figures ---- */
  if (p[0] === "step-up") {
    if (!can(s, "finance.viewInstitutional")) return json({ error: "Not permitted" }, 403);

    const result = await checkPassword(s.userId, String(b.password || ""));
    if (!result.ok) {
      await audit({
        action: "LOGIN_FAILED", entity: "User", entityId: s.userId, session: s, req,
        summary: s.loginId + " failed re-authentication for institutional finance",
      });
      return json({ error: result.error }, result.status);
    }

    await audit({
      action: "VIEW_CONFIDENTIAL", entity: "Fee", session: s, req,
      summary: s.loginId + " re-authenticated to unlock institutional financial figures",
    });

    return json({
      ok: true,
      stepUpToken: issueStepUp(s.userId, result.tokenVersion),
      minutes: STEP_UP_MINUTES,
    });
  }

  /* ---- ask the agent ---- */
  if (p[0] === "ask") {
    const question = String(b.question || "").trim().slice(0, 1200);
    if (!question) return json({ error: "A question is required" }, 400);
    if (!can(s, "finance.viewOwn") && !can(s, "finance.viewInstitutional")) {
      return json({ error: "Not permitted" }, 403);
    }

    const dept = await scopeDepartment(s.userId, s.role, b.department);

    // Elevation decides whether the institutional tool is bound at all.
    const elevated = await verifyStepUp(req, s);

    const result = await askFinanceAgent({
      session: s,
      question,
      uploaded: readUploaded(b),
      department: dept,
      history: Array.isArray(b.history) ? b.history.slice(-6) : [],
      allowInstitutional: elevated.ok,
    });

    // Only aggregate finance access is worth an audit row; auditing every
    // question about one's own fees would bury the entries that matter.
    if (result.toolsUsed.includes("analyse_institutional_fees")) {
      await audit({
        action: "VIEW_CONFIDENTIAL", entity: "Fee", session: s, req,
        summary: "Fee assistant returned institutional figures (tools: " + result.toolsUsed.join(", ") + ")",
      });
    }

    return json({
      answer: result.answer,
      toolsUsed: result.toolsUsed,
      toolOutputs: result.toolOutputs,
      rounds: result.rounds,
      latencyMs: result.latencyMs,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }
