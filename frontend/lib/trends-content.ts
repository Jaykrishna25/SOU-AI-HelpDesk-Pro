/* ============================================================
   Market & Technology Radar — the curated briefing.

   WHY THIS FILE EXISTS AT ALL
   ---------------------------
   The obvious way to build "an agent that tells students what is
   new in the market" is to ask a language model. That is also the
   way to get a confident, well-written, six-months-out-of-date
   answer, because a model's knowledge stops at its training cut-off
   and it has no way to tell you that.

   "Which AI models launched recently?" is the worst possible
   question to put to a model unaided. It will name the newest ones
   IT knows about and present them as current. A student planning
   what to learn acts on that.

   So the model here never supplies facts. It only explains, groups
   and relates the entries below, every one of which carries the
   date it was checked and where it came from. Anything outside this
   file, the agent says it does not know.

   KEEPING IT HONEST
   -----------------
   A dated file is a promise to maintain it. `checkedOn` is not
   decoration - trends-core.ts turns it into a freshness state, the
   panel shows that state to the student, and an entry past
   STALE_AFTER_DAYS is withheld from the model rather than quietly
   served as current.

   TO REFRESH: edit the entries, set `checkedOn` to the date you
   actually verified the claim against `source`, and run the tests.
   `RADAR_REVIEWED_ON` below is the whole-file review date - move it
   only when you have been through every section.
   ============================================================ */

/** The date a human last reviewed this entire file. YYYY-MM-DD. */
export const RADAR_REVIEWED_ON = "2026-09-20";

export type RadarKind = "model" | "skill" | "market";

export interface RadarItem {
  id: string;
  kind: RadarKind;
  title: string;
  /** Two or three sentences. Plain statement of fact, no persuasion. */
  body: string;
  /** The date someone verified this against `sourceUrl`. YYYY-MM-DD. */
  checkedOn: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  /** Models only: who released it. */
  vendor?: string;
}

/* ------------------------------------------------------------------
   1. AI MODEL LAUNCHES

   The fastest-moving section and the one most likely to be wrong.
   Release trackers disagree with each other and with vendor blogs,
   so each entry names the tracker it came from rather than implying
   the vendor confirmed it. Where a claim could not be checked
   against a primary source, that is stated in the body - a student
   quoting this in an interview should know how firm it is.
   ------------------------------------------------------------------ */

const MODELS: RadarItem[] = [
  {
    id: "m-gpt6-astra",
    kind: "model",
    vendor: "OpenAI",
    title: "GPT-6 Astra",
    body:
      "Listed as released on 4 September 2026 and described as OpenAI's next frontier " +
      "reasoning model. Capability claims come from the tracker, not from a vendor " +
      "benchmark this file has verified — treat published scores as unconfirmed.",
    checkedOn: "2026-09-20",
    sourceName: "LLM Stats release log",
    sourceUrl: "https://llm-stats.com/llm-updates",
    tags: ["frontier", "reasoning", "openai"],
  },
  {
    id: "m-gemini-38-flash",
    kind: "model",
    vendor: "Google",
    title: "Gemini 3.8 Flash",
    body:
      "Listed 2 September 2026. A lightweight, low-latency variant rather than a new " +
      "frontier tier. Flash-class models matter to students because they are what most " +
      "student projects can actually afford to call in a loop.",
    checkedOn: "2026-09-20",
    sourceName: "LLM Stats release log",
    sourceUrl: "https://llm-stats.com/llm-updates",
    tags: ["efficient", "google", "cheap-inference"],
  },
  {
    id: "m-deepseek-v41-flash",
    kind: "model",
    vendor: "DeepSeek",
    title: "DeepSeek-V4.1-Flash",
    body:
      "Listed 10 September 2026, an inference-speed-focused revision of the V4 line. " +
      "The open-weight labs are the reason a college lab can run a capable model on " +
      "its own hardware, so this line is worth following even if you never pay for it.",
    checkedOn: "2026-09-20",
    sourceName: "LLM Stats release log",
    sourceUrl: "https://llm-stats.com/llm-updates",
    tags: ["open-weights", "efficient", "deepseek"],
  },
  {
    id: "m-kimi-k28",
    kind: "model",
    vendor: "Moonshot AI",
    title: "Kimi K2.8 Preview",
    body:
      "Listed 11 September 2026 as a preview. A preview label matters: APIs and prices " +
      "at this stage change without notice, so it is a poor foundation for a final-year " +
      "project you need to demo in April.",
    checkedOn: "2026-09-20",
    sourceName: "LLM Stats release log",
    sourceUrl: "https://llm-stats.com/llm-updates",
    tags: ["preview", "moonshot"],
  },
  {
    id: "m-release-pace",
    kind: "model",
    vendor: "(several)",
    title: "The release pace itself is the finding",
    body:
      "One tracker listed several hundred model releases across 2026 and updates hourly. " +
      "The practical lesson for a student is not which model is ahead this month — that " +
      "changes — but that anything you build should be able to swap the model behind it. " +
      "Skill in the surrounding system outlasts skill in one vendor's API.",
    checkedOn: "2026-09-20",
    sourceName: "LLM Stats release log",
    sourceUrl: "https://llm-stats.com/llm-updates",
    tags: ["strategy", "portability"],
  },
];

/* ------------------------------------------------------------------
   2. SKILLS WORTH LEARNING

   Written as claims a student can act on this semester. Anything
   phrased as "the future of work" was left out; it is not something
   anyone can act on and it ages badly.
   ------------------------------------------------------------------ */

const SKILLS: RadarItem[] = [
  {
    id: "s-agentic",
    kind: "skill",
    title: "Building agentic systems, not just calling an API",
    body:
      "Reported hiring for agent-focused roles grew sharply through 2026, and engineering " +
      "leaders widely report a skills gap as autonomous systems reach production. The gap " +
      "is in the unglamorous half: tool definitions, retries, evaluation, guardrails and " +
      "cost control. Prompting is the part everyone already has.",
    checkedOn: "2026-09-20",
    sourceName: "Industry hiring coverage, 2026",
    sourceUrl: "https://jobsbyculture.com/blog/agentic-ai-hiring-boom-2026",
    tags: ["ai", "agents", "high-demand"],
  },
  {
    id: "s-fullstack",
    kind: "skill",
    title: "Full-stack web: JavaScript/TypeScript, React, Node",
    body:
      "Full-stack developer remains among the most-listed technical roles in Indian " +
      "hiring guides for 2026. It is also the fastest route from coursework to something " +
      "you can show, which is why it is still the highest-return first specialism.",
    checkedOn: "2026-09-20",
    sourceName: "Qureos — In-demand tech jobs in India",
    sourceUrl: "https://www.qureos.com/career-guide/in-demand-tech-jobs-in-india",
    tags: ["web", "beginner-friendly", "india"],
  },
  {
    id: "s-cloud",
    kind: "skill",
    title: "Cloud and containers: AWS or Azure, Docker, Kubernetes, CI/CD",
    body:
      "Cloud architecture and DevOps sit in every 2026 in-demand list for India and are " +
      "named among the better-paid specialisms. Free tiers make this learnable without a " +
      "budget, and deploying one small service end to end teaches more than a course.",
    checkedOn: "2026-09-20",
    sourceName: "Qureos — In-demand tech jobs in India",
    sourceUrl: "https://www.qureos.com/career-guide/in-demand-tech-jobs-in-india",
    tags: ["cloud", "devops", "india"],
  },
  {
    id: "s-data",
    kind: "skill",
    title: "Data: SQL first, then Python and the analysis stack",
    body:
      "Data scientist and analyst roles stay near the top of demand lists, but SQL is the " +
      "part that appears in nearly every job ad regardless of title. It is a week of work " +
      "to become competent and it is checked in interviews more often than machine learning.",
    checkedOn: "2026-09-20",
    sourceName: "Qureos — In-demand tech jobs in India",
    sourceUrl: "https://www.qureos.com/career-guide/in-demand-tech-jobs-in-india",
    tags: ["data", "sql", "beginner-friendly"],
  },
  {
    id: "s-security",
    kind: "skill",
    title: "Security fundamentals",
    body:
      "Cybersecurity analyst is a standing entry in Indian demand lists, and security " +
      "questions now arrive in ordinary backend interviews: authentication, authorisation, " +
      "injection, secret handling. You do not need a specialism to be expected to know these.",
    checkedOn: "2026-09-20",
    sourceName: "Qureos — In-demand tech jobs in India",
    sourceUrl: "https://www.qureos.com/career-guide/in-demand-tech-jobs-in-india",
    tags: ["security", "india"],
  },
  {
    id: "s-fundamentals",
    kind: "skill",
    title: "The fundamentals did not stop mattering",
    body:
      "Data structures, databases, networks and operating systems are still what campus " +
      "and off-campus interviews test, and they are what lets you debug a system an AI " +
      "tool wrote. Chasing only the newest framework is the most common way a strong " +
      "student ends up unable to answer the first round.",
    checkedOn: "2026-09-20",
    sourceName: "Editorial position of this radar",
    sourceUrl: "",
    tags: ["fundamentals", "interviews"],
  },
];

/* ------------------------------------------------------------------
   3. MARKET CONDITIONS

   Context, not advice. A student reading "hiring is down" should
   also read what that changes about how they apply.
   ------------------------------------------------------------------ */

const MARKET: RadarItem[] = [
  {
    id: "k-it-bpm-scale",
    kind: "market",
    title: "India's IT–BPM sector, by size",
    body:
      "Reported at roughly 5.4 million professionals and about $254 billion in annual " +
      "revenue. The figure is worth knowing mainly as scale: this is a large, still-hiring " +
      "employer base, not a closing door, whatever a given quarter's headlines say.",
    checkedOn: "2026-09-20",
    sourceName: "Qureos — In-demand tech jobs in India",
    sourceUrl: "https://www.qureos.com/career-guide/in-demand-tech-jobs-in-india",
    tags: ["india", "sector"],
  },
  {
    id: "k-ai-skills-gap",
    kind: "market",
    title: "Demand is concentrated at the AI-adjacent edge",
    body:
      "Coverage through 2026 describes strong growth in AI and agent-related roles " +
      "alongside a widely reported skills gap, while general openings are more " +
      "competitive. In practice that means a demonstrated project beats a certificate, " +
      "because the gap employers describe is in doing, not in knowing.",
    checkedOn: "2026-09-20",
    sourceName: "Industry hiring coverage, 2026",
    sourceUrl: "https://jobsbyculture.com/blog/agentic-ai-hiring-boom-2026",
    tags: ["hiring", "ai"],
  },
  {
    id: "k-portfolio",
    kind: "market",
    title: "What a portfolio has to prove now",
    body:
      "When anyone can generate a working CRUD app, a repository of them proves less than " +
      "it did. What still reads as evidence: something deployed and used by people who are " +
      "not you, a written account of a decision you got wrong, and tests. This portal is " +
      "itself an example — the defensible parts are the boundaries, not the feature count.",
    checkedOn: "2026-09-20",
    sourceName: "Editorial position of this radar",
    sourceUrl: "",
    tags: ["portfolio", "interviews"],
  },
];

export const RADAR: RadarItem[] = [...MODELS, ...SKILLS, ...MARKET];

export const KIND_LABEL: Record<RadarKind, string> = {
  model: "AI model launches",
  skill: "Skills to learn",
  market: "Market conditions",
};

export const KIND_BLURB: Record<RadarKind, string> = {
  model: "What has been released recently, and how firm each claim is.",
  skill: "What to put this semester into, with the reason attached.",
  market: "Conditions you are graduating into, without the doom or the hype.",
};
