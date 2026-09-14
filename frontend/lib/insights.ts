import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";

const GRID = 0.71;
const STAFF = ["FACULTY", "HOD", "HOI", "ADMIN", "SUPER_ADMIN", "OWNER"];
const MIN_ATTENDANCE = 75;

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
async function who(req: NextRequest) {
  const s: any = await getSession(req as any);
  if (!s) return null;
  return { id: String(s.userId || s.id || s.sub || ""), role: String(s.role || s.roleCode || "STUDENT").toUpperCase() };
}
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/insights\/?/, "").split("/").filter(Boolean);
}
const r1 = (n: number) => Math.round(n * 10) / 10;

// least-squares slope over evenly spaced points
function slope(y: number[]) {
  const n = y.length; if (n < 2) return 0;
  const mx = (n - 1) / 2, my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  y.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2; });
  return den ? num / den : 0;
}

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  if (!STAFF.includes(u.role)) return json({ error: "Staff only" }, 403);
  const s = seg(req);

  if (s[0] === "alerts") {
    const alerts: any[] = [];

    // --- attendance risk ---
    const sessions = await prisma.qRSession.findMany({
      where: { approved: true }, include: { scans: true }, orderBy: { createdAt: "desc" }, take: 500,
    });
    const heldPerClass: Record<string, number> = {};
    sessions.forEach(x => { heldPerClass[x.className] = (heldPerClass[x.className] || 0) + 1; });

    const person: Record<string, { name: string; enr: string; cls: string; n: number }> = {};
    sessions.forEach(x => x.scans.forEach(sc => {
      const k = sc.studentUserId;
      person[k] = person[k] || { name: sc.studentName, enr: sc.enrollment || "", cls: x.className, n: 0 };
      person[k].n++;
    }));

    for (const [id, p] of Object.entries(person)) {
      const held = heldPerClass[p.cls] || 0;
      if (held < 3) continue;
      const pct = (p.n / held) * 100;
      const remaining = Math.max(0, Math.round(held * 0.6));
      const best = ((p.n + remaining) / (held + remaining)) * 100;
      if (pct >= 85) continue;
      alerts.push({
        kind: "LOW_ATTENDANCE",
        severity: pct < 60 ? "CRITICAL" : pct < MIN_ATTENDANCE ? "WARNING" : "INFO",
        studentUserId: id, studentName: p.name, enrollment: p.enr, className: p.cls,
        metric: r1(pct), threshold: MIN_ATTENDANCE, attended: p.n, held,
        message: pct < MIN_ATTENDANCE
          ? p.name + " is at " + r1(pct) + "% - below the " + MIN_ATTENDANCE + "% exam eligibility bar"
          : p.name + " is at " + r1(pct) + "% and trending towards the bar",
        recoverable: best >= MIN_ATTENDANCE,
        bestCase: r1(best),
      });
    }

    // --- ticket volume forecast ---
    let forecast: any = null;
    try {
      const since = new Date(Date.now() - 56 * 864e5);
      const t = await prisma.ticket.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
      const weeks = new Array(8).fill(0);
      t.forEach(x => {
        const w = Math.floor((Date.now() - x.createdAt.getTime()) / (7 * 864e5));
        if (w >= 0 && w < 8) weeks[7 - w]++;
      });
      const m = weeks.reduce((a, b) => a + b, 0) / 8;
      const sl = slope(weeks);
      const next = Math.max(0, Math.round(weeks[7] + sl));
      forecast = { weeks, mean: r1(m), trendPerWeek: r1(sl), nextWeek: next };
      if (m > 0 && next > m * 1.25) {
        alerts.push({
          kind: "TICKET_SURGE", severity: next > m * 1.6 ? "CRITICAL" : "WARNING",
          metric: next, threshold: r1(m),
          message: "Ticket volume is trending up - about " + next + " expected next week against an 8-week average of " + r1(m) + ". Consider extra desk cover.",
        });
      }
    } catch { /* ticket model shape differs - skip forecast */ }

    const order: any = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity] || (a.metric || 0) - (b.metric || 0));
    return json({ alerts, forecast, sessionsAnalysed: sessions.length, minAttendance: MIN_ATTENDANCE });
  }

  if (s[0] === "sustainability") {
    const days = Math.min(180, Math.max(7, Number(new URL(req.url).searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 864e5);
    const bk = await prisma.booking.findMany({
      where: { startsAt: { gte: since }, status: { in: ["APPROVED", "COMPLETED"] } },
      include: { resource: true },
    });

    let used = 0, co2 = 0, seatHours = 0, capHours = 0, attHours = 0;
    const byType: Record<string, any> = {};
    const byBuilding: Record<string, any> = {};
    const daily: Record<string, { used: number; saved: number; n: number }> = {};

    for (const b of bk) {
      const hrs = (b.endsAt.getTime() - b.startsAt.getTime()) / 36e5;
      const savedKwh = b.co2Kg / GRID;
      used += b.energyKwh; co2 += b.co2Kg;
      const cap = b.resource?.capacity || 0;
      capHours += cap * hrs; attHours += b.attendees * hrs;
      seatHours += Math.max(0, cap - b.attendees) * hrs;

      const t = b.resource?.type || "OTHER";
      byType[t] = byType[t] || { type: t, bookings: 0, used: 0, saved: 0, hours: 0 };
      byType[t].bookings++; byType[t].used += b.energyKwh; byType[t].saved += savedKwh; byType[t].hours += hrs;

      const bd = b.resource?.building || "Unassigned";
      byBuilding[bd] = byBuilding[bd] || { building: bd, bookings: 0, used: 0, saved: 0 };
      byBuilding[bd].bookings++; byBuilding[bd].used += b.energyKwh; byBuilding[bd].saved += savedKwh;

      const d = b.startsAt.toISOString().slice(0, 10);
      daily[d] = daily[d] || { used: 0, saved: 0, n: 0 };
      daily[d].used += b.energyKwh; daily[d].saved += savedKwh; daily[d].n++;
    }

    const round = (o: any) => Object.values(o).map((x: any) => ({
      ...x, used: r1(x.used), saved: r1(x.saved), hours: x.hours ? r1(x.hours) : undefined,
    }));

    return json({
      days, bookings: bk.length,
      energyKwhUsed: r1(used),
      energyKwhSaved: r1(co2 / GRID),
      co2KgSaved: r1(co2),
      treesEquivalent: r1(co2 / 21),
      seatHoursSaved: Math.round(seatHours),
      utilisationPct: capHours ? r1((attHours / capHours) * 100) : 0,
      byType: round(byType).sort((a: any, b: any) => b.used - a.used),
      byBuilding: round(byBuilding).sort((a: any, b: any) => b.used - a.used),
      daily: Object.entries(daily).sort().map(([day, v]) => ({ day: day.slice(5), used: r1(v.used), saved: r1(v.saved), bookings: v.n })),
      gridFactor: GRID,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST() { return json({ error: "Read only" }, 405); }
export async function PATCH() { return json({ error: "Read only" }, 405); }
export async function DELETE() { return json({ error: "Read only" }, 405); }
