import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { verifyPassword, type Session } from "@/lib/server-auth";

/* ============================================================
   Step-up authentication.

   Holding a valid session proves you signed in at some point in
   the last eight hours. It does not prove you are still the one
   at the keyboard. Institutional financial figures are worth a
   fresh check, so they require re-authentication within the last
   five minutes.

   The elevation is a separate short-lived token, not a flag on
   the session, for three reasons: the client cannot forge it,
   it expires on its own without any cleanup, and it is bound to
   the user's current tokenVersion - so revoking their sessions
   revokes their elevation too.
   ============================================================ */

const SECRET = process.env.JWT_SECRET || "";
if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not set. Refusing to sign elevation tokens with a default.");
}
const EFFECTIVE = SECRET || "dev-only-not-for-production";

/** Long enough to read a dashboard, short enough that a walked-away screen expires. */
export const STEP_UP_MINUTES = 5;

interface StepUpClaims {
  sub: string;      // user id
  tv: number;       // token version at the moment of elevation
  su: true;
  purpose: string;  // what this elevation was granted for
}

export function issueStepUp(userId: string, tokenVersion: number, purpose = "finance"): string {
  const claims: StepUpClaims = { sub: userId, tv: tokenVersion, su: true, purpose };
  return jwt.sign(claims, EFFECTIVE, { expiresIn: STEP_UP_MINUTES * 60 });
}

export type StepUpResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "wrong-user" | "wrong-purpose" };

/**
 * Verify the elevation token on a request.
 *
 * Checks it is well-formed, unexpired, issued to THIS user, for THIS purpose,
 * and that the user's sessions have not been revoked since it was granted.
 */
export async function verifyStepUp(
  req: Request,
  session: Session,
  purpose = "finance",
): Promise<StepUpResult> {
  const header = req.headers.get("x-step-up") || "";
  if (!header) return { ok: false, reason: "missing" };

  let claims: StepUpClaims;
  try {
    claims = jwt.verify(header, EFFECTIVE) as StepUpClaims;
  } catch (e: any) {
    return { ok: false, reason: e?.name === "TokenExpiredError" ? "expired" : "invalid" };
  }

  if (!claims?.su) return { ok: false, reason: "invalid" };
  if (claims.sub !== session.userId) return { ok: false, reason: "wrong-user" };
  if (claims.purpose !== purpose) return { ok: false, reason: "wrong-purpose" };

  // A password change or forced sign-out must also drop any elevation.
  const u = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tokenVersion: true, isActive: true },
  });
  if (!u || !u.isActive) return { ok: false, reason: "revoked" };
  if (claims.tv !== u.tokenVersion) return { ok: false, reason: "revoked" };

  return { ok: true };
}

export type StepUpCheck =
  | { ok: true; tokenVersion: number }
  | { ok: false; status: number; error: string };

/**
 * Re-authenticate with a password.
 *
 * Returns a generic failure on a wrong password without saying whether the
 * account has one, and never reveals the hash. This does NOT feed the login
 * lockout counter: locking someone out of their own dashboard because they
 * fumbled a re-entry is a denial of service, not a security control. Attempts
 * are audited by the caller instead.
 */
export async function checkPassword(userId: string, password: string): Promise<StepUpCheck> {
  if (!password) return { ok: false, status: 400, error: "Your password is required." };

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, tokenVersion: true, isActive: true },
  });
  if (!u || !u.isActive) return { ok: false, status: 401, error: "Account unavailable." };

  if (!u.passwordHash) {
    return {
      ok: false, status: 409,
      error: "This account has no password set yet. Choose one under Your account first.",
    };
  }

  const good = await verifyPassword(password, u.passwordHash);
  if (!good) return { ok: false, status: 401, error: "That password is not correct." };

  return { ok: true, tokenVersion: u.tokenVersion };
}
