import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import {
  generatePlan, progressOf, studyStreak, recentMinutes,
  MAX_DAYS, MAX_HOURS_PER_DAY, MAX_SUBJECTS,
} from "@/lib/plan-core";
import {
  chunkPages, topPassages, citationsOf, docFacts, DOC_SYSTEM, NO_MATCH,
  type Page,
} from "@/lib/doc-rag";
import { normaliseQuiz, QUIZ_SYSTEM } from "@/lib/quiz-core";

/* ============================================================
   Study planner, document reader and quiz studio.

   Three features, one route, because they share a student's
   study context and splitting them would mean three copies of
   the same auth and the same model wiring.

   What is stored and what is not
   ------------------------------
   STORED: the generated timetable and which slots the student
   has ticked off, plus a row per quiz attempt. That is what
   makes the tracker and the analytics real rather than a number
   that resets on refresh.

   NOT STORED: the uploaded document. Its text arrives in the
   request, is chunked, searched and answered in memory, and is
   gone when the response is sent. The same rule the WhatsApp
   loader follows, for the same reason — a student's own notes
   are not ours to keep.
   ============================================================ */

const MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/planner\/?/, "").split("/").filter(Boolean);
}

function safeError(e: any): string {
  const name = String(e?.name || "Error");
  const msg = String(e?.message || e || "unknown failure")
    .replace(/[a-z]+:\/\/[^\s"']+/gi, "[redacted connection string]")
    .replace(/Invalid\s+`[^`]*?\["?(\w+)"?\]\.(\w+)\.(\w+)\(\)`\s+invocation[^\n]*/i,
             "Invalid prisma.$2.$3() call")
    .replace(/\s+in\s+[A-Za-z]:\\[^\s]+/g, "");
  const lines = msg.split("\n").map(l => l.trim()).filter(Boolean);
  const useful = lines.filter(l => /^Invalid Prisma|Unknown argument|Available options|Argument `|Expected/i.test(l));
  return `${name}: ${(useful.length ? useful : lines.slice(0, 3)).join(" · ").slice(0, 400)}`;
}

async function ask(system: string, human: string, temperature: number, maxOutputTokens = 900) {
  if (!process.env.GEMINI_API_KEY) throw new Error("No AI key is configured on this deployment.");
  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: MODEL, temperature, maxOutputTokens,
  });
  const res: any = await llm.invoke([new SystemMessage(system), new HumanMessage(human)]);
  const text = typeof res?.content === "string"
    ? res.content
    : Array.isArray(res?.content)
      ? res.content.map((c: any) => c?.text || "").join("")
      : String(res?.content ?? "");
  return text.trim();
}

/** Models wrap JSON in ``` fences about a third of the time, whatever you ask. */
function parseJSONish(text: string): any {
  const stripped = String(text || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch { /* try harder */ }
  const first = stripped.indexOf("[");
  const last = stripped.lastIndexOf("]");
  if (first >= 0 && last > first) {
    try { return JSON.parse(stripped.slice(first, last + 1)); } catch { /* give up */ }
  }
  return null;
}

/* ---------------- reading the request ---------------- */

/** Pages arrive from the browser, so they are validated like any other input. */
function readPages(raw: any): Page[] {
  return (Array.isArray(raw) ? raw : [])
    .map((p: any, i: number) => ({
      page: Number.isFinite(Number(p?.page)) ? Number(p.page) : i + 1,
      text: String(p?.text || ""),
    }))
    .filter(p => p.text.trim());
}

async function loadState(userId: string) {
  const plan = await prisma.studyPlanRun.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });

  /* Tasks for the active plan drive the tracker; every task ever completed
     drives the streak, which must survive generating a new plan. */
  const [tasks, allDone, attempts] = await Promise.all([
    plan ? prisma.studyTask.findMany({
      where: { planId: plan.id },
      orderBy: [{ day: "asc" }, { start: "asc" }],
    }) : Promise.resolve([]),
    prisma.studyTask.findMany({
      where: { userId, done: true },
      select: { day: true, subject: true, minutes: true, done: true, doneAt: true },
      orderBy: { doneAt: "desc" },
      take: 500,
    }),
    prisma.quizAttempt.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 40,
    }),
  ]);

  const progress = progressOf(tasks as any);
  const quizTotals = attempts.reduce(
    (a, q) => ({ correct: a.correct + q.correct, total: a.total + q.total }),
    { correct: 0, total: 0 },
  );

  return {
    plan: plan && {
      id: plan.id, goal: plan.goal, days: plan.days,
      hoursPerDay: plan.hoursPerDay, strategy: plan.strategy,
      subjects: plan.subjects, createdAt: plan.createdAt,
    },
    tasks,
    progress,
    analytics: {
      streak: studyStreak(allDone as any),
      last7: recentMinutes(allDone as any, 7),
      lifetimeMinutes: allDone.reduce((a, t) => a + (t.minutes || 0), 0),
      quizzes: attempts.length,
      quizAccuracy: quizTotals.total ? Math.round((quizTotals.correct / quizTotals.total) * 100) : null,
      recentAttempts: attempts.slice(0, 8).map(q => ({
        subject: q.subject, correct: q.correct, total: q.total,
        source: q.source, at: q.createdAt,
      })),
    },
  };
}

/* ---------------- endpoints ---------------- */

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  try {
    return json(await loadState(s.userId));
  } catch (e: any) {
    console.error("[planner] load failed:", e);
    return json({ error: safeError(e) }, 500);
  }
}

export async function POST(req: NextRequest) {
  const p = seg(req);
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  try {
    /* ---- generate a timetable ---- */
    if (p[0] === "generate") {
      const days = Math.min(MAX_DAYS, Math.max(1, Math.floor(Number(body?.days) || 7)));
      const hoursPerDay = Math.min(MAX_HOURS_PER_DAY, Math.max(0.5, Number(body?.hoursPerDay) || 3));
      const subjects = (Array.isArray(body?.subjects) ? body.subjects : []).slice(0, MAX_SUBJECTS);

      if (!subjects.some((x: any) => String(x?.name || "").trim())) {
        return json({ error: "Add at least one subject before generating a plan." }, 400);
      }

      const generated = generatePlan({
        goal: String(body?.goal || "").slice(0, 120),
        days, hoursPerDay, subjects,
        startDate: typeof body?.startDate === "string" ? body.startDate : undefined,
      });

      if (!generated.slots.length) {
        return json({ error: "That combination produced no sessions. Try more hours or more days." }, 400);
      }

      /* One active plan at a time. The old one is retired rather than deleted,
         so the days already completed still count towards the streak. */
      const saved = await prisma.$transaction(async tx => {
        await tx.studyPlanRun.updateMany({ where: { userId: s.userId, active: true }, data: { active: false } });
        const run = await tx.studyPlanRun.create({
          data: {
            userId: s.userId,
            goal: String(body?.goal || "Study plan").slice(0, 120) || "Study plan",
            days, hoursPerDay, strategy: generated.strategy,
            subjects: subjects as any,
          },
        });
        await tx.studyTask.createMany({
          data: generated.slots.map(sl => ({
            planId: run.id, userId: s.userId,
            day: sl.day, date: new Date(sl.date + "T00:00:00Z"),
            start: sl.start, end: sl.end,
            subject: sl.subject, title: sl.title, mode: sl.mode, minutes: sl.minutes,
          })),
        });
        return run;
      });

      return json({ ...(await loadState(s.userId)), createdPlanId: saved.id });
    }

    /* ---- ask the uploaded document ---- */
    if (p[0] === "ask") {
      const question = String(body?.question || "").trim().slice(0, 500);
      const pages = readPages(body?.pages);
      if (!question) return json({ error: "Type a question first." }, 400);
      if (!pages.length) return json({ error: "Load a document first — there is nothing to read." }, 400);

      const chunks = chunkPages(pages);
      const passages = topPassages(chunks, question, 4);

      /* The refusal is decided HERE, before any model call. A retriever that
         found nothing cannot be talked into an answer. */
      if (!passages.length) {
        return json({ answer: NO_MATCH, citations: [], matched: 0, searched: chunks.length });
      }

      const answer = await ask(DOC_SYSTEM, docFacts(passages, question), 0.2, 700);
      return json({
        answer,
        citations: citationsOf(passages),
        matched: passages.length,
        searched: chunks.length,
      });
    }

    /* ---- generate a quiz ---- */
    if (p[0] === "quiz") {
      const subject = String(body?.subject || "").trim().slice(0, 80);
      const count = Math.min(10, Math.max(3, Math.floor(Number(body?.count) || 5)));
      const pages = readPages(body?.pages);

      let human: string;
      let source = "subject";

      if (pages.length) {
        /* Questions from the student's own document. Pull the densest
           passages for the topic so the questions are about the material
           rather than the title page. */
        const chunks = chunkPages(pages);
        const picked = subject
          ? topPassages(chunks, subject, 6)
          : chunks.slice(0, 6).map(c => ({ ...c, score: 1 }));
        if (!picked.length) {
          return json({ error: `Nothing in the document matched "${subject}". Try another topic, or clear the topic to use the opening pages.` }, 400);
        }
        source = "document";
        human = `Write ${count} questions answerable ONLY from these passages.\n\n`
              + picked.map(x => `[page ${x.page}] ${x.text}`).join("\n\n");
      } else {
        if (!subject) return json({ error: "Give a topic, or load a document." }, 400);
        human = `Write ${count} questions on: ${subject}. University level.`;
      }

      const questions = normaliseQuiz(parseJSONish(await ask(QUIZ_SYSTEM, human, 0.7, 1600)), count);
      if (!questions.length) {
        return json({ error: "The model did not return usable questions. Try again, or narrow the topic." }, 502);
      }
      return json({ questions, source, subject: subject || "Document" });
    }

    /* ---- record a finished attempt ---- */
    if (p[0] === "attempt") {
      const total = Math.min(50, Math.max(1, Math.floor(Number(body?.total) || 0)));
      const correct = Math.min(total, Math.max(0, Math.floor(Number(body?.correct) || 0)));
      await prisma.quizAttempt.create({
        data: {
          userId: s.userId,
          subject: String(body?.subject || "Practice").slice(0, 80),
          total, correct,
          source: body?.source === "document" ? "document" : "subject",
        },
      });
      return json(await loadState(s.userId));
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("[planner] POST /" + (p[0] || "") + " failed:", e);
    return json({ error: safeError(e) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  try {
    const id = String(body?.id || "");
    const done = !!body?.done;
    if (!id) return json({ error: "No task given." }, 400);

    /* Scoped to this user. Without the userId in the where clause, one student
       could tick off another's timetable by guessing an id. */
    const r = await prisma.studyTask.updateMany({
      where: { id, userId: s.userId },
      data: { done, doneAt: done ? new Date() : null },
    });
    if (!r.count) return json({ error: "That task is not yours." }, 404);

    return json(await loadState(s.userId));
  } catch (e: any) {
    console.error("[planner] PATCH failed:", e);
    return json({ error: safeError(e) }, 500);
  }
}
