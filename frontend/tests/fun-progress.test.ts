import { describe, it, expect } from "vitest";
import {
  levelFor, streakFor, badgesFor, progressFor, LEVELS, BADGES,
  type PlayRow,
} from "@/lib/fun-progress";

const row = (puzzleDate: string, over: Partial<PlayRow> = {}): PlayRow => ({
  puzzleDate, game: "grid", score: 500, durationMs: 120_000, ...over,
});

/* Progression is derived from GameScore rows rather than stored, so these
   tests are the only thing standing between a wrong curve and a student
   seeing a level they did not earn. */

describe("levels", () => {
  it("starts everyone at level 1", () => {
    expect(levelFor(0).level.n).toBe(1);
    expect(levelFor(0).level.title).toBe("Fresher");
  });

  it("advances on the threshold, not one point after", () => {
    for (const l of LEVELS.slice(1)) {
      expect(levelFor(l.at).level.n).toBe(l.n);
      expect(levelFor(l.at - 1).level.n).toBe(l.n - 1);
    }
  });

  it("caps at the top level rather than overflowing", () => {
    const top = LEVELS[LEVELS.length - 1];
    const s = levelFor(top.at * 10);
    expect(s.level.n).toBe(top.n);
    expect(s.next).toBeNull();
    expect(s.span).toBeNull();
    expect(s.percent).toBe(100);
  });

  it("reports progress through the current level", () => {
    const s = levelFor(800 + (2_500 - 800) / 2);   // halfway from 2 to 3
    expect(s.level.n).toBe(2);
    expect(s.percent).toBeGreaterThan(45);
    expect(s.percent).toBeLessThan(55);
  });

  it("the curve only ever goes up", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].at).toBeGreaterThan(LEVELS[i - 1].at);
    }
  });

  it("gets harder, never easier, to gain a level", () => {
    // A curve that flattens late makes the last levels meaningless.
    const gaps = LEVELS.slice(1).map((l, i) => l.at - LEVELS[i].at);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    }
  });

  it("handles junk input without returning NaN", () => {
    expect(levelFor(-500).level.n).toBe(1);
    expect(levelFor(NaN as any).points).toBe(0);
    expect(levelFor(undefined as any).level.n).toBe(1);
  });
});

describe("streaks", () => {
  it("counts consecutive days", () => {
    const rows = ["2026-09-15", "2026-09-16", "2026-09-17"].map(d => row(d));
    expect(streakFor(rows, "2026-09-17").current).toBe(3);
  });

  it("does not count the same day twice", () => {
    // Three games on one day is one day of streak, not three.
    const rows = [row("2026-09-17"), row("2026-09-17", { game: "debug" }), row("2026-09-17", { game: "robot" })];
    expect(streakFor(rows, "2026-09-17").current).toBe(1);
  });

  it("survives one missed day, and breaks on two", () => {
    /* The grace day is the point. A student who played for a fortnight and
       then sat an exam should not lose it at one minute past midnight. */
    const rows = ["2026-09-15", "2026-09-16"].map(d => row(d));
    expect(streakFor(rows, "2026-09-17").current).toBe(2);    // yesterday
    expect(streakFor(rows, "2026-09-17").atRisk).toBe(true);
    expect(streakFor(rows, "2026-09-18").current).toBe(0);    // two days gone
  });

  it("knows whether today already counts", () => {
    const rows = [row("2026-09-17")];
    expect(streakFor(rows, "2026-09-17").playedToday).toBe(true);
    expect(streakFor(rows, "2026-09-17").atRisk).toBe(false);
    expect(streakFor(rows, "2026-09-18").playedToday).toBe(false);
  });

  it("remembers the best run even after the current one breaks", () => {
    const rows = [
      ...["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"].map(d => row(d)),
      row("2026-09-17"),
    ];
    const s = streakFor(rows, "2026-09-17");
    expect(s.current).toBe(1);
    expect(s.best).toBe(5);
  });

  it("crosses a month boundary correctly", () => {
    const rows = ["2026-08-30", "2026-08-31", "2026-09-01"].map(d => row(d));
    expect(streakFor(rows, "2026-09-01").current).toBe(3);
  });

  it("handles no history at all", () => {
    const s = streakFor([], "2026-09-17");
    expect(s).toEqual({ current: 0, best: 0, atRisk: false, playedToday: false });
  });
});

describe("badges", () => {
  const ctx = (rows: PlayRow[], extra: any = {}) => ({
    rows, today: "2026-09-17", totalGames: 11, ...extra,
  });

  it("awards the first one on any score", () => {
    const b = progressFor(ctx([row("2026-09-17")])).badges;
    expect(b.find(x => x.id === "first")!.earned).toBe(true);
  });

  it("does not award it for an unsolved attempt", () => {
    const b = progressFor(ctx([row("2026-09-17", { score: 0 })])).badges;
    expect(b.find(x => x.id === "first")!.earned).toBe(false);
  });

  it("awards all-rounder only when every game has been tried", () => {
    const ten = Array.from({ length: 10 }, (_, i) => row("2026-09-17", { game: "g" + i }));
    let b = progressFor(ctx(ten)).badges;
    expect(b.find(x => x.id === "allrounder")!.earned).toBe(false);
    expect(b.find(x => x.id === "allrounder")!.progress).toBe(91);

    b = progressFor(ctx([...ten, row("2026-09-17", { game: "g10" })])).badges;
    expect(b.find(x => x.id === "allrounder")!.earned).toBe(true);
  });

  it("separates the sweep from the all-rounder", () => {
    // Every game, but spread over eleven days - that is all-rounder, not sweep.
    const spread = Array.from({ length: 11 }, (_, i) =>
      row(`2026-09-${String(i + 1).padStart(2, "0")}`, { game: "g" + i }));
    const b = progressFor(ctx(spread)).badges;
    expect(b.find(x => x.id === "allrounder")!.earned).toBe(true);
    expect(b.find(x => x.id === "sweep")!.earned).toBe(false);
  });

  it("awards the streak badges from the best run, not only the current one", () => {
    const week = Array.from({ length: 7 }, (_, i) =>
      row(`2026-09-${String(i + 1).padStart(2, "0")}`));
    const b = progressFor(ctx(week)).badges;
    // The run ended on the 7th and today is the 17th - it is broken, but earned.
    expect(b.find(x => x.id === "week")!.earned).toBe(true);
    expect(b.find(x => x.id === "fortnight")!.earned).toBe(false);
  });

  it("awards the perfect run only at the maximum", () => {
    expect(progressFor(ctx([row("2026-09-17", { score: 999 })]))
      .badges.find(x => x.id === "perfect")!.earned).toBe(false);
    expect(progressFor(ctx([row("2026-09-17", { score: 1000 })]))
      .badges.find(x => x.id === "perfect")!.earned).toBe(true);
  });

  it("reads typing and robot achievements from the context", () => {
    const b = progressFor(ctx([row("2026-09-17")], { bestTypingWpm: 61, optimalRobotRuns: 1 })).badges;
    expect(b.find(x => x.id === "typist")!.earned).toBe(true);
    expect(b.find(x => x.id === "optimal")!.earned).toBe(true);
  });

  it("never reports progress above 100", () => {
    const many = Array.from({ length: 300 }, (_, i) => row("2026-09-17", { game: "g" + (i % 11) }));
    for (const b of progressFor(ctx(many, { bestTypingWpm: 200 })).badges) {
      if (b.progress !== undefined) {
        expect(b.progress).toBeGreaterThanOrEqual(0);
        expect(b.progress).toBeLessThanOrEqual(100);
      }
    }
  });

  it("every badge explains how to get it", () => {
    for (const b of BADGES) {
      expect(b.name.length).toBeGreaterThan(2);
      expect(b.how.length).toBeGreaterThan(10);
    }
  });

  it("has at least one badge that is not about being good", () => {
    /* A leaderboard already rewards winning, and a leaderboard is what makes a
       student who is not the best stop playing. Participation needs a route. */
    const participation = BADGES.filter(b =>
      /streak|play every|hundred/i.test(b.how));
    expect(participation.length).toBeGreaterThanOrEqual(3);
  });
});

describe("the whole picture", () => {
  it("sums points from the rows when not given them", () => {
    const rows = [row("2026-09-16", { score: 300 }), row("2026-09-17", { score: 500 })];
    expect(progressFor({ rows, today: "2026-09-17", totalGames: 11 }).points).toBe(800);
  });

  it("counts solved separately from played", () => {
    const rows = [row("2026-09-17", { score: 500 }), row("2026-09-17", { game: "debug", score: 0 })];
    const p = progressFor({ rows, today: "2026-09-17", totalGames: 11 });
    expect(p.played).toBe(2);
    expect(p.solved).toBe(1);
    expect(p.gamesTried).toBe(2);
  });

  it("survives an empty history", () => {
    const p = progressFor({ rows: [], today: "2026-09-17", totalGames: 11 });
    expect(p.points).toBe(0);
    expect(p.level.level.n).toBe(1);
    expect(p.streak.current).toBe(0);
    expect(p.badges.every(b => !b.earned)).toBe(true);
  });
});
