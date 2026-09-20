/* ============================================================
   Study planner — schedule generation and progress maths.

   Pure functions. No Prisma, no network, no model.

   The important design decision: THE MODEL DOES NOT BUILD THE
   TIMETABLE. Asking a language model to divide 5 hours across
   3 subjects over 7 days produces a plausible-looking grid whose
   arithmetic is wrong roughly as often as it is right, and the
   student will not check it. So the slots, the times and the
   allocation are computed here and tested; the model is only
   used elsewhere, to explain topics and write quiz questions.

   A timetable a student plans their week around has to add up.
   ============================================================ */

export type Difficulty = "Easy" | "Medium" | "Hard";
export type StudyMode = "Concept Learning & Exercises" | "Active Recall & Revision";

export const SESSION_MINUTES = 45;
export const BREAK_MINUTES = 15;
export const DEFAULT_DAY_START = "09:00";
/** Nobody studies through lunch, and a plan that pretends otherwise gets ignored. */
export const LUNCH_START = "13:00";
export const LUNCH_MINUTES = 60;

export const MAX_DAYS = 60;
export const MAX_HOURS_PER_DAY = 12;
export const MAX_SUBJECTS = 8;

export interface SubjectInput {
  name: string;
  difficulty: Difficulty;
  /** Free text, comma separated. Optional. */
  topics?: string;
}

export interface PlanRequest {
  goal: string;
  days: number;
  hoursPerDay: number;
  subjects: SubjectInput[];
  /** ISO date (YYYY-MM-DD). Defaults to today. */
  startDate?: string;
  dayStart?: string;
}

export interface Slot {
  day: number;
  date: string;
  start: string;
  end: string;
  subject: string;
  title: string;
  mode: StudyMode;
  minutes: number;
}

export interface GeneratedPlan {
  strategy: string;
  slots: Slot[];
  sessionsPerDay: number;
  totalMinutes: number;
  perSubject: { subject: string; sessions: number; minutes: number }[];
}

/* ---------------- time helpers ---------------- */

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return 9 * 60;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mi = Math.min(59, Math.max(0, Number(m[2])));
  return h * 60 + mi;
}

export function toClock(mins: number): string {
  const wrapped = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/* ---------------- allocation ---------------- */

export function weightFor(d: Difficulty): number {
  return d === "Hard" ? 3 : d === "Medium" ? 2 : 1;
}

/**
 * How many sessions fit in a day.
 *
 * "Daily study hours" means hours actually studying, not hours elapsed —
 * breaks are on top. Rounding DOWN matters: a plan that quietly asks for more
 * than the student said they had is how a plan stops being followed.
 */
export function sessionsPerDay(hoursPerDay: number): number {
  const h = Number.isFinite(hoursPerDay) ? hoursPerDay : 0;
  return Math.max(1, Math.floor((h * 60) / SESSION_MINUTES));
}

/**
 * Split N sessions across subjects by difficulty weight.
 *
 * Largest-remainder, so the parts always sum to exactly N. Rounding each
 * share independently loses or invents sessions, which is precisely the kind
 * of quiet arithmetic error nobody checks in a generated timetable.
 */
export function allocate(subjects: SubjectInput[], total: number): number[] {
  const n = subjects.length;
  if (!n || total <= 0) return new Array(Math.max(0, n)).fill(0);

  const weights = subjects.map(s => weightFor(s.difficulty));
  const sum = weights.reduce((a, b) => a + b, 0) || n;

  const exact = weights.map(w => (w / sum) * total);
  const base = exact.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);

  /* Hand the leftovers to the largest fractional parts; ties go to the
     harder subject, then to the earlier one, so the result is stable. */
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v), w: weights[i] }))
    .sort((a, b) => (b.frac - a.frac) || (b.w - a.w) || (a.i - b.i));

  for (let k = 0; left > 0; k++, left--) base[order[k % n].i]++;

  /* Every subject the student bothered to type deserves at least one session.
     Take from the most-allocated subject to pay for it. */
  for (let i = 0; i < n; i++) {
    if (base[i] > 0) continue;
    let donor = base.indexOf(Math.max(...base));
    if (base[donor] > 1) { base[donor]--; base[i]++; }
  }
  return base;
}

function topicsOf(s: SubjectInput): string[] {
  return String(s.topics || "")
    .split(/[,;\n]/)
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/* ---------------- the schedule ---------------- */

export function generatePlan(req: PlanRequest, now: Date = new Date()): GeneratedPlan {
  const days = Math.min(MAX_DAYS, Math.max(1, Math.floor(Number(req.days) || 1)));
  const hours = Math.min(MAX_HOURS_PER_DAY, Math.max(0.5, Number(req.hoursPerDay) || 1));
  const subjects = (req.subjects || [])
    .filter(s => String(s?.name || "").trim())
    .slice(0, MAX_SUBJECTS)
    .map(s => ({
      name: String(s.name).trim().slice(0, 60),
      difficulty: (["Easy", "Medium", "Hard"].includes(s.difficulty) ? s.difficulty : "Medium") as Difficulty,
      topics: s.topics,
    }));

  const perDay = sessionsPerDay(hours);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(req.startDate || "")) ? req.startDate! : todayISO(now);
  const dayStartMin = toMinutes(req.dayStart || DEFAULT_DAY_START);

  if (!subjects.length) {
    return {
      strategy: "No subjects were given, so there is nothing to schedule.",
      slots: [], sessionsPerDay: perDay, totalMinutes: 0, perSubject: [],
    };
  }

  const total = perDay * days;
  const quota = allocate(subjects, total);

  /* A queue per subject, so every session gets a distinct topic label and
     the parts are numbered in order rather than at random. */
  const queues = subjects.map((s, i) => {
    const topics = topicsOf(s);
    return Array.from({ length: quota[i] }, (_, k) => ({
      subject: s.name,
      title: `${s.name}: ${topics.length ? topics[k % topics.length] : "Key Concepts"} · Part ${k + 1}`,
    }));
  });

  /* Interleave, hardest first within each round, so no subject is left
     entirely to the last day. Cramming one subject per day is how a plan
     produces a student who has forgotten day one by day five. */
  const orderedSubjects = subjects
    .map((s, i) => ({ i, w: weightFor(s.difficulty) }))
    .sort((a, b) => (b.w - a.w) || (a.i - b.i));

  const ordered: { subject: string; title: string }[] = [];
  let remaining = total;
  while (remaining > 0) {
    let moved = false;
    for (const { i } of orderedSubjects) {
      const item = queues[i].shift();
      if (!item) continue;
      ordered.push(item);
      remaining--;
      moved = true;
      if (remaining <= 0) break;
    }
    if (!moved) break;   // queues exhausted; guards against an infinite loop
  }

  const lunchAt = toMinutes(LUNCH_START);
  const slots: Slot[] = [];
  let cursor = 0;

  for (let d = 0; d < days; d++) {
    /* The last day of a plan of three days or more is revision. You cannot
       learn something new the day before the exam, and pretending otherwise
       is the most common flaw in a generated study plan. */
    const revisionDay = days >= 3 && d === days - 1;
    let clock = dayStartMin;

    for (let s = 0; s < perDay; s++) {
      const item = ordered[cursor++];
      if (!item) break;

      if (clock < lunchAt && clock + SESSION_MINUTES > lunchAt) clock = lunchAt + LUNCH_MINUTES;

      const mode: StudyMode = revisionDay || s % 2 === 1
        ? "Active Recall & Revision"
        : "Concept Learning & Exercises";

      slots.push({
        day: d + 1,
        date: addDays(start, d),
        start: toClock(clock),
        end: toClock(clock + SESSION_MINUTES),
        subject: item.subject,
        title: revisionDay ? item.title.replace(/· Part \d+$/, "· Revision") : item.title,
        mode,
        minutes: SESSION_MINUTES,
      });

      clock += SESSION_MINUTES + BREAK_MINUTES;
    }
  }

  const perSubject = subjects.map(s => {
    const mine = slots.filter(x => x.subject === s.name);
    return { subject: s.name, sessions: mine.length, minutes: mine.length * SESSION_MINUTES };
  });

  const hardest = [...subjects].sort((a, b) => weightFor(b.difficulty) - weightFor(a.difficulty))[0];
  const strategy =
    `${days}-day plan for ${String(req.goal || "your exam").trim() || "your exam"}, `
    + `${perDay} session(s) of ${SESSION_MINUTES} minutes a day `
    + `(${((perDay * SESSION_MINUTES) / 60).toFixed(2)} hours of study, breaks on top). `
    + `Sessions are weighted by difficulty, so ${hardest.name} gets the most. `
    + (days >= 3 ? "The final day is revision only." : "Too short for a dedicated revision day.");

  return {
    strategy,
    slots,
    sessionsPerDay: perDay,
    totalMinutes: slots.length * SESSION_MINUTES,
    perSubject,
  };
}

/* ---------------- progress ---------------- */

export interface TaskLike {
  day: number;
  subject: string;
  minutes: number;
  done: boolean;
  doneAt?: Date | string | null;
}

export interface Progress {
  done: number;
  total: number;
  pct: number;
  minutesDone: number;
  byDay: { day: number; done: number; total: number }[];
  bySubject: { subject: string; done: number; total: number; pct: number }[];
}

export function progressOf(tasks: TaskLike[]): Progress {
  const list = tasks || [];
  const done = list.filter(t => t.done);

  const days = [...new Set(list.map(t => t.day))].sort((a, b) => a - b);
  const subjects = [...new Set(list.map(t => t.subject))];

  return {
    done: done.length,
    total: list.length,
    pct: list.length ? Math.round((done.length / list.length) * 100) : 0,
    minutesDone: done.reduce((a, t) => a + (Number(t.minutes) || 0), 0),
    byDay: days.map(day => ({
      day,
      done: list.filter(t => t.day === day && t.done).length,
      total: list.filter(t => t.day === day).length,
    })),
    bySubject: subjects.map(subject => {
      const mine = list.filter(t => t.subject === subject);
      const d = mine.filter(t => t.done).length;
      return { subject, done: d, total: mine.length, pct: mine.length ? Math.round((d / mine.length) * 100) : 0 };
    }),
  };
}

/**
 * Consecutive days on which at least one task was completed, counting back
 * from today.
 *
 * Yesterday still counts as a live streak — today is not over yet, and a
 * counter that resets at midnight punishes someone for not having studied
 * before breakfast.
 */
export function studyStreak(tasks: TaskLike[], now: Date = new Date()): number {
  const daysWithWork = new Set(
    (tasks || [])
      .filter(t => t.done && t.doneAt)
      .map(t => {
        const d = new Date(t.doneAt as any);
        return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      })
      .filter(Boolean),
  );
  if (!daysWithWork.size) return 0;

  const today = now.toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);
  if (!daysWithWork.has(today) && !daysWithWork.has(yesterday)) return 0;

  let streak = 0;
  let cursor = daysWithWork.has(today) ? today : yesterday;
  while (daysWithWork.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Minutes completed per day over the last `span` days, oldest first. */
export function recentMinutes(tasks: TaskLike[], span = 7, now: Date = new Date()): { date: string; minutes: number }[] {
  const today = now.toISOString().slice(0, 10);
  const out: { date: string; minutes: number }[] = [];

  for (let i = span - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const minutes = (tasks || [])
      .filter(t => {
        if (!t.done || !t.doneAt) return false;
        const d = new Date(t.doneAt as any);
        return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
      })
      .reduce((a, t) => a + (Number(t.minutes) || 0), 0);
    out.push({ date, minutes });
  }
  return out;
}
