import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can, normaliseRole, type Role } from "@/lib/policy";
import { audit } from "@/lib/audit";

/* ============================================================
   Account administration.

   Password recovery here is deliberately admin-mediated rather
   than self-service by email. Recovery requires proving who you
   are, and this deployment has no server-side mail sender - the
   email helper is client-side EmailJS with public credentials,
   which cannot deliver a reset token safely.

   So an administrator clears the password after verifying the
   person, and the account falls back to the existing first-time
   flow: sign in with date of birth, then choose a password.

   The rank rule below matters. `user.manage` includes ADMIN, and
   a reset account signs in with its date of birth - which is not
   a secret. Without a rank check an ADMIN could reset the OWNER,
   then sign in as the OWNER. Reset is therefore only ever
   permitted downwards.
   ============================================================ */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
}

/** Higher number outranks lower. Equal ranks may not reset each other. */
const RANK: Record<Role, number> = {
  STUDENT: 1, FACULTY: 2, ADMIN: 3, HOD: 3, HOI: 4, OWNER: 5, SUPER_ADMIN: 6,
};

function outranks(actor: string, target: string): boolean {
  return RANK[normaliseRole(actor)] > RANK[normaliseRole(target)];
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "user.manage")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "users") {
    const term = (q.get("q") || "").trim();
    if (term.length < 2) {
      return json({ items: [], hint: "Type at least two characters of a name or login ID." });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { loginId: { contains: term, mode: "insensitive" } },
          { fullName: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { fullName: "asc" },
      take: 25,
      select: {
        id: true, loginId: true, fullName: true, role: true, isActive: true,
        passwordHash: true, lockedUntil: true, failedLogins: true, lastLoginAt: true,
      },
    });

    return json({
      items: users.map(u => ({
        id: u.id,
        loginId: u.loginId,
        fullName: u.fullName,
        role: u.role,
        isActive: u.isActive,
        // The hash itself is never returned - only whether one exists.
        hasPassword: !!u.passwordHash,
        locked: !!u.lockedUntil && u.lockedUntil.getTime() > Date.now(),
        lockedUntil: u.lockedUntil,
        failedLogins: u.failedLogins,
        lastLoginAt: u.lastLoginAt,
        canReset: outranks(s.role, u.role),
      })),
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "user.manage")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const b = await req.json().catch(() => ({}));
  const loginId = String(b.loginId || "").trim();
  if (!loginId) return json({ error: "A login ID is required" }, 400);

  const target = await prisma.user.findUnique({
    where: { loginId },
    select: { id: true, loginId: true, fullName: true, role: true },
  });
  if (!target) return json({ error: "No account with that login ID" }, 404);

  if (!outranks(s.role, target.role)) {
    await audit({
      action: "ROLE_CHANGE", entity: "User", entityId: target.id, session: s, req,
      summary: "DENIED account action on " + target.loginId + " (" + target.role +
               ") by " + s.loginId + " (" + s.role + ") - insufficient rank",
    });
    return json({
      error: "You cannot perform this on an account at or above your own level. " +
             "Ask someone more senior.",
    }, 403);
  }

  /* ---- clear the password, returning the account to first-time sign-in ---- */
  if (p[0] === "reset-password") {
    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: null,          // falls back to date-of-birth sign-in
        mustChangePassword: true,    // forces a new password immediately after
        tokenVersion: { increment: 1 }, // every existing session dies now
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    await audit({
      action: "PASSWORD_RESET", entity: "User", entityId: target.id, session: s, req,
      summary: s.loginId + " (" + s.role + ") reset the password for " +
               target.loginId + " (" + target.role + "). Account returned to " +
               "first-time sign-in and all existing sessions were revoked.",
    });

    return json({
      ok: true,
      loginId: target.loginId,
      fullName: target.fullName,
      instruction:
        "Tell " + target.fullName + " to sign in with their login ID and date of birth, " +
        "then choose a new password. Verify their identity in person or by a channel you " +
        "trust before telling them - a reset account is protected only by a date of birth.",
    });
  }

  /* ---- clear a lockout without touching the password ---- */
  if (p[0] === "unlock") {
    await prisma.user.update({
      where: { id: target.id },
      data: { failedLogins: 0, lockedUntil: null },
    });
    await audit({
      action: "UPDATE", entity: "User", entityId: target.id, session: s, req,
      summary: s.loginId + " cleared the login lockout on " + target.loginId,
    });
    return json({ ok: true, loginId: target.loginId });
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }
