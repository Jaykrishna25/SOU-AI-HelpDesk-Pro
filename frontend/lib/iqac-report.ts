import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { audit } from "@/lib/audit";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/iqac-report\/?/, "").split("/").filter(Boolean);
}
const code = (p: string) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const d10 = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Builds a draft from APPROVED evidence only.
 * Every statement carries the evidence IDs it was derived from.
 * Metrics without approved evidence are listed as gaps, never omitted.
 */
async function buildDraft(yearId: string, kind: string) {
  const year = await prisma.academicYear.findUnique({ where: { id: yearId } });
  if (!year) return null;

  const criteria = await prisma.qualityCriterion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      indicators: {
        where: { active: true }, orderBy: { sortOrder: "asc" },
        include: {
          metrics: {
            where: { active: true }, orderBy: { sortOrder: "asc" },
            include: {
              evidence: {
                where: { academicYearId: yearId, approvalStatus: "APPROVED" },
                orderBy: { evidenceDate: "asc" },
                include: { _count: { select: { documents: true } } },
              },
            },
          },
        },
      },
    },
  });

  const sources: Record<string, string[]> = {};   // statementId -> evidence record ids
  const gaps: any[] = [];
  let evidenced = 0, totalMetrics = 0;

  const out = criteria.map(c => ({
    code: c.code,
    title: c.title,
    indicators: c.indicators.map(i => ({
      code: i.code,
      title: i.title,
      metrics: i.metrics.map(m => {
        totalMetrics++;
        const recs = m.evidence;
        const statementId = "S-" + m.code.replace(/\./g, "_");

        if (recs.length === 0) {
          gaps.push({ criterion: c.code, indicator: i.code, metric: m.code, title: m.title });
          return {
            statementId, code: m.code, title: m.title,
            evidenced: false,
            statement: null,
            note: "No approved evidence recorded for " + year.code + ".",
            sources: [],
          };
        }

        evidenced++;
        sources[statementId] = recs.map(r => r.id);

        const systems = Array.from(new Set(recs.map(r => r.sourceSystem).filter(Boolean)));
        const withDocs = recs.filter(r => r._count.documents > 0).length;
        const range = recs.length > 1
          ? d10(recs[0].evidenceDate) + " to " + d10(recs[recs.length - 1].evidenceDate)
          : d10(recs[0].evidenceDate);

        const statement =
          m.title + ": " + recs.length + " approved evidence record" + (recs.length === 1 ? "" : "s") +
          " for " + year.code + " (" + range + "), " + withDocs + " with attached documents" +
          (systems.length ? ", sourced from " + systems.join("; ") : ", source system not stated") + ".";

        return {
          statementId, code: m.code, title: m.title,
          evidenced: true,
          statement,
          note: systems.length ? null : "Source system not stated on one or more records.",
          sources: recs.map(r => ({
            id: r.id, code: r.code, title: r.title,
            evidenceDate: d10(r.evidenceDate),
            documents: r._count.documents,
            sourceSystem: r.sourceSystem, sourceReference: r.sourceReference,
            verifiedAt: r.lastVerifiedAt ? d10(r.lastVerifiedAt) : null,
            visibility: r.visibility,
          })),
        };
      }),
    })),
  }));

  return {
    kind,
    title: kind === "DVV" ? "Data Validation and Verification - evidence index"
                          : "Self Study Report - data annexure (draft)",
    institution: "Silver Oak University, Ahmedabad",
    academicYear: year.code,
    periodFrom: d10(year.startsOn),
    periodTo: d10(year.endsOn),
    generatedAt: new Date().toISOString(),
    basis: "Compiled exclusively from evidence records with approvalStatus = APPROVED. " +
           "No figure in this document is inferred, estimated or generated. " +
           "Metrics without approved evidence are listed as gaps.",
    coverage: { totalMetrics, evidenced, gaps: totalMetrics - evidenced },
    criteria: out,
    gaps,
    statementSources: sources,
  };
}

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "draft") {
    if (!can(s, "report.generate")) return json({ error: "Not permitted to generate reports" }, 403);
    const draft = await buildDraft(q.get("yearId") || "", q.get("kind") || "SSR");
    if (!draft) return json({ error: "Academic year not found" }, 404);
    return json({ draft });
  }

  if (p[0] === "saved") {
    const items = await prisma.reportSnapshot.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, code: true, kind: true, title: true, periodFrom: true, periodTo: true,
                generatedBy: true, approvedBy: true, approvedAt: true, publishedAt: true, createdAt: true },
    });
    return json({ items });
  }

  if (p[0] === "one") {
    const r = await prisma.reportSnapshot.findUnique({ where: { id: q.get("id") || "" } });
    if (!r) return json({ error: "Not found" }, 404);
    return json({ meta: r, payload: JSON.parse(r.payloadJson), sources: JSON.parse(r.statementSourcesJson || "{}") });
  }

  return json({ error: "Not found" }, 404);
}

/* ===================== POST ===================== */
export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);
  const b = await req.json().catch(() => ({}));

  if (p[0] === "save") {
    if (!can(s, "report.generate")) return json({ error: "Not permitted" }, 403);
    const draft = await buildDraft(String(b.yearId || ""), String(b.kind || "SSR"));
    if (!draft) return json({ error: "Academic year not found" }, 404);

    const snap = await prisma.reportSnapshot.create({
      data: {
        code: code("RPT"), kind: draft.kind, title: draft.title,
        academicYearId: String(b.yearId),
        periodFrom: new Date(draft.periodFrom), periodTo: new Date(draft.periodTo),
        payloadJson: JSON.stringify(draft),
        statementSourcesJson: JSON.stringify(draft.statementSources),
        generatedBy: s.fullName + " (" + s.role + ")",
      },
    });
    await audit({ action: "CREATE", entity: "ReportSnapshot", entityId: snap.id, session: s, req,
      summary: "Drafted " + snap.code + " for " + draft.academicYear +
               " - " + draft.coverage.evidenced + "/" + draft.coverage.totalMetrics + " metrics evidenced" });
    return json({ id: snap.id, code: snap.code, coverage: draft.coverage });
  }

  if (p[0] === "approve") {
    if (!can(s, "report.publish")) return json({ error: "Only the IQAC may approve a report for export" }, 403);
    const snap = await prisma.reportSnapshot.findUnique({ where: { id: String(b.id || "") } });
    if (!snap) return json({ error: "Report not found" }, 404);
    const updated = await prisma.reportSnapshot.update({
      where: { id: snap.id },
      data: { approvedBy: s.fullName + " (" + s.role + ")", approvedAt: new Date() },
    });
    await audit({ action: "APPROVE", entity: "ReportSnapshot", entityId: snap.id, session: s, req,
      summary: snap.code + " approved for export by " + s.fullName });
    return json({ report: updated });
  }

  if (p[0] === "export") {
    const snap = await prisma.reportSnapshot.findUnique({ where: { id: String(b.id || "") } });
    if (!snap) return json({ error: "Report not found" }, 404);
    if (!snap.approvedAt) return json({ error: "This report must be approved by the IQAC before export" }, 409);
    await audit({ action: "EXPORT", entity: "ReportSnapshot", entityId: snap.id, session: s, req,
      summary: s.loginId + " exported " + snap.code });
    return json({ ok: true, payload: JSON.parse(snap.payloadJson), meta: snap });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Reports are immutable snapshots" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }
