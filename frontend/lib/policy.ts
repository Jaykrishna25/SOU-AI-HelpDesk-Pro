import type { Session } from "./server-auth";

/* ============================================================
   Central authorization policy.
   Every protected endpoint must ask this module - never inline
   its own role array. Roles and capabilities live in one place
   so they cannot drift apart across modules.
   ============================================================ */

export const ROLES = [
  "STUDENT", "FACULTY", "ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

/** Capabilities are verbs the system can perform, not screens. */
export type Capability =
  // resources and bookings
  | "booking.create" | "booking.approve" | "booking.viewAll"
  // attendance
  | "attendance.startSession" | "attendance.verify"
  // feedback
  | "feedback.submit" | "feedback.createForm" | "feedback.viewAggregate"
  // grievance
  | "grievance.raise" | "grievance.handle" | "grievance.viewIdentity"
  // exams
  | "exam.generateSeating"
  // analytics and reporting
  | "insights.view" | "report.generate" | "report.publish"
  // IQAC / evidence (Phase 1)
  | "evidence.upload" | "evidence.verify" | "evidence.approve"
  | "evidence.viewConfidential" | "evidence.viewRestricted"
  | "criteria.configure"
  // administration
  | "user.manage" | "role.assign" | "audit.view";

const MATRIX: Record<Capability, Role[]> = {
  "booking.create": ["STUDENT", "FACULTY", "ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"],
  "booking.approve": ["ADMIN", "OWNER", "SUPER_ADMIN"],
  "booking.viewAll": ["ADMIN", "OWNER", "SUPER_ADMIN"],

  "attendance.startSession": ["STUDENT", "FACULTY"],          // students only if CR - checked separately
  "attendance.verify": ["FACULTY", "HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],

  "feedback.submit": ["STUDENT", "FACULTY", "ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"],
  "feedback.createForm": ["FACULTY", "HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],
  "feedback.viewAggregate": ["FACULTY", "HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],

  "grievance.raise": ["STUDENT", "FACULTY", "ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"],
  "grievance.handle": ["ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"],
  "grievance.viewIdentity": ["OWNER", "SUPER_ADMIN"],

  "exam.generateSeating": ["ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"],

  "insights.view": ["FACULTY", "HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],
  "report.generate": ["HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],
  "report.publish": ["HOI", "OWNER", "SUPER_ADMIN"],

  "evidence.upload": ["FACULTY", "HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],
  "evidence.verify": ["HOD", "HOI", "ADMIN", "OWNER", "SUPER_ADMIN"],
  "evidence.approve": ["HOI", "OWNER", "SUPER_ADMIN"],
  "evidence.viewConfidential": ["HOI", "OWNER", "SUPER_ADMIN"],
  "evidence.viewRestricted": ["OWNER", "SUPER_ADMIN"],
  "criteria.configure": ["HOI", "OWNER", "SUPER_ADMIN"],

  "user.manage": ["ADMIN", "OWNER", "SUPER_ADMIN"],
  "role.assign": ["OWNER", "SUPER_ADMIN"],
  "audit.view": ["OWNER", "SUPER_ADMIN"],
};

/** Domains whose records are never returned by general search or RAG. */
export const SENSITIVE_DOMAINS = [
  "counselling", "icc", "anti-ragging", "hr", "medical", "welfare", "disability",
] as const;
export type SensitiveDomain = (typeof SENSITIVE_DOMAINS)[number];

/** Only these roles may ever read a sensitive domain, and only their own. */
const SENSITIVE_ACCESS: Record<SensitiveDomain, Role[]> = {
  counselling: ["OWNER", "SUPER_ADMIN"],
  icc: ["OWNER", "SUPER_ADMIN"],
  "anti-ragging": ["OWNER", "SUPER_ADMIN"],
  hr: ["OWNER", "SUPER_ADMIN"],
  medical: ["OWNER", "SUPER_ADMIN"],
  welfare: ["OWNER", "SUPER_ADMIN"],
  disability: ["HOI", "OWNER", "SUPER_ADMIN"],
};

export type Visibility = "public" | "internal" | "confidential" | "restricted";

export function normaliseRole(role: unknown): Role {
  const r = String(role || "").toUpperCase();
  return (ROLES as readonly string[]).includes(r) ? (r as Role) : "STUDENT";
}

/** The single question every endpoint should ask. */
export function can(session: Session | null, cap: Capability): boolean {
  if (!session) return false;
  return MATRIX[cap]?.includes(normaliseRole(session.role)) ?? false;
}

export function canReadSensitive(session: Session | null, domain: SensitiveDomain): boolean {
  if (!session) return false;
  return SENSITIVE_ACCESS[domain]?.includes(normaliseRole(session.role)) ?? false;
}

export function canSeeVisibility(session: Session | null, v: Visibility): boolean {
  if (v === "public") return true;
  if (!session) return false;
  if (v === "internal") return true;
  if (v === "confidential") return can(session, "evidence.viewConfidential");
  return can(session, "evidence.viewRestricted");
}

/** Throwable guard for route handlers. */
export class Forbidden extends Error {
  status = 403;
  constructor(cap: Capability) { super("Not permitted: " + cap); }
}
export function require_(session: Session | null, cap: Capability): Session {
  if (!session) { const e = new Forbidden(cap); e.status = 401; throw e; }
  if (!can(session, cap)) throw new Forbidden(cap);
  return session;
}

/** Department scoping - HOD/FACULTY see their own department unless institute-wide. */
export function departmentScope(session: Session | null, dept?: string | null) {
  const r = normaliseRole(session?.role);
  if (["HOI", "OWNER", "SUPER_ADMIN", "ADMIN"].includes(r)) return {};
  return dept ? { department: dept } : {};
}
