import { prisma } from "./prisma";
import type { Session } from "./server-auth";

/* ============================================================
   Audit logging. Call for every create, update, delete, approve,
   export and confidential-evidence view. Never throws - a failed
   audit write must not break the user action, but it is recorded
   to the server log so the gap is visible.
   ============================================================ */

export type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE"
  | "APPROVE" | "REJECT" | "VERIFY"
  | "EXPORT" | "VIEW_CONFIDENTIAL" | "VIEW_IDENTITY"
  | "LOGIN" | "LOGIN_FAILED" | "LOGOUT"
  | "ROLE_CHANGE" | "PASSWORD_RESET";

export interface AuditInput {
  action: AuditAction;
  entity: string;               // model or module, e.g. "EvidenceRecord"
  entityId?: string | null;
  summary?: string | null;      // one human-readable line
  detail?: unknown;             // structured diff or context - never secrets
  session?: Session | null;
  req?: Request | null;
}

/** Fields that must never be written into an audit detail blob. */
const REDACT = ["password", "passwordHash", "token", "secret", "otp", "identityRef"];

function scrub(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT.some(r => k.toLowerCase().includes(r.toLowerCase())) ? "[redacted]" : scrub(v);
  }
  return out;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    const h = input.req?.headers;
    await prisma.auditLog.create({
      data: {
        userId: input.session?.userId || null,
        actorRole: input.session?.role || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        summary: input.summary ? String(input.summary).slice(0, 500) : null,
        detail: input.detail ? JSON.stringify(scrub(input.detail)).slice(0, 8000) : null,
        ip: h?.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: h?.get("user-agent")?.slice(0, 300) || null,
      },
    });
  } catch (e) {
    console.error("[audit] write failed", input.action, input.entity, e);
  }
}
