import { rolesWith } from "@/lib/policy";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";

// Central Electricity Authority grid emission factor for India (kg CO2 per kWh)
const GRID_KG_PER_KWH = 0.71;
const STAFF = ["ADMIN", "FACULTY", "HOD", "HOI", "OWNER", "SUPER_ADMIN"];
const APPROVERS = rolesWith("booking.approve");
function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }

async function who(req: NextRequest) {
  const s: any = await getLiveSession(req as any);
  if (!s) return null;
  return {
    id: String(s.userId || s.id || s.sub || ""),
    role: String(s.role || s.roleCode || "STUDENT").toUpperCase(),
    name: String(s.name || s.fullName || s.username || "User"),
  };
}

function seg(req: NextRequest) {
  const p = new URL(req.url).pathname.replace(/^\/api\/gr\/?/, "");
  return p.split("/").filter(Boolean);
}

function code(prefix: string) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function baselineKw(type: string) {
  const r = await prisma.resource.aggregate({
    _max: { powerKw: true },
    where: { type: type as any, active: true },
  });
  return r._max.powerKw || 0;
}

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const q = new URL(req.url).searchParams;

  if (s[0] === "resources") {
    const type = q.get("type");
    const items = await prisma.resource.findMany({
      where: { active: true, ...(type && type !== "ALL" ? { type: type as any } : {}) },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return json({ items });
  }

  if (s[0] === "availability") {
    const resourceId = q.get("resourceId") || "";
    const date = q.get("date") || new Date().toISOString().slice(0, 10);
    const from = new Date(date + "T00:00:00.000Z");
    const to = new Date(date + "T23:59:59.999Z");
    const items = await prisma.booking.findMany({
      where: { resourceId, startsAt: { gte: from, lte: to }, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { startsAt: "asc" },
      select: { id: true, startsAt: true, endsAt: true, status: true, userName: true, purpose: true },
    });
    return json({ items });
  }

  if (s[0] === "bookings") {
    const scope = q.get("scope") || "mine";
    const staff = APPROVERS.includes(u.role);
    const where: any = scope === "all" && staff ? {} : { userId: u.id };
    if (q.get("status")) where.status = q.get("status");
    const items = await prisma.booking.findMany({
      where, orderBy: { startsAt: "desc" }, take: 200,
      include: { resource: { select: { name: true, code: true, type: true, location: true, ecoScore: true } } },
    });
    return json({ items });
  }

  if (s[0] === "impact") {
    const since = new Date(Date.now() - 30 * 864e5);
    const all = await prisma.booking.findMany({
      where: { createdAt: { gte: since }, status: { in: ["APPROVED", "COMPLETED"] } },
      include: { resource: { select: { type: true, name: true, capacity: true, ecoScore: true } } },
    });
    let used = 0, saved = 0, co2 = 0, seatHours = 0;
    const byType: Record<string, { bookings: number; saved: number; used: number }> = {};
    for (const b of all) {
      used += b.energyKwh; saved += (b as any).co2Kg > 0 ? 0 : 0;
      const hrs = (b.endsAt.getTime() - b.startsAt.getTime()) / 36e5;
      seatHours += Math.max(0, (b.resource?.capacity || 0) - b.attendees) * hrs;
      const t = b.resource?.type || "OTHER";
      byType[t] = byType[t] || { bookings: 0, saved: 0, used: 0 };
      byType[t].bookings++; byType[t].used += b.energyKwh;
    }
    const agg = await prisma.booking.aggregate({
      _sum: { co2Kg: true }, where: { createdAt: { gte: since }, status: { in: ["APPROVED", "COMPLETED"] } },
    });
    co2 = agg._sum.co2Kg || 0;
    saved = co2 / GRID_KG_PER_KWH;
    for (const t of Object.keys(byType)) byType[t].saved = Math.round(byType[t].used * 0.18 * 10) / 10;
    return json({
      windowDays: 30, bookings: all.length,
      energyKwhUsed: Math.round(used * 10) / 10,
      energyKwhSaved: Math.round(saved * 10) / 10,
      co2KgSaved: Math.round(co2 * 10) / 10,
      seatHoursSaved: Math.round(seatHours),
      treesEquivalent: Math.round((co2 / 21) * 10) / 10,
      byType,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const body = await req.json().catch(() => ({}));

  if (s[0] === "bookings") {
    const { resourceId, date, startHour, endHour, purpose, attendees } = body;
    if (!resourceId || !date || startHour == null || endHour == null)
      return json({ error: "Missing fields" }, 400);
    if (Number(endHour) <= Number(startHour))
      return json({ error: "End time must be after start time" }, 400);

    const res = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!res || !res.active) return json({ error: "Resource unavailable" }, 404);
    if (Number(attendees || 1) > res.capacity)
      return json({ error: "Capacity is " + res.capacity + ", you requested " + attendees }, 400);
    if (Number(startHour) < res.openHour || Number(endHour) > res.closeHour)
      return json({ error: res.name + " is open " + res.openHour + ":00 to " + res.closeHour + ":00" }, 400);

    const pad = (n: number) => String(n).padStart(2, "0");
    const startsAt = new Date(date + "T" + pad(Number(startHour)) + ":00:00.000Z");
    const endsAt = new Date(date + "T" + pad(Number(endHour)) + ":00:00.000Z");

    const clash = await prisma.booking.findFirst({
      where: {
        resourceId, status: { in: ["PENDING", "APPROVED"] },
        startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
      },
      select: { code: true, startsAt: true, endsAt: true, userName: true },
    });
    if (clash) {
      const h = (d: Date) => pad(d.getUTCHours()) + ":00";
      return json({ error: "Already booked " + h(clash.startsAt) + "-" + h(clash.endsAt) + " (" + clash.code + ")" }, 409);
    }

    const hours = (endsAt.getTime() - startsAt.getTime()) / 36e5;
    const base = await baselineKw(res.type);
    const energyKwh = Math.round(res.powerKw * hours * 100) / 100;
    const savedKwh = Math.max(0, (base - res.powerKw) * hours);
    const co2Kg = Math.round(savedKwh * GRID_KG_PER_KWH * 100) / 100;
    const autoApprove = false;

    const created = await prisma.booking.create({
      data: {
        code: code("BK"), resourceId, userId: u.id, userName: u.name, userRole: u.role,
        purpose: String(purpose || "Not specified").slice(0, 300),
        attendees: Number(attendees || 1), startsAt, endsAt,
        status: autoApprove ? "APPROVED" : "PENDING",
        decidedBy: autoApprove ? "AUTO (staff privilege)" : null,
        decidedAt: autoApprove ? new Date() : null,
        energyKwh, co2Kg,
      },
      include: { resource: { select: { name: true, code: true, type: true } } },
    });
    return json({ booking: created });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const body = await req.json().catch(() => ({}));
  const { id, action, note } = body;
  if (!id || !action) return json({ error: "Missing fields" }, 400);

  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) return json({ error: "Booking not found" }, 404);

  const staff = APPROVERS.includes(u.role);
  if (action === "cancel") {
    if (b.userId !== u.id && !staff) return json({ error: "Not your booking" }, 403);
    const up = await prisma.booking.update({ where: { id }, data: { status: "CANCELLED", note: note || null } });
    return json({ booking: up });
  }
  if (action === "approve" || action === "reject") {
    if (!staff) return json({ error: "Only Admin can approve or reject bookings" }, 403);
    const up = await prisma.booking.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        note: note || null, decidedBy: u.name + " (" + u.role + ")", decidedAt: new Date(),
      },
    });
    return json({ booking: up });
  }
  return json({ error: "Unknown action" }, 400);
}

export async function DELETE() { return json({ error: "Use PATCH cancel" }, 405); }



