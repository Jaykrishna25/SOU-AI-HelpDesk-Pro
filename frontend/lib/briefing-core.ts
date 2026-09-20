/* ============================================================
   The morning briefing agent — planning, parsing and memory.

   Pure functions. No Prisma, no network, no model. Everything
   that decides WHAT the briefing is about lives here, which is
   what makes an unattended job testable.

   What makes this agentic rather than another prompt
   ---------------------------------------------------
   Every other AI feature in this portal answers a question
   somebody asked. This one runs on a schedule with nobody at the
   keyboard, decides what is worth saying, and says it first:

     1. PLAN    — picks what to look for, from the student's own
                  strongest subjects. Deterministic; the model
                  does not choose the subject of its own briefing.
     2. ACT     — calls three live feeds.
     3. OBSERVE — compares against what it showed last time.
     4. REPORT  — writes up what CHANGED.
     5. REMEMBER— stores what it showed, so tomorrow differs.

   Step 3 is the one that matters. A digest that prints the same
   thing every morning is ignored by Wednesday.

   The three streams
   -----------------
     JOBS   — Remotive. Personal: the keywords come from this
              student's own strongest subjects.
     MODELS — Hugging Face trending. Shared: which AI models are
              actually being picked up right now.
     TOOLS  — GitHub, repositories created recently that have
              already gathered stars. Shared: what is new in the
              wider stack.

   Jobs are computed per student. Models and tools are the same
   for everybody, so they are fetched once per run and shared —
   both because it is correct and because 200 students each
   calling GitHub would be rate-limited within seconds.
   ============================================================ */

/** Below this score a subject does not drive the search. */
export const EMPLOYABLE = 60;

/** How many URLs to remember. Enough for months; bounded so the row cannot grow forever. */
export const MEMORY_LIMIT = 600;

/** A release older than this is not "new" for briefing purposes. */
export const RELEASE_MAX_AGE_DAYS = 75;

export interface ScoredSubject {
  subject: string;
  score: number;
}

export interface Listing {
  title: string;
  company: string;
  location: string;
  url: string;
  matchedOn: string;
}

/** A newly published AI model, or a newly popular open-source tool. */
export interface Release {
  kind: "model" | "tool";
  title: string;
  /** Who published it. */
  by: string;
  /** Counted facts only — likes, downloads, stars. Never a judgement. */
  detail: string;
  url: string;
  ageDays: number | null;
}

/* ---------------- plan ---------------- */

export interface Plan {
  keywords: string[];
  /** The subject the brief leads with. */
  focus: string;
  reason: string;
}

const SKILL_MAP: Record<string, string[]> = {
  "data structure": ["algorithms"],
  "algorithm": ["algorithms"],
  "database": ["sql", "database"],
  "dbms": ["sql", "database"],
  "operating system": ["linux", "systems"],
  "computer network": ["networking"],
  "network": ["networking"],
  "software engineering": ["software engineer"],
  "web technolog": ["web developer"],
  "web develop": ["web developer"],
  "machine learning": ["machine learning"],
  "artificial intelligence": ["machine learning"],
  "data science": ["data science"],
  "cloud": ["cloud"],
  "information security": ["cybersecurity"],
  "cyber": ["cybersecurity"],
  "mobile application": ["android"],
  "android": ["android"],
  "python": ["python"],
  "java": ["java"],
};

export function skillsFor(subject: string): string[] {
  const s = String(subject || "").toLowerCase();
  for (const [key, skills] of Object.entries(SKILL_MAP)) {
    if (s.includes(key)) return skills;
  }
  return [];
}

/**
 * Decide what this morning's briefing is about.
 *
 * Deliberately NOT a model call: a decision this cheap should be
 * deterministic and inspectable. The model writes the brief; it does not
 * choose the topic.
 *
 * The rule is to match the market against what the student is GOOD at.
 * Their weak subjects belong to the study plan, and opening a morning
 * briefing with a list of failures is not a thing anyone should build.
 */
export function planToday(rows: ScoredSubject[], limit = 4): Plan {
  const strong = [...(rows || [])]
    .filter(r => Number.isFinite(r.score) && r.score >= EMPLOYABLE)
    .sort((a, b) => b.score - a.score);

  const keywords: string[] = [];
  /* Only subjects that actually contributed a keyword can be the focus.
     Using the top scorer regardless produced a brief headed "strongest
     subject: Yoga" while searching SQL roles — incoherent, and the sort of
     thing nobody notices until it is read aloud. */
  const contributing: ScoredSubject[] = [];

  for (const r of strong) {
    const skills = skillsFor(r.subject);
    if (!skills.length) continue;
    contributing.push(r);
    for (const s of skills) if (!keywords.includes(s)) keywords.push(s);
    if (keywords.length >= limit) break;
  }

  if (!keywords.length) {
    return {
      keywords: ["computer science"],
      focus: "general",
      reason: "No subject mapped to a skill keyword, so the search is broad.",
    };
  }

  return {
    keywords: keywords.slice(0, limit),
    focus: contributing[0].subject,
    reason: "Matched on: " + contributing.slice(0, 3).map(c => c.subject).join(", "),
  };
}

/* ---------------- parse: feeds into releases ---------------- */

function num(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function ageDaysOf(iso: any, now: Date = new Date()): number | null {
  const d = new Date(String(iso || ""));
  if (isNaN(d.getTime())) return null;
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  return days < 0 ? 0 : days;
}

/**
 * One Hugging Face model record into a Release.
 *
 * Only counted facts survive: likes, downloads, the pipeline tag and the age.
 * Nothing here is an opinion about whether the model is any good, because the
 * feed does not know that and neither do we.
 */
export function modelRelease(raw: any, now: Date = new Date()): Release | null {
  const id = String(raw?.id || raw?.modelId || "").trim();
  if (!id) return null;

  const likes = num(raw?.likes);
  const downloads = num(raw?.downloads);
  const task = String(raw?.pipeline_tag || "").trim();
  const ageDays = ageDaysOf(raw?.createdAt, now);

  const bits: string[] = [];
  if (likes) bits.push(`${likes.toLocaleString("en-IN")} likes`);
  if (downloads) bits.push(`${downloads.toLocaleString("en-IN")} downloads`);
  if (task) bits.push(task.replace(/-/g, " "));

  return {
    kind: "model",
    title: id.includes("/") ? id.split("/").slice(1).join("/") : id,
    by: id.includes("/") ? id.split("/")[0] : "unknown",
    detail: bits.join(" · ") || "no usage figures published",
    url: `https://huggingface.co/${id}`,
    ageDays,
  };
}

/** One GitHub repository record into a Release. */
export function toolRelease(raw: any, now: Date = new Date()): Release | null {
  const url = String(raw?.html_url || "").trim();
  const name = String(raw?.name || "").trim();
  if (!url || !name) return null;

  const stars = num(raw?.stargazers_count);
  const lang = String(raw?.language || "").trim();
  const ageDays = ageDaysOf(raw?.created_at, now);

  const bits: string[] = [];
  if (stars) bits.push(`${stars.toLocaleString("en-IN")} stars`);
  if (lang) bits.push(lang);

  /* The repository's own one-line description, trimmed. It is the author's
     words, not the model's, which is the point. */
  const desc = String(raw?.description || "").replace(/\s+/g, " ").trim();
  if (desc) bits.push(desc.length > 90 ? desc.slice(0, 89) + "…" : desc);

  return {
    kind: "tool",
    title: name,
    by: String(raw?.owner?.login || "unknown"),
    detail: bits.join(" · ") || "no description published",
    url,
    ageDays,
  };
}

/**
 * Keep the genuinely recent ones — but never return an empty list purely
 * because the window was tight. Showing three slightly older releases beats
 * showing none and letting the model imply the field went quiet.
 */
export function pickFresh(
  items: Release[],
  maxAgeDays = RELEASE_MAX_AGE_DAYS,
  floor = 3,
): Release[] {
  const list = items || [];
  const fresh = list.filter(r => r.ageDays === null || r.ageDays <= maxAgeDays);
  return fresh.length >= Math.min(floor, list.length) ? fresh : list;
}

/* ---------------- observe ---------------- */

export interface HasUrl { url: string }

export interface Delta<T extends HasUrl> {
  newItems: T[];
  repeatCount: number;
  firstRun: boolean;
  daysSinceLast: number | null;
}

/**
 * Generic over the three streams: a job, a model and a tool are all just
 * something with a URL that this student either has or has not been shown.
 * One shared memory list covers all three.
 */
export function diffAgainstMemory<T extends HasUrl>(
  items: T[],
  seenUrls: string[],
  lastRun: Date | null,
  now: Date = new Date(),
): Delta<T> {
  const seen = new Set(seenUrls || []);
  const newItems = (items || []).filter(l => !seen.has(l.url));

  let daysSinceLast: number | null = null;
  if (lastRun instanceof Date && !isNaN(lastRun.getTime())) {
    daysSinceLast = Math.floor((now.getTime() - lastRun.getTime()) / 86_400_000);
  }

  return {
    newItems,
    repeatCount: (items || []).length - newItems.length,
    firstRun: seen.size === 0,
    daysSinceLast,
  };
}

/** What to store for next time. Bounded, newest kept. */
export function nextMemory(seenUrls: string[], items: HasUrl[]): string[] {
  const merged = [...(seenUrls || []), ...(items || []).map(l => l.url)];
  return [...new Set(merged)].slice(-MEMORY_LIMIT);
}

/* ---------------- report ---------------- */

export interface FactsInput {
  plan: Plan;
  jobs: Listing[];
  jobDelta: Delta<Listing>;
  releases: Release[];
  releaseDelta: Delta<Release>;
  errors: string[];
  now?: Date;
}

/**
 * Exactly what the model is allowed to know. Nothing else reaches it.
 *
 * Every number in here was computed by the functions above or came straight
 * off a feed. The model receives facts and is told it may not add to them —
 * which is what makes a high temperature safe: the prose varies, the figures
 * cannot.
 */
export function factsBlock(input: FactsInput): string {
  const { plan, jobs, jobDelta, releases, releaseDelta, errors } = input;
  const now = input.now ?? new Date();

  const lines: string[] = [
    `Today: ${now.toDateString()}`,
    `Job search keywords, taken from the student's strongest subjects: ${plan.keywords.join(", ")}`,
    `Strongest mapped subject: ${plan.focus}`,
    "",
  ];

  if (jobDelta.firstRun) {
    lines.push("This is the first briefing ever generated for this student.");
  } else if (jobDelta.daysSinceLast !== null) {
    lines.push(`Days since the last briefing: ${jobDelta.daysSinceLast}`);
  }

  /* ---- jobs ---- */
  lines.push("");
  lines.push("=== OPENINGS ===");
  if (!jobs.length && errors.some(e => e.startsWith("jobs"))) {
    lines.push("THE JOBS FEED COULD NOT BE REACHED. There are no openings today.");
  } else {
    lines.push(`New openings since the last briefing: ${jobDelta.newItems.length}`);
    lines.push(`Openings already shown before: ${jobDelta.repeatCount}`);
    if (jobDelta.newItems.length) {
      for (const l of jobDelta.newItems.slice(0, 5)) {
        lines.push(`- ${l.title} at ${l.company} (${l.location}) [matched: ${l.matchedOn}]`);
      }
    } else {
      lines.push("No new openings today — everything returned was shown in a previous briefing.");
    }
  }

  /* ---- new AI models ---- */
  const models = releaseDelta.newItems.filter(r => r.kind === "model");
  lines.push("");
  lines.push("=== AI MODELS PUBLISHED RECENTLY (from Hugging Face, trending now) ===");
  if (!releases.some(r => r.kind === "model") && errors.some(e => e.startsWith("models"))) {
    lines.push("THE MODELS FEED COULD NOT BE REACHED.");
  } else if (!models.length) {
    lines.push("Nothing here that this student has not already been shown.");
  } else {
    for (const r of models.slice(0, 5)) {
      const age = r.ageDays === null ? "date unknown" : `published ${r.ageDays} day(s) ago`;
      lines.push(`- ${r.title} by ${r.by} — ${r.detail}; ${age}`);
    }
  }

  /* ---- new tools ---- */
  const tools = releaseDelta.newItems.filter(r => r.kind === "tool");
  lines.push("");
  lines.push("=== OPEN-SOURCE TOOLS CREATED RECENTLY THAT ARE GAINING STARS (from GitHub) ===");
  if (!releases.some(r => r.kind === "tool") && errors.some(e => e.startsWith("tools"))) {
    lines.push("THE TOOLS FEED COULD NOT BE REACHED.");
  } else if (!tools.length) {
    lines.push("Nothing here that this student has not already been shown.");
  } else {
    for (const r of tools.slice(0, 5)) {
      const age = r.ageDays === null ? "date unknown" : `created ${r.ageDays} day(s) ago`;
      lines.push(`- ${r.title} by ${r.by} — ${r.detail}; ${age}`);
    }
  }

  if (errors.length) {
    lines.push("");
    lines.push("Feeds that failed: " + errors.join("; "));
  }

  return lines.join("\n");
}

export const BRIEFING_SYSTEM = `You write a short morning briefing for one university computer science student.

You are given three kinds of fact: job openings matched to this student's
strongest subjects, AI models published recently, and open-source tools
created recently that are gaining stars.

HARD RULES:
1. Use ONLY the facts given below. Do not invent a company, a model, a repository,
   a number, a date, a benchmark or a trend. If the facts are thin the briefing
   is short — that is fine and honest.
2. Never predict anything: not salaries, not hiring trends, not which model will
   win, not the student's chances. You have no basis for any of it.
3. Do not rank or rate a model or a tool you have only been given download counts
   for. Popularity is not quality and you must not imply that it is.
4. Do not flatter. No "great news", no exclamation marks, no "exciting
   opportunity", no "game changer". A briefing is read at 8am by someone who has
   not had tea.
5. Four to six sentences. Lead with what CHANGED since the last briefing. Cover
   openings first, then models, then tools — but skip any section that has
   nothing new rather than padding it.
6. If a feed failed, say that feed could not be reached. Do not dress it up as
   "a quiet day in the market" — that would be inventing a market condition out
   of a network error.

Plain British English. No headings, no bullet points, no sign-off.`;
