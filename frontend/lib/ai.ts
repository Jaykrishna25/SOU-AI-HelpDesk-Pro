import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
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

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-1.5-flash";
const EMBED_MODEL = process.env.AI_EMBED_MODEL || "text-embedding-004";
const TOP_K = Number(process.env.AI_TOP_K || 5);
/** Below this best-match score we do not trust the retrieval. */
const CONFIDENCE_FLOOR = Number(process.env.AI_CONFIDENCE_FLOOR || 0.62);
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

function embedder() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: EMBED_MODEL,
  });
}

/* ---------------- vectors ---------------- */

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!aiConfigured()) throw new Error("GEMINI_API_KEY is not configured");
  return embedder().embedDocuments(texts);
}

export async function embedQuery(text: string): Promise<number[]> {
  if (!aiConfigured()) throw new Error("GEMINI_API_KEY is not configured");
  return embedder().embedQuery(text);
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
2. Reply in the SAME language the student used. If they wrote in Marathi,
   reply in Marathi. Hindi to Hindi. Gujarati to Gujarati. English to English.
   Match their script, not just their language.
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

export interface AnswerResult {
  answer: string;
  confident: boolean;
  score: number;
  sources: { title: string; sourceKey: string; score: number }[];
  latencyMs: number;
}

export async function answerQuestion(opts: {
  question: string;
  history?: { role: string; text: string }[];
}): Promise<AnswerResult> {
  const started = Date.now();

  const hits = await retrieve(opts.question);
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
  const answer = await chain.invoke({ context, history, question: opts.question });

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
