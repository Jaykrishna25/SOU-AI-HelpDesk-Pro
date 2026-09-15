import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";

const GRID = 0.71;
const CELL = ["HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"];

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
async function who(req: NextRequest) {
  const s: any = await getLiveSession(req as any);
  if (!s) return null;
  return { id: String(s.userId || s.id || s.sub || ""), role: String(s.role || s.roleCode || "STUDENT").toUpperCase(), name: String(s.name || s.fullName || "User") };
}
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/reports\/?/, "").split("/").filter(Boolean);
}
const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b ? r1((a / b) * 100) : 0);

async function build(kind: string, from: Date, to: Date) {
  const win = { gte: from, lte: to };
  const sections: any[] = [];

  // 2.7 Student feedback on teaching
  const forms = await prisma.feedbackForm.findMany({
    where: { createdAt: win }, include: { responses: true },
  });
  const allR = forms.flatMap(f => f.responses);
  const avg = (k: string) => allR.length ? r1(allR.reduce((a: number, b: any) => a + b[k], 0) / allR.length) : 0;
  sections.push({
    key: "feedback", criterion: "NAAC 2.7 - Student Satisfaction Survey",
    title: "Student feedback on teaching",
    summary: {
      "Forms floated": forms.length,
      "Responses collected": allR.length,
      "Average response rate per form": forms.length ? r1(allR.length / forms.length) : 0,
      "Overall satisfaction (of 5)": avg("overall"),
      "Clarity of teaching": avg("clarity"),
      "Fairness of assessment": avg("fairness"),
    },
    table: {
      columns: ["Subject", "Faculty", "Term", "Responses", "Overall", "Clarity", "Engagement"],
      rows: forms.map(f => {
        const r = f.responses;
        const a = (k: string) => r.length ? r1(r.reduce((x: number, y: any) => x + y[k], 0) / r.length) : 0;
        return [f.subjectName, f.facultyName, f.term, r.length, a("overall"), a("clarity"), a("engagement")];
      }),
    },
  });

  // 6.5 / 7.1.10 Grievance redressal
  const gr = await prisma.grievance.findMany({ where: { createdAt: win } });
  const resolved = gr.filter(g => g.status === "RESOLVED" || g.status === "CLOSED");
  const dayss = resolved.filter(g => g.respondedAt)
    .map(g => (g.respondedAt!.getTime() - g.createdAt.getTime()) / 864e5);
  const byCat: Record<string, number> = {};
  gr.forEach(g => { byCat[g.category] = (byCat[g.category] || 0) + 1; });
  sections.push({
    key: "grievance", criterion: "NAAC 6.5.2 / 7.1.10 - Grievance redressal",
    title: "Grievance redressal mechanism",
    summary: {
      "Grievances received": gr.length,
      "Resolved": resolved.length,
      "Resolution rate": pct(resolved.length, gr.length) + "%",
      "Average resolution time (days)": dayss.length ? r1(dayss.reduce((a, b) => a + b, 0) / dayss.length) : 0,
      "Anonymity": "Identity withheld from all handlers except the Owner",
    },
    table: {
      columns: ["Category", "Received", "Resolved", "Rate"],
      rows: Object.entries(byCat).map(([c, n]) => {
        const rr = gr.filter(g => g.category === c && (g.status === "RESOLVED" || g.status === "CLOSED")).length;
        return [c, n, rr, pct(rr, n) + "%"];
      }),
    },
  });

  // 2.x Attendance
  const sess = await prisma.qRSession.findMany({ where: { createdAt: win }, include: { scans: true } });
  const approvedS = sess.filter(s => s.approved);
  const totalExpected = approvedS.reduce((a, s) => a + (s.expectedCount || 0), 0);
  const totalPresent = approvedS.reduce((a, s) => a + s.scans.length, 0);
  sections.push({
    key: "attendance", criterion: "NAAC 2.3 - Teaching-learning process",
    title: "Attendance capture and verification",
    summary: {
      "Sessions conducted": sess.length,
      "Faculty-verified sessions": approvedS.length,
      "Verification rate": pct(approvedS.length, sess.length) + "%",
      "Average attendance": totalExpected ? pct(totalPresent, totalExpected) + "%" : "n/a",
      "Method": "Rotating HMAC QR code, CR-initiated, faculty-approved",
    },
    table: {
      columns: ["Subject", "Class", "Date", "Present", "Expected", "Status"],
      rows: sess.slice(0, 100).map(s => [s.subjectName, s.className,
        s.createdAt.toISOString().slice(0, 10), s.scans.length, s.expectedCount || "-",
        s.approved ? "Verified" : s.closed ? "Pending" : "Live"]),
    },
  });

  // 7.1 Green initiatives + 4.1 Infrastructure
  const bk = await prisma.booking.findMany({
    where: { startsAt: win, status: { in: ["APPROVED", "COMPLETED"] } }, include: { resource: true },
  });
  const co2 = bk.reduce((a, b) => a + b.co2Kg, 0);
  const used = bk.reduce((a, b) => a + b.energyKwh, 0);
  let capH = 0, attH = 0;
  bk.forEach(b => {
    const h = (b.endsAt.getTime() - b.startsAt.getTime()) / 36e5;
    capH += (b.resource?.capacity || 0) * h; attH += b.attendees * h;
  });
  const res = await prisma.resource.findMany({ where: { active: true } });
  const byType: Record<string, { n: number; cap: number; area: number; bk: number }> = {};
  res.forEach(r => {
    byType[r.type] = byType[r.type] || { n: 0, cap: 0, area: 0, bk: 0 };
    byType[r.type].n++; byType[r.type].cap += r.capacity; byType[r.type].area += r.areaSqm;
  });
  bk.forEach(b => { const t = b.resource?.type; if (t && byType[t]) byType[t].bk++; });
  sections.push({
    key: "green", criterion: "NAAC 7.1 - Energy conservation / 4.1 - Physical facilities",
    title: "Resource utilisation and green campus",
    summary: {
      "Bookings approved": bk.length,
      "Energy consumed (kWh)": r1(used),
      "Energy avoided (kWh)": r1(co2 / GRID),
      "CO2 avoided (kg)": r1(co2),
      "Equivalent trees (annual)": r1(co2 / 21),
      "Space utilisation": pct(attH, capH) + "%",
      "Basis": "CEA India grid factor " + GRID + " kg CO2/kWh; savings measured against the highest-draw resource of the same type",
    },
    table: {
      columns: ["Resource type", "Units", "Total capacity", "Area (sqm)", "Bookings"],
      rows: Object.entries(byType).map(([t, v]) => [t, v.n, v.cap, r1(v.area), v.bk]),
    },
  });

  // Exam conduct
  const plans = await prisma.seatingPlan.findMany({ where: { createdAt: win }, include: { _count: { select: { seats: true } } } });
  sections.push({
    key: "exams", criterion: "NAAC 2.5 - Evaluation process and reforms",
    title: "Examination conduct",
    summary: {
      "Seating plans generated": plans.length,
      "Students allocated": plans.reduce((a, p) => a + (p._count?.seats || 0), 0),
      "Allocation rule": "No two candidates of the same programme adjacent or directly behind",
    },
    table: {
      columns: ["Examination", "Date", "Seats", "Generated by"],
      rows: plans.map(p => [p.examName, p.examDate.toISOString().slice(0, 10), p._count?.seats || 0, p.createdBy]),
    },
  });

  // Support desk (guarded - ticket model may vary)
  try {
    const t = await prisma.ticket.findMany({ where: { createdAt: win } });
    const closed = t.filter((x: any) => /RESOLV|CLOSE/i.test(String(x.status)));
    sections.push({
      key: "support", criterion: "NAAC 6.5 - Internal quality assurance",
      title: "Student support desk",
      summary: {
        "Queries raised": t.length,
        "Resolved": closed.length,
        "Resolution rate": pct(closed.length, t.length) + "%",
        "Self-service": "AI assistant resolves common queries without raising a ticket",
      },
      table: { columns: [], rows: [] },
    });
  } catch { /* ticket shape differs */ }

  // Headcount (guarded)
  try {
    const g: any[] = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } } as any);
    sections.push({
      key: "strength", criterion: "AICTE EOA - Institutional strength",
      title: "Registered users by role",
      summary: Object.fromEntries(g.map((x: any) => [String(x.role), x._count._all])),
      table: { columns: [], rows: [] },
    });
  } catch { /* user model shape differs */ }

  return {
    kind,
    institution: "Silver Oak University, Ahmedabad",
    title: kind === "AICTE_EOA" ? "AICTE Extension of Approval - Data Annexure" : "NAAC AQAR - Data Annexure",
    periodFrom: from.toISOString().slice(0, 10),
    periodTo: to.toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    sections,
  };
}

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  if (!CELL.includes(u.role)) return json({ error: "IQAC / administration access only" }, 403);
  const s = seg(req);
  const q = new URL(req.url).searchParams;

  if (s[0] === "generate") {
    const to = q.get("to") ? new Date(q.get("to") + "T23:59:59Z") : new Date();
    const from = q.get("from") ? new Date(q.get("from") + "T00:00:00Z") : new Date(Date.now() - 365 * 864e5);
    return json(await build(q.get("kind") || "NAAC_AQAR", from, to));
  }
  if (s[0] === "saved") {
    const items = await prisma.reportExport.findMany({ orderBy: { generatedAt: "desc" }, take: 40,
      select: { id: true, code: true, kind: true, title: true, periodFrom: true, periodTo: true, generatedBy: true, generatedAt: true } });
    return json({ items });
  }
  if (s[0] === "one") {
    const p = await prisma.reportExport.findUnique({ where: { id: q.get("id") || "" } });
    if (!p) return json({ error: "Not found" }, 404);
    return json({ report: JSON.parse(p.payloadJson), meta: p });
  }
  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  if (!CELL.includes(u.role)) return json({ error: "IQAC / administration access only" }, 403);
  const b = await req.json().catch(() => ({}));
  const p = b.payload;
  if (!p) return json({ error: "No payload" }, 400);
  const saved = await prisma.reportExport.create({
    data: {
      code: "RPT-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      kind: String(p.kind || "NAAC_AQAR"), title: String(p.title || "Report"),
      periodFrom: new Date(p.periodFrom), periodTo: new Date(p.periodTo),
      payloadJson: JSON.stringify(p), generatedBy: u.name + " (" + u.role + ")",
    },
  });
  return json({ id: saved.id, code: saved.code });
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }

