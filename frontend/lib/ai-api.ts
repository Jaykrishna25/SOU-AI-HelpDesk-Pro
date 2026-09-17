import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { aiConfigured, answerQuestion, ingest } from "@/lib/ai";
import { KB_DOCS } from "@/lib/kb-content";

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/ai\/?/, "").split("/").filter(Boolean);
}

export async function GET(req: NextRequest) {
  const p = seg(req);
  if (p[0] === "status") {
    const chunks = await prisma.knowledgeChunk.count({ where: { active: true } }).catch(() => 0);
    return json({
      configured: aiConfigured(),
      chunks,
      model: process.env.AI_CHAT_MODEL || "gemini-1.5-flash",
    });
  }
  return json({ error: "Not found" }, 404);
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);
  const b = await req.json().catch(() => ({}));

  /* ---- ask a question ---- */
  if (p[0] === "chat") {
    const message = String(b.message || "").trim().slice(0, 1500);
    if (!message) return json({ error: "A question is required" }, 400);

    if (!aiConfigured()) {
      return json({
        configured: false,
        answer: "The AI assistant is not configured on this deployment. Your question can still be raised as a ticket.",
        confident: false, sources: [],
      });
    }

    // conversation memory
    let sessionId = String(b.sessionId || "");
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } }).catch(() => null)
      : null;
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: s.userId, userName: s.fullName, language: String(b.lang || "en-IN") },
      });
      sessionId = session.id;
    }

    const history = await prisma.chatTurn.findMany({
      where: { sessionId }, orderBy: { createdAt: "asc" }, take: 12,
      select: { role: true, text: true },
    });

    await prisma.chatTurn.create({
      data: { sessionId, role: "user", text: message, language: String(b.lang || "") || null },
    });

    let result;
    try {
      result = await answerQuestion({ question: message, lang: String(b.lang || "en-IN"), history });
    } catch (e: any) {
      console.error("[ai] answer failed", e);
      return json({
        configured: true, error: "assistant_unavailable",
        answer: "The assistant could not be reached just now. Your question can be raised as a ticket instead.",
        confident: false, sources: [], sessionId,
      }, 200);
    }

    await prisma.chatTurn.create({
      data: {
        sessionId, role: "ai", text: result.answer,
        sourcesJson: JSON.stringify(result.sources),
        confidence: result.score, latencyMs: result.latencyMs,
      },
    });

    return json({
      configured: true,
      sessionId,
      answer: result.answer,
      confident: result.confident,
      score: result.score,
      sources: result.sources,
      latencyMs: result.latencyMs,
    });
  }

  /* ---- ingest knowledge ---- */
  if (p[0] === "ingest") {
    if (!can(s, "criteria.configure")) return json({ error: "Administrator access required" }, 403);
    if (!aiConfigured()) return json({ error: "GEMINI_API_KEY is not configured" }, 400);

    const extra = Array.isArray(b.documents) ? b.documents : [];
    const docs = [...KB_DOCS, ...extra].filter((d: any) => d?.sourceKey && d?.content);
    try {
      const r = await ingest(docs);
      await audit({ action: "UPDATE", entity: "KnowledgeChunk", session: s, req,
        summary: "Ingested " + r.upserted + " knowledge chunk(s)" });
      return json({ ok: true, ...r, total: docs.length });
    } catch (e: any) {
      return json({ error: "Ingestion failed: " + (e?.message || "unknown") }, 502);
    }
  }

  return json({ error: "Not found" }, 404);
}

export async function PATCH() { return json({ error: "Not supported" }, 405); }
export async function DELETE() { return json({ error: "Not supported" }, 405); }

