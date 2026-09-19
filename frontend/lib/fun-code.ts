import { mulberry32, seedFrom, shuffled } from "@/lib/fun-core";
import {
  TYPING_SNIPPETS, JUMBLES, DEBUGS, OUTPUTS, ROBOT_LEVELS, SEMANTIC_TERMS,
  type JumblePuzzle, type DebugPuzzle, type OutputPuzzle, type RobotLevel,
} from "@/lib/fun-code-content";

/* ============================================================
   Six code games: generation and checking.

   Two rules carried over from the rest of the Fun Zone, and they
   are the reason the leaderboard means anything:

     1. DETERMINISTIC FROM THE DATE. Everyone gets the same
        puzzle on the same day, so the weekly board compares like
        with like.

     2. THE ANSWER NEVER LEAVES THE SERVER. Each `make*` function
        returns a client half with the solution stripped out. The
        client posts an attempt; a `check*` function here decides.
        That is the difference between a leaderboard and an
        honour system.

   None of these games executes code. Predict-the-Output is
   multiple choice and Robot Path is a fixed command vocabulary,
   precisely so that no student input is ever run on the server.
   A lunch-break game is not worth an arbitrary code execution
   hole.
   ============================================================ */

/* ---------------- typing sprint ---------------- */

export interface TypingClient { lang: string; text: string }

export function makeTyping(date: string): TypingClient {
  const rnd = mulberry32(seedFrom("typing:" + date));
  const s = TYPING_SNIPPETS[Math.floor(rnd() * TYPING_SNIPPETS.length)];
  return { lang: s.lang, text: s.text };
}

export interface TypingResult {
  solved: boolean;
  accuracy: number;   // 0-100
  wpm: number;
  bonus: number;
}

/**
 * Score a typing attempt.
 *
 * Accuracy is character-by-character against the target, so a single wrong
 * bracket early does not cascade into everything after it being "wrong" the
 * way a naive diff would. Speed alone is not enough: below 90% accuracy the
 * run does not count, because typing code fast and wrongly is not a skill.
 */
export function checkTyping(target: string, typed: string, durationMs: number): TypingResult {
  const t = String(typed ?? "");
  let correct = 0;
  for (let i = 0; i < target.length; i++) {
    if (t[i] === target[i]) correct++;
  }
  const accuracy = Math.round((correct / Math.max(1, target.length)) * 100);

  const minutes = Math.max(0.05, durationMs / 60_000);
  // The standard: five characters counts as one word.
  const wpm = Math.round((target.length / 5) / minutes);

  const solved = accuracy >= 90 && t.length >= target.length * 0.9;
  // Reward speed, but cap it so a suspiciously fast run cannot dominate.
  const bonus = solved ? Math.min(300, Math.max(0, (wpm - 20) * 5)) : 0;

  return { solved, accuracy, wpm, bonus };
}

/* ---------------- jumble programming ---------------- */

export interface JumbleClient {
  title: string;
  lang: string;
  /** Shuffled. The correct order is not sent. */
  lines: string[];
  hint: string;
}

export function makeJumble(date: string): { client: JumbleClient; puzzle: JumblePuzzle } {
  const rnd = mulberry32(seedFrom("jumble:" + date));
  const puzzle = JUMBLES[Math.floor(rnd() * JUMBLES.length)];

  // Reshuffle until the order actually differs - handing back the solved
  // puzzle would be a poor first impression.
  let lines = puzzle.lines;
  for (let i = 0; i < 12 && lines.join("|") === puzzle.lines.join("|"); i++) {
    lines = shuffled(puzzle.lines, rnd);
  }

  return { client: { title: puzzle.title, lang: puzzle.lang, lines, hint: puzzle.hint }, puzzle };
}

export function checkJumble(attempt: unknown, puzzle: JumblePuzzle): boolean {
  if (!Array.isArray(attempt)) return false;
  if (attempt.length !== puzzle.lines.length) return false;
  return attempt.every((l, i) => String(l) === puzzle.lines[i]);
}

/* ---------------- debug it ---------------- */

export interface DebugClient {
  title: string;
  lang: string;
  lines: string[];
  /** No buggyLine, no explanation, no fix. */
}

export function makeDebug(date: string): { client: DebugClient; puzzle: DebugPuzzle } {
  const rnd = mulberry32(seedFrom("debug:" + date));
  const puzzle = DEBUGS[Math.floor(rnd() * DEBUGS.length)];
  return {
    client: { title: puzzle.title, lang: puzzle.lang, lines: puzzle.lines },
    puzzle,
  };
}

export function checkDebug(line: unknown, puzzle: DebugPuzzle): boolean {
  return Number(line) === puzzle.buggyLine;
}

/* ---------------- predict the output ---------------- */

export interface OutputClient {
  lang: string;
  code: string;
  /** Options in a date-shuffled order. The answer index is not sent. */
  options: string[];
}

export function makeOutput(date: string): { client: OutputClient; answerIndex: number; puzzle: OutputPuzzle } {
  const rnd = mulberry32(seedFrom("output:" + date));
  const puzzle = OUTPUTS[Math.floor(rnd() * OUTPUTS.length)];

  // Shuffle the options so the answer is not always in the same position.
  const correct = puzzle.options[puzzle.answer];
  const options = shuffled(puzzle.options, rnd);
  return { client: { lang: puzzle.lang, code: puzzle.code, options }, answerIndex: options.indexOf(correct), puzzle };
}

export function checkOutput(choice: unknown, answerIndex: number): boolean {
  return Number(choice) === answerIndex;
}

/* ---------------- robot path ---------------- */

export type RobotCommand = "up" | "down" | "left" | "right";

export interface RobotClient {
  grid: string[];
  par: number;
  hint: string;
}

export function makeRobot(date: string): { client: RobotClient; level: RobotLevel } {
  const rnd = mulberry32(seedFrom("robot:" + date));
  const level = ROBOT_LEVELS[Math.floor(rnd() * ROBOT_LEVELS.length)];
  return { client: { grid: level.grid, par: level.par, hint: level.hint }, level };
}

export interface RobotRun {
  reached: boolean;
  coins: number;
  steps: number;
  /** Why it stopped, when it did not reach the goal. */
  failed: "wall" | "offgrid" | "ran-out" | null;
  /** Cells visited, so the client can animate the run it was given. */
  path: [number, number][];
}

const DELTA: Record<RobotCommand, [number, number]> = {
  up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
};

/**
 * Walk a command sequence over the grid.
 *
 * The server runs this, not the client. "I reached the goal" is a claim, and a
 * claim on a leaderboard has to be checkable.
 *
 * Hitting a wall stops the run rather than being ignored. Silently skipping an
 * illegal move would let a student spam every direction and stumble to the
 * goal, which is not the puzzle.
 */
export function runRobot(grid: string[], commands: unknown): RobotRun {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const path: [number, number][] = [];

  let r = 0, c = 0;
  for (let i = 0; i < rows; i++) {
    const j = grid[i].indexOf("S");
    if (j >= 0) { r = i; c = j; break; }
  }
  path.push([r, c]);

  const list = Array.isArray(commands) ? commands : [];
  // A cap, so a pathological sequence cannot spin the server.
  const MAX = 200;
  const collected = new Set<string>();
  let steps = 0;

  for (const raw of list.slice(0, MAX)) {
    const cmd = String(raw) as RobotCommand;
    const d = DELTA[cmd];
    if (!d) continue;                       // unknown command: ignore, do not fail

    const nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
      return { reached: false, coins: collected.size, steps, failed: "offgrid", path };
    }
    if (grid[nr][nc] === "#") {
      return { reached: false, coins: collected.size, steps, failed: "wall", path };
    }

    r = nr; c = nc; steps++;
    path.push([r, c]);
    if (grid[r][c] === "*") collected.add(`${r},${c}`);
    if (grid[r][c] === "G") {
      return { reached: true, coins: collected.size, steps, failed: null, path };
    }
  }

  return { reached: false, coins: collected.size, steps, failed: "ran-out", path };
}

/** How many moves over the optimum still earn an efficiency bonus. */
export const ROBOT_TOLERANCE = 4;

/** Per coin. Deliberately more than the full efficiency bonus of 100. */
export const COIN_VALUE = 120;

/**
 * Coins are worth more than speed; speed still counts.
 *
 * `par` is the true shortest path, so nobody can beat it — an efficiency
 * bonus of `par - steps` would always be zero. The tolerance is what makes it
 * a scale: hit the optimum and earn the full 100, drift four moves over and
 * earn nothing, and detouring for a coin is worth more than either.
 *
 * That ordering is deliberate, and it has to hold arithmetically rather than
 * just in a comment: a coin is worth 120, more than the maximum efficiency
 * bonus of 100, so detouring for one always beats the fastest clean run. The
 * first version set a coin at 80 and quietly made the coins a trap — a test
 * caught it.
 */
export function robotBonus(run: RobotRun, par: number): number {
  if (!run.reached) return 0;
  const slack = Math.max(0, (par + ROBOT_TOLERANCE) - run.steps);
  const efficiency = Math.min(ROBOT_TOLERANCE, slack) * 25;
  return Math.min(400, run.coins * COIN_VALUE + efficiency);
}

/* ---------------- semantic match ---------------- */

export interface SemanticClient {
  /** The terms to clear, in order. Accepted words are not sent. */
  terms: { term: string; subject: string }[];
}

export function makeSemantic(date: string, count = 5): { client: SemanticClient; picked: typeof SEMANTIC_TERMS } {
  const rnd = mulberry32(seedFrom("semantic:" + date));
  const picked = shuffled(SEMANTIC_TERMS, rnd).slice(0, count);
  return {
    client: { terms: picked.map(t => ({ term: t.term, subject: t.subject })) },
    picked,
  };
}

/**
 * Does this word clear this term?
 *
 * Substring matching in both directions, so "circular wait" clears a term that
 * accepts "circular", and typing "b-tree" clears one that accepts "btree".
 * Generous on purpose: this tests whether a student knows the association, not
 * whether they guessed the exact word in a list.
 */
export function checkSemantic(guess: string, accepts: string[]): boolean {
  const g = String(guess || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (g.length < 2) return false;
  return accepts.some(a => {
    const t = a.toLowerCase().replace(/[^a-z0-9]/g, "");
    return t === g || (g.length >= 4 && (t.includes(g) || g.includes(t)));
  });
}

/** Clearing more terms is worth more; clearing all of them is worth most. */
export function semanticBonus(cleared: number, total: number): number {
  if (cleared <= 0) return 0;
  const base = Math.round((cleared / Math.max(1, total)) * 350);
  return cleared >= total ? base + 150 : base;
}
