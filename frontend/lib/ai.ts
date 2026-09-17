import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { prisma } from "@/lib/prisma";

/* ============================================================
   Retrieval-augmented assistant.

   Answers are generated ONLY from retrieved portal content. The
   model is instructed to reply in the user's own language and to
   say plainly when the retrieved context does not contain the
   answer, rather than inventing one.

   Credentials come from the environment. Nothing is hard-coded.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-2.5-flash";
const EMBED_MODEL = process.env.AI_EMBED_MODEL || "gemini-embedding-001";
const TOP_K = Number(process.env.AI_TOP_K || 5);
/** Below this best-match score we do not trust the retrieval. */
const CONFIDENCE_FLOOR = Number(process.env.AI_CONFIDENCE_FLOOR || 0.55);
const HISTORY_TURNS = 6;

export function aiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function chatModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: CHAT_MODEL,
    temperature: 0.2,
    maxOutputTokens: 700,
  });
}


/* ---------------- vectors ---------------- */

/* Direct REST calls to the embedding API.

   LangChain's GoogleGenerativeAIEmbeddings resolved a different model for
   embedQuery than for embedDocuments in this version, which produced a 404 on
   every question while ingestion succeeded. Calling the endpoint ourselves
   removes that ambiguity - the model name below is the one that is used. */

const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

async function embedOne(text: string): Promise<number[]> {
  const url = EMBED_BASE + EMBED_MODEL + ":embedContent?key=" + process.env.GEMINI_API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/" + EMBED_MODEL,
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("Embedding failed (" + res.status + ") using model " + EMBED_MODEL + ": " + body.slice(0, 300));
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Embedding response had no values");
  return values as number[];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!aiConfigured()) throw new Error("GEMINI_API_KEY is not configured");
  const out: number[][] = [];
  for (const t of texts) out.push(await embedOne(t));   // sequential: stays inside free-tier rate limits
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  if (!aiConfigured()) throw new Error("GEMINI_API_KEY is not configured");
  return embedOne(text);
}

export function cosine(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

export interface Retrieved {
  id: string; title: string; content: string;
  sourceType: string; sourceKey: string; score: number;
}

/**
 * Similarity search over stored chunks.
 * Cosine is computed in application code - see docs/ARCHITECTURE.md for why,
 * and for the pgvector path if the corpus ever grows past a few thousand chunks.
 */
export async function retrieve(query: string, k = TOP_K): Promise<Retrieved[]> {
  const qv = await embedQuery(query);
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { active: true },
    select: { id: true, title: true, content: true, sourceType: true, sourceKey: true, embedding: true },
  });
  return chunks
    .map(c => ({
      id: c.id, title: c.title, content: c.content,
      sourceType: c.sourceType, sourceKey: c.sourceKey,
      score: cosine(qv, c.embedding as unknown as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/* ---------------- prompt ---------------- */

const SYSTEM = `You are the Silver Oak University help desk assistant.

RULES, in order of importance:
1. Answer ONLY from the CONTEXT below. Never invent fees, dates, deadlines,
   policies, marks, or contact details. If the context does not contain the
   answer, say so plainly.
2. You MUST write your entire answer in {language} and in that language's own
   script. This is not optional. Do not answer in English unless {language} is
   English. Do not mix languages or transliterate.
3. Be brief. Two to four sentences unless steps are genuinely needed.
4. When the context is insufficient, reply in the student's language with a
   short apology and say the query is being raised as a ticket. Do not guess.
5. Never state a number that does not appear in the context.

CONTEXT:
{context}

Recent conversation:
{history}`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{question}"],
]);

const LANG_NAME: Record<string, string> = {
  "en-IN": "English",
  "mr-IN": "Marathi (\u092E\u0930\u093E\u0920\u0940, Devanagari script)",
  "hi-IN": "Hindi (\u0939\u093F\u0928\u094D\u0926\u0940, Devanagari script)",
  "gu-IN": "Gujarati (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0 script)",
};

/**
 * Stored knowledge is in English. A non-English question is restated in English
 * purely to improve retrieval; the answer is still generated from the original
 * question and written in the student's language.
 */
async function englishSearchQuery(question: string, lang: string): Promise<string> {
  if (lang === "en-IN" || !/[^\u0000-\u024F]/.test(question)) return question;
  try {
    const out = await chatModel().invoke(
      "Translate this university help desk question into short, plain English. " +
      "Reply with the translation only, no commentary.\n\n" + question
    );
    const text = typeof out === "string" ? out : String((out as any)?.content ?? "");
    return text.trim() || question;
  } catch {
    return question;
  }
}

export interface AnswerResult {
  answer: string;
  confident: boolean;
  score: number;
  sources: { title: string; sourceKey: string; score: number }[];
  latencyMs: number;
}

export async function answerQuestion(opts: {
  question: string;
  lang?: string;
  history?: { role: string; text: string }[];
}): Promise<AnswerResult> {
  const started = Date.now();

  const lang = opts.lang || "en-IN";
  const searchQuery = await englishSearchQuery(opts.question, lang);

  const primary = await retrieve(searchQuery);
  let hits = primary;
  if (searchQuery !== opts.question) {
    const secondary = await retrieve(opts.question);
    const byId = new Map<string, Retrieved>();
    [...primary, ...secondary].forEach(h => {
      const prev = byId.get(h.id);
      if (!prev || h.score > prev.score) byId.set(h.id, h);
    });
    hits = Array.from(byId.values()).sort((a, b) => b.score - a.score).slice(0, TOP_K);
  }
  const best = hits[0]?.score ?? 0;
  const usable = hits.filter(h => h.score >= CONFIDENCE_FLOOR * 0.8);

  const context = usable.length
    ? usable.map((h, i) => "[" + (i + 1) + "] " + h.title + "\n" + h.content).join("\n\n")
    : "(no relevant portal content was retrieved for this question)";

  const history = (opts.history || [])
    .slice(-HISTORY_TURNS)
    .map(t => (t.role === "user" ? "Student: " : "Assistant: ") + t.text)
    .join("\n") || "(start of conversation)";

  const chain = prompt.pipe(chatModel()).pipe(new StringOutputParser());
  const answer = await chain.invoke({
    context, history, question: opts.question,
    language: LANG_NAME[lang] || "English",
  });

  return {
    answer: (answer || "").trim(),
    confident: best >= CONFIDENCE_FLOOR,
    score: Math.round(best * 1000) / 1000,
    sources: usable.map(h => ({ title: h.title, sourceKey: h.sourceKey, score: Math.round(h.score * 1000) / 1000 })),
    latencyMs: Date.now() - started,
  };
}

/* ---------------- ingestion ---------------- */

/** Splits on paragraph boundaries, keeping chunks within a workable size. */
export function chunkText(text: string, maxChars = 1200, overlap = 150): string[] {
  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > maxChars && buf) {
      out.push(buf);
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export async function ingest(docs: {
  sourceType: string; sourceKey: string; title: string; content: string; lang?: string;
}[]): Promise<{ upserted: number; skipped: number }> {
  if (!aiConfigured()) throw new Error("GEMINI_API_KEY is not configured");
  let upserted = 0, skipped = 0;

  for (let i = 0; i < docs.length; i += 20) {
    const batch = docs.slice(i, i + 20);
    const vectors = await embedTexts(batch.map(d => d.title + "\n" + d.content));
    for (let j = 0; j < batch.length; j++) {
      const d = batch[j];
      if (!d.content.trim()) { skipped++; continue; }
      await prisma.knowledgeChunk.upsert({
        where: { sourceKey: d.sourceKey },
        update: {
          title: d.title, content: d.content, embedding: vectors[j],
          charCount: d.content.length, lang: d.lang || "en", active: true,
        },
        create: {
          sourceType: d.sourceType, sourceKey: d.sourceKey, title: d.title,
          content: d.content, embedding: vectors[j],
          charCount: d.content.length, lang: d.lang || "en",
        },
      });
      upserted++;
    }
  }
  return { upserted, skipped };
}



