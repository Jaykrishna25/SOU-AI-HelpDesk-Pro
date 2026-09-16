import { rolesWith } from "@/lib/policy";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";

const CREATORS = rolesWith("feedback.createForm");
const HANDLERS = rolesWith("grievance.handle");
const IDENTITY = rolesWith("grievance.viewIdentity");
function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }

async function who(req: NextRequest) {
  const s: any = await getLiveSession(req as any);
  if (!s) return null;
  return {
    id: String(s.userId || s.id || s.sub || ""),
    role: String(s.role || s.roleCode || "STUDENT").toUpperCase(),
    name: String(s.name || s.fullName || "User"),
    dept: String(s.department || s.dept || ""),
  };
}
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/inst\/?/, "").split("/").filter(Boolean);
}
function code(p: string) { return p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }
function hash(formId: string, userId: string) {
  return crypto.createHash("sha256").update(formId + "|" + userId).digest("hex");
}
const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : 0);

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const q = new URL(req.url).searchParams;

  if (s[0] === "forms") {
    const now = new Date();
    if (q.get("scope") === "manage" && CREATORS.includes(u.role)) {
      const items = await prisma.feedbackForm.findMany({
        where: u.role === "FACULTY" ? { facultyUserId: u.id } : {},
        orderBy: { createdAt: "desc" }, include: { _count: { select: { responses: true } } },
      });
      return json({ items });
    }
    const open = await prisma.feedbackForm.findMany({
      where: { active: true, opensAt: { lte: now }, closesAt: { gte: now } },
      orderBy: { closesAt: "asc" },
    });
    const done = await prisma.feedbackResponse.findMany({
      where: { formId: { in: open.map(f => f.id) } }, select: { formId: true, respondentHash: true },
    });
    const mine = new Set(done.filter(d => open.some(f => d.respondentHash === hash(f.id, u.id))).map(d => d.formId));
    return json({ items: open.map(f => ({ ...f, submitted: mine.has(f.id) })) });
  }

  if (s[0] === "aggregate") {
    const formId = q.get("formId") || "";
    const f = await prisma.feedbackForm.findUnique({ where: { id: formId } });
    if (!f) return json({ error: "Form not found" }, 404);
    const allowed = ["HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"].includes(u.role) ||
      (u.role === "FACULTY" && f.facultyUserId === u.id);
    if (!allowed) return json({ error: "Not permitted" }, 403);
    const r = await prisma.feedbackResponse.findMany({ where: { formId }, orderBy: { createdAt: "desc" } });
    return json({
      form: f, count: r.length,
      scores: {
        clarity: avg(r.map(x => x.clarity)), engagement: avg(r.map(x => x.engagement)),
        fairness: avg(r.map(x => x.fairness)), availability: avg(r.map(x => x.availability)),
        overall: avg(r.map(x => x.overall)),
      },
      comments: r.filter(x => x.comment).map(x => x.comment),
    });
  }

  if (s[0] === "grievances") {
    const c = q.get("code");
    if (c) {
      const g = await prisma.grievance.findUnique({ where: { code: c.toUpperCase() } });
      if (!g) return json({ error: "No grievance with that code" }, 404);
      const { identityRef, ...safe } = g as any;
      return json({ item: safe });
    }
    if (!HANDLERS.includes(u.role)) return json({ error: "Not permitted" }, 403);
    const items = await prisma.grievance.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const showId = IDENTITY.includes(u.role);
    return json({
      items: items.map(g => {
        const { identityRef, ...rest } = g as any;
        return showId ? { ...rest, identityRef } : rest;
      }),
      identityVisible: showId,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const b = await req.json().catch(() => ({}));

  if (s[0] === "forms") {
    if (!CREATORS.includes(u.role)) return json({ error: "Faculty or above only" }, 403);
    const days = Math.min(90, Math.max(1, Number(b.days || 14)));
    const f = await prisma.feedbackForm.create({
      data: {
        code: code("FB"), subjectName: String(b.subjectName || "").slice(0, 80),
        facultyName: String(b.facultyName || u.name).slice(0, 80),
        facultyUserId: b.facultyUserId || (u.role === "FACULTY" ? u.id : null),
        department: String(b.department || u.dept || "").slice(0, 60),
        term: String(b.term || "").slice(0, 30),
        closesAt: new Date(Date.now() + days * 864e5), createdBy: u.name,
      },
    });
    return json({ form: f });
  }

  if (s[0] === "responses") {
    const { formId, clarity, engagement, fairness, availability, overall, comment } = b;
    const f = await prisma.feedbackForm.findUnique({ where: { id: String(formId || "") } });
    if (!f || !f.active) return json({ error: "Form is closed" }, 410);
    const n = (v: any) => Math.min(5, Math.max(1, Number(v || 3)));
    try {
      await prisma.feedbackResponse.create({
        data: {
          formId: f.id, respondentHash: hash(f.id, u.id),
          clarity: n(clarity), engagement: n(engagement), fairness: n(fairness),
          availability: n(availability), overall: n(overall),
          comment: comment ? String(comment).slice(0, 800) : null,
        },
      });
    } catch { return json({ error: "You have already submitted feedback for this subject" }, 409); }
    return json({ ok: true });
  }

  if (s[0] === "grievances") {
    const g = await prisma.grievance.create({
      data: {
        code: code("GR"), category: String(b.category || "Other").slice(0, 40),
        subject: String(b.subject || "").slice(0, 120), body: String(b.body || "").slice(0, 4000),
        identityRef: u.id + " | " + u.name + " | " + u.role,
      },
    });
    return json({ code: g.code });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const b = await req.json().catch(() => ({}));

  if (s[0] === "grievances") {
    if (!HANDLERS.includes(u.role)) return json({ error: "Not permitted" }, 403);
    await prisma.grievance.update({
      where: { id: String(b.id || "") },
      data: {
        status: b.status || "UNDER_REVIEW",
        response: b.response ? String(b.response).slice(0, 2000) : undefined,
        respondedBy: b.response ? u.role : undefined,
        respondedAt: b.response ? new Date() : undefined,
      },
    });
    return json({ ok: true });
  }
  if (s[0] === "forms") {
    if (!CREATORS.includes(u.role)) return json({ error: "Not permitted" }, 403);
    await prisma.feedbackForm.update({ where: { id: String(b.id || "") }, data: { active: !!b.active } });
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

export async function DELETE() { return json({ error: "Not supported" }, 405); }




