import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { audit } from "@/lib/audit";

const EXPIRY_WINDOW_DAYS = 60;
function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/iqac-insight\/?/, "").split("/").filter(Boolean);
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

async function currentYear(yearId?: string | null) {
  if (yearId) return prisma.academicYear.findUnique({ where: { id: yearId } });
  return prisma.academicYear.findFirst({ where: { isCurrent: true } })
    ?? prisma.academicYear.findFirst({ orderBy: { code: "desc" } });
}

/* ==================== GET ==================== */
export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "insights.view")) return json({ error: "Not permitted" }, 403);
  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "dashboard") {
    const year = await currentYear(q.get("yearId"));
    if (!year) return json({ error: "No academic year configured" }, 404);

    const criteria = await prisma.qualityCriterion.findMany({
      where: { active: true }, orderBy: { sortOrder: "asc" },
      include: { indicators: { where: { active: true }, include: { metrics: { where: { active: true }, select: { id: true } } } } },
    });

    const evidence = await prisma.evidenceRecord.findMany({
      where: { academicYearId: year.id },
      select: {
        id: true, metricId: true, departmentName: true, approvalStatus: true,
        verificationStatus: true, expiresAt: true, isDemo: true,
      },
    });

    const approvedMetrics = new Set(evidence.filter(e => e.approvalStatus === "APPROVED").map(e => e.metricId));
    const anyMetrics = new Set(evidence.map(e => e.metricId));

    const byCriterion = criteria.map(c => {
      const ids = c.indicators.flatMap(i => i.metrics.map(m => m.id));
      const approved = ids.filter(id => approvedMetrics.has(id)).length;
      const started = ids.filter(id => anyMetrics.has(id)).length;
      return {
        code: c.code, title: c.title,
        metrics: ids.length, approved, started,
        completion: pct(approved, ids.length),
      };
    });

    const allMetricIds = criteria.flatMap(c => c.indicators.flatMap(i => i.metrics.map(m => m.id)));
    const soon = new Date(Date.now() + EXPIRY_WINDOW_DAYS * 864e5);

    const byDept: Record<string, { total: number; approved: number }> = {};
    evidence.forEach(e => {
      const d = e.departmentName || "Unassigned";
      byDept[d] = byDept[d] || { total: 0, approved: 0 };
      byDept[d].total++;
      if (e.approvalStatus === "APPROVED") byDept[d].approved++;
    });

    const years = await prisma.academicYear.findMany({ orderBy: { code: "asc" }, take: 6 });
    const trend = [];
    for (const y of years) {
      const [total, approved] = await Promise.all([
        prisma.evidenceRecord.count({ where: { academicYearId: y.id } }),
        prisma.evidenceRecord.count({ where: { academicYearId: y.id, approvalStatus: "APPROVED" } }),
      ]);
      trend.push({ year: y.code, total, approved });
    }

    const [plans, doneItems, totalItems, openIssues, criticalIssues] = await Promise.all([
      prisma.actionPlan.count({ where: { academicYearId: year.id } }),
      prisma.actionItem.count({ where: { status: "DONE", actionPlan: { academicYearId: year.id } } }),
      prisma.actionItem.count({ where: { actionPlan: { academicYearId: year.id } } }),
      prisma.dataQualityIssue.count({ where: { resolved: false, academicYearId: year.id } }),
      prisma.dataQualityIssue.count({ where: { resolved: false, severity: "CRITICAL", academicYearId: year.id } }),
    ]);

    return json({
      year: { id: year.id, code: year.code, locked: year.locked },
      totals: {
        metrics: allMetricIds.length,
        metricsWithApprovedEvidence: allMetricIds.filter(id => approvedMetrics.has(id)).length,
        metricsWithAnyEvidence: allMetricIds.filter(id => anyMetrics.has(id)).length,
        missingEvidence: allMetricIds.filter(id => !anyMetrics.has(id)).length,
        evidenceRecords: evidence.length,
        pendingVerification: evidence.filter(e => e.verificationStatus === "UNVERIFIED" || e.verificationStatus === "IN_REVIEW").length,
        pendingApproval: evidence.filter(e => e.approvalStatus === "SUBMITTED").length,
        expiringSoon: evidence.filter(e => e.expiresAt && e.expiresAt < soon).length,
        demoRecords: evidence.filter(e => e.isDemo).length,
      },
      completion: pct(allMetricIds.filter(id => approvedMetrics.has(id)).length, allMetricIds.length),
      byCriterion,
      byDepartment: Object.entries(byDept).map(([name, v]) => ({
        name, total: v.total, approved: v.approved, completion: pct(v.approved, v.total),
      })).sort((a, b) => b.total - a.total),
      trend,
      actionPlans: { plans, totalItems, doneItems, completion: pct(doneItems, totalItems) },
      dataQuality: { open: openIssues, critical: criticalIssues },
      expiryWindowDays: EXPIRY_WINDOW_DAYS,
    });
  }

  if (p[0] === "issues") {
    const resolved = q.get("resolved") === "true";
    const yid = q.get("yearId") || undefined;
    const items = await prisma.dataQualityIssue.findMany({
      where: { resolved, ...(yid ? { academicYearId: yid } : {}) },
      orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
      take: 300,
      include: { metric: { select: { code: true, title: true } }, academicYear: { select: { code: true } } },
    });
    return json({ items });
  }

  return json({ error: "Not found" }, 404);
}

/* ==================== POST: run the engine ==================== */
export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);

  if (p[0] === "scan") {
    if (!can(s, "evidence.verify")) return json({ error: "Not permitted to run a data-quality scan" }, 403);
    const b = await req.json().catch(() => ({}));
    const year = await currentYear(b.yearId);
    if (!year) return json({ error: "No academic year configured" }, 404);

    // clear previous unresolved findings for this year - the scan is authoritative
    await prisma.dataQualityIssue.deleteMany({ where: { resolved: false, academicYearId: year.id } });

    const found: any[] = [];
    const add = (kind: string, severity: string, entity: string, message: string,
                 extra: { entityId?: string; metricId?: string; detail?: string } = {}) =>
      found.push({ kind, severity, entity, message, academicYearId: year.id, ...extra });

    const metrics = await prisma.qualityMetric.findMany({
      where: { active: true, keyIndicator: { active: true, criterion: { active: true } } },
      include: { keyIndicator: { include: { criterion: true } }, evidence: { where: { academicYearId: year.id } } },
    });

    for (const m of metrics) {
      const label = m.code + " " + m.title;

      // 1. no evidence at all
      if (m.evidence.length === 0) {
        add("MISSING_EVIDENCE", "WARNING", "QualityMetric",
            "No evidence recorded for " + label + " in " + year.code, { metricId: m.id });
        continue;
      }

      // 2. evidence exists but none verified
      if (!m.evidence.some(e => e.verificationStatus === "VERIFIED")) {
        add("UNVERIFIED_METRIC", "WARNING", "QualityMetric",
            label + " has " + m.evidence.length + " record(s) but none verified", { metricId: m.id });
      }

      // 3. duplicate titles within the same metric and year
      const seen = new Map<string, string>();
      for (const e of m.evidence) {
        const key = e.title.trim().toLowerCase();
        if (seen.has(key)) {
          add("DUPLICATE", "INFO", "EvidenceRecord",
              "Possible duplicate title under " + label + ": " + e.title,
              { entityId: e.id, metricId: m.id, detail: "also " + seen.get(key) });
        } else seen.set(key, e.code);
      }

      // 4. dates outside the academic year
      for (const e of m.evidence) {
        if (e.evidenceDate < year.startsOn || e.evidenceDate > year.endsOn) {
          add("INVALID_DATE", "WARNING", "EvidenceRecord",
              e.code + " is dated " + e.evidenceDate.toISOString().slice(0, 10) +
              ", outside " + year.code, { entityId: e.id, metricId: m.id });
        }
        if (e.evidenceDate.getTime() > Date.now()) {
          add("INVALID_DATE", "CRITICAL", "EvidenceRecord",
              e.code + " has a future evidence date", { entityId: e.id, metricId: m.id });
        }
      }

      // 5. structured or numeric claims with no stated source
      for (const e of m.evidence) {
        if ((e.evidenceType === "STRUCTURED" || e.evidenceType === "NARRATIVE") &&
            !e.sourceSystem && !e.sourceReference) {
          add("UNSOURCED_FIGURE", "CRITICAL", "EvidenceRecord",
              e.code + " states a figure with no source system or reference",
              { entityId: e.id, metricId: m.id });
        }
      }
    }

    // 6. documents expiring
    const soon = new Date(Date.now() + EXPIRY_WINDOW_DAYS * 864e5);
    const expiring = await prisma.evidenceRecord.findMany({
      where: { academicYearId: year.id, expiresAt: { not: null, lt: soon } },
      select: { id: true, code: true, title: true, expiresAt: true, metricId: true },
    });
    for (const e of expiring) {
      const past = e.expiresAt! < new Date();
      add("EXPIRING_DOCUMENT", past ? "CRITICAL" : "WARNING", "EvidenceRecord",
          e.code + (past ? " expired on " : " expires on ") + e.expiresAt!.toISOString().slice(0, 10),
          { entityId: e.id, metricId: e.metricId });
    }

    // 7. exact duplicate files anywhere
    const docs = await prisma.evidenceDocument.findMany({
      where: { checksum: { not: null } },
      select: { id: true, checksum: true, fileName: true, evidenceRecordId: true },
    });
    const byHash = new Map<string, string[]>();
    docs.forEach(d => {
      const list = byHash.get(d.checksum!) || [];
      list.push(d.evidenceRecordId);
      byHash.set(d.checksum!, list);
    });
    for (const [hash, recs] of byHash) {
      const unique = Array.from(new Set(recs));
      if (unique.length > 1) {
        add("DUPLICATE", "WARNING", "EvidenceDocument",
            "The same file is attached to " + unique.length + " different evidence records",
            { detail: "checksum " + hash.slice(0, 12) });
      }
    }

    if (found.length) await prisma.dataQualityIssue.createMany({ data: found });
    await audit({ action: "UPDATE", entity: "DataQualityIssue", session: s, req,
      summary: "Data-quality scan for " + year.code + " found " + found.length + " issue(s)" });

    const bySeverity = found.reduce((a: any, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});
    return json({ year: year.code, found: found.length, bySeverity });
  }

  if (p[0] === "resolve") {
    if (!can(s, "evidence.verify")) return json({ error: "Not permitted" }, 403);
    const b = await req.json().catch(() => ({}));
    await prisma.dataQualityIssue.update({
      where: { id: String(b.id || "") },
      data: { resolved: true, resolvedBy: s.fullName, resolvedAt: new Date() },
    });
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }

