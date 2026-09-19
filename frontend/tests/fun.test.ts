import { describe, it, expect } from "vitest";
import {
  budgetState, chargeFor, DAILY_BUDGET_MINUTES, MIN_CHARGE_MINUTES, MAX_CHARGE_MINUTES,
  dateKey, weekKey, makeGrid, checkGrid,
  makeScramble, makeSequence, scoreRun, plausible, MAX_SCORE,
} from "@/lib/fun-core";
import { targetFor, judgeGuess, rankingFor, scoreLadder } from "@/lib/fun-ladder";
import { memeOfTheDay, quizFor, quizScore } from "@/lib/fun-memes";
import { VOCAB } from "@/lib/fun-vocab";

/* These cover the rules the Fun Zone depends on being right: the daily budget,
   whether a generated grid is actually solvable, and whether a score can be
   forged. All pure - no database, no network. */

const at = (h: number, m = 0) => new Date(2026, 8, 18, h, m);

describe("the daily budget", () => {
  /* The Fun Zone used to be gated by two fixed time windows. That was the wrong
     instrument: a window says "not now", which is a rule about the timetable and
     invites "my lecture was cancelled". A budget says "enough for today", which
     is what anyone worried about this feature was actually worried about. */

  it("is open all day while the allowance lasts", () => {
    for (const h of [0, 9, 12, 15, 18, 23]) {
      expect(budgetState(0, at(h, 30)).open).toBe(true);
    }
  });

  it("closes once the allowance is spent, at any hour", () => {
    for (const h of [0, 9, 12, 15, 18, 23]) {
      expect(budgetState(DAILY_BUDGET_MINUTES, at(h, 30)).open).toBe(false);
    }
  });

  it("closes on the boundary rather than one minute late", () => {
    expect(budgetState(DAILY_BUDGET_MINUTES - 1, at(12)).open).toBe(true);
    expect(budgetState(DAILY_BUDGET_MINUTES, at(12)).open).toBe(false);
    expect(budgetState(DAILY_BUDGET_MINUTES + 50, at(12)).open).toBe(false);
  });

  it("never reports negative minutes left", () => {
    expect(budgetState(999, at(12)).leftMinutes).toBe(0);
    expect(budgetState(-5, at(12)).usedMinutes).toBe(0);
  });

  it("counts down to midnight, never negative", () => {
    for (let h = 0; h < 24; h++) {
      const r = budgetState(0, at(h, 30)).resetsInMinutes;
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(24 * 60);
    }
  });

  it("says how much is left, or that it is gone", () => {
    expect(budgetState(10, at(12)).label).toContain("20 minutes left");
    expect(budgetState(29, at(12)).label).toContain("1 minute left");
    expect(budgetState(30, at(12)).label).toMatch(/used today/i);
  });
});

describe("what a play costs against the budget", () => {
  it("charges a minimum however short the client claims it was", () => {
    /* Duration is reported by the client. Without a floor, a player could claim
       every puzzle took zero seconds and never spend anything. */
    expect(chargeFor(0)).toBe(MIN_CHARGE_MINUTES);
    expect(chargeFor(1_000)).toBe(MIN_CHARGE_MINUTES);
    expect(chargeFor(-50_000)).toBe(MIN_CHARGE_MINUTES);
  });

  it("caps a single play, so a forgotten tab cannot burn the day", () => {
    expect(chargeFor(60 * 60_000)).toBe(MAX_CHARGE_MINUTES);
    expect(chargeFor(Number.MAX_SAFE_INTEGER)).toBe(MAX_CHARGE_MINUTES);
  });

  it("charges the real duration in between", () => {
    expect(chargeFor(5 * 60_000)).toBe(5);
    expect(chargeFor(3.4 * 60_000)).toBe(3);
  });

  it("survives junk input rather than returning NaN", () => {
    expect(chargeFor(NaN)).toBe(MIN_CHARGE_MINUTES);
    expect(chargeFor(undefined as any)).toBe(MIN_CHARGE_MINUTES);
  });

  it("allows a sensible number of plays per day", () => {
    // Between four long games and fifteen quick ones.
    expect(Math.floor(DAILY_BUDGET_MINUTES / MAX_CHARGE_MINUTES)).toBeGreaterThanOrEqual(3);
    expect(Math.floor(DAILY_BUDGET_MINUTES / MIN_CHARGE_MINUTES)).toBeLessThanOrEqual(20);
  });
});

describe("date and week keys", () => {
  it("formats a date key", () => {
    expect(dateKey(new Date(Date.UTC(2026, 8, 18)))).toBe("2026-09-18");
  });

  it("gives the same week key to days in the same week", () => {
    const mon = new Date(Date.UTC(2026, 8, 14));
    const fri = new Date(Date.UTC(2026, 8, 18));
    expect(weekKey(mon)).toBe(weekKey(fri));
  });

  it("changes week key across a week boundary", () => {
    const sun = new Date(Date.UTC(2026, 8, 13));
    const mon = new Date(Date.UTC(2026, 8, 14));
    expect(weekKey(sun)).not.toBe(weekKey(mon));
  });
});

describe("mini grid", () => {
  it("generates the same puzzle for the same date", () => {
    expect(makeGrid("2026-09-18").given).toEqual(makeGrid("2026-09-18").given);
  });

  it("generates a solution that satisfies every constraint", () => {
    // If this fails the puzzle is unsolvable and nobody can score.
    for (const date of ["2026-09-18", "2026-01-01", "2026-12-31", "2027-06-15"]) {
      const { solution } = makeGrid(date);
      for (let i = 0; i < 4; i++) {
        expect(new Set(solution[i]).size).toBe(4);
        expect(new Set(solution.map(r => r[i])).size).toBe(4);
      }
      for (const [r, c] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
        const box = [solution[r][c], solution[r][c + 1], solution[r + 1][c], solution[r + 1][c + 1]];
        expect(new Set(box).size).toBe(4);
      }
    }
  });

  it("blanks exactly six cells and leaves the rest correct", () => {
    const { given, solution, blanks } = makeGrid("2026-09-18");
    expect(blanks).toBe(6);
    let empty = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (given[r][c] === 0) empty++;
        else expect(given[r][c]).toBe(solution[r][c]);
      }
    }
    expect(empty).toBe(6);
  });

  it("accepts the solution and rejects anything else", () => {
    const { solution } = makeGrid("2026-09-18");
    expect(checkGrid(solution, solution)).toBe(true);

    const wrong = solution.map(r => [...r]);
    wrong[0][0] = (wrong[0][0] % 4) + 1;
    expect(checkGrid(wrong, solution)).toBe(false);
    expect(checkGrid([], solution)).toBe(false);
  });
});

describe("scramble and sequence", () => {
  it("scrambles into something different from the answer", () => {
    for (const date of ["2026-09-18", "2026-03-04", "2026-07-22"]) {
      const p = makeScramble(date);
      expect(p.scrambled).not.toBe(p.answer);
      expect([...p.scrambled].sort()).toEqual([...p.answer].sort());
    }
  });

  it("gives everyone the same sequence on a given day", () => {
    expect(makeSequence("2026-09-18")).toEqual(makeSequence("2026-09-18"));
    expect(makeSequence("2026-09-18").every(n => n >= 0 && n < 4)).toBe(true);
  });
});

describe("scoring", () => {
  it("scores zero when not solved", () => {
    expect(scoreRun({ solved: false, durationMs: 1000, mistakes: 0 })).toBe(0);
  });

  it("rewards speed but never drops below the floor", () => {
    const fast = scoreRun({ solved: true, durationMs: 5_000, mistakes: 0 });
    const slow = scoreRun({ solved: true, durationMs: 600_000, mistakes: 9 });
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThanOrEqual(100);
  });

  it("never exceeds the maximum", () => {
    expect(scoreRun({ solved: true, durationMs: 1000, mistakes: 0 })).toBeLessThanOrEqual(MAX_SCORE);
  });

  it("rejects a forged score or an impossible duration", () => {
    expect(plausible(99999, 10_000)).toBe(false);
    expect(plausible(500, 10)).toBe(false);          // solved in 10ms
    expect(plausible(500, 60 * 60_000)).toBe(false); // an hour on one puzzle
    expect(plausible(500, 20_000)).toBe(true);
  });
});

describe("concept ladder", () => {
  it("picks the same target for everyone on a given day", () => {
    expect(targetFor("2026-09-18").word).toBe(targetFor("2026-09-18").word);
  });

  it("ranks the target first against itself", () => {
    const t = targetFor("2026-09-18").word;
    expect(rankingFor(t)[0]).toBe(t);
    expect(judgeGuess(t, t).band).toBe("answer");
    expect(judgeGuess(t, t).rank).toBe(1);
  });

  it("ranks every vocabulary term exactly once", () => {
    const ranked = rankingFor(targetFor("2026-09-18").word);
    expect(ranked.length).toBe(VOCAB.length);
    expect(new Set(ranked).size).toBe(VOCAB.length);
  });

  it("puts a related term nearer than an unrelated one", () => {
    // The whole game depends on this being true.
    const near = judgeGuess("index", "b-tree").rank!;
    const far = judgeGuess("index", "probability").rank!;
    expect(near).toBeLessThan(far);
  });

  it("returns a definition for a known guess, so a wrong guess still teaches", () => {
    const g = judgeGuess("index", "b-tree");
    expect(g.known).toBe(true);
    expect(g.definition).toBeTruthy();
    expect(g.subject).toBeTruthy();
  });

  it("marks an unknown word as unknown rather than guessing at it", () => {
    const g = judgeGuess("index", "banana");
    expect(g.known).toBe(false);
    expect(g.rank).toBeNull();
    expect(g.band).toBe("unknown");
  });

  it("scores fewer guesses higher, with a floor", () => {
    expect(scoreLadder(1)).toBeGreaterThan(scoreLadder(10));
    expect(scoreLadder(100)).toBeGreaterThanOrEqual(100);
  });
});

describe("meme desk", () => {
  it("picks the same entry for everyone on a given day", () => {
    expect(memeOfTheDay("2026-09-18").name).toBe(memeOfTheDay("2026-09-18").name);
  });

  it("builds three questions whose answer is among the options", () => {
    const quiz = quizFor("2026-09-18");
    expect(quiz).toHaveLength(3);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.options[q.answerIndex]).toBeTruthy();
      expect(new Set(q.options).size).toBe(4);   // no duplicate options
    }
  });

  it("scores a full set higher than a partial one", () => {
    expect(quizScore(3, 3)).toBeGreaterThan(quizScore(2, 3));
    expect(quizScore(0, 3)).toBe(0);
  });
});
