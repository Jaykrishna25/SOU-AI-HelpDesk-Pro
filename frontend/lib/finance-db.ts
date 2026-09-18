import { prisma } from "@/lib/prisma";
import {
  analyseFeeRows, type FeeAnalysis, type InstitutionalAnalysis,
} from "@/lib/finance-math";

/* ============================================================
   Database-backed fee analysis.

   Kept apart from finance-math.ts so the arithmetic can be unit
   tested without a database connection. This module only fetches
   rows; every calculation happens in finance-math.ts.
   ============================================================ */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[, \u20B9]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- database-backed: one student ---------------- */

export async function analyseStudentFees(userId: string): Promise<FeeAnalysis | null> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, fees: { select: { semester: true, totalFees: true, paidFees: true, status: true, dueDate: true } } },
  });
  if (!student) return null;
  const rows = student.fees.sort((a, b) => a.semester - b.semester);
  return analyseFeeRows(rows, "portal-record");
}

/* ---------------- database-backed: institution-wide ---------------- */

export async function analyseInstitutionalFees(department?: string | null): Promise<InstitutionalAnalysis> {
  const fees = await prisma.fee.findMany({
    select: {
      semester: true, totalFees: true, paidFees: true, dueDate: true, studentId: true,
      student: { select: { department: { select: { name: true } } } },
    },
  });

  const scoped = department
    ? fees.filter(f => f.student?.department?.name === department)
    : fees;

  const now = Date.now();
  const semMap = new Map<number, { billed: number; collected: number }>();
  const deptMap = new Map<string, { billed: number; collected: number }>();
  const overdueStudentIds = new Set<string>();

  let totalBilled = 0, totalCollected = 0, overdueAmount = 0;
  const studentIds = new Set<string>();

  for (const f of scoped) {
    const billed = num(f.totalFees);
    const paid = num(f.paidFees);
    const outstanding = Math.max(0, billed - paid);

    totalBilled += billed;
    totalCollected += paid;
    studentIds.add(f.studentId);

    if (outstanding > 0.5 && f.dueDate && new Date(f.dueDate).getTime() < now) {
      overdueStudentIds.add(f.studentId);
      overdueAmount += outstanding;
    }

    const s = semMap.get(f.semester) || { billed: 0, collected: 0 };
    semMap.set(f.semester, { billed: s.billed + billed, collected: s.collected + paid });

    const dname = f.student?.department?.name || "Unassigned";
    const d = deptMap.get(dname) || { billed: 0, collected: 0 };
    deptMap.set(dname, { billed: d.billed + billed, collected: d.collected + paid });
  }

  const rate = (billed: number, collected: number) => (billed > 0 ? round2((collected / billed) * 100) : 0);

  return {
    studentsWithFees: studentIds.size,
    totalBilled: round2(totalBilled),
    totalCollected: round2(totalCollected),
    totalOutstanding: round2(Math.max(0, totalBilled - totalCollected)),
    collectionRatePercent: rate(totalBilled, totalCollected),
    overdueStudents: overdueStudentIds.size,
    overdueAmount: round2(overdueAmount),
    bySemester: [...semMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([semester, v]) => ({
        semester,
        billed: round2(v.billed),
        collected: round2(v.collected),
        outstanding: round2(Math.max(0, v.billed - v.collected)),
        collectionRatePercent: rate(v.billed, v.collected),
      })),
    byDepartment: [...deptMap.entries()]
      .sort((a, b) => b[1].billed - a[1].billed)
      .map(([dept, v]) => ({
        department: dept,
        billed: round2(v.billed),
        collected: round2(v.collected),
        outstanding: round2(Math.max(0, v.billed - v.collected)),
        collectionRatePercent: rate(v.billed, v.collected),
      })),
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}

