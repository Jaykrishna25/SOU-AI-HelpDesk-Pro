import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { parseChat, searchChat, renderHits } from "@/lib/whatsapp";

/* ============================================================
   Class group endpoints.

   NOTE WHAT IS NOT HERE: there is no Prisma import in this file,
   and no model, table or migration anywhere for chat messages.
   That is the design, not an oversight.

   A WhatsApp export is sixty people's data uploaded by one of
   them. Storing it would make this portal the custodian of
   messages whose authors never consented, and would turn a
   convenience feature into a data-protection liability. So the
   chat is posted, parsed, answered and forgotten inside a single
   request. The student's browser holds it for as long as their
   tab is open; the server holds it for milliseconds.

   The practical cost is that every question re-posts the chat.
   That is a real cost and it is worth paying.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";

/* An export is text, and a class group is small. The cap stops someone
   pasting a novel, and keeps the request inside serverless limits. */
const MAX_CHARS = 400_000;

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/classchat\/?/, "").split("/").filter(Boolean);
}

const SYSTEM = `You answer a student's question using ONLY the class group messages given to you.

HARD RULES:
1. Never invent a date, a room, a deadline or a name. If the messages do not
   state it, say it was not found and suggest asking the class representative.
2. Say WHO said it and WHEN. A date a student must act on is useless without
   its source.
3. If two messages conflict, the LATER one wins, and you must say it was
   changed. A room moved from 204 to 108 means the answer is 108 - a student
   told 204 walks into the wrong room.
4. These are the student's own uploaded messages, not university records. Do
   not present them as official. A class group is often right and sometimes
   wrong.
5. Two to four sentences.`;

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  // Reading one's own uploaded chat is the same class of act as reading one's
  // own record, so it sits behind the same capability.
  if (!can(s, "study.viewOwn")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const b = await req.json().catch(() => ({} as any));
  const raw = String(b?.chat || "");

  if (!raw.trim()) return json({ error: "No chat content was provided." }, 400);
  if (raw.length > MAX_CHARS) {
    return json({
      error: `That export is too large (${Math.round(raw.length / 1000)}k characters). `
           + `Export a shorter date range, or use "Without media".`,
    }, 413);
  }

  const chat = parseChat(raw);

  /* ---- parse only: what did we get, and what was removed ---- */
  if (p[0] === "parse") {
    if (!chat.messages.length) {
      return json({
        error: "No readable messages were found. Export the chat from WhatsApp "
             + "using \"Without media\" and upload the .txt file it produces.",
      }, 422);
    }
    return json({
      messages: chat.messages.length,
      days: chat.days,
      senders: chat.senders,
      announcements: chat.announcements.slice(-10),
      numbersRedacted: chat.numbersRedacted,
      inlineRedacted: chat.inlineRedacted,
      dropped: chat.dropped,
      notes: chat.notes,
      stored: false,
    });
  }

  /* ---- ask a question of it ---- */
  if (p[0] === "ask") {
    const question = String(b?.question || "").trim();
    if (!question) return json({ error: "A question is required" }, 400);
    if (!chat.messages.length) return json({ error: "No readable messages in that chat." }, 422);

    const hits = searchChat(chat, question, 6);
    const context = renderHits(hits, question);

    // Retrieval is deterministic and happens here, in TypeScript, before the
    // model is involved at all. The model cannot decide not to search, and it
    // only ever sees the messages that matched.
    const sources = hits.map(h => ({
      date: h.message.date, time: h.message.time,
      sender: h.message.sender, text: h.message.text,
    }));

    if (!process.env.GEMINI_API_KEY) {
      return json({
        answer: hits.length
          ? "The assistant is not configured on this deployment, but these are the "
            + "matching messages from your group."
          : "No message in your group matched that question.",
        sources, configured: false, found: hits.length,
      });
    }

    try {
      const llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: CHAT_MODEL,
        temperature: 0.1,
        maxOutputTokens: 400,
      });
      const res: any = await llm.invoke([
        new SystemMessage(SYSTEM),
        new HumanMessage(`Question: ${question}\n\n${context}`),
      ]);
      const answer = typeof res?.content === "string"
        ? res.content
        : Array.isArray(res?.content)
          ? res.content.map((c: any) => c?.text || "").join("")
          : String(res?.content ?? "");

      return json({ answer: answer.trim(), sources, configured: true, found: hits.length });
    } catch (e: any) {
      /* Degrade to the messages themselves rather than to nothing. The
         retrieval already worked; only the phrasing failed, and the raw
         messages are more useful to a student than an error. */
      return json({
        answer: hits.length
          ? "The assistant could not be reached, but these are the matching messages "
            + "from your group, exactly as they were sent."
          : "No message in your group matched that question.",
        sources, configured: true, found: hits.length,
        degraded: String(e?.message || e).slice(0, 160),
      });
    }
  }

  return json({ error: "Not found" }, 404);
}
