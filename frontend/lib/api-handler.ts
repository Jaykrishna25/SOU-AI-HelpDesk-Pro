import { verifyPassword, hashPassword, passwordProblem, isLocked, noteFailedLogin, clearFailedLogins, LOCK_POLICY, signResetToken, verifyResetToken, RESET_POLICY } from "@/lib/server-auth";
import { maskEmail } from "@/lib/mask";
import { audit } from "./audit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, getSession, getLiveSession, stageForRole, isStaff, notifyUser } from "@/lib/server-auth";

type Ctx = { params: Promise<{ path: string[] }> };
const ok = (data: unknown) => NextResponse.json({ success: true, ...(data as object) });
const bad = (msg: string, code = 400) => NextResponse.json({ success: false, error: msg }, { status: code });

function ticketCode() {
  return "TKT-" + new Date().getFullYear() + "-" + String(1000 + Math.floor(Math.random() * 9000));
}

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [a, b] = path;
  const s = await getLiveSession(req);

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
    const roleValue = "STUDENT"; // privileged roles are assigned by an administrator, never self-selected
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
    const { loginId, password, birthdate } = body as Record<string, string>;
    if (!loginId) return bad("Login ID is required");
    const user = await prisma.user.findUnique({ where: { loginId: String(loginId).trim() } });
    if (!user || !user.isActive) return bad("Invalid credentials", 401);
    if (isLocked(user)) {
      return bad("Account locked after repeated failed attempts. Try again in " + LOCK_POLICY.LOCK_MINUTES + " minutes.", 423);
    }
    let passed = false;
    let firstTime = false;
    if (user.passwordHash) {
      passed = !!password && (await verifyPassword(String(password), user.passwordHash));
    } else {
      passed = !!birthdate && user.birthdate.toISOString().slice(0, 10) === String(birthdate);
      firstTime = passed;
    }
    if (!passed) {
      await noteFailedLogin(user.id, user.failedLogins);
      await audit({ action: "LOGIN_FAILED", entity: "User", entityId: user.id, req, summary: "Failed login for " + user.loginId });
      return bad("Invalid credentials", 401);
    }
    await clearFailedLogins(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const session = {
      userId: user.id, role: user.role, loginId: user.loginId, fullName: user.fullName,
      tv: user.tokenVersion, mcp: firstTime || user.mustChangePassword,
    };
    await audit({ action: "LOGIN", entity: "User", entityId: user.id, session, req, summary: user.loginId + " signed in" });
    return ok({
      token: signToken(session),
      mustChangePassword: session.mcp,
      user: { id: user.id, role: user.role, fullName: user.fullName, loginId: user.loginId },
    });
  }

  /* ---------------- forgot password ----------------

     Step 1 of 2. The account is proved with three facts that are not all
     on any one document: the login ID, the registered email, and the date
     of birth. That is the same standard the first sign-in already uses,
     raised by one factor.

     Two things are deliberate:

     - The failure message never distinguishes "no such ID" from "wrong
       email" from "wrong date". Any of those three telling the truth
       turns this endpoint into a way to confirm that a given enrollment
       number exists, and then to guess at the rest one field at a time.

     - Failed attempts go through noteFailedLogin, so this path shares the
       login lockout rather than sitting beside it as an unlimited oracle.
       A reset form with no rate limit is the softest way into an account.

     This verifies identity in-session rather than emailing a link. That is
     a real limitation and it is written down in docs/AUTH.md: anyone
     holding all three facts can reset the password without access to the
     mailbox. Emailing a one-time link is the upgrade, and the token this
     returns is already shaped to be delivered that way. */
  if (a === "auth" && b === "forgot-password") {
    const { loginId, email, birthdate } = body as Record<string, string>;
    const DENY = "Those details do not match an account. Check your login ID, "
               + "registered email and date of birth.";

    if (!loginId || !email || !birthdate) return bad(DENY, 400);

    const user = await prisma.user.findUnique({ where: { loginId: String(loginId).trim() } });
    if (!user || !user.isActive) return bad(DENY, 401);
    if (isLocked(user)) {
      return bad("Account locked after repeated failed attempts. Try again in "
               + LOCK_POLICY.LOCK_MINUTES + " minutes.", 423);
    }

    const emailOk = !!user.email
      && user.email.trim().toLowerCase() === String(email).trim().toLowerCase();
    const dobOk = user.birthdate.toISOString().slice(0, 10) === String(birthdate).trim();

    if (!emailOk || !dobOk) {
      await noteFailedLogin(user.id, user.failedLogins);
      await audit({
        action: "PASSWORD_RESET_DENIED", entity: "User", entityId: user.id, req,
        summary: "Failed reset attempt for " + user.loginId,
      });
      return bad(DENY, 401);
    }

    await clearFailedLogins(user.id);
    await audit({
      action: "PASSWORD_RESET_REQUESTED", entity: "User", entityId: user.id, req,
      summary: user.loginId + " passed reset verification",
    });

    return ok({
      resetToken: signResetToken(user.id, user.tokenVersion),
      expiresInMinutes: RESET_POLICY.TTL_MINUTES,
      /* Masked so the screen can confirm which mailbox is on file without
         printing an address to whoever is standing at the machine. */
      email: maskEmail(user.email),
      fullName: user.fullName,
    });
  }

  /* Step 2 of 2. Bumping tokenVersion both signs every device out and
     retires the reset token that was just used - see signResetToken. */
  if (a === "auth" && b === "reset-password") {
    const { resetToken, newPassword } = body as Record<string, string>;
    const claims = verifyResetToken(String(resetToken || ""));
    if (!claims) {
      return bad("This reset link has expired or has already been used. Start again.", 401);
    }
    const user = await prisma.user.findUnique({ where: { id: claims.userId } });
    if (!user || !user.isActive) return bad("Account not found", 404);
    if (claims.tv !== user.tokenVersion) {
      return bad("This reset link has already been used. Start again.", 401);
    }
    const problem = passwordProblem(String(newPassword || ""), user.loginId);
    if (problem) return bad(problem);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(String(newPassword)),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    await audit({
      action: "PASSWORD_RESET", entity: "User", entityId: user.id, req,
      summary: user.loginId + " reset their password and all sessions were revoked",
    });
    /* No token is returned. A reset signs you out everywhere, including
       here; you sign in with the new password like anyone else. */
    return ok({ reset: true });
  }

  if (a === "auth" && b === "set-password") {
    const me = await getLiveSession(req);
    if (!me) return bad("Unauthenticated", 401);
    const { currentPassword, newPassword } = body as Record<string, string>;
    const user = await prisma.user.findUnique({ where: { id: me.userId } });
    if (!user) return bad("Account not found", 404);
    if (user.passwordHash) {
      const okCurrent = !!currentPassword && (await verifyPassword(String(currentPassword), user.passwordHash));
      if (!okCurrent) return bad("Current password is incorrect", 401);
    }
    const problem = passwordProblem(String(newPassword || ""), user.loginId);
    if (problem) return bad(problem);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(String(newPassword)),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
    await audit({ action: "PASSWORD_RESET", entity: "User", entityId: user.id, session: me, req, summary: user.loginId + " set a new password" });
    const session = {
      userId: user.id, role: user.role, loginId: user.loginId, fullName: user.fullName,
      tv: updated.tokenVersion, mcp: false,
    };
    return ok({ token: signToken(session) });
  }

  const s = await getLiveSession(req);
  if (!s) return bad("Unauthenticated", 401);

  /* ---------------- batch escalation ----------------

     One admin action, one note, one notification, however many tickets.
     The old flow was one PATCH per ticket, which sent a student four
     separate emails about what is, to them, a single conversation.

     THE CROSS-STUDENT CHECK IS HERE, not only in the UI. The client
     refuses a mixed batch too, but that is a courtesy; this is the
     guarantee. One escalation carries one note, so a batch spanning two
     students would put both their names in front of whoever receives it
     and drop each into the other's thread. A privacy rule enforced only
     in a component is one refactor away from not existing. */
  if (a === "tickets" && b === "batch") {
    if (!isStaff(s.role)) return bad("Not permitted", 403);
    const codes = Array.isArray((body as any).codes) ? (body as any).codes.map(String) : [];
    const { recipient, stage, note } = body as Record<string, string>;
    if (!codes.length) return bad("No tickets selected");
    if (codes.length > 50) return bad("Too many tickets in one batch");
    if (!stage) return bad("A destination is required");

    const found = await prisma.ticket.findMany({ where: { code: { in: codes } } });
    if (found.length !== codes.length) return bad("Some tickets could not be found", 404);

    const owners = new Set(found.map(t => t.creatorId));
    if (owners.size > 1) {
      return bad("These tickets belong to " + owners.size + " different people. "
               + "Send each person's tickets separately.", 422);
    }

    /* Already-settled tickets are skipped rather than reopened. An admin who
       selected a whole card should not silently un-resolve last week's work. */
    const open = found.filter(t => t.status !== "Resolved" && t.status !== "Closed");
    if (!open.length) return bad("Every selected ticket is already resolved");

    const summary = note || ("Escalated to " + (recipient || stage) + " as a group.");
    await prisma.$transaction(
      open.map(t => prisma.ticket.update({
        where: { code: t.code },
        data: {
          status: "Escalated", stage, note: summary,
          history: { create: { event: "ESCALATED", actor: s.fullName, note: summary } },
        },
      }))
    );

    /* One notification naming every code. The student gets a single message
       and can still tell which of their queries moved. */
    const creatorId = found[0].creatorId;
    await notifyUser(creatorId,
      open.length + (open.length === 1 ? " query escalated" : " queries escalated"),
      summary + " (" + open.map(t => t.code).join(", ") + ")");

    await audit({
      action: "UPDATE", entity: "Ticket", entityId: open.map(t => t.code).join(","),
      session: s, req,
      summary: s.fullName + " escalated " + open.length + " tickets to " + stage + " as one batch",
    });

    return ok({
      escalated: open.map(t => t.code),
      skipped: found.filter(t => !open.includes(t)).map(t => t.code),
    });
  }

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
  const s = await getLiveSession(req);
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
  const s = await getLiveSession(req);
  if (!s) return bad("Unauthenticated", 401);

  if (a === "cr" && b) {
    if (!isStaff(s.role)) return bad("Only staff can remove a CR", 403);
    await prisma.cRAssignment.deleteMany({ where: { subjectCode: b } });
    return ok({ removed: b });
  }

  return bad("Unknown endpoint: " + path.join("/"), 404);
}







