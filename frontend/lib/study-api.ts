import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can, normaliseRole } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { computeStudyPlan, renderStudyPlan, WEAK_THRESHOLD } from "@/lib/study-math";
import { fetchStudentResults, fetchSubjectCohort } from "@/lib/study-db";
import { askStudyAgent, studySummary, studyAiConfigured } from "@/lib/study-agent";

/* Study plan endpoints.

   Same shape as the fee assistant: deterministic arithmetic server-side, the
   model only ever rewords the result, and the tools bound to the agent depend
   on the caller's role. */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/study\/?/, "").split("/").filter(Boolean);
}

function clampThreshold(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return WEAK_THRESHOLD;
  return Math.min(90, Math.max(35, n));
}

/** An HOD sees their own department and cannot widen that with a query param. */
async function scopeDepartment(userId: string, role: string, requested?: string | null) {
  if (normaliseRole(role) !== "HOD") return requested || null;
  const f = await prisma.faculty.findUnique({
    where: { userId },
    select: { department: { select: { name: true } } },
  });
  return f?.department?.name ?? null;
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "status") {
    return json({
      configured: studyAiConfigured(),
      role: normaliseRole(s.role),
      canViewOwn: can(s, "study.viewOwn"),
      canViewCohort: can(s, "study.viewCohort"),
    });
  }

  /* ---- the signed-in student's own plan ---- */
  if (p[0] === "me") {
    if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

    const rows = await fetchStudentResults(s.userId);
    if (!rows) return json({ plan: null, reason: "no-student-record" });
    if (!rows.length) return json({ plan: null, reason: "no-results-recorded" });

    const threshold = clampThreshold(q.get("threshold"));
    return json({ plan: computeStudyPlan(rows, threshold) });
  }

  /* ---- cohort view for staff: which subjects the cohort struggles with ---- */
  if (p[0] === "cohort") {
    if (!can(s, "study.viewCohort")) return json({ error: "Not permitted" }, 403);

    const threshold = clampThreshold(q.get("threshold"));
    const dept = await scopeDepartment(s.userId, s.role, q.get("department"));
    const subjects = await fetchSubjectCohort(threshold, dept);

    await audit({
      action: "VIEW_CONFIDENTIAL", entity: "Result", session: s, req,
      summary: "Viewed cohort performance" + (dept ? " for " + dept : " (institution-wide)"),
    });

    return json({ subjects, scope: dept || "institution-wide", threshold });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const p = seg(req);
  const b = await req.json().catch(() => ({}));

  /* ---- plain-language summary of the student's own plan ---- */
  if (p[0] === "summary") {
    if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

    const rows = await fetchStudentResults(s.userId);
    if (!rows || !rows.length) {
      return json({ raw: "", summary: "No examination results are recorded against this account yet." });
    }
    const plan = computeStudyPlan(rows, clampThreshold(b.threshold));
    const raw = renderStudyPlan(plan);
    const { summary } = await studySummary(raw);
    return json({ raw, summary });
  }

  /* ---- ask the agent ---- */
  if (p[0] === "ask") {
    const question = String(b.question || "").trim().slice(0, 1200);
    if (!question) return json({ error: "A question is required" }, 400);
    if (!can(s, "study.viewOwn") && !can(s, "study.viewCohort")) {
      return json({ error: "Not permitted" }, 403);
    }

    const dept = await scopeDepartment(s.userId, s.role, b.department);
    const result = await askStudyAgent({
      session: s,
      question,
      threshold: clampThreshold(b.threshold),
      department: dept,
      history: Array.isArray(b.history) ? b.history.slice(-6) : [],
    });

    if (result.toolsUsed.includes("analyse_cohort_performance")) {
      await audit({
        action: "VIEW_CONFIDENTIAL", entity: "Result", session: s, req,
        summary: "Study adviser returned cohort figures (tools: " + result.toolsUsed.join(", ") + ")",
      });
    }

    return json({
      answer: result.answer,
      toolsUsed: result.toolsUsed,
      rounds: result.rounds,
      latencyMs: result.latencyMs,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }
