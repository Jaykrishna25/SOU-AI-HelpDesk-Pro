import { describe, it, expect } from "vitest";
import {
  makeTyping, checkTyping, makeJumble, checkJumble, makeDebug, checkDebug,
  makeOutput, checkOutput, makeRobot, runRobot, robotBonus, ROBOT_TOLERANCE,
  COIN_VALUE, makeSemantic, checkSemantic, semanticBonus,
} from "@/lib/fun-code";
import { ROBOT_LEVELS, DEBUGS, OUTPUTS, JUMBLES, SEMANTIC_TERMS } from "@/lib/fun-code-content";

const DAY = "2026-09-19";

/* Two properties run through all six games, and they are what make the weekly
   leaderboard mean anything:

     1. Deterministic from the date, so everyone gets the same puzzle.
     2. The answer never reaches the client.

   Both are asserted per game below. */

describe("every puzzle is the same for everyone on the same day", () => {
  it("and different on a different day", () => {
    expect(makeTyping(DAY)).toEqual(makeTyping(DAY));
    expect(makeDebug(DAY).puzzle.title).toBe(makeDebug(DAY).puzzle.title);
    expect(makeOutput(DAY).answerIndex).toBe(makeOutput(DAY).answerIndex);
    expect(makeRobot(DAY).level.grid).toEqual(makeRobot(DAY).level.grid);
    expect(makeSemantic(DAY).client).toEqual(makeSemantic(DAY).client);

    // Across a week, the puzzles should not all be identical.
    const titles = new Set(
      ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]
        .map(d => makeDebug(d).puzzle.title),
    );
    expect(titles.size).toBeGreaterThan(1);
  });
});

describe("the answer never reaches the client", () => {
  it("jumble sends shuffled lines and no solution", () => {
    const { client, puzzle } = makeJumble(DAY);
    expect(client).not.toHaveProperty("solution");
    expect(client.lines.join("|")).not.toBe(puzzle.lines.join("|"));
    // Same lines, different order.
    expect([...client.lines].sort()).toEqual([...puzzle.lines].sort());
  });

  it("debug sends no line number, explanation or fix", () => {
    const { client } = makeDebug(DAY);
    expect(client).not.toHaveProperty("buggyLine");
    expect(client).not.toHaveProperty("explanation");
    expect(client).not.toHaveProperty("fixed");
  });

  it("predict-the-output sends no answer index", () => {
    const { client } = makeOutput(DAY);
    expect(client).not.toHaveProperty("answer");
    expect(client).not.toHaveProperty("explanation");
  });

  it("semantic match sends no accepted words", () => {
    const { client } = makeSemantic(DAY);
    expect(JSON.stringify(client)).not.toContain("accepts");
    for (const t of client.terms) expect(Object.keys(t).sort()).toEqual(["subject", "term"]);
  });
});

describe("typing sprint", () => {
  const target = "for (int i = 0; i < n; i++) { sum += arr[i]; }";

  it("scores a perfect run", () => {
    const r = checkTyping(target, target, 20_000);
    expect(r.solved).toBe(true);
    expect(r.accuracy).toBe(100);
    expect(r.bonus).toBeGreaterThan(0);
  });

  it("does not let speed excuse inaccuracy", () => {
    // Typing code fast and wrongly is not a skill.
    const r = checkTyping(target, "x".repeat(target.length), 3_000);
    expect(r.solved).toBe(false);
    expect(r.bonus).toBe(0);
  });

  it("one wrong character does not cascade", () => {
    /* A naive diff marks everything after an inserted character as wrong.
       Position-by-position comparison keeps the damage local. */
    const typed = target.slice(0, 5) + "X" + target.slice(6);
    expect(checkTyping(target, typed, 20_000).accuracy).toBeGreaterThanOrEqual(95);
  });

  it("refuses a run that stopped short", () => {
    expect(checkTyping(target, target.slice(0, 10), 5_000).solved).toBe(false);
  });

  it("handles empty and missing input", () => {
    expect(checkTyping(target, "", 5_000).accuracy).toBe(0);
    expect(checkTyping(target, undefined as any, 5_000).solved).toBe(false);
  });
});

describe("jumble programming", () => {
  it("accepts the correct order and rejects anything else", () => {
    const { puzzle } = makeJumble(DAY);
    expect(checkJumble(puzzle.lines, puzzle)).toBe(true);
    expect(checkJumble([...puzzle.lines].reverse(), puzzle)).toBe(false);
    expect(checkJumble(puzzle.lines.slice(0, -1), puzzle)).toBe(false);
    expect(checkJumble("not an array", puzzle)).toBe(false);
    expect(checkJumble(null, puzzle)).toBe(false);
  });

  it("every puzzle has a function signature first", () => {
    // If the first line is not the definition, the puzzle has no anchor.
    for (const j of JUMBLES) {
      expect(j.lines[0]).toMatch(/^(def|function|int|void|public)/);
    }
  });
});

describe("debug it", () => {
  it("accepts only the buggy line", () => {
    const { puzzle } = makeDebug(DAY);
    expect(checkDebug(puzzle.buggyLine, puzzle)).toBe(true);
    expect(checkDebug(puzzle.buggyLine + 1, puzzle)).toBe(false);
    expect(checkDebug(null, puzzle)).toBe(false);
  });

  it("every puzzle points at a line that exists and explains itself", () => {
    for (const d of DEBUGS) {
      expect(d.buggyLine).toBeGreaterThanOrEqual(0);
      expect(d.buggyLine).toBeLessThan(d.lines.length);
      expect(d.explanation.length).toBeGreaterThan(30);
      expect(d.fixed.length).toBeGreaterThan(0);
    }
  });
});

describe("predict the output", () => {
  it("the shuffled options still contain the right answer", () => {
    const { client, answerIndex, puzzle } = makeOutput(DAY);
    expect(client.options[answerIndex]).toBe(puzzle.options[puzzle.answer]);
    expect(checkOutput(answerIndex, answerIndex)).toBe(true);
    expect(checkOutput(answerIndex + 1, answerIndex)).toBe(false);
  });

  it("every puzzle has a valid answer index and distinct options", () => {
    for (const o of OUTPUTS) {
      expect(o.answer).toBeGreaterThanOrEqual(0);
      expect(o.answer).toBeLessThan(o.options.length);
      expect(new Set(o.options).size).toBe(o.options.length);
      expect(o.explanation.length).toBeGreaterThan(20);
    }
  });
});

describe("robot path", () => {
  it("every level is solvable, and par is the true shortest path", () => {
    /* par was guessed in the first draft and was wrong by three to four moves
       on every level - one was not solvable by the route its own hint
       described. A par nobody can reach is worse than no par, because the
       student assumes they are the problem. */
    for (const level of ROBOT_LEVELS) {
      expect(shortestPath(level.grid)).toBe(level.par);
    }
  });

  it("every grid is rectangular and has exactly one start and goal", () => {
    for (const level of ROBOT_LEVELS) {
      const widths = new Set(level.grid.map(r => r.length));
      expect(widths.size).toBe(1);
      const flat = level.grid.join("");
      expect(flat.split("S").length - 1).toBe(1);
      expect(flat.split("G").length - 1).toBe(1);
    }
  });

  it("every coin is reachable", () => {
    // A coin behind a wall is a puzzle that punishes you for trying.
    for (const level of ROBOT_LEVELS) {
      for (const [r, c] of coinCells(level.grid)) {
        expect(reachable(level.grid, r, c)).toBe(true);
      }
    }
  });

  it("a wall stops the run rather than being ignored", () => {
    /* Silently skipping an illegal move would let a student spam every
       direction and stumble into the goal. */
    const grid = ["S#G"];
    expect(runRobot(grid, ["right"]).failed).toBe("wall");
    expect(runRobot(grid, ["right"]).reached).toBe(false);
  });

  it("walking off the grid stops the run", () => {
    expect(runRobot(["S.G"], ["up"]).failed).toBe("offgrid");
  });

  it("reports running out of moves", () => {
    expect(runRobot(["S..G"], ["right"]).failed).toBe("ran-out");
  });

  it("ignores an unknown command without failing the run", () => {
    const r = runRobot(["S.G"], ["teleport", "right", "right"]);
    expect(r.reached).toBe(true);
    expect(r.steps).toBe(2);
  });

  it("collects each coin once", () => {
    const r = runRobot(["S*G"], ["right", "left", "right", "right"]);
    expect(r.coins).toBe(1);
  });

  it("survives junk input", () => {
    expect(runRobot(["S.G"], null).reached).toBe(false);
    expect(runRobot(["S.G"], "right").reached).toBe(false);
  });

  it("a coin is always worth more than a fast clean run", () => {
    /* The first version priced a coin at 80 against a maximum efficiency
       bonus of 100, which quietly made the coins a trap. */
    const optimal = robotBonus({ reached: true, coins: 0, steps: 7, failed: null, path: [] }, 7);
    const detour = robotBonus(
      { reached: true, coins: 1, steps: 7 + ROBOT_TOLERANCE, failed: null, path: [] }, 7,
    );
    expect(detour).toBeGreaterThan(optimal);
    expect(COIN_VALUE).toBeGreaterThan(ROBOT_TOLERANCE * 25);
  });

  it("scores nothing for a run that did not reach the goal", () => {
    expect(robotBonus({ reached: false, coins: 3, steps: 4, failed: "wall", path: [] }, 7)).toBe(0);
  });
});

describe("semantic match", () => {
  it("accepts a related word, generously", () => {
    const accepts = ["circular", "wait", "mutex"];
    expect(checkSemantic("circular", accepts)).toBe(true);
    expect(checkSemantic("CIRCULAR", accepts)).toBe(true);
    expect(checkSemantic("circular wait", accepts)).toBe(true);
    expect(checkSemantic("b-tree", ["btree"])).toBe(true);
  });

  it("rejects an unrelated word", () => {
    expect(checkSemantic("banana", ["circular", "wait"])).toBe(false);
  });

  it("will not let a two-letter guess match by substring", () => {
    // Otherwise "ca" clears anything containing those letters.
    expect(checkSemantic("ci", ["circular"])).toBe(false);
    expect(checkSemantic("cir", ["circular"])).toBe(false);
    expect(checkSemantic("", ["circular"])).toBe(false);
  });

  it("rewards clearing everything more than clearing most", () => {
    expect(semanticBonus(5, 5)).toBeGreaterThan(semanticBonus(4, 5) + 50);
    expect(semanticBonus(0, 5)).toBe(0);
  });

  it("every term has enough accepted words to be fair", () => {
    for (const t of SEMANTIC_TERMS) {
      expect(t.accepts.length).toBeGreaterThanOrEqual(6);
      expect(t.term.length).toBeGreaterThan(2);
    }
  });
});

/* ---------------- helpers ---------------- */

function cells(grid: string[]) {
  return { R: grid.length, C: grid[0].length };
}

function find(grid: string[], ch: string): [number, number] {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(ch);
    if (c >= 0) return [r, c];
  }
  return [-1, -1];
}

const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** Breadth-first shortest path from S to G, ignoring coins. */
function shortestPath(grid: string[]): number {
  const { R, C } = cells(grid);
  const [sr, sc] = find(grid, "S");
  const [gr, gc] = find(grid, "G");
  const seen = new Set([`${sr},${sc}`]);
  let q: [number, number, number][] = [[sr, sc, 0]];
  while (q.length) {
    const [r, c, d] = q.shift()!;
    if (r === gr && c === gc) return d;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
      if (grid[nr][nc] === "#") continue;
      const k = `${nr},${nc}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nr, nc, d + 1]);
    }
  }
  return -1;
}

function coinCells(grid: string[]): [number, number][] {
  const out: [number, number][] = [];
  grid.forEach((row, r) => row.split("").forEach((ch, c) => { if (ch === "*") out.push([r, c]); }));
  return out;
}

function reachable(grid: string[], tr: number, tc: number): boolean {
  const { R, C } = cells(grid);
  const [sr, sc] = find(grid, "S");
  const seen = new Set([`${sr},${sc}`]);
  const q: [number, number][] = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === tr && c === tc) return true;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
      if (grid[nr][nc] === "#") continue;
      const k = `${nr},${nc}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nr, nc]);
    }
  }
  return false;
}
