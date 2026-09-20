/* ============================================================
   Market & Technology Radar — freshness, selection, prompts.

   Pure functions. No Prisma, no network, no clock of its own —
   every function that needs "now" is handed one, so the rules
   that matter here can be tested at any date rather than only on
   the day the suite happens to run.

   The rule this file exists to enforce:

     A dated claim that has gone stale is withheld, not
     downgraded. The agent would rather say "I last checked this
     in March and will not repeat it as current" than hand a
     student a six-month-old model ranking with a small grey
     caveat under it. Caveats under confident text do not get
     read; missing text does.
   ============================================================ */

import { RADAR, RADAR_REVIEWED_ON, type RadarItem, type RadarKind } from "./trends-content";

/** Past this, an entry is withheld from answers entirely. */
export const STALE_AFTER_DAYS = 120;
/** Past this, an entry is still served but flagged as ageing. */
export const AGEING_AFTER_DAYS = 45;

export type Freshness = "fresh" | "ageing" | "stale";

const DAY = 86400000;

/** Whole days between an ISO date and `now`. Negative dates are treated as stale. */
export function ageInDays(isoDate: string, now: Date): number {
  const then = Date.parse(String(isoDate || "") + "T00:00:00Z");
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / DAY);
}

export function freshness(isoDate: string, now: Date): Freshness {
  const age = ageInDays(isoDate, now);
  /* A future date is a typo or a clock problem, not freshness. Calling it
     stale makes the mistake visible instead of granting it an extra year
     of being treated as current. */
  if (age < 0) return "stale";
  if (age > STALE_AFTER_DAYS) return "stale";
  if (age > AGEING_AFTER_DAYS) return "ageing";
  return "fresh";
}

export interface RadarEntry extends RadarItem {
  ageDays: number;
  freshness: Freshness;
}

export function describe(items: RadarItem[], now: Date): RadarEntry[] {
  return items.map(i => ({
    ...i,
    ageDays: ageInDays(i.checkedOn, now),
    freshness: freshness(i.checkedOn, now),
  }));
}

/** Everything still inside the staleness window, newest first. */
export function usable(now: Date, items: RadarItem[] = RADAR): RadarEntry[] {
  return describe(items, now)
    .filter(i => i.freshness !== "stale")
    .sort((a, b) => a.ageDays - b.ageDays);
}

export function withheld(now: Date, items: RadarItem[] = RADAR): RadarEntry[] {
  return describe(items, now).filter(i => i.freshness === "stale");
}

export function byKind(entries: RadarEntry[], kind: RadarKind): RadarEntry[] {
  return entries.filter(e => e.kind === kind);
}

/** Overall state of the radar, for the banner at the top of the panel. */
export interface RadarStatus {
  reviewedOn: string;
  reviewedAgeDays: number;
  freshness: Freshness;
  usableCount: number;
  withheldCount: number;
  /** True when nothing at all is current enough to answer from. */
  empty: boolean;
}

export function status(now: Date, items: RadarItem[] = RADAR): RadarStatus {
  const live = usable(now, items);
  const dead = withheld(now, items);
  return {
    reviewedOn: RADAR_REVIEWED_ON,
    reviewedAgeDays: ageInDays(RADAR_REVIEWED_ON, now),
    freshness: freshness(RADAR_REVIEWED_ON, now),
    usableCount: live.length,
    withheldCount: dead.length,
    empty: live.length === 0,
  };
}

/* ---------------- retrieval ---------------- */

const STOP = new Set([
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "is", "are", "was", "were", "be", "been", "the", "a", "an", "of", "in", "on",
  "for", "to", "and", "or", "i", "me", "my", "should", "do", "does", "did",
  "can", "could", "would", "will", "new", "latest", "recent", "recently",
  "now", "currently", "please", "tell", "about", "market", "learn",
]);

export function terms(question: string): string[] {
  return String(question || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map(t => t.replace(/^[.]+|[.]+$/g, ""))
    .filter(t => t.length > 1 && !STOP.has(t));
}

/**
 * Keyword scoring over the curated entries.
 *
 * Deliberately not embeddings. The corpus is a few dozen short entries that a
 * person wrote and maintains; a vector index would add an API call, a failure
 * mode and a cost to a search that a `for` loop does exactly as well. The
 * embedding path in lib/ai.ts exists because the knowledge base there is
 * thousands of chunks of other people's prose. This is not that.
 */
export function search(question: string, now: Date, items: RadarItem[] = RADAR): RadarEntry[] {
  const live = usable(now, items);
  const t = terms(question);
  if (!t.length) return live;

  const scored = live.map(e => {
    const title = e.title.toLowerCase();
    const body = e.body.toLowerCase();
    const tags = e.tags.join(" ").toLowerCase();
    const vendor = (e.vendor || "").toLowerCase();
    let score = 0;
    for (const term of t) {
      if (title.includes(term)) score += 3;
      if (tags.includes(term)) score += 2;
      if (vendor.includes(term)) score += 2;
      if (body.includes(term)) score += 1;
    }
    return { e, score };
  });

  const hits = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  /* Nothing matched: hand back everything rather than nothing. The prompt
     already forbids answering from outside the file, so a wide context is
     safe, and "I have nothing on that" is a worse answer than a related one
     when the corpus is this small. */
  return (hits.length ? hits.map(s => s.e) : live).slice(0, 12);
}

/* ---------------- prompts ---------------- */

export const NO_CONTENT_MESSAGE =
  "The technology radar has not been refreshed recently enough for me to answer from it. " +
  "Everything in it is past the point where I would repeat it as current, and I would " +
  "rather say nothing than tell you last term's model rankings are this term's. Ask the " +
  "department to refresh it, or check the sources listed on the radar directly.";

export function briefingContext(entries: RadarEntry[]): string {
  if (!entries.length) return "(nothing current is available)";
  return entries
    .map(e =>
      "[" + e.id + "] " + e.title +
      "\nCategory: " + e.kind +
      (e.vendor ? "\nFrom: " + e.vendor : "") +
      "\nChecked on: " + e.checkedOn + " (" + e.ageDays + " days ago, " + e.freshness + ")" +
      "\nSource: " + (e.sourceName || "unattributed") +
      "\n" + e.body)
    .join("\n\n");
}

export function askPrompt(entries: RadarEntry[], todayIso: string): string {
  return `You are the Market & Technology Radar for Silver Oak University. You help
students understand what is changing in the technology job market, what is worth
learning, and which AI models have recently been released.

Today is ${todayIso}.

WHERE YOUR FACTS COME FROM — this is the whole point of you:
Everything factual you say must come from the RADAR ENTRIES below. They were
checked by a person on the dates shown. You have your own impressions of this
subject from training and they are older than these entries and you cannot tell
by how much. So:

1. Never name a model, a company, a statistic, a salary, a growth figure or a
   date that is not in the entries. Not even one you are confident about.
2. If the entries do not cover what was asked, say so directly and say what the
   radar does cover. Do not fill the gap.
3. If a student asks whether something even newer exists, the honest answer is
   that you only know what is on this radar and the dates are shown — say that.
   Never imply your knowledge continues past them.
4. When an entry is marked "ageing", say when it was checked as you use it.
5. General explanation is fine and expected. Explaining what an agentic system
   is, or why SQL is asked about in interviews, is teaching, not inventing.
   The line is between explaining a concept and asserting a current fact.

HOW TO WRITE:
- Answer the actual question first, in two to five sentences.
- Plain language. Indian university context. No hype, no "exciting times", no
  "the future of work". A student deciding how to spend a semester is owed
  specifics.
- Be honest about uncertainty in the entries themselves — several say their
  capability claims are unconfirmed, and you should pass that on rather than
  smoothing it away.
- Do not flatter the student, do not open with "great question", and do not
  close with an offer to help further; the interface does that.
- Never give individual career advice framed as a prediction. "This is what
  hiring guides report" is fair. "You will get a job if you learn X" is not.

RADAR ENTRIES:
${briefingContext(entries)}`;
}

/** Starter questions, so the page does not open on an empty box. */
export const STARTERS: { label: string; q: string }[] = [
  { label: "Recent AI model launches", q: "Which AI models have been released recently?" },
  { label: "What should I learn next?", q: "What technologies should I learn this semester to be employable?" },
  { label: "Is the job market bad?", q: "What are hiring conditions like for engineering graduates right now?" },
  { label: "Agentic AI", q: "What are agentic AI systems and why is everyone hiring for them?" },
  { label: "AI vs fundamentals", q: "Should I focus on AI tools or on core computer science fundamentals?" },
  { label: "Making a portfolio count", q: "What makes a student portfolio stand out now?" },
];
