import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface Session { userId: string; role: string; loginId: string; fullName: string; }

export function signToken(s: Session): string {
  return jwt.sign(s, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): Session | null {
  try { return jwt.verify(token, SECRET) as Session; } catch { return null; }
}

export function getSession(req: Request): Session | null {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return verifyToken(header.slice(7));
}

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
