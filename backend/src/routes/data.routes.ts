import { Router } from "express";
import { prisma } from "../config/db";
import { authenticate, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/me", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { student: { include: { department: true, course: true } }, faculty: { include: { department: true } }, admin: true },
  });
  res.json({ success: true, user });
});

router.get("/notifications", async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.sub }, orderBy: { createdAt: "desc" }, take: 50,
  });
  res.json({ success: true, notifications });
});

router.get("/knowledge-base", async (_req, res) => {
  res.json({ success: true, docs: await prisma.knowledgeBase.findMany() });
});

export default router;
