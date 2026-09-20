import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { fetchStudentResults } from "@/lib/study-db";
import { scoreOf } from "@/lib/study-math";
import {
  planToday, diffAgainstMemory, nextMemory, factsBlock, BRIEFING_SYSTEM,
  modelRelease, toolRelease, pickFresh,
  type Listing, type Release,
} from "@/lib/briefing-core";

/* ============================================================
   The morning briefing agent.

   Runs unattended on Vercel Cron. Nobody is at the keyboard —
   that is the whole point. An agent that needs you to press a
   button is a chat box with extra steps.

   Loop: plan → act → observe → report → remember.
   The planning, the parsing and the diffing live in
   briefing-core.ts, pure and unit tested; this file is the
   network, the model and the database.

   Three feeds, none of which needs an API key:

     Remotive      openings, matched to this student's subjects
     Hugging Face  AI models published recently and trending now
     GitHub        repositories created recently, gaining stars

   Openings are personal, so they are fetched per student. Models
   and tools are identical for everyone, so they are fetched ONCE
   per run and shared — partly because recomputing them 200 times
   is waste, but mainly because GitHub's unauthenticated search
   allows about ten requests a minute and would cut us off inside
   the first dozen students.

   Temperature is 1.0, which is high. That is safe here because
   of how the two halves are split:

     - Every figure — download counts, star counts, ages, the
       number of new items — comes from a feed and from
       deterministic TypeScript. The model never sees a number it
       could alter.
     - Temperature 1.0 applies only to the WRITING, which
       receives the gathered facts and is told it may not add
       to them.

   So the brief reads differently each morning — which is why
   anybody reads the second one — while the names and counts are
   whatever the feeds returned.

   Ollama was the original plan and cannot run here: Vercel has
   no persistent process and nothing like the memory an 8B model
   needs. The Python version in ai-agent/ keeps that path for
   the offline demonstration; this one keeps the same loop.
   ============================================================ */

const MODEL = process.env.BRIEFING_MODEL || process.env.AI_CHAT_MODEL || "gemini-3.6-flash";
const TEMPERATURE = Number(process.env.BRIEFING_TEMPERATURE ?? 1.0);

const JOBS_ENDPOINT = "https://remotive.com/api/remote-jobs";
const MODELS_ENDPOINT = "https://huggingface.co/api/models";
const TOOLS_ENDPOINT = "https://api.github.com/search/repositories";
const FEED_TIMEOUT_MS = 12_000;
const UA = "sou-briefing-agent/2.0 (Silver Oak University portal)";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }

/**
 * Turn a thrown error into something safe to show a student.
 *
 * An unhandled throw in a route handler returns an empty 500 body, which tells
 * the reader nothing. Returning the message is far more useful — but database
 * errors can carry the connection string, so anything that looks like a URL
 * with credentials in it is removed before the text leaves the server.
 */
function safeError(e: any): string {
  const name = String(e?.name || "Error");

  const cleaned = String(e?.message || e || "unknown failure")
    .replace(/[a-z]+:\/\/[^\s"']+/gi, "[redacted connection string]")
    /* Prisma quotes the whole bundled module path back at you. Under Turbopack
       that is 200 characters of `__TURBOPACK__imported__module__$5b$project...`
       before the sentence that matters. */
    .replace(/Invalid\s+`[^`]*?\["?(\w+)"?\]\.(\w+)\.(\w+)\(\)`\s+invocation[^\n]*/i,
             "Invalid prisma.$2.$3() call")
    .replace(/Invalid\s+`[^`]*`\s+invocation[^\n]*/i, "Invalid Prisma call")
    .replace(/\s+in\s+[A-Za-z]:\\[^\s]+/g, "");

  const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);

  /* Prisma prints the offending argument and then the valid ones. Those two
     lines are the entire diagnosis, and they are usually a long way down. */
  const useful = lines.filter(l =>
    /^Invalid Prisma|Unknown argument|Available options|Argument `|is missing|Expected/i.test(l));

  const body = (useful.length ? useful : lines.slice(0, 3)).join(" · ").slice(0, 500);
  return `${name}: ${body}`;
}
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/briefing\/?/, "").split("/").filter(Boolean);
}

/** Every outbound call goes through here, so every one of them has a timeout. */
async function getJSON(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 1800 },
    } as any);
    if (!r.ok) throw new Error("feed returned " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- act: openings, per student ---------------- */

async function fetchJobs(keywords: string[], perKeyword = 4) {
  const listings: Listing[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const kw of keywords) {
    try {
      const data = await getJSON(
        `${JOBS_ENDPOINT}?search=${encodeURIComponent(kw)}&limit=${perKeyword}`,
      );
      for (const j of Array.isArray(data?.jobs) ? data.jobs : []) {
        const url = String(j?.url || "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        listings.push({
          title: String(j?.title || "Untitled role"),
          company: String(j?.company_name || "unknown company"),
          location: String(j?.candidate_required_location || "location not stated"),
          url,
          matchedOn: kw,
        });
      }
    } catch (e: any) {
      errors.push(`jobs/${kw}: ${String(e?.message || e).slice(0, 60)}`);
    }
  }
  return { listings, errors };
}

/* ---------------- act: the shared world ---------------- */

interface World { releases: Release[]; errors: string[] }

/* Held for the length of one cron run. Deliberately in memory rather than in
   the database: it is a cache, not a fact, and a cold start losing it costs
   two HTTP calls. */
let worldCache: { at: number; world: World } | null = null;
const WORLD_TTL_MS = 30 * 60_000;

async function fetchModels(now: Date): Promise<{ items: Release[]; error?: string }> {
  try {
    /* Sorted by Hugging Face's own trending score, which is recent activity
       rather than all-time downloads. Sorting by downloads would return the
       same handful of 2018 models every single morning. */
    const raw = await getJSON(`${MODELS_ENDPOINT}?sort=trendingScore&direction=-1&limit=20`);
    const parsed = (Array.isArray(raw) ? raw : [])
      .map(r => modelRelease(r, now))
      .filter((r): r is Release => !!r);
    return { items: pickFresh(parsed).slice(0, 8) };
  } catch (e: any) {
    return { items: [], error: `models: ${String(e?.message || e).slice(0, 60)}` };
  }
}

async function fetchTools(now: Date): Promise<{ items: Release[]; error?: string }> {
  try {
    /* Created in the last 60 days AND already past 300 stars. Either half
       alone is useless: "newest repositories" is mostly empty scaffolding,
       and "most starred" is a museum. The intersection is the thing a
       student would actually want to hear about. */
    const since = new Date(now.getTime() - 60 * 86_400_000).toISOString().slice(0, 10);
    const q = encodeURIComponent(`created:>${since} stars:>300`);
    const raw = await getJSON(`${TOOLS_ENDPOINT}?q=${q}&sort=stars&order=desc&per_page=10`);
    const parsed = (Array.isArray(raw?.items) ? raw.items : [])
      .map((r: any) => toolRelease(r, now))
      .filter((r: Release | null): r is Release => !!r);
    return { items: pickFresh(parsed).slice(0, 8) };
  } catch (e: any) {
    return { items: [], error: `tools: ${String(e?.message || e).slice(0, 60)}` };
  }
}

async function fetchWorld(now: Date): Promise<World> {
  if (worldCache && Date.now() - worldCache.at < WORLD_TTL_MS) return worldCache.world;

  const [m, t] = await Promise.all([fetchModels(now), fetchTools(now)]);
  const world: World = {
    releases: [...m.items, ...t.items],
    errors: [m.error, t.error].filter(Boolean) as string[],
  };

  /* Only cache a usable result. Caching a total failure for half an hour
     would turn one bad minute into a bad morning for everybody. */
  if (world.releases.length) worldCache = { at: Date.now(), world };
  return world;
}

/* ---------------- the run ---------------- */

async function runFor(userId: string, name: string) {
  const rows = await fetchStudentResults(userId);
  if (!rows || !rows.length) {
    return { skipped: "no-results" as const };
  }

  const now = new Date();

  // PLAN — deterministic. The model does not choose its own topic.
  const plan = planToday(rows.map(r => ({ subject: r.subjectName, score: scoreOf(r) })));

  // ACT — personal feed and shared feeds together.
  const [jobs, world] = await Promise.all([fetchJobs(plan.keywords), fetchWorld(now)]);
  const errors = [...jobs.errors, ...world.errors];

  // OBSERVE — against what this user has already been shown.
  const prior = await prisma.briefing.findUnique({ where: { userId } });
  const seen = prior?.seenUrls ?? [];
  const last = prior?.lastRunAt ?? null;
  const jobDelta = diffAgainstMemory(jobs.listings, seen, last, now);
  const releaseDelta = diffAgainstMemory(world.releases, seen, last, now);

  // REPORT
  const facts = factsBlock({
    plan, jobs: jobs.listings, jobDelta,
    releases: world.releases, releaseDelta, errors, now,
  });

  const hour = now.getHours();
  const greeting =
    hour < 12 ? `Good morning, ${name}.`
    : hour < 17 ? `Good afternoon, ${name}.`
    : `Good evening, ${name}.`;

  let body: string;
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("no API key configured");
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: MODEL,
      temperature: TEMPERATURE,
      maxOutputTokens: 500,
    });
    const res: any = await llm.invoke([
      new SystemMessage(BRIEFING_SYSTEM),
      new HumanMessage(facts),
    ]);
    body = (typeof res?.content === "string"
      ? res.content
      : Array.isArray(res?.content)
        ? res.content.map((c: any) => c?.text || "").join("")
        : String(res?.content ?? "")).trim();
    if (!body) throw new Error("empty response");
  } catch (e: any) {
    /* The facts are already gathered and correct by this point, so degrade to
       them rather than to nothing. A plain list beats an error message. */
    body =
      "The briefing could not be written up — the model was not reachable. "
      + "The findings themselves are below, unchanged.\n\n" + facts;
  }

  // REMEMBER — one list covering all three streams.
  const seenUrls = nextMemory(seen, [...jobs.listings, ...world.releases]);
  const newReleases = releaseDelta.newItems;

  const data = {
    body, greeting,
    plan: plan as any,
    listings: jobDelta.newItems.slice(0, 6) as any,
    releases: newReleases.slice(0, 8) as any,
    newCount: jobDelta.newItems.length,
    releaseCount: newReleases.length,
    seenUrls,
    model: MODEL,
    lastRunAt: now,
  };

  const saved = await prisma.briefing.upsert({
    where: { userId },
    create: { userId, ...data, runs: 1 },
    update: { ...data, runs: { increment: 1 } },
  });

  return { saved, plan, jobDelta, releaseDelta, errors };
}

/** The shape the card reads. One place, so the two endpoints cannot drift. */
function present(b: any) {
  return {
    greeting: b.greeting,
    body: b.body,
    plan: b.plan,
    listings: b.listings,
    releases: b.releases ?? [],
    newCount: b.newCount,
    releaseCount: b.releaseCount ?? 0,
    model: b.model,
    temperature: TEMPERATURE,
    runs: b.runs,
    lastRunAt: b.lastRunAt,
  };
}

/* ---------------- endpoints ---------------- */

export async function GET(req: NextRequest) {
  const p = seg(req);

  /* ---- the scheduled run ----
     Vercel Cron issues a GET, not a POST, and there is no session on it. It
     is authorised by a shared secret instead — without one, this endpoint
     would let anyone on the internet drain the API quota. */
  if (p[0] === "cron") {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization") || "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return json({ error: "Not authorised" }, 401);
    }

    const students = await prisma.user.findMany({
      where: { isActive: true, role: "STUDENT" },
      select: { id: true, fullName: true },
      take: 200,
    });

    /* The function is killed at 60 seconds. Stopping early and reporting how
       far we got is honest; being killed mid-write is not. */
    const deadline = Date.now() + 50_000;

    let written = 0, skipped = 0, unreached = 0;
    for (const u of students) {
      if (Date.now() > deadline) { unreached = students.length - written - skipped; break; }
      try {
        const r = await runFor(u.id, (u.fullName || "there").split(" ")[0]);
        if ("skipped" in r) skipped++; else written++;
      } catch {
        skipped++;   // one student's failure must not stop the rest
      }
    }
    return json({ ok: true, written, skipped, unreached, total: students.length });
  }

  /* ---- the signed-in user's latest ---- */
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  const b = await prisma.briefing.findUnique({ where: { userId: s.userId } });
  if (!b) return json({ briefing: null });

  return json({ briefing: present(b) });
}

export async function POST(req: NextRequest) {
  const p = seg(req);

  /* ---- run it now, for the signed-in user ---- */
  if (p[0] === "run") {
    const s = await getLiveSession(req);
    if (!s) return json({ error: "Unauthenticated" }, 401);
    if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

    try {
      const r = await runFor(s.userId, (s.fullName || "there").split(" ")[0]);
      if ("skipped" in r) {
        return json({
          error: "No examination results are recorded for this account, so the "
               + "agent has nothing to build a plan from.",
        }, 422);
      }
      return json({ briefing: present(r.saved) });
    } catch (e: any) {
      console.error("[briefing] manual run failed:", e);
      return json({ error: safeError(e) }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}
