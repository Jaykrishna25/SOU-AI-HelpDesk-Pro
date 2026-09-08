import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, getSession, stageForRole, isStaff, notifyUser } from "@/lib/server-auth";

type Ctx = { params: Promise<{ path: string[] }> };
const ok = (data: unknown) => NextResponse.json({ success: true, ...(data as object) });
const bad = (msg: string, code = 400) => NextResponse.json({ success: false, error: msg }, { status: code });

function ticketCode() {
  return "TKT-" + new Date().getFullYear() + "-" + String(1000 + Math.floor(Math.random() * 9000));
}

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [a, b] = path;
  const s = getSession(req);

  if (a === "soumis" && b === "status") {
    const live = Boolean(process.env.SOUMIS_BASE_URL && process.env.SOUMIS_API_KEY);
    return ok({ mode: live ? "live" : "mock", live,
      note: live ? "Connected to the official SOU MIS API."
                 : "Mock mode. Live access requires API credentials approved by SOU MIS/IT." });
  }

  if (!s) return bad("Unauthenticated", 401);

  if (a === "me") {
    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      include: { student: { include: { department: true } }, faculty: true, admin: true },
    });
    return ok({ user });
  }

  if (a === "tickets") {
    const where = s.role === "STUDENT"
      ? { creatorId: s.userId }
      : { stage: stageForRole(s.role) };
    const tickets = await prisma.ticket.findMany({ where, orderBy: { createdAt: "desc" }, include: { creator: { select: { role: true } } } });
    return ok({ tickets });
  }

  if (a === "cr") {
    const crs = await prisma.cRAssignment.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ crs });
  }

  if (a === "attendance") {
    const subs = await prisma.attendanceSubmission.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ submissions: subs });
  }

  if (a === "notifications") {
    const notifications = await prisma.notification.findMany({
      where: { userId: s.userId }, orderBy: { createdAt: "desc" }, take: 30,
    });
    return ok({ notifications });
  }

  return bad("Unknown endpoint: " + path.join("/"), 404);
}

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [a, b] = path;
  const body = await req.json().catch(() => ({}));

  if (a === "auth" && b === "signup") {
    const { fullName, email, phone, birthdate, institute, course, role } = body as Record<string, string>;
    const roleValue = ["STUDENT", "FACULTY", "ADMIN", "HOD", "HOI", "OWNER"].includes(String(role || "").toUpperCase()) ? String(role).toUpperCase() : "STUDENT";
    if (!fullName || !email || !birthdate) return bad("Name, email and date of birth are required");
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return bad("An account with this email already exists. Please log in.");
    let loginId = "";
    for (let i = 0; i < 8; i++) {
      const prefixes: Record<string, string> = { STUDENT: "SOU" + new Date().getFullYear(), FACULTY: "FAC", ADMIN: "ADM", HOD: "HOD", HOI: "HOI", OWNER: "OWN" };
      const candidate = (prefixes[roleValue] || "SOU") + String(1000 + Math.floor(Math.random() * 9000));
      const clash = await prisma.user.findUnique({ where: { loginId: candidate } });
      if (!clash) { loginId = candidate; break; }
    }
    if (!loginId) return bad("Could not allocate an ID. Please try again.");
    await prisma.user.create({
      data: { loginId, role: roleValue as any, fullName, email, phone, institute, course, birthdate: new Date(birthdate + "T00:00:00Z") },
    });
    return ok({ loginId, fullName });
  }

  if (a === "auth" && b === "login") {
    const { loginId, birthdate } = body as { loginId?: string; birthdate?: string };
    if (!loginId || !birthdate) return bad("loginId and birthdate are required");
    const user = await prisma.user.findUnique({ where: { loginId: loginId.trim() } });
    if (!user || !user.isActive) return bad("Invalid ID or birthdate", 401);
    if (user.birthdate.toISOString().slice(0, 10) !== birthdate) return bad("Invalid ID or birthdate", 401);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entity: "User" } });
    const session = { userId: user.id, role: user.role, loginId: user.loginId, fullName: user.fullName };
    return ok({ token: signToken(session), user: { id: user.id, role: user.role, fullName: user.fullName, loginId: user.loginId } });
  }

  const s = getSession(req);
  if (!s) return bad("Unauthenticated", 401);

  if (a === "tickets") {
    const { subject, description, category, priority } = body as Record<string, string>;
    if (!subject) return bad("subject is required");
    const ticket = await prisma.ticket.create({
      data: {
        code: ticketCode(), subject, description: description || subject,
        category: category || "GENERAL", priority: priority || "MEDIUM",
        status: "Open", stage: "ADMIN", creatorId: s.userId, creatorName: s.fullName,
        history: { create: { event: "CREATED", actor: s.fullName } },
      },
    });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(admins.map((u) => notifyUser(u.id, "New ticket " + ticket.code, subject)));
    return ok({ ticket });
  }

  if (a === "cr") {
    if (!isStaff(s.role)) return bad("Only staff can assign a CR", 403);
    const { subjectCode, subjectName, enrollmentNo, studentName } = body as Record<string, string>;
    if (!subjectCode || !enrollmentNo) return bad("subjectCode and enrollmentNo are required");
    const cr = await prisma.cRAssignment.upsert({
      where: { subjectCode },
      update: { subjectName, enrollmentNo, studentName, assignedBy: s.fullName },
      create: { subjectCode, subjectName, enrollmentNo, studentName, assignedBy: s.fullName },
    });
    const student = await prisma.user.findUnique({ where: { loginId: enrollmentNo } });
    if (student) await notifyUser(student.id, "You are now a Class Representative", "for " + subjectName);
    return ok({ cr });
  }

  if (a === "attendance") {
    const { subjectCode, subjectName, date, entries } = body as Record<string, unknown>;
    if (!subjectCode || !Array.isArray(entries)) return bad("subjectCode and entries[] are required");
    const cr = await prisma.cRAssignment.findUnique({ where: { subjectCode: String(subjectCode) } });
    if (!cr || cr.enrollmentNo.toLowerCase() !== s.loginId.toLowerCase())
      return bad("You are not the CR for this subject", 403);
    const sub = await prisma.attendanceSubmission.create({
      data: {
        subjectCode: String(subjectCode), subjectName: String(subjectName || subjectCode),
        date: String(date), markedByEnrollment: s.loginId, markedByName: s.fullName,
        entries: entries as object, status: "PENDING", syncState: "NOT_SYNCED",
      },
    });
    const staff = await prisma.user.findMany({ where: { role: { in: ["FACULTY", "ADMIN"] } } });
    await Promise.all(staff.map((u) => notifyUser(u.id, "Attendance awaiting approval", sub.subjectName + " - " + sub.date)));
    return ok({ submission: sub });
  }

  return bad("Unknown endpoint: " + path.join("/"), 404);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [a, b] = path;
  const body = await req.json().catch(() => ({}));
  const s = getSession(req);
  if (!s) return bad("Unauthenticated", 401);

  if (a === "tickets" && b) {
    if (!isStaff(s.role) && body.status !== "Reopened") return bad("Not permitted", 403);
    const existing = await prisma.ticket.findUnique({ where: { code: b } });
    if (!existing) return bad("Ticket not found", 404);
    const ticket = await prisma.ticket.update({
      where: { code: b },
      data: {
        status: body.status ?? existing.status,
        stage: body.stage ?? existing.stage,
        note: body.note ?? existing.note,
        history: { create: { event: String(body.status || "UPDATED"), actor: s.fullName, note: body.note || "" } },
      },
    });
    await notifyUser(existing.creatorId, "Ticket " + ticket.code + " " + ticket.status, ticket.note || ticket.subject);
    return ok({ ticket });
  }

  if (a === "attendance" && b) {
    if (!isStaff(s.role)) return bad("Only staff can approve attendance", 403);
    const sub = await prisma.attendanceSubmission.findUnique({ where: { id: b } });
    if (!sub) return bad("Submission not found", 404);

    if (body.action === "reject") {
      const updated = await prisma.attendanceSubmission.update({
        where: { id: b }, data: { status: "REJECTED", approvedBy: s.fullName },
      });
      return ok({ submission: updated });
    }

    const live = Boolean(process.env.SOUMIS_BASE_URL && process.env.SOUMIS_API_KEY);
    let syncState = "SYNCED (mock - awaiting SOU MIS API access)";
    if (live) {
      try {
        const res = await fetch(process.env.SOUMIS_BASE_URL + "/api/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.SOUMIS_API_KEY,
            "Idempotency-Key": sub.id,
          },
          body: JSON.stringify({ subjectCode: sub.subjectCode, date: sub.date, entries: sub.entries }),
        });
        syncState = res.ok ? "SYNCED to SOU MIS (live)" : "FAILED (SOU MIS returned " + res.status + ")";
      } catch { syncState = "QUEUED (SOU MIS unreachable - will retry)"; }
    }
    const updated = await prisma.attendanceSubmission.update({
      where: { id: b }, data: { status: "APPROVED", approvedBy: s.fullName, syncState },
    });
    const crUser = await prisma.user.findUnique({ where: { loginId: sub.markedByEnrollment } });
    if (crUser) await notifyUser(crUser.id, "Attendance approved", sub.subjectName + " - " + syncState);
    return ok({ submission: updated });
  }

  return bad("Unknown endpoint: " + path.join("/"), 404);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [a, b] = path;
  const s = getSession(req);
  if (!s) return bad("Unauthenticated", 401);

  if (a === "cr" && b) {
    if (!isStaff(s.role)) return bad("Only staff can remove a CR", 403);
    await prisma.cRAssignment.deleteMany({ where: { subjectCode: b } });
    return ok({ removed: b });
  }

  return bad("Unknown endpoint: " + path.join("/"), 404);
}



