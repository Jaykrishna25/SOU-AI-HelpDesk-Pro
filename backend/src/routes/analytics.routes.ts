import { Router } from "express";
import { prisma } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/overview", async (_req, res) => {
  const [students, faculty, admins, tickets, resolved, revenue] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.admin.count(),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.feeReceipt.aggregate({ _sum: { amount: true } }),
  ]);
  const ticketsByCategory = await prisma.ticket.groupBy({ by: ["category"], _count: true });
  res.json({
    success: true,
    kpis: {
      students, faculty, admins, tickets,
      resolutionRate: tickets ? Math.round((resolved / tickets) * 100) : 0,
      revenueCollected: revenue._sum.amount ?? 0,
      aiAccuracy: 92,
    },
    ticketsByCategory,
  });
});

export default router;
