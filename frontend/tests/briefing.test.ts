import { describe, it, expect } from "vitest";
import {
  planToday, skillsFor, diffAgainstMemory, nextMemory, factsBlock,
  modelRelease, toolRelease, pickFresh, ageDaysOf,
  BRIEFING_SYSTEM, EMPLOYABLE, MEMORY_LIMIT, RELEASE_MAX_AGE_DAYS,
  type Listing, type Release,
} from "@/lib/briefing-core";

const NOW = new Date("2026-09-20T08:00:00Z");

const L = (url: string, over: Partial<Listing> = {}): Listing => ({
  title: "Backend Intern", company: "Acme", location: "Remote",
  url, matchedOn: "sql", ...over,
});

const R = (url: string, over: Partial<Release> = {}): Release => ({
  kind: "model", title: "Thing", by: "someone", detail: "1 like",
  url, ageDays: 3, ...over,
});

const facts = (over: any = {}) => factsBlock({
  plan: planToday([{ subject: "DBMS", score: 91 }]),
  jobs: [], jobDelta: diffAgainstMemory([] as Listing[], [], null, NOW),
  releases: [], releaseDelta: diffAgainstMemory([] as Release[], [], null, NOW),
  errors: [], now: NOW, ...over,
});

/* This agent runs unattended. Nobody is watching when it decides what to say,
   which is exactly why the deciding has to be tested. */

describe("planning — what the briefing is about", () => {
  const subjects = [
    { subject: "Database Management Systems", score: 91 },
    { subject: "Computer Networks", score: 84 },
    { subject: "Operating Systems", score: 37 },   // weak
    { subject: "Machine Learning", score: 78 },
    { subject: "Yoga", score: 95 },                // unmapped, top scorer
  ];

  it("draws keywords from the strongest subjects, best first", () => {
    expect(planToday(subjects).keywords[0]).toBe("sql");
  });

  it("does not let an unmapped subject become the headline", () => {
    /* Yoga scores highest but contributes no keyword. The first version used
       the top scorer regardless, producing "strongest subject: Yoga" above a
       list of SQL roles. */
    expect(planToday(subjects).focus).toBe("Database Management Systems");
    expect(planToday(subjects).reason).not.toContain("Yoga");
  });

  it("excludes weak subjects entirely", () => {
    // Those belong to the study plan. Nobody is more employable in the
    // subject they struggled with.
    const kw = planToday(subjects, 10).keywords;
    expect(kw).not.toContain("linux");
    expect(kw).not.toContain("systems");
  });

  it("treats a score exactly on the threshold as employable", () => {
    expect(planToday([{ subject: "DBMS", score: EMPLOYABLE }]).keywords).toContain("sql");
  });

  it("respects the keyword limit", () => {
    expect(planToday(subjects, 2).keywords.length).toBe(2);
  });

  it("falls back rather than producing nothing", () => {
    for (const rows of [[], [{ subject: "Yoga", score: 95 }], [{ subject: "DBMS", score: 20 }]]) {
      const p = planToday(rows);
      expect(p.keywords).toEqual(["computer science"]);
      expect(p.focus).toBe("general");
    }
  });

  it("ignores unusable scores rather than ranking them", () => {
    const p = planToday([
      { subject: "DBMS", score: NaN as any },
      { subject: "Computer Networks", score: 88 },
    ]);
    expect(p.keywords).toContain("networking");
    expect(p.keywords).not.toContain("sql");
  });

  it("matches subject names loosely", () => {
    expect(skillsFor("DBMS")).toEqual(skillsFor("Database Management Systems"));
    expect(skillsFor("Advanced Web Technologies")).toContain("web developer");
    expect(skillsFor("Environmental Studies")).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   Parsing the two "what is new in the market" feeds. These fixtures are
   trimmed copies of real responses, so a field renamed upstream shows up
   here rather than as an empty card at 8am.
   ------------------------------------------------------------------ */

describe("parsing new AI models (Hugging Face)", () => {
  const raw = {
    id: "deepseek-ai/DeepSeek-V4.1-Flash",
    likes: 2689, downloads: 325712,
    pipeline_tag: "image-text-to-text",
    createdAt: "2026-09-10T02:17:58.000Z",
  };

  it("splits the publisher from the model name", () => {
    const r = modelRelease(raw, NOW)!;
    expect(r.by).toBe("deepseek-ai");
    expect(r.title).toBe("DeepSeek-V4.1-Flash");
    expect(r.url).toBe("https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash");
    expect(r.kind).toBe("model");
  });

  it("carries counted facts and nothing else", () => {
    const d = modelRelease(raw, NOW)!.detail;
    expect(d).toContain("likes");
    expect(d).toContain("downloads");
    // No adjectives. The feed cannot tell us a model is good.
    expect(d).not.toMatch(/best|top|leading|powerful|state of the art/i);
  });

  it("computes how old the model is", () => {
    expect(modelRelease(raw, NOW)!.ageDays).toBe(10);
  });

  it("survives a record with no name", () => {
    expect(modelRelease({ likes: 5 }, NOW)).toBeNull();
    expect(modelRelease(null, NOW)).toBeNull();
  });

  it("says so rather than printing zeros when counts are missing", () => {
    const r = modelRelease({ id: "acme/thing" }, NOW)!;
    expect(r.detail).toBe("no usage figures published");
    expect(r.ageDays).toBeNull();
  });

  it("handles a model published without an owner prefix", () => {
    expect(modelRelease({ id: "gpt2" }, NOW)!.by).toBe("unknown");
  });
});

describe("parsing new tools (GitHub)", () => {
  const raw = {
    name: "jev-ultrafast",
    html_url: "https://github.com/browser-use/jev-ultrafast",
    owner: { login: "browser-use" },
    description: "i. am. speed.",
    stargazers_count: 7854,
    language: "Python",
    created_at: "2026-09-16T21:30:12Z",
  };

  it("keeps the author's own description, not a generated one", () => {
    const r = toolRelease(raw, NOW)!;
    expect(r.detail).toContain("i. am. speed.");
    expect(r.detail).toContain("7,854 stars");
    expect(r.by).toBe("browser-use");
    expect(r.kind).toBe("tool");
  });

  it("truncates a description rather than letting it run away", () => {
    const r = toolRelease({ ...raw, description: "x".repeat(400) }, NOW)!;
    expect(r.detail.length).toBeLessThan(160);
    expect(r.detail).toContain("…");
  });

  it("survives a repository with no link", () => {
    expect(toolRelease({ name: "x" }, NOW)).toBeNull();
    expect(toolRelease({ html_url: "https://x" }, NOW)).toBeNull();
  });

  it("computes age", () => {
    expect(toolRelease(raw, NOW)!.ageDays).toBe(3);
    expect(ageDaysOf("not a date", NOW)).toBeNull();
    // A clock skew must not produce a negative age.
    expect(ageDaysOf("2027-01-01T00:00:00Z", NOW)).toBe(0);
  });
});

describe("freshness", () => {
  it("drops releases that are not actually new", () => {
    const items = [R("a", { ageDays: 2 }), R("b", { ageDays: 5 }),
                   R("c", { ageDays: 9 }), R("d", { ageDays: 900 })];
    expect(pickFresh(items).map(r => r.url)).toEqual(["a", "b", "c"]);
  });

  it("would rather show something slightly old than nothing", () => {
    /* If the whole feed is stale, returning [] lets the model imply the
       field went quiet — which is a claim about the world, not about the
       feed, and therefore an invented fact. */
    const stale = [R("a", { ageDays: 300 }), R("b", { ageDays: 400 })];
    expect(pickFresh(stale).length).toBe(2);
  });

  it("keeps an item whose date could not be read", () => {
    expect(pickFresh([R("a", { ageDays: null })]).length).toBe(1);
  });

  it("uses a sane default window", () => {
    expect(RELEASE_MAX_AGE_DAYS).toBeGreaterThan(30);
    expect(RELEASE_MAX_AGE_DAYS).toBeLessThan(180);
  });
});

describe("observing — what actually changed", () => {
  const listings = [L("a"), L("b"), L("c")];

  it("treats everything as new on the first run", () => {
    const d = diffAgainstMemory(listings, [], null, NOW);
    expect(d.firstRun).toBe(true);
    expect(d.newItems.length).toBe(3);
    expect(d.repeatCount).toBe(0);
  });

  it("reports only what it has not shown before", () => {
    const d = diffAgainstMemory(listings, ["a", "b"], new Date("2026-09-19T08:00:00Z"), NOW);
    expect(d.newItems.map(l => l.url)).toEqual(["c"]);
    expect(d.repeatCount).toBe(2);
    expect(d.firstRun).toBe(false);
  });

  it("says nothing is new when nothing is", () => {
    /* The case most digests refuse to admit, and the reason this one stays
       worth reading. */
    const d = diffAgainstMemory(listings, ["a", "b", "c"], new Date("2026-09-19T08:00:00Z"), NOW);
    expect(d.newItems).toEqual([]);
    expect(d.repeatCount).toBe(3);
  });

  it("works the same way on models and tools", () => {
    // One memory list covers all three feeds; the diff must not care which.
    const d = diffAgainstMemory([R("m1"), R("m2")], ["m1"], null, NOW);
    expect(d.newItems.map(r => r.url)).toEqual(["m2"]);
  });

  it("counts the days since the last run", () => {
    const d = diffAgainstMemory(listings, ["a"], new Date("2026-09-17T08:00:00Z"), NOW);
    expect(d.daysSinceLast).toBe(3);
  });

  it("survives a missing or unusable last-run date", () => {
    expect(diffAgainstMemory(listings, ["a"], null, NOW).daysSinceLast).toBeNull();
    expect(diffAgainstMemory(listings, ["a"], new Date("nonsense"), NOW).daysSinceLast).toBeNull();
  });

  it("handles empty input without throwing", () => {
    expect(diffAgainstMemory([], [], null, NOW).newItems).toEqual([]);
    expect(diffAgainstMemory(null as any, null as any, null, NOW).newItems).toEqual([]);
  });
});

describe("memory", () => {
  it("merges without duplicating", () => {
    expect(nextMemory(["a", "b"], [L("b"), L("c")])).toEqual(["a", "b", "c"]);
  });

  it("remembers jobs, models and tools in one list", () => {
    expect(nextMemory([], [L("job"), R("model"), R("tool", { kind: "tool" })]))
      .toEqual(["job", "model", "tool"]);
  });

  it("stays bounded, keeping the newest", () => {
    const old = Array.from({ length: MEMORY_LIMIT + 50 }, (_, i) => "old" + i);
    const next = nextMemory(old, [L("fresh")]);
    expect(next.length).toBe(MEMORY_LIMIT);
    expect(next).toContain("fresh");
    expect(next).not.toContain("old0");
  });

  it("is large enough for three feeds a day for months", () => {
    expect(MEMORY_LIMIT).toBeGreaterThanOrEqual(500);
  });

  it("handles empty inputs", () => {
    expect(nextMemory([], [])).toEqual([]);
    expect(nextMemory(null as any, null as any)).toEqual([]);
  });
});

describe("what the model is allowed to see", () => {
  it("separates the three streams so they cannot be conflated", () => {
    const f = facts();
    expect(f).toContain("=== OPENINGS ===");
    expect(f).toContain("AI MODELS PUBLISHED RECENTLY");
    expect(f).toContain("OPEN-SOURCE TOOLS CREATED RECENTLY");
  });

  it("states the change first, and names the keywords", () => {
    const jobs = [L("a"), L("b")];
    const f = facts({
      jobs,
      jobDelta: diffAgainstMemory(jobs, ["a"], new Date("2026-09-19T08:00:00Z"), NOW),
    });
    expect(f).toContain("New openings since the last briefing: 1");
    expect(f).toContain("Openings already shown before: 1");
    expect(f).toContain("sql");
  });

  it("lists new models and tools with their counted facts", () => {
    const releases = [
      R("m", { title: "MiniCPM5-2B", by: "openbmb", detail: "1,451 likes", ageDays: 14 }),
      R("t", { kind: "tool", title: "PRAXIST", by: "sapientinc", detail: "6,185 stars", ageDays: 24 }),
    ];
    const f = facts({ releases, releaseDelta: diffAgainstMemory(releases, [], null, NOW) });
    expect(f).toContain("MiniCPM5-2B by openbmb — 1,451 likes; published 14 day(s) ago");
    expect(f).toContain("PRAXIST by sapientinc — 6,185 stars; created 24 day(s) ago");
  });

  it("says a feed failed rather than leaving a silent gap", () => {
    const f = facts({ errors: ["models: feed returned 503"] });
    expect(f).toMatch(/THE MODELS FEED COULD NOT BE REACHED/);
    expect(f).toContain("503");
  });

  it("does not claim a feed failed when it simply had nothing new", () => {
    const releases = [R("m")];
    const f = facts({ releases, releaseDelta: diffAgainstMemory(releases, ["m"], null, NOW) });
    expect(f).not.toMatch(/COULD NOT BE REACHED/);
    expect(f).toContain("Nothing here that this student has not already been shown.");
  });

  it("reports one feed failing without condemning the others", () => {
    const releases = [R("m")];
    const f = facts({
      releases, releaseDelta: diffAgainstMemory(releases, [], null, NOW),
      errors: ["jobs/sql: timeout"],
    });
    expect(f).toContain("THE JOBS FEED COULD NOT BE REACHED");
    expect(f).not.toContain("THE MODELS FEED COULD NOT BE REACHED");
  });

  it("caps how much reaches the model from each stream", () => {
    const jobs = Array.from({ length: 20 }, (_, i) => L("u" + i));
    const releases = Array.from({ length: 20 }, (_, i) => R("r" + i));
    const f = facts({
      jobs, jobDelta: diffAgainstMemory(jobs, [], null, NOW),
      releases, releaseDelta: diffAgainstMemory(releases, [], null, NOW),
    });
    expect((f.match(/^- /gm) || []).length).toBeLessThanOrEqual(15);
  });
});

describe("the system prompt carries the limits", () => {
  it("forbids invention, prediction and flattery", () => {
    expect(BRIEFING_SYSTEM).toMatch(/Do not invent/i);
    expect(BRIEFING_SYSTEM).toMatch(/Never predict/i);
    expect(BRIEFING_SYSTEM).toMatch(/Do not flatter/i);
  });

  it("forbids treating download counts as a measure of quality", () => {
    // The specific temptation the new feeds introduce: a model with a lot of
    // downloads is popular, which is not the same as good, and a briefing
    // that blurs the two is teaching a student the wrong habit.
    expect(BRIEFING_SYSTEM).toMatch(/Popularity is not quality/i);
  });

  it("forbids dressing a feed failure up as a market condition", () => {
    expect(BRIEFING_SYSTEM).toMatch(/quiet day in the market/i);
  });
});
