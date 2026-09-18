import jwt from "jsonwebtoken";
import { hash as bcryptHash, compare as bcryptCompare } from "bcryptjs";
import { prisma } from "./prisma";

/* JWT_SECRET must be real. A silent dev fallback is how a demo secret
   reaches production - fail loudly instead. */
const SECRET = process.env.JWT_SECRET || "";
if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not set. Refusing to sign tokens with a default.");
}
const EFFECTIVE = SECRET || "dev-only-not-for-production";

/** 8 hours - one working day, short enough that a stolen token expires. */
const TOKEN_TTL = "8h";
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

export interface Session {
  userId: string;
  role: string;
  loginId: string;
  fullName: string;
  tv?: number;              // token version - bumped to log out all devices
  mcp?: boolean;            // must change password
}

export function signToken(s: Session): string {
  return jwt.sign(s, EFFECTIVE, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): Session | null {
  try { return jwt.verify(token, EFFECTIVE) as Session; } catch { return null; }
}

export function getSession(req: Request): Session | null {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return verifyToken(header.slice(7));
}

/** Use where a revoked session must be rejected immediately. */
export async function getLiveSession(req: Request): Promise<Session | null> {
  const s = getSession(req);
  if (!s) return null;
  const u = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { tokenVersion: true, isActive: true },
  });
  if (!u || !u.isActive) return null;
  /* Fail closed on a missing token version.
     Previously this read `typeof s.tv === "number" && s.tv !== u.tokenVersion`,
     which skipped the check entirely for any token without a `tv` claim - so a
     token issued before versioning existed could not be revoked by bumping
     tokenVersion. Every sign-in path now sets `tv`, so a token without one is
     stale by definition and is rejected. `tokenVersion` is non-nullable with a
     default of 0, so a valid session always has a number to compare. */
  if (typeof s.tv !== "number" || s.tv !== u.tokenVersion) return null;
  return s;
}

/* ---------------- passwords ---------------- */
export function hashPassword(plain: string): Promise<string> {
  return bcryptHash(plain, BCRYPT_ROUNDS);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcryptCompare(plain, hash);
}

/** Minimum policy. Returns null when acceptable, else the reason. */
export function passwordProblem(pw: string, loginId?: string): string | null {
  if (!pw || pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (loginId && pw.toLowerCase().includes(loginId.toLowerCase())) {
    return "Password must not contain your login ID.";
  }
  if (/^(\d{4}-\d{2}-\d{2}|\d{8})$/.test(pw)) return "A date is not an acceptable password.";
  return null;
}

/* ---------------- lockout (serverless-safe, stored in DB) ---------------- */
export function isLocked(u: { lockedUntil: Date | null }): boolean {
  return !!u.lockedUntil && u.lockedUntil.getTime() > Date.now();
}
export async function noteFailedLogin(userId: string, current: number): Promise<void> {
  const next = current + 1;
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLogins: next,
      lockedUntil: next >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
    },
  });
}
export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null } });
}
export const LOCK_POLICY = { MAX_FAILED, LOCK_MINUTES };

/* ---------------- existing helpers, unchanged ---------------- */
export function stageForRole(role: string): string {
  if (role === "HOI") return "HOI";
  if (role === "HOD") return "HOD";
  if (role === "FACULTY") return "FACULTY";
  if (role === "OWNER" || role === "SUPER_ADMIN") return "OWNER";
  return "ADMIN";
}

export const isStaff = (role: string) => role !== "STUDENT";

export async function notifyUser(userId: string, title: string, body: string) {
  try { await prisma.notification.create({ data: { userId, title, body } }); } catch {}
}

