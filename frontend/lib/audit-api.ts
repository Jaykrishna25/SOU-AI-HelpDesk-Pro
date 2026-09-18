import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";

/* ============================================================
   Audit log viewer - read only.

   An audit trail nobody can read is not accountability, it is
   just storage. This exposes it to the roles holding
   `audit.view` (OWNER, SUPER_ADMIN) and to nobody else.

   There is deliberately no write, edit or delete path here. An
   audit log that the application can rewrite proves nothing.
   ============================================================ */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/audit\/?/, "").split("/").filter(Boolean);
}

const MAX_TAKE = 200;

/** Actions worth surfacing first - the ones that touch sensitive material. */
const SENSITIVE_ACTIONS = ["VIEW_IDENTITY", "VIEW_CONFIDENTIAL", "ROLE_CHANGE", "DELETE", "EXPORT"];

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "audit.view")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "summary") {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [total, recent, byAction] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
      }),
    ]);
    return json({
      total,
      last7Days: recent,
      byAction: byAction.map(a => ({ action: a.action, count: a._count.action })),
      sensitiveActions: SENSITIVE_ACTIONS,
    });
  }

  if (p[0] === "list" || p.length === 0) {
    const take = Math.min(Number(q.get("take") || 50), MAX_TAKE);
    const skip = Math.max(Number(q.get("skip") || 0), 0);
    const action = q.get("action") || "";
    const entity = q.get("entity") || "";
    const sensitiveOnly = q.get("sensitive") === "1";

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (sensitiveOnly) where.action = { in: SENSITIVE_ACTIONS };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take, skip,
        select: {
          id: true, action: true, entity: true, entityId: true, summary: true,
          actorRole: true, createdAt: true, ip: true,
          user: { select: { loginId: true, fullName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return json({
      items: items.map(i => ({
        id: i.id,
        action: i.action,
        entity: i.entity,
        entityId: i.entityId,
        summary: i.summary,
        actorRole: i.actorRole,
        actor: i.user ? (i.user.fullName + " (" + i.user.loginId + ")") : "unauthenticated",
        ip: i.ip,
        createdAt: i.createdAt,
      })),
      total, take, skip,
    });
  }

  return json({ error: "Not found" }, 404);
}

/* No write path by design. */
export async function POST() { return json({ error: "The audit log is append-only and written by the system" }, 405); }
export async function PATCH() { return json({ error: "Audit entries cannot be modified" }, 405); }
export async function DELETE() { return json({ error: "Audit entries cannot be deleted" }, 405); }
