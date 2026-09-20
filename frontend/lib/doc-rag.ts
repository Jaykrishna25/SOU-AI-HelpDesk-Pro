/* ============================================================
   Reading a document the student uploaded, with page citations.

   Pure functions. No Prisma, no network, no model.

   Why this retriever is lexical, and the portal's other one is not
   ----------------------------------------------------------------
   The knowledge base in lib/ai.ts uses real embeddings: the 20 KB
   articles are stable, so embedding them once and reusing the
   vectors forever is the right trade.

   An uploaded PDF is the opposite. It exists for one conversation,
   it is never stored, and embedding eighty chunks of it before the
   first question can be answered would cost an API call per chunk
   for a document nobody will ask about twice. So this one scores
   passages by weighted term overlap — BM25-style idf, computed
   over the document itself.

   That is a deliberate trade, not a shortcut, and it has a real
   consequence worth stating out loud: this retriever matches
   WORDS, so a question phrased entirely in synonyms will miss.
   The floor below is what stops that from becoming a confident
   wrong answer.

   Nothing here is written to the database. The extracted text
   lives in the request and in the browser tab, and goes away with
   both.
   ============================================================ */

export interface Page { page: number; text: string }
export interface Chunk { idx: number; page: number; text: string }
export interface Scored extends Chunk { score: number }

export const CHUNK_CHARS = 900;
export const CHUNK_OVERLAP = 150;
export const MAX_PAGES = 400;
export const MAX_DOC_CHARS = 600_000;

/** Below this, the best passage is not a match and the question goes unanswered. */
export const RELEVANCE_FLOOR = 0.6;

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "is", "are", "was", "were", "be", "been", "being", "of",
  "to", "in", "on", "for", "with", "as", "by", "at", "from", "it", "its",
  "what", "which", "who", "whom", "how", "why", "when", "where", "do", "does",
  "did", "can", "could", "should", "would", "will", "shall", "may", "might",
  "i", "me", "my", "we", "our", "you", "your", "about", "into", "over",
]);

export function tokenize(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ઀-૿\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t));
}

/**
 * Split pages into overlapping chunks, each remembering the page it came from.
 *
 * The page number is the entire point: an answer a student cannot check
 * against the source is worth very little when they are revising from it.
 */
export function chunkPages(pages: Page[], size = CHUNK_CHARS, overlap = CHUNK_OVERLAP): Chunk[] {
  const chunks: Chunk[] = [];
  const step = Math.max(50, size - Math.max(0, overlap));
  let idx = 0;
  let budget = MAX_DOC_CHARS;

  for (const p of (pages || []).slice(0, MAX_PAGES)) {
    const text = String(p?.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const capped = text.slice(0, Math.max(0, budget));
    budget -= capped.length;

    for (let i = 0; i < capped.length; i += step) {
      const slice = capped.slice(i, i + size).trim();
      if (slice.length < 40 && chunks.length) break;   // trailing scrap
      if (slice) chunks.push({ idx: idx++, page: Number(p.page) || 0, text: slice });
      if (i + size >= capped.length) break;
    }
    if (budget <= 0) break;
  }
  return chunks;
}

/**
 * Score every chunk against the query.
 *
 * idf so that a rare word ("normalisation") counts for far more than a common
 * one ("system"), and a saturating term-frequency so that a chunk cannot win
 * purely by repeating the query word twenty times.
 */
export function scoreChunks(chunks: Chunk[], query: string): Scored[] {
  const terms = [...new Set(tokenize(query))];
  const list = chunks || [];
  if (!terms.length || !list.length) return [];

  const tokenised = list.map(c => tokenize(c.text));
  const N = list.length;

  const idf = new Map<string, number>();
  for (const t of terms) {
    const df = tokenised.reduce((a, toks) => a + (toks.includes(t) ? 1 : 0), 0);
    idf.set(t, Math.log(1 + N / (1 + df)));
  }

  return list
    .map((c, i) => {
      const toks = tokenised[i];
      let score = 0;
      for (const t of terms) {
        const tf = toks.reduce((a, x) => a + (x === t ? 1 : 0), 0);
        if (tf) score += (idf.get(t) || 0) * (tf / (tf + 1.2));
      }
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score || a.idx - b.idx);
}

/** The best passages, or none at all. */
export function topPassages(chunks: Chunk[], query: string, k = 4): Scored[] {
  const scored = scoreChunks(chunks, query).filter(s => s.score >= RELEVANCE_FLOOR);
  if (!scored.length) return [];

  /* Prefer spread over depth: four passages from four pages is a better
     answer than four consecutive slices of the same paragraph. */
  const out: Scored[] = [];
  const pagesUsed = new Map<number, number>();
  for (const s of scored) {
    const used = pagesUsed.get(s.page) || 0;
    if (used >= 2) continue;
    pagesUsed.set(s.page, used + 1);
    out.push(s);
    if (out.length >= k) break;
  }
  return out;
}

export function citationsOf(passages: Scored[]): number[] {
  return [...new Set((passages || []).map(p => p.page))].sort((a, b) => a - b);
}

/** Exactly what the model is allowed to see. The passages, and nothing else. */
export function docFacts(passages: Scored[], question: string): string {
  const lines = [`QUESTION: ${String(question || "").trim()}`, "", "PASSAGES FROM THE DOCUMENT:"];
  for (const p of passages) {
    lines.push(`[page ${p.page}] ${p.text}`);
    lines.push("");
  }
  return lines.join("\n");
}

export const DOC_SYSTEM = `You answer a student's question using ONLY the passages given below,
which were taken from a document the student uploaded.

HARD RULES:
1. Use only the passages. If they do not contain the answer, say the document does
   not appear to cover it and stop. Do not fill the gap from your own knowledge —
   the student is revising from THIS document, and a correct fact that is not in it
   is still a wrong answer for their exam.
2. Cite the page for every claim, like this: (p. 12). Every paragraph you write must
   carry at least one page number.
3. Do not invent a page number. Only cite pages that appear in the passages.
4. Quote sparingly — a phrase, not a paragraph. Explain in your own words.
5. Be concise: a short paragraph, or a few short ones. No preamble, no sign-off.

If the passages conflict with each other, say so rather than picking one.

Plain British English.`;

/** What to say when the retriever found nothing. Not a model call. */
export const NO_MATCH =
  "I could not find anything about that in this document. This reader matches the "
  + "words in your question against the words in the document, so try the phrasing "
  + "the document itself would use — or the question may genuinely be outside what "
  + "this file covers.";
