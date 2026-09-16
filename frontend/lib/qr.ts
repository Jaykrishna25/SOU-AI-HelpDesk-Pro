import { rolesWith } from "@/lib/policy";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";

const ROTATE_MS = 20000;
const APPROVERS = rolesWith("attendance.verify");
function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }

async function who(req: NextRequest) {
  const s: any = await getLiveSession(req as any);
  if (!s) return null;
  return {
    id: String(s.userId || s.id || s.sub || ""),
    role: String(s.role || s.roleCode || "STUDENT").toUpperCase(),
    name: String(s.name || s.fullName || s.username || "User"),
    loginId: String(s.loginId || s.enrollmentNo || s.username || ""),
  };
}

function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/qr\/?/, "").split("/").filter(Boolean);
}

function codeFor(token: string, win: number) {
  const h = crypto.createHmac("sha256", token).update(String(win)).digest("hex").toUpperCase();
  return h.replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
function currentWindow() { return Math.floor(Date.now() / ROTATE_MS); }

export async function GET(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const q = new URL(req.url).searchParams;

  if (s[0] === "live") {
    const id = q.get("id") || "";
    const ses = await prisma.qRSession.findUnique({
      where: { id }, include: { scans: { orderBy: { scannedAt: "desc" } } },
    });
    if (!ses) return json({ error: "Session not found" }, 404);
    const expired = ses.closed || ses.expiresAt.getTime() < Date.now();
    return json({
      session: {
        id: ses.id, subjectName: ses.subjectName, className: ses.className,
        expectedCount: ses.expectedCount, closed: ses.closed, approved: ses.approved,
        expiresAt: ses.expiresAt, syncState: ses.syncState,
      },
      code: expired ? null : codeFor(ses.token, currentWindow()),
      rotateMs: ROTATE_MS,
      scans: ses.scans.map(x => ({ id: x.id, name: x.studentName, enrollment: x.enrollment, at: x.scannedAt })),
    });
  }

  if (s[0] === "sessions") {
    const scope = q.get("scope") || "mine";
    const where: any =
      scope === "pending" && APPROVERS.includes(u.role)
        ? { closed: true, approved: false }
        : scope === "all" && APPROVERS.includes(u.role)
        ? {}
        : { crUserId: u.id };
    const items = await prisma.qRSession.findMany({
      where, orderBy: { createdAt: "desc" }, take: 60,
      include: { scans: { select: { id: true, studentName: true, enrollment: true, scannedAt: true } } },
    });
    return json({ items });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const s = seg(req);
  const body = await req.json().catch(() => ({}));

  if (s[0] === "sessions") {
    if (u.role === "STUDENT" && u.loginId) {
      try {
        const cr = await prisma.cRAssignment.findFirst({
          where: { enrollmentNo: { equals: u.loginId, mode: "insensitive" } },
        });
        if (!cr) return json({ error: "Only the Class Representative can start an attendance session" }, 403);
      } catch { /* assignment lookup unavailable - allow */ }
    }
    const minutes = Math.min(60, Math.max(2, Number(body.minutes || 10)));
    const ses = await prisma.qRSession.create({
      data: {
        token: crypto.randomBytes(24).toString("hex"),
        subjectName: String(body.subjectName || "Untitled").slice(0, 80),
        className: String(body.className || "").slice(0, 60),
        crUserId: u.id,
        expectedCount: Number(body.expectedCount || 0),
        expiresAt: new Date(Date.now() + minutes * 60000),
        rotateSeconds: ROTATE_MS / 1000,
      },
    });
    return json({ id: ses.id });
  }

  if (s[0] === "scan") {
    const { sessionId, code } = body;
    const ses = await prisma.qRSession.findUnique({ where: { id: String(sessionId || "") } });
    if (!ses) return json({ error: "Session not found" }, 404);
    if (ses.closed) return json({ error: "This attendance session is closed" }, 410);
    if (ses.expiresAt.getTime() < Date.now()) return json({ error: "This code has expired" }, 410);

    const w = currentWindow();
    const ok = [w, w - 1].some(x => codeFor(ses.token, x) === String(code || "").toUpperCase());
    if (!ok) return json({ error: "Code is not valid right now - it rotates every 20 seconds" }, 400);

    try {
      await prisma.qRScan.create({
        data: { sessionId: ses.id, studentUserId: u.id, studentName: u.name, enrollment: u.loginId || null },
      });
    } catch {
      return json({ ok: true, already: true, subject: ses.subjectName });
    }
    return json({ ok: true, subject: ses.subjectName, className: ses.className });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH(req: NextRequest) {
  const u = await who(req);
  if (!u) return json({ error: "Unauthorised" }, 401);
  const { id, action } = await req.json().catch(() => ({}));
  const ses = await prisma.qRSession.findUnique({ where: { id: String(id || "") } });
  if (!ses) return json({ error: "Session not found" }, 404);

  if (action === "close") {
    if (ses.crUserId !== u.id && !APPROVERS.includes(u.role)) return json({ error: "Not your session" }, 403);
    await prisma.qRSession.update({ where: { id: ses.id }, data: { closed: true } });
    return json({ ok: true });
  }
  if (action === "approve" || action === "reject") {
    if (!APPROVERS.includes(u.role)) return json({ error: "Faculty or above only" }, 403);
    await prisma.qRSession.update({
      where: { id: ses.id },
      data: {
        closed: true, approved: action === "approve",
        approvedBy: u.name + " (" + u.role + ")", approvedAt: new Date(),
        syncState: action === "approve" ? "SYNCED (mock - awaiting SOU MIS API access)" : "REJECTED",
      },
    });
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
}

export async function DELETE() { return json({ error: "Use PATCH" }, 405); }


