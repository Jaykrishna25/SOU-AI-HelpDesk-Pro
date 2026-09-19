/* ============================================================
   Fun Zone core logic.

   Pure functions: no Prisma, no network, no Date.now() unless it
   is passed in. Puzzles are generated deterministically from the
   date, so every student gets the same puzzle on the same day and
   a leaderboard actually compares like with like - which is the
   whole point of a daily puzzle.

   The access window is here too, because "is it open" is a rule,
   not a query, and a rule should be testable.
   ============================================================ */

export type GameId =
  | "grid" | "scramble" | "sequence" | "ladder" | "culture"
  // code games, see lib/fun-code.ts
  | "typing" | "jumble" | "debug" | "output" | "robot" | "semantic";

export const GAMES: { id: GameId; name: string; blurb: string }[] = [
  { id: "grid", name: "Mini Grid", blurb: "Fill the 4x4 so no number repeats in a row, column or box." },
  { id: "scramble", name: "Word Scramble", blurb: "Unscramble the word. Fewer guesses scores higher." },
  { id: "sequence", name: "Sequence Recall", blurb: "Watch the pattern, repeat it back. It gets longer." },
  { id: "ladder", name: "Concept Ladder", blurb: "Guess the hidden subject term. Every guess shows you how close and why." },
  { id: "culture", name: "Meme Desk", blurb: "Meme of the day - where it came from, what it means, then three questions." },

  /* Code games. Subject-relevant on purpose: the argument that got the Fun
     Zone approved was that a break can still be practice. */
  { id: "typing", name: "Typing Sprint", blurb: "Type a code snippet accurately. Brackets are the hard part." },
  { id: "jumble", name: "Jumble Programming", blurb: "Shuffled lines of a real function. Put them back in order." },
  { id: "debug", name: "Debug It", blurb: "One block, one bug. Find the line." },
  { id: "output", name: "Predict the Output", blurb: "Read the code. Say what it prints. Some of these are traps." },
  { id: "robot", name: "Robot Path", blurb: "Sequence commands to reach the goal. Coins are optional." },
  { id: "semantic", name: "Semantic Match", blurb: "Clear each term by typing a word that belongs with it." },
];

/* ---------------- access window ---------------- */

/**
 * The Fun Zone opens twice a day rather than all day.
 *
 * This is deliberate. A campus portal that offers unlimited games during
 * lecture hours is a portal that gets blocked by the institution. Two windows -
 * lunch and evening - make it a break rather than a distraction, and make the
 * institution's answer "yes" instead of "no".
 */
export interface Window { startHour: number; endHour: number; label: string }

export const WINDOWS: Window[] = [
  { startHour: 12, endHour: 14, label: "Lunch break" },
  { startHour: 17, endHour: 20, label: "Evening" },
];

/** Minutes of play allowed per day, across all games. */
export const DAILY_BUDGET_MINUTES = 30;

export interface WindowState {
  open: boolean;
  label: string;
  /** Minutes until it opens (when closed) or closes (when open). */
  minutes: number;
  windows: string[];
}

function hhmm(h: number): string {
  return String(h).padStart(2, "0") + ":00";
}

export function windowState(now: Date = new Date()): WindowState {
  const h = now.getHours();
  const m = now.getMinutes();
  const labels = WINDOWS.map(w => `${hhmm(w.startHour)}-${hhmm(w.endHour)}`);

  for (const w of WINDOWS) {
    if (h >= w.startHour && h < w.endHour) {
      return {
        open: true,
        label: w.label,
        minutes: (w.endHour - h) * 60 - m,
        windows: labels,
      };
    }
  }

  // Closed: find the next opening, today or tomorrow.
  const upcoming = WINDOWS.filter(w => w.startHour > h).sort((a, b) => a.startHour - b.startHour)[0];
  if (upcoming) {
    return {
      open: false,
      label: "Opens " + hhmm(upcoming.startHour),
      minutes: (upcoming.startHour - h) * 60 - m,
      windows: labels,
    };
  }
  const first = WINDOWS[0];
  return {
    open: false,
    label: "Opens tomorrow " + hhmm(first.startHour),
    minutes: (24 - h + first.startHour) * 60 - m,
    windows: labels,
  };
}

/* ---------------- date and week keys ---------------- */

export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO-style week key, so a weekly board is a single indexed lookup. */
export function weekKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/* ---------------- deterministic randomness ---------------- */

/** Small, fast, seeded PRNG. Same seed, same puzzle, everywhere. */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- game 1: mini grid ---------------- */

export interface GridPuzzle {
  /** 4x4, 0 means empty. */
  given: number[][];
  solution: number[][];
  blanks: number;
}

/** A valid 4x4 Latin-square-with-boxes, permuted deterministically. */
export function makeGrid(date: string): GridPuzzle {
  const rnd = mulberry32(seedFrom("grid:" + date));

  const base = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  // Permuting symbols keeps every constraint intact.
  const symbols = shuffled([1, 2, 3, 4], rnd);
  let solution = base.map(row => row.map(v => symbols[v - 1]));

  // Swapping the two rows inside a band, or two columns inside a stack,
  // also preserves validity.
  if (rnd() > 0.5) solution = [solution[1], solution[0], solution[2], solution[3]];
  if (rnd() > 0.5) solution = [solution[0], solution[1], solution[3], solution[2]];
  if (rnd() > 0.5) solution = solution.map(r => [r[1], r[0], r[2], r[3]]);
  if (rnd() > 0.5) solution = solution.map(r => [r[0], r[1], r[3], r[2]]);

  // Blank out 6 cells - enough to be a puzzle, few enough to stay quick.
  const cells = shuffled([...Array(16).keys()], rnd).slice(0, 6);
  const given = solution.map(r => [...r]);
  for (const c of cells) given[Math.floor(c / 4)][c % 4] = 0;

  return { given, solution, blanks: cells.length };
}

export function checkGrid(attempt: number[][], solution: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (attempt?.[r]?.[c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/* ---------------- game 2: word scramble ---------------- */

const WORDS = [
  "ALGORITHM", "DATABASE", "NETWORK", "COMPILER", "VARIABLE", "FUNCTION",
  "RECURSION", "POINTER", "BOOLEAN", "INTEGER", "SYNTAX", "BINARY",
  "ENCRYPT", "PROTOCOL", "KERNEL", "THREAD", "CACHE", "SCHEMA",
  "GRADIENT", "TENSOR", "CLUSTER", "LATENCY", "PACKET", "ROUTER",
  "LIBRARY", "CAMPUS", "LECTURE", "SEMESTER", "DIPLOMA", "FACULTY",
];

export interface ScramblePuzzle {
  scrambled: string;
  answer: string;
  hint: string;
}

export function makeScramble(date: string): ScramblePuzzle {
  const rnd = mulberry32(seedFrom("scramble:" + date));
  const answer = WORDS[Math.floor(rnd() * WORDS.length)];

  let scrambled = answer;
  // Reshuffle until it actually looks different.
  for (let i = 0; i < 12 && scrambled === answer; i++) {
    scrambled = shuffled(answer.split(""), rnd).join("");
  }

  return {
    scrambled,
    answer,
    hint: `${answer.length} letters, starts with "${answer[0]}"`,
  };
}

/* ---------------- game 3: sequence recall ---------------- */

export function makeSequence(date: string, length = 8): number[] {
  const rnd = mulberry32(seedFrom("sequence:" + date));
  return Array.from({ length }, () => Math.floor(rnd() * 4));
}

/* ---------------- scoring ---------------- */

/**
 * One scale for every game, so the overall board is not nonsense.
 *
 * Base 1000, reduced by time taken and by mistakes. Floors at 100 so a slow
 * finish still beats not finishing - the board should reward completing the
 * puzzle, not only speed.
 */
export function scoreRun(opts: {
  solved: boolean;
  durationMs: number;
  mistakes: number;
  bonus?: number;
}): number {
  if (!opts.solved) return 0;
  const seconds = Math.max(1, Math.round(opts.durationMs / 1000));
  const timePenalty = Math.min(600, seconds * 4);
  const mistakePenalty = Math.min(300, opts.mistakes * 60);
  return Math.max(100, Math.round(1000 - timePenalty - mistakePenalty + (opts.bonus || 0)));
}

/** Guard against a client posting an impossible score. */
export const MAX_SCORE = 1000;

export function plausible(score: number, durationMs: number): boolean {
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return false;
  if (!Number.isFinite(durationMs) || durationMs < 500 || durationMs > 30 * 60_000) return false;
  return true;
}
