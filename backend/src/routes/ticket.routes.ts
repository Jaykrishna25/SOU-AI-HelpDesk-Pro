import { Router } from "express";
import { prisma } from "../config/db";
import { authenticate, AuthedRequest } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { Role } from "@prisma/client";
import { assignTicket, resolveTicket, escalateTicket, runSlaSweep } from "../services/ticket.service";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthedRequest, res) => {
  const where = req.user!.role === "STUDENT" ? { creatorId: req.user!.sub } : {};
  const tickets = await prisma.ticket.findMany({
    where, orderBy: { createdAt: "desc" },
    include: { creator: { select: { fullName: true } }, assignee: { select: { fullName: true } } },
  });
  res.json({ success: true, tickets });
});

router.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { history: true, comments: { include: { author: true } }, watchers: true },
  });
  res.json({ success: true, ticket });
});

router.post("/:id/assign", authorize(Role.ADMIN, Role.HOD), async (req: AuthedRequest, res) => {
  res.json({ success: true, ticket: await assignTicket(req.params.id, req.body.assigneeId, req.user!.sub) });
});

router.post("/:id/resolve", authorize(Role.ADMIN, Role.FACULTY, Role.HOD), async (req: AuthedRequest, res) => {
  res.json({ success: true, ticket: await resolveTicket(req.params.id, req.user!.sub, req.body.note) });
});

router.post("/:id/escalate", authorize(Role.ADMIN, Role.FACULTY, Role.HOD), async (req: AuthedRequest, res) => {
  res.json({ success: true, ticket: await escalateTicket(req.params.id, req.user!.sub) });
});

router.post("/sla/sweep", authorize(Role.SUPER_ADMIN, Role.OWNER), async (_req, res) => {
  res.json({ success: true, breached: await runSlaSweep() });
});

export default router;
