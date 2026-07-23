import { Router } from "express";
import { prisma } from "../config/db";
import { signAccess, signRefresh, verifyRefresh } from "../utils/jwt";
import { ApiError } from "../utils/apiError";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  loginId: z.string().min(2),
  birthdate: z.string(), // YYYY-MM-DD
});

// Universal login: loginId + birthdate. Role inferred from user record.
router.post("/login", async (req, res) => {
  const { loginId, birthdate } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");

  const bd = user.birthdate.toISOString().slice(0, 10);
  if (bd !== birthdate) throw new ApiError(401, "Invalid credentials");

  const payload = { sub: user.id, role: user.role, loginId: user.loginId };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 864e5) },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id } });

  res.json({ success: true, accessToken, refreshToken,
    user: { id: user.id, role: user.role, fullName: user.fullName, loginId: user.loginId } });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "Missing refresh token");
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked) throw new ApiError(401, "Invalid refresh token");
  const p = verifyRefresh(refreshToken);
  res.json({ success: true, accessToken: signAccess({ sub: p.sub, role: p.role, loginId: p.loginId }) });
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revoked: true } });
  res.json({ success: true });
});

export default router;
