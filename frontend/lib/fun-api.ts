import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession, notifyUser } from "@/lib/server-auth";
import { can, normaliseRole } from "@/lib/policy";
import {
  budgetState, chargeFor, dateKey, weekKey, makeGrid, makeScramble, makeSequence,
  checkGrid, scoreRun, plausible, GAMES, DAILY_BUDGET_MINUTES, type GameId,
} from "@/lib/fun-core";
import {
  targetFor, hintFor, judgeGuess, scoreLadder, MAX_GUESSES,
} from "@/lib/fun-ladder";
import { memeOfTheDay, quizFor, quizScore } from "@/lib/fun-memes";
import {
  makeTyping, checkTyping, makeJumble, checkJumble, makeDebug, checkDebug,
  makeOutput, checkOutput, makeRobot, runRobot, robotBonus,
  makeSemantic, checkSemantic, semanticBonus,
} from "@/lib/fun-code";

/* Fun Zone endpoints.

   Two rules the server enforces rather than trusting the client with:

   1. The daily budget. Thirty minutes a day across every game. Once it is
      spent the puzzle endpoint returns 423 and no puzzle, so keeping the tab
      open achieves nothing. The Fun Zone itself is open all day - the limit is
      how long you play, not when.
   2. The solution. No answer ever leaves the server. The client posts its
      attempt and the server decides, which is the difference between a
      leaderboard and an honour system. */

/** Minutes this user has spent today, charged per recorded play. */
async function minutesUsedToday(userId: string, today: string): Promise<number> {
  const plays = await prisma.gameScore.findMany({
    where: { userId, puzzleDate: today },
    select: { durationMs: true },
  });
  return plays.reduce((total, p) => total + chargeFor(p.durationMs), 0);
}

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/fun\/?/, "").split("/").filter(Boolean);
}

const VALID: GameId[] = [
  "grid", "scramble", "sequence", "ladder", "culture",
  "typing", "jumble", "debug", "output", "robot", "semantic",
];

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "fun.play")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const now = new Date();
  const today = dateKey(now);

  if (p[0] === "status") {
    const playedToday = await prisma.gameScore.findMany({
      where: { userId: s.userId, puzzleDate: today },
      select: { game: true, score: true, durationMs: true },
    });
    const minutesUsed = playedToday.reduce((a, r) => a + chargeFor(r.durationMs), 0);
    const budget = budgetState(minutesUsed, now);

    return json({
      window: budget,          // the client reads `window.open` and `window.label`
      budget,
      games: GAMES,
      today,
      playedToday: playedToday.map(r => r.game),
      minutesUsed,
      budgetMinutes: DAILY_BUDGET_MINUTES,
      budgetLeft: budget.leftMinutes,
    });
  }

  /* ---- fetch today's puzzle ---- */
  if (p[0] === "puzzle") {
    const budget = budgetState(await minutesUsedToday(s.userId, today), now);
    if (!budget.open) {
      return json({
        error: "You have used today's 30 minutes. It resets at midnight.",
        closed: true, window: budget, budget,
      }, 423);
    }

    const game = String(new URL(req.url).searchParams.get("game") || "") as GameId;
    if (!VALID.includes(game)) return json({ error: "Unknown game" }, 400);

    const already = await prisma.gameScore.findFirst({
      where: { userId: s.userId, game, puzzleDate: today },
      select: { score: true },
    });

    if (game === "grid") {
      const { given, blanks } = makeGrid(today);
      // The solution is deliberately withheld - the server checks the attempt.
      return json({ game, date: today, puzzle: { given, blanks }, alreadyPlayed: already?.score ?? null });
    }
    if (game === "scramble") {
      const { scrambled, hint } = makeScramble(today);
      return json({ game, date: today, puzzle: { scrambled, hint }, alreadyPlayed: already?.score ?? null });
    }
    if (game === "ladder") {
      // The target word never leaves the server. Guesses are judged here.
      return json({
        game, date: today,
        puzzle: { hint: hintFor(today), maxGuesses: MAX_GUESSES, vocabSize: judgeGuess(targetFor(today).word, targetFor(today).word).total },
        alreadyPlayed: already?.score ?? null,
      });
    }
    if (game === "culture") {
      const entry = memeOfTheDay(today);
      const quiz = quizFor(today);
      // Answers withheld - only the questions and options are sent.
      return json({
        game, date: today,
        puzzle: {
          entry,
          quiz: quiz.map(q => ({ question: q.question, options: q.options })),
        },
        alreadyPlayed: already?.score ?? null,
      });
    }
    /* ---- code games ----
       Each returns the client half only. Solutions, buggy line numbers,
       answer indices and accepted words all stay on this side. */
    if (game === "typing") {
      return json({ game, date: today, puzzle: makeTyping(today), alreadyPlayed: already?.score ?? null });
    }
    if (game === "jumble") {
      return json({ game, date: today, puzzle: makeJumble(today).client, alreadyPlayed: already?.score ?? null });
    }
    if (game === "debug") {
      return json({ game, date: today, puzzle: makeDebug(today).client, alreadyPlayed: already?.score ?? null });
    }
    if (game === "output") {
      return json({ game, date: today, puzzle: makeOutput(today).client, alreadyPlayed: already?.score ?? null });
    }
    if (game === "robot") {
      return json({ game, date: today, puzzle: makeRobot(today).client, alreadyPlayed: already?.score ?? null });
    }
    if (game === "semantic") {
      return json({ game, date: today, puzzle: makeSemantic(today).client, alreadyPlayed: already?.score ?? null });
    }

    return json({
      game, date: today,
      puzzle: { sequence: makeSequence(today) },
      alreadyPlayed: already?.score ?? null,
    });
  }

  /* ---- leaderboard ---- */
  if (p[0] === "leaderboard") {
    const q = new URL(req.url).searchParams;
    const game = q.get("game");
    const wk = q.get("week") || weekKey(now);

    const where: any = { weekKey: wk };
    if (game && VALID.includes(game as GameId)) where.game = game;

    const rows = await prisma.gameScore.findMany({
      where,
      select: { userId: true, userName: true, userRole: true, game: true, score: true },
    });

    const byUser = new Map<string, { name: string; role: string; total: number; plays: number }>();
    for (const r of rows) {
      const e = byUser.get(r.userId) || { name: r.userName, role: r.userRole, total: 0, plays: 0 };
      e.total += r.score; e.plays += 1;
      byUser.set(r.userId, e);
    }

    const board = [...byUser.entries()]
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .map((r, i) => ({ rank: i + 1, ...r, isYou: r.userId === s.userId }));

    return json({ week: wk, game: game || "all", board, players: byUser.size });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "fun.play")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const b = await req.json().catch(() => ({}));
  const now = new Date();
  const today = dateKey(now);
  const budget = budgetState(await minutesUsedToday(s.userId, today), now);

  /* ---- judge one Concept Ladder guess (no score recorded here) ---- */
  if (p[0] === "guess") {
    if (!budget.open) {
      return json({ error: "You have used today's 30 minutes.", closed: true, budget }, 423);
    }
    const guess = String(b.guess || "").trim();
    if (!guess) return json({ error: "A guess is required" }, 400);
    return json(judgeGuess(targetFor(today).word, guess));
  }

  if (p[0] !== "submit") return json({ error: "Not found" }, 404);

  if (!budget.open) {
    return json({
      error: "You have used today's 30 minutes, so scores are not accepted.",
      closed: true, budget,
    }, 423);
  }

  const game = String(b.game || "") as GameId;
  if (!VALID.includes(game)) return json({ error: "Unknown game" }, 400);

  const durationMs = Number(b.durationMs) || 0;
  const mistakes = Math.max(0, Number(b.mistakes) || 0);

  /* ---- the server decides whether it was solved ---- */
  let solved = false;
  let bonus = 0;

  if (game === "grid") {
    solved = checkGrid(b.attempt, makeGrid(today).solution);
  } else if (game === "scramble") {
    solved = String(b.answer || "").trim().toUpperCase() === makeScramble(today).answer;
  } else if (game === "ladder") {
    const target = targetFor(today);
    solved = String(b.answer || "").trim().toLowerCase() === target.word;
    const guesses = Math.max(1, Math.min(MAX_GUESSES, Number(b.guesses) || 1));
    if (solved) bonus = scoreLadder(guesses) - 1000;   // scoreRun starts from 1000
  } else if (game === "culture") {
    const quiz = quizFor(today);
    const answers: number[] = Array.isArray(b.answers) ? b.answers : [];
    const correct = quiz.reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0);
    solved = correct > 0;
    bonus = quizScore(correct, quiz.length) - 500;
  } else {
    const seq = makeSequence(today);
    const got: number[] = Array.isArray(b.recalled) ? b.recalled : [];
    // Score by how far they got; full recall earns the bonus.
    const reached = got.findIndex((v, i) => v !== seq[i]);
    const correct = reached === -1 ? got.length : reached;
    solved = correct >= 4;
    bonus = correct >= seq.length ? 200 : correct * 20;
  }

  /* ---- code games: the server decides, every time ---- */
  let detail: any = null;

  if (game === "typing") {
    const r = checkTyping(makeTyping(today).text, String(b.typed || ""), durationMs);
    solved = r.solved; bonus = r.bonus;
    detail = { accuracy: r.accuracy, wpm: r.wpm };
  } else if (game === "jumble") {
    solved = checkJumble(b.order, makeJumble(today).puzzle);
  } else if (game === "debug") {
    const { puzzle } = makeDebug(today);
    solved = checkDebug(b.line, puzzle);
    // The explanation is only returned once the answer has been given, so it
    // cannot be read out of the puzzle response.
    detail = { buggyLine: puzzle.buggyLine, explanation: puzzle.explanation, fixed: puzzle.fixed };
  } else if (game === "output") {
    const { answerIndex, puzzle } = makeOutput(today);
    solved = checkOutput(b.choice, answerIndex);
    detail = { answerIndex, explanation: puzzle.explanation };
  } else if (game === "robot") {
    const { level } = makeRobot(today);
    const run = runRobot(level.grid, b.commands);
    solved = run.reached;
    bonus = robotBonus(run, level.par);
    detail = { steps: run.steps, coins: run.coins, par: level.par, failed: run.failed, path: run.path };
  } else if (game === "semantic") {
    const { picked } = makeSemantic(today);
    const guesses: string[] = Array.isArray(b.guesses) ? b.guesses : [];
    // One guess per term, in order.
    const cleared = picked.reduce(
      (n, t, i) => n + (checkSemantic(guesses[i] ?? "", t.accepts) ? 1 : 0), 0,
    );
    solved = cleared > 0;
    bonus = semanticBonus(cleared, picked.length);
    detail = {
      cleared, total: picked.length,
      // Shown only after submitting, so the answers are not in the puzzle.
      answers: picked.map(t => ({ term: t.term, accepts: t.accepts.slice(0, 4) })),
    };
  }

  if (!solved) {
    return json({ ok: true, solved: false, score: 0, detail, message: "Not solved - no score recorded." });
  }

  const score = scoreRun({ solved, durationMs, mistakes, bonus });
  if (!plausible(score, durationMs)) {
    return json({ error: "That result could not be verified." }, 422);
  }

  const wk = weekKey(now);
  const name = s.fullName || s.loginId;

  try {
    await prisma.gameScore.create({
      data: {
        userId: s.userId, userName: name, userRole: normaliseRole(s.role),
        game, puzzleDate: today, score, durationMs, moves: mistakes, weekKey: wk,
      },
    });
  } catch {
    // The unique constraint means one scoring run per puzzle per day.
    return json({
      ok: true, solved: true, score, detail, alreadyRecorded: true,
      message: "Solved - but today's score for this game was already recorded.",
    });
  }

  /* ---- notify if this is the new weekly leader ---- */
  const rows = await prisma.gameScore.findMany({
    where: { weekKey: wk },
    select: { userId: true, userName: true, score: true },
  });
  const totals = new Map<string, { name: string; total: number }>();
  for (const r of rows) {
    const e = totals.get(r.userId) || { name: r.userName, total: 0 };
    e.total += r.score;
    totals.set(r.userId, e);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1].total - a[1].total);
  const leaderIsYou = ranked.length > 0 && ranked[0][0] === s.userId;

  if (leaderIsYou && ranked.length > 1) {
    // Tell the player they took the lead, and tell whoever they overtook.
    await notifyUser(s.userId, "You lead the weekly board",
      `${name} is top of the Fun Zone leaderboard for ${wk} with ${ranked[0][1].total} points.`);
    const runnerUp = ranked[1];
    await notifyUser(runnerUp[0], "You have been overtaken",
      `${name} has moved ahead of you on the Fun Zone leaderboard for ${wk}.`);
  }

  return json({
    ok: true, solved: true, score, detail,
    weeklyTotal: totals.get(s.userId)?.total ?? score,
    rank: ranked.findIndex(r => r[0] === s.userId) + 1,
    players: ranked.length,
    leader: leaderIsYou,
  });
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Scores cannot be deleted" }, 405); }
