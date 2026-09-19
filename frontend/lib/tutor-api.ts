import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { fetchStudentResults } from "@/lib/study-db";
import { computeStudyPlan, scoreOf } from "@/lib/study-math";
import {
  outOfScope, SCOPE_MESSAGE, explainPrompt, practicePrompt, parsePractice,
  starterTopics, type Depth,
} from "@/lib/tutor-core";

/* ============================================================
   Tutor endpoints.

   Nothing is stored. A tutoring session is a conversation, not a
   record, and keeping one would mean holding what a student
   struggled to understand — which is exactly the sort of thing
   nobody wants on file against their name.

   The boundary in tutor-core.ts runs BEFORE the model is called,
   so a question about the syllabus never reaches it. That
   ordering is deliberate: a model asked what is in the exam will
   produce something plausible, and plausible is the problem.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/tutor\/?/, "").split("/").filter(Boolean);
}

function llm(maxTokens: number) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: CHAT_MODEL,
    temperature: 0.3,      // a little room to phrase an explanation well
    maxOutputTokens: maxTokens,
  });
}

function textOf(res: any): string {
  const c = res?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p: any) => p?.text || "").join("");
  return String(c ?? "");
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  /* ---- which subjects should the tutor offer? ----
     Weak subjects from the student's own plan, so the tutor opens already
     knowing what they are struggling with rather than showing an empty box. */
  if (seg(req)[0] === "subjects") {
    const rows = await fetchStudentResults(s.userId);
    if (!rows || !rows.length) {
      return json({ weak: [], all: [], configured: !!process.env.GEMINI_API_KEY });
    }
    const plan = computeStudyPlan(rows);
    return json({
      weak: plan.items.map(i => ({
        subject: i.subjectName,
        score: i.score,
        severity: i.severity,
        topics: starterTopics(i.subjectName),
      })),
      all: rows.map(r => ({ subject: r.subjectName, score: scoreOf(r) })),
      configured: !!process.env.GEMINI_API_KEY,
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const b = await req.json().catch(() => ({} as any));

  const subject = String(b?.subject || "").trim().slice(0, 120);
  const topic = String(b?.topic || "").trim().slice(0, 300);
  if (!topic) return json({ error: "A topic is required" }, 400);

  /* The boundary, before the model is reached. */
  const blocked = outOfScope(topic);
  if (blocked) {
    return json({ refused: true, reason: blocked, message: SCOPE_MESSAGE[blocked] });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json({ error: "The tutor is not configured on this deployment." }, 503);
  }

  /* ---- explain a concept ---- */
  if (p[0] === "explain") {
    const depth = (["quick", "normal", "scratch"].includes(b?.depth) ? b.depth : "normal") as Depth;
    try {
      const res = await llm(depth === "scratch" ? 1400 : depth === "normal" ? 900 : 500)
        .invoke([
          new SystemMessage(explainPrompt(subject || "this subject", topic, depth)),
          new HumanMessage(topic),
        ]);
      const answer = textOf(res).trim();
      if (!answer) return json({ error: "No explanation came back. Try rephrasing." }, 502);
      return json({ answer, depth, subject, topic });
    } catch (e: any) {
      return json({ error: "The tutor could not be reached: " + String(e?.message || e).slice(0, 160) }, 502);
    }
  }

  /* ---- generate practice questions ---- */
  if (p[0] === "practice") {
    try {
      const res = await llm(2000).invoke([
        new SystemMessage(practicePrompt(subject || "this subject", topic)),
        new HumanMessage(`Topic: ${topic}`),
      ]);
      const questions = parsePractice(textOf(res));
      if (!questions.length) {
        // Better to say nothing came back than to show a half-parsed question.
        return json({
          error: "Practice questions could not be generated for that topic. "
               + "Try naming it more specifically.",
        }, 502);
      }
      return json({ questions, subject, topic });
    } catch (e: any) {
      return json({ error: "The tutor could not be reached: " + String(e?.message || e).slice(0, 160) }, 502);
    }
  }

  return json({ error: "Not found" }, 404);
}
