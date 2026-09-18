/* ============================================================
   Study plan arithmetic.

   Pure functions. No Prisma import, no model import, so the
   arithmetic can be unit tested on its own - the same split used
   for the fee analysis, and for the same reason: a student acts
   on this, so a plan that is confidently wrong about which
   subject is most urgent sends them to revise the wrong thing.

   Scores are out of 100. Study hours are per week.
   ============================================================ */

/** Below this a subject is a weak area. */
export const WEAK_THRESHOLD = 60;
/** Below this it is at risk of failing rather than merely weak. */
export const CRITICAL_THRESHOLD = 45;

export interface ResultRow {
  subjectCode: string;
  subjectName: string;
  semester: number;
  internalMarks: number;
  externalMarks: number;
  grade: string | null;
}

export interface PlanItem {
  subjectCode: string;
  subjectName: string;
  semester: number;
  score: number;
  grade: string;
  priority: number;            // 1 is most urgent
  severity: "critical" | "weak";
  hoursPerWeek: number;
  reason: string;
}

export interface StudyPlan {
  items: PlanItem[];
  strongest: { subjectName: string; score: number }[];
  subjectCount: number;
  averageScore: number;
  weakCount: number;
  criticalCount: number;
  totalHours: number;
  threshold: number;
  bySemester: { semester: number; average: number; subjects: number }[];
  generatedAt: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Guards against NaN reaching a total and poisoning every figure. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function scoreOf(r: ResultRow): number {
  return round2(num(r.internalMarks) + num(r.externalMarks));
}

function gradeFromScore(score: number): string {
  const table: [number, string][] = [
    [90, "O"], [80, "A"], [70, "B+"], [60, "B"], [50, "C"], [45, "D"],
  ];
  for (const [cut, g] of table) if (score >= cut) return g;
  return "E";
}

/**
 * Build the plan.
 *
 * Priority is worst score first. Hours scale with the gap to the threshold, so
 * the plan spends more time where more ground has to be made up rather than
 * splitting hours evenly across weak subjects.
 *
 * Note on credits: the Subject model does not record credit weight, so credits
 * do not factor into priority here. The standalone version of this tool does
 * weight by credits; this one cannot, and says so rather than inventing a
 * weighting that looks rigorous and is not.
 */
export function computeStudyPlan(rows: ResultRow[], threshold = WEAK_THRESHOLD): StudyPlan {
  const scored = rows.map(r => ({ row: r, score: scoreOf(r) }));

  const weak = scored
    .filter(s => s.score < threshold)
    .sort((a, b) => a.score - b.score);

  const items: PlanItem[] = weak.map((s, i) => {
    const critical = s.score < CRITICAL_THRESHOLD;
    const gap = Math.max(0, threshold - s.score);
    const hours = Math.min(10, Math.max(2, Math.round(gap / 6)));
    return {
      subjectCode: s.row.subjectCode,
      subjectName: s.row.subjectName,
      semester: s.row.semester,
      score: s.score,
      grade: s.row.grade || gradeFromScore(s.score),
      priority: i + 1,
      severity: critical ? "critical" : "weak",
      hoursPerWeek: hours,
      reason:
        `scored ${s.score} out of 100, ` +
        (critical ? "below the pass-risk line" : "below the target line") +
        ` of ${threshold}, a gap of ${round2(gap)} marks`,
    };
  });

  const allScores = scored.map(s => s.score).filter(n => n > 0);

  const semMap = new Map<number, { total: number; count: number }>();
  for (const s of scored) {
    const e = semMap.get(s.row.semester) || { total: 0, count: 0 };
    semMap.set(s.row.semester, { total: e.total + s.score, count: e.count + 1 });
  }

  return {
    items,
    strongest: scored
      .filter(s => s.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => ({ subjectName: s.row.subjectName, score: s.score })),
    subjectCount: rows.length,
    averageScore: allScores.length ? round2(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
    weakCount: weak.length,
    criticalCount: weak.filter(s => s.score < CRITICAL_THRESHOLD).length,
    totalHours: items.reduce((a, i) => a + i.hoursPerWeek, 0),
    threshold,
    bySemester: [...semMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([semester, v]) => ({
        semester,
        average: round2(v.total / v.count),
        subjects: v.count,
      })),
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}

/** Exactly what the model is handed. It rewords this; it never recomputes it. */
export function renderStudyPlan(p: StudyPlan): string {
  const out = [
    `STUDY PLAN (generated ${p.generatedAt}, from the portal's examination records)`,
    `Subjects on record: ${p.subjectCount}`,
    `Average score: ${p.averageScore} out of 100`,
    `Weak subjects: ${p.weakCount} (of which ${p.criticalCount} are at risk of failing)`,
    `Suggested study load: ${p.totalHours} hours per week in total`,
    "",
  ];

  if (!p.items.length) {
    out.push(`No subject falls below ${p.threshold} out of 100. Nothing is flagged for revision.`);
  } else {
    out.push("PRIORITISED WEAK AREAS:");
    for (const i of p.items) {
      out.push(
        `${i.priority}. ${i.subjectName} (${i.subjectCode}, semester ${i.semester}) - ` +
        `${i.severity.toUpperCase()} - ${i.hoursPerWeek} hrs/week. Reason: ${i.reason}.`,
      );
    }
  }

  if (p.bySemester.length) {
    out.push("");
    out.push("SEMESTER AVERAGES: " +
      p.bySemester.map(s => `sem ${s.semester}: ${s.average} (${s.subjects} subjects)`).join(", "));
  }

  if (p.strongest.length) {
    out.push("");
    out.push("STRONGEST SUBJECTS: " +
      p.strongest.map(s => `${s.subjectName} (${s.score})`).join(", "));
  }

  out.push("");
  out.push("These figures come from recorded examination results only. " +
           "No grade is predicted and no future performance is forecast.");
  return out.join("\n");
}
