/* ============================================================
   Fun Zone progression: levels, streaks and badges.

   Every number here is DERIVED from rows that already exist in
   GameScore. There is no progression table, no XP column and no
   migration. That is deliberate: a schema you can recompute is a
   schema you can change your mind about, and if the level curve
   below turns out to be wrong it can be rewritten without a data
   migration or a single incorrect badge left behind.

   Pure functions - no Prisma, no network - so the streak rule
   and the level curve are unit tested.

   One rule the design follows throughout: reward SHOWING UP more
   than winning. A leaderboard already rewards winning, and a
   leaderboard is the thing that makes a student who is not the
   best stop playing. Streaks, participation badges and a level
   curve that everyone advances along are the counterweight.
   ============================================================ */

export interface PlayRow {
  /** "YYYY-MM-DD" */
  puzzleDate: string;
  game: string;
  score: number;
  durationMs: number;
}

/* ---------------- levels ---------------- */

export interface Level {
  n: number;
  title: string;
  /** Lifetime points needed to reach it. */
  at: number;
}

/**
 * The curve.
 *
 * Early levels are close together so a new player sees movement in their first
 * session; later ones stretch out. The titles are deliberately about learning
 * rather than combat - this sits in a university portal, and "Level 7:
 * Destroyer" would be the wrong note in front of an HOI.
 */
export const LEVELS: Level[] = [
  { n: 1, title: "Fresher", at: 0 },
  { n: 2, title: "Curious", at: 800 },
  { n: 3, title: "Regular", at: 2_500 },
  { n: 4, title: "Sharp", at: 6_000 },
  { n: 5, title: "Consistent", at: 12_000 },
  { n: 6, title: "Quick", at: 22_000 },
  { n: 7, title: "Dependable", at: 38_000 },
  { n: 8, title: "Formidable", at: 60_000 },
  { n: 9, title: "Scholar", at: 95_000 },
  { n: 10, title: "Oak", at: 150_000 },
];

export interface LevelState {
  level: Level;
  next: Level | null;
  points: number;
  /** Points into the current level. */
  into: number;
  /** Points the current level spans. Null at the cap. */
  span: number | null;
  /** 0-100. Sits at 100 once the top level is reached. */
  percent: number;
}

export function levelFor(points: number): LevelState {
  const p = Math.max(0, Math.round(points || 0));

  let level = LEVELS[0];
  for (const l of LEVELS) if (p >= l.at) level = l;

  const next = LEVELS.find(l => l.n === level.n + 1) ?? null;
  const into = p - level.at;
  const span = next ? next.at - level.at : null;

  return {
    level, next, points: p, into, span,
    percent: span ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/* ---------------- streaks ---------------- */

/** One day, in milliseconds. Dates are date-only keys, so this is exact. */
const DAY_MS = 86_400_000;

function toUtc(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export interface StreakState {
  /** Consecutive days up to and including today (or yesterday). */
  current: number;
  /** The best run ever. */
  best: number;
  /** True when today has not been played but yesterday was. */
  atRisk: boolean;
  /** True when today counts toward the streak already. */
  playedToday: boolean;
}

/**
 * Consecutive days played.
 *
 * A streak survives until the end of the day AFTER the last play. Miss two
 * days and it resets. The one-day grace is the whole point: a student who
 * played every day for a fortnight and then had an exam should not lose it at
 * one minute past midnight — losing a long streak to a technicality is how
 * people stop playing altogether.
 */
export function streakFor(rows: PlayRow[], today: string): StreakState {
  const days = [...new Set((rows || []).map(r => r.puzzleDate))].sort();
  if (!days.length) {
    return { current: 0, best: 0, atRisk: false, playedToday: false };
  }

  // Longest run anywhere in the history.
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (toUtc(days[i]) - toUtc(days[i - 1])) / DAY_MS;
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const t = toUtc(today);
  const last = days[days.length - 1];
  const sinceLast = (t - toUtc(last)) / DAY_MS;

  // Broken: the last play was the day before yesterday or older.
  if (sinceLast > 1) {
    return { current: 0, best, atRisk: false, playedToday: false };
  }

  // Walk backwards from the last play.
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const gap = (toUtc(days[i]) - toUtc(days[i - 1])) / DAY_MS;
    if (gap !== 1) break;
    current++;
  }

  return {
    current,
    best: Math.max(best, current),
    atRisk: sinceLast === 1,
    playedToday: sinceLast === 0,
  };
}

/* ---------------- badges ---------------- */

export interface Badge {
  id: string;
  name: string;
  how: string;
  /** Why it exists, shown on hover. Not every badge is about winning. */
  note?: string;
}

export interface BadgeState extends Badge {
  earned: boolean;
  /** Progress toward it, 0-100, when that is meaningful. */
  progress?: number;
}

export interface BadgeContext {
  rows: PlayRow[];
  today: string;
  streak: StreakState;
  points: number;
  /** Games that exist, so "played them all" means something. */
  totalGames: number;
  /** Best result details the API can supply cheaply. */
  bestTypingWpm?: number;
  optimalRobotRuns?: number;
}

export const BADGES: Badge[] = [
  { id: "first", name: "First Move", how: "Score on any puzzle" },
  { id: "week", name: "Seven Days", how: "A seven-day streak",
    note: "Showing up is the hard part. This one is not about being good." },
  { id: "fortnight", name: "Fortnight", how: "A fourteen-day streak" },
  { id: "allrounder", name: "All-Rounder", how: "Play every game at least once" },
  { id: "sweep", name: "Clean Sweep", how: "Play every game in a single day" },
  { id: "century", name: "Century", how: "One hundred puzzles solved" },
  { id: "perfect", name: "Perfect Run", how: "Score the maximum on any puzzle",
    note: "1000 points means no time penalty and no mistakes." },
  { id: "typist", name: "Touch Typist", how: "Reach 60 wpm in Typing Sprint" },
  { id: "optimal", name: "Shortest Path", how: "Solve Robot Path in the optimal number of moves" },
  { id: "scholar", name: "Scholar", how: "Reach level 9" },
];

export function badgesFor(ctx: BadgeContext): BadgeState[] {
  const rows = ctx.rows || [];
  const solved = rows.filter(r => r.score > 0);
  const distinctGames = new Set(rows.map(r => r.game));

  const perDay = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!perDay.has(r.puzzleDate)) perDay.set(r.puzzleDate, new Set());
    perDay.get(r.puzzleDate)!.add(r.game);
  }
  const bestDay = Math.max(0, ...[...perDay.values()].map(s => s.size));

  const level = levelFor(ctx.points).level.n;
  const maxScore = Math.max(0, ...rows.map(r => r.score));

  const state: Record<string, { earned: boolean; progress?: number }> = {
    first: { earned: solved.length > 0 },
    week: { earned: ctx.streak.best >= 7, progress: pct(ctx.streak.best, 7) },
    fortnight: { earned: ctx.streak.best >= 14, progress: pct(ctx.streak.best, 14) },
    allrounder: {
      earned: distinctGames.size >= ctx.totalGames,
      progress: pct(distinctGames.size, ctx.totalGames),
    },
    sweep: { earned: bestDay >= ctx.totalGames, progress: pct(bestDay, ctx.totalGames) },
    century: { earned: solved.length >= 100, progress: pct(solved.length, 100) },
    perfect: { earned: maxScore >= 1000, progress: pct(maxScore, 1000) },
    typist: {
      earned: (ctx.bestTypingWpm ?? 0) >= 60,
      progress: pct(ctx.bestTypingWpm ?? 0, 60),
    },
    optimal: { earned: (ctx.optimalRobotRuns ?? 0) > 0 },
    scholar: { earned: level >= 9, progress: pct(level, 9) },
  };

  return BADGES.map(b => ({ ...b, ...state[b.id] }));
}

function pct(have: number, need: number): number {
  if (!need) return 0;
  return Math.min(100, Math.round((Math.max(0, have) / need) * 100));
}

/* ---------------- the whole picture ---------------- */

export interface Progress {
  points: number;
  level: LevelState;
  streak: StreakState;
  badges: BadgeState[];
  solved: number;
  played: number;
  gamesTried: number;
}

export function progressFor(ctx: Omit<BadgeContext, "streak" | "points"> & { points?: number }): Progress {
  const rows = ctx.rows || [];
  const points = ctx.points ?? rows.reduce((t, r) => t + r.score, 0);
  const streak = streakFor(rows, ctx.today);

  return {
    points,
    level: levelFor(points),
    streak,
    badges: badgesFor({ ...ctx, streak, points }),
    solved: rows.filter(r => r.score > 0).length,
    played: rows.length,
    gamesTried: new Set(rows.map(r => r.game)).size,
  };
}
