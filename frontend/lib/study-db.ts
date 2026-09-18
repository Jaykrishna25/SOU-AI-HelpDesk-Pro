import { prisma } from "@/lib/prisma";
import type { ResultRow } from "@/lib/study-math";

/* Database access for the study plan.

   Kept apart from study-math.ts so the arithmetic can be unit tested without a
   database connection. This module fetches rows; it calculates nothing. */

export async function fetchStudentResults(userId: string): Promise<ResultRow[] | null> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      results: {
        select: {
          semester: true, internalMarks: true, externalMarks: true, grade: true,
          subject: { select: { code: true, name: true } },
        },
        orderBy: [{ semester: "asc" }],
      },
    },
  });
  if (!student) return null;

  return student.results.map(r => ({
    subjectCode: r.subject?.code ?? "",
    subjectName: r.subject?.name ?? "Unnamed subject",
    semester: r.semester,
    internalMarks: r.internalMarks,
    externalMarks: r.externalMarks,
    grade: r.grade,
  }));
}

/**
 * Cohort view for faculty and above: how a department is performing per subject.
 * Aggregate only - no individual student is named.
 */
export interface SubjectCohort {
  subjectCode: string;
  subjectName: string;
  semester: number;
  students: number;
  average: number;
  belowThreshold: number;
}

export async function fetchSubjectCohort(
  threshold: number,
  department?: string | null,
): Promise<SubjectCohort[]> {
  const results = await prisma.result.findMany({
    select: {
      semester: true, internalMarks: true, externalMarks: true,
      subject: { select: { code: true, name: true } },
      student: { select: { department: { select: { name: true } } } },
    },
  });

  const scoped = department
    ? results.filter(r => r.student?.department?.name === department)
    : results;

  const map = new Map<string, { name: string; semester: number; scores: number[] }>();
  for (const r of scoped) {
    const code = r.subject?.code ?? "";
    if (!code) continue;
    const score = (r.internalMarks || 0) + (r.externalMarks || 0);
    const e = map.get(code) || { name: r.subject?.name ?? code, semester: r.semester, scores: [] };
    e.scores.push(score);
    map.set(code, e);
  }

  return [...map.entries()]
    .map(([code, v]) => ({
      subjectCode: code,
      subjectName: v.name,
      semester: v.semester,
      students: v.scores.length,
      average: Math.round((v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 100) / 100,
      belowThreshold: v.scores.filter(s => s < threshold).length,
    }))
    .sort((a, b) => a.average - b.average);
}
