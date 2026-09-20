import { describe, it, expect } from "vitest";
import {
  ageInDays, freshness, usable, withheld, status, search, terms,
  briefingContext, askPrompt, STALE_AFTER_DAYS, AGEING_AFTER_DAYS,
} from "@/lib/trends-core";
import { RADAR, RADAR_REVIEWED_ON, type RadarItem } from "@/lib/trends-content";
import { maskEmail } from "@/lib/mask";

/* The claim this feature makes is that it never states a current fact the
   model supplied. Two things enforce that: the curated file is the only
   source of facts, and anything in it past the staleness window is withheld
   rather than served with a caveat. These tests pin both. If someone later
   loosens the window, or lets a stale entry through "with a warning", the
   suite fails — which is the point, because that change would be invisible
   in the UI until a student repeated something wrong in an interview. */

const AT = (iso: string) => new Date(iso + "T12:00:00Z");

function item(over: Partial<RadarItem> = {}): RadarItem {
  return {
    id: "t1", kind: "model", title: "Test model", body: "Body text.",
    checkedOn: "2026-09-01", sourceName: "Src", sourceUrl: "https://example.com",
    tags: ["test"], ...over,
  } as RadarItem;
}

describe("age and freshness", () => {
  it("counts whole days from the checked date", () => {
    expect(ageInDays("2026-09-01", AT("2026-09-01"))).toBe(0);
    expect(ageInDays("2026-09-01", AT("2026-09-11"))).toBe(10);
  });

  it("treats an unparseable date as infinitely old rather than as today", () => {
    // A typo in a date field must fail toward withholding, never toward
    // "checked today". The opposite default would silently publish anything
    // with a malformed date as current.
    expect(ageInDays("", AT("2026-09-01"))).toBe(Number.POSITIVE_INFINITY);
    expect(ageInDays("not-a-date", AT("2026-09-01"))).toBe(Number.POSITIVE_INFINITY);
    expect(freshness("nonsense", AT("2026-09-01"))).toBe("stale");
  });

  it("treats a future date as stale, not as extra fresh", () => {
    expect(freshness("2027-01-01", AT("2026-09-01"))).toBe("stale");
  });

  it("moves through fresh, ageing and stale at the stated thresholds", () => {
    const base = "2026-01-01";
    const at = (days: number) => new Date(Date.parse(base + "T00:00:00Z") + days * 86400000);
    expect(freshness(base, at(AGEING_AFTER_DAYS))).toBe("fresh");
    expect(freshness(base, at(AGEING_AFTER_DAYS + 1))).toBe("ageing");
    expect(freshness(base, at(STALE_AFTER_DAYS))).toBe("ageing");
    expect(freshness(base, at(STALE_AFTER_DAYS + 1))).toBe("stale");
  });
});

describe("stale entries are withheld, not downgraded", () => {
  const items = [
    item({ id: "new", checkedOn: "2026-09-01" }),
    item({ id: "old", checkedOn: "2025-01-01" }),
  ];
  const now = AT("2026-09-10");

  it("keeps a current entry and drops an expired one", () => {
    expect(usable(now, items).map(i => i.id)).toEqual(["new"]);
    expect(withheld(now, items).map(i => i.id)).toEqual(["old"]);
  });

  it("never lets a withheld entry reach the model's context", () => {
    const ctx = briefingContext(usable(now, items));
    expect(ctx).toContain("new");
    expect(ctx).not.toContain("[old]");
  });

  it("search cannot resurrect a stale entry, even on an exact title match", () => {
    const stale = [item({ id: "old", title: "Quantum Widget 9", checkedOn: "2024-01-01" })];
    expect(search("Quantum Widget 9", now, stale)).toEqual([]);
  });

  it("reports an empty radar rather than answering from an empty context", () => {
    const s = status(now, [item({ checkedOn: "2020-01-01" })]);
    expect(s.empty).toBe(true);
    expect(s.usableCount).toBe(0);
    expect(s.withheldCount).toBe(1);
  });
});

describe("search", () => {
  const now = AT("2026-09-20");

  it("strips filler words that appear in every question here", () => {
    // "what are the latest new AI models" is almost entirely stop words; if
    // they survived, every question would match every entry equally.
    expect(terms("What are the latest new AI models?")).toEqual(["ai", "models"]);
    expect(terms("")).toEqual([]);
  });

  it("keeps version-ish tokens that a naive tokeniser would destroy", () => {
    expect(terms("Is c++ or node.js better?")).toContain("c++");
    expect(terms("Is c++ or node.js better?")).toContain("node.js");
  });

  it("ranks a vendor question onto that vendor's entries", () => {
    const hits = search("What has DeepSeek released?", now);
    expect(hits[0].vendor).toBe("DeepSeek");
  });

  it("finds skills content from a plain student question", () => {
    const hits = search("which cloud skills should I learn", now);
    expect(hits.some(h => h.tags.includes("cloud"))).toBe(true);
  });

  it("returns the whole current radar when nothing matches, never nothing", () => {
    // An empty context is the one state in which the model would answer from
    // training data, so "no match" must not produce one.
    const hits = search("zzzzz qqqqq", now);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("the prompt states the rule it depends on", () => {
  const now = AT("2026-09-20");
  const prompt = askPrompt(usable(now), "2026-09-20");

  it("forbids naming anything outside the entries", () => {
    expect(prompt).toMatch(/Never name a model/i);
  });

  it("tells the model not to imply knowledge past the entry dates", () => {
    expect(prompt).toMatch(/Never imply your knowledge continues past them/i);
  });

  it("carries today's date, so the model can reason about age", () => {
    expect(prompt).toContain("2026-09-20");
  });

  it("puts every usable entry's checked date in the context", () => {
    for (const e of usable(now)) expect(prompt).toContain(e.checkedOn);
  });
});

describe("the shipped radar file", () => {
  it("dates and attributes every entry", () => {
    for (const e of RADAR) {
      expect(e.checkedOn, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.sourceName, e.id).not.toBe("");
      expect(e.body.length, e.id).toBeGreaterThan(40);
    }
  });

  it("uses unique ids, so a source chip cannot point at two entries", () => {
    expect(new Set(RADAR.map(e => e.id)).size).toBe(RADAR.length);
  });

  it("has a whole-file review date no older than its newest entry", () => {
    const newest = RADAR.map(e => e.checkedOn).sort().pop()!;
    expect(RADAR_REVIEWED_ON >= newest).toBe(true);
  });
});

describe("maskEmail", () => {
  it("shows the first character and keeps the domain", () => {
    // "a.student" is nine characters: one shown, eight starred.
    expect(maskEmail("a.student@silveroakuni.ac.in")).toBe("a********@silveroakuni.ac.in");
  });

  it("reveals nothing when the local part is too short to mask", () => {
    // The bug this guards: slice(0,1) + stars would print "j*@x.com" for
    // "jp@x.com", which is the whole local part for a two-letter address.
    expect(maskEmail("jp@x.com")).toBe("**@x.com");
    expect(maskEmail("j@x.com")).toBe("*@x.com");
  });

  it("returns empty for anything that is not an address", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
    expect(maskEmail("not-an-email")).toBe("");
    expect(maskEmail("@x.com")).toBe("");
    expect(maskEmail("user@")).toBe("");
  });
});
