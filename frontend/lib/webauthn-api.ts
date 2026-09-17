import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession, signToken } from "@/lib/server-auth";
import { audit } from "@/lib/audit";
import {
  registrationOptions, verifyRegistration,
  authenticationOptions, verifyAuthentication, purgeExpiredChallenges,
} from "@/lib/webauthn";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/webauthn\/?/, "").split("/").filter(Boolean);
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const keys = await prisma.passkey.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
  });
  return json({ passkeys: keys });
}

export async function POST(req: NextRequest) {
  const p = seg(req);
  const b = await req.json().catch(() => ({}));

  /* ---- register a passkey on this device (signed in) ---- */
  if (p[0] === "register" && p[1] === "options") {
    const s = await getLiveSession(req);
    if (!s) return json({ error: "Unauthenticated" }, 401);
    try {
      await purgeExpiredChallenges();
      const options = await registrationOptions(s.userId, s.loginId, s.fullName);
      return json({ options });
    } catch (e: any) {
      return json({ error: e?.message || "Could not start registration" }, 400);
    }
  }

  if (p[0] === "register" && p[1] === "verify") {
    const s = await getLiveSession(req);
    if (!s) return json({ error: "Unauthenticated" }, 401);
    try {
      const label = String(b.label || "").trim() || "This device";
      const r = await verifyRegistration(s.userId, s.loginId, b.response, label);
      await audit({
        action: "CREATE", entity: "Passkey", entityId: r.credentialId, session: s, req,
        summary: s.loginId + " registered a passkey (" + label + ")",
      });
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e?.message || "Could not register this device" }, 400);
    }
  }

  /* ---- sign in with face or fingerprint (no session yet) ---- */
  if (p[0] === "login" && p[1] === "options") {
    const loginId = String(b.loginId || "").trim();
    if (!loginId) return json({ error: "Login ID is required" }, 400);
    try {
      await purgeExpiredChallenges();
      const options = await authenticationOptions(loginId);
      return json({ options });
    } catch (e: any) {
      // Deliberately the same message whether the account or the passkey is
      // missing, so this endpoint cannot be used to enumerate accounts.
      return json({ error: "No passkey is registered for that login ID." }, 404);
    }
  }

  if (p[0] === "login" && p[1] === "verify") {
    const loginId = String(b.loginId || "").trim();
    try {
      const user = await verifyAuthentication(loginId, b.response);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
      });
      const session = {
        userId: user.id, role: user.role, loginId: user.loginId, fullName: user.fullName,
        tv: user.tokenVersion, mcp: !user.passwordHash,
      };
      await audit({
        action: "LOGIN", entity: "User", entityId: user.id, session, req,
        summary: user.loginId + " signed in with a passkey",
      });
      return json({
        token: signToken(session),
        mustChangePassword: session.mcp,
        user: { id: user.id, role: user.role, fullName: user.fullName, loginId: user.loginId },
      });
    } catch (e: any) {
      await audit({
        action: "LOGIN_FAILED", entity: "User", req,
        summary: "Passkey sign-in failed for " + loginId + ": " + (e?.message || "unknown"),
      });
      return json({ error: e?.message || "Could not verify this device" }, 401);
    }
  }

  return json({ error: "Not found" }, 404);
}

export async function DELETE(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  const key = await prisma.passkey.findUnique({ where: { id } });
  if (!key || key.userId !== s.userId) return json({ error: "Not your passkey" }, 403);
  await prisma.passkey.delete({ where: { id } });
  await audit({
    action: "DELETE", entity: "Passkey", entityId: id, session: s, req,
    summary: s.loginId + " removed passkey " + key.label,
  });
  return json({ ok: true });
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
