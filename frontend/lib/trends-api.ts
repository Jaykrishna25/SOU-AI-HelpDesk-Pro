import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { gate, GATE_MESSAGE } from "@/lib/ai-guard";
import { KIND_LABEL, KIND_BLURB, type RadarKind } from "@/lib/trends-content";
import {
  usable, withheld, status, byKind, search, askPrompt,
  NO_CONTENT_MESSAGE, STARTERS,
} from "@/lib/trends-core";

/* ============================================================
   Market & Technology Radar endpoints.

   Nothing is stored. What a student asks about their own
   employability is not something this portal should keep on file
   against their enrollment number, and there is no analytics
   question here worth that trade.

   Two orderings are deliberate:

   1. The staleness check runs before the model is called, and
      when nothing is current the model is not called at all. An
      agent that reaches a language model with an empty context
      answers from training data and sounds exactly as confident
      doing it.

   2. The existing ai-guard runs first, so "what will my package
      be" and questions about a named person's record go to a
      human from here too, rather than being answered as market
      commentary. The radar knows about the market; it knows
      nothing about the student asking.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/trends\/?/, "").split("/").filter(Boolean);
}

function textOf(res: any): string {
  const c = res?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p: any) => p?.text || "").join("");
  return String(c ?? "");
}

const KINDS: RadarKind[] = ["model", "skill", "market"];

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "trends.view")) return json({ error: "Not permitted" }, 403);

  const now = new Date();

  /* The briefing: everything current, grouped, with its dates attached.
     This path never calls a model — it is the file, read out. A student who
     only wants to know what is new should not be waiting on an LLM, and the
     dates are more useful unsummarised. */
  if (!seg(req).length || seg(req)[0] === "briefing") {
    const live = usable(now);
    return json({
      status: status(now),
      configured: !!process.env.GEMINI_API_KEY,
      starters: STARTERS,
      sections: KINDS.map(k => ({
        kind: k,
        label: KIND_LABEL[k],
        blurb: KIND_BLURB[k],
        items: byKind(live, k),
      })),
      /* Named, not hidden. Someone maintaining this needs to see what fell
         out of the window, and a student seeing "3 entries withheld as out
         of date" learns something true about the thing they are reading. */
      withheld: withheld(now).map(w => ({ id: w.id, title: w.title, checkedOn: w.checkedOn, ageDays: w.ageDays })),
    });
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "trends.view")) return json({ error: "Not permitted" }, 403);
  if (seg(req)[0] !== "ask") return json({ error: "Not found" }, 404);

  const body = await req.json().catch(() => ({} as any));
  const question = String(body?.question || "").trim().slice(0, 500);
  if (!question) return json({ error: "A question is required" }, 400);

  /* Personal-record and complaint questions belong with a human, here as
     much as in the help desk. Same rule, same module — the two must not
     drift apart. */
  const blocked = gate(question);
  if (blocked) return json({ refused: true, message: GATE_MESSAGE[blocked] });

  const now = new Date();
  const entries = search(question, now);

  if (!entries.length) {
    return json({ refused: true, stale: true, message: NO_CONTENT_MESSAGE });
  }

  if (!process.env.GEMINI_API_KEY) {
    /* Not configured is not a reason to improvise. The briefing endpoint
       still works without a key, so say that rather than failing blankly. */
    return json({
      error: "The radar's assistant is not configured on this deployment. "
           + "The briefing below is the same information, unsummarised.",
    }, 503);
  }

  try {
    const res = await new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: CHAT_MODEL,
      temperature: 0.2,          // this is reporting, not writing
      maxOutputTokens: 900,
    }).invoke([
      new SystemMessage(askPrompt(entries, now.toISOString().slice(0, 10))),
      new HumanMessage(question),
    ]);

    const answer = textOf(res).trim();
    if (!answer) return json({ error: "No answer came back. Try rephrasing." }, 502);

    return json({
      answer,
      /* Every answer ships the entries it was allowed to use. A claim the
         student cannot trace is a claim they should not repeat. */
      sources: entries.map(e => ({
        id: e.id, title: e.title, kind: e.kind,
        checkedOn: e.checkedOn, freshness: e.freshness,
        sourceName: e.sourceName, sourceUrl: e.sourceUrl,
      })),
      status: status(now),
    });
  } catch (e: any) {
    return json({ error: "The radar could not be reached: " + String(e?.message || e).slice(0, 160) }, 502);
  }
}
