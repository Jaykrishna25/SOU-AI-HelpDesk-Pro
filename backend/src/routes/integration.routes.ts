import { Router } from "express";
import { authenticate, AuthedRequest } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { Role } from "@prisma/client";
import { SouMisAdapter, SouMisNotAuthorizedError, MisAttendanceRecord } from "../services/soumis.adapter";

const router = Router();
router.use(authenticate);

router.get("/soumis/status", (_req, res) => {
  res.json({ success: true, ...SouMisAdapter.status() });
});

router.get("/soumis/students", authorize(Role.ADMIN, Role.FACULTY, Role.HOD, Role.HOI, Role.OWNER, Role.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const department = String(req.query.department || "CSE");
      const semester = Number(req.query.semester || 5);
      res.json({ success: true, mode: SouMisAdapter.mode(), students: await SouMisAdapter.getStudents(department, semester) });
    } catch (e) { next(e); }
  });

router.get("/soumis/attendance/:enrollmentNo", async (req, res, next) => {
  try {
    res.json({ success: true, mode: SouMisAdapter.mode(), summary: await SouMisAdapter.getAttendanceSummary(req.params.enrollmentNo) });
  } catch (e) { next(e); }
});

router.post("/soumis/attendance", authorize(Role.FACULTY, Role.ADMIN, Role.SUPER_ADMIN),
  async (req: AuthedRequest, res, next) => {
    try {
      const records = (req.body?.records || []) as MisAttendanceRecord[];
      if (!Array.isArray(records) || records.length === 0)
        return res.status(400).json({ success: false, error: "records[] is required" });
      const key = String(req.headers["idempotency-key"] || `${req.user?.sub}-${Date.now()}`);
      res.json({ success: true, result: await SouMisAdapter.postAttendance(records, key) });
    } catch (e) { next(e); }
  });

router.post("/soumis/sync", authorize(Role.SUPER_ADMIN, Role.OWNER, Role.HOD),
  async (req, res, next) => {
    try {
      const department = String(req.body?.department || "CSE");
      const semester = Number(req.body?.semester || 5);
      res.json({ success: true, result: await SouMisAdapter.syncRoster(department, semester) });
    } catch (e) { next(e); }
  });

router.use((err: unknown, _req: any, res: any, next: any) => {
  if (err instanceof SouMisNotAuthorizedError)
    return res.status(503).json({ success: false, error: err.message, integration: "SOU_MIS", actionRequired: "Obtain API credentials from the SOU MIS/IT department." });
  next(err);
});

export default router;
