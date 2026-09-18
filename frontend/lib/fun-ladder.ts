import { VOCAB, findTerm, type Term } from "@/lib/fun-vocab";

/* ============================================================
   Concept Ladder.

   A guessing game in the shape of Contexto: you guess a term, it
   tells you how close you are, and you narrow in. The difference
   is where "close" comes from.

   Contexto uses a word-embedding model. Calling an embedding API
   once per guess would burn quota and break the game the moment
   it runs out, so closeness here is computed locally from how
   much two terms' DEFINITIONS overlap, weighted by how rare each
   word is across the vocabulary (TF-IDF cosine).

   That has a real advantage for a study tool: the definitions are
   the reason two concepts are near each other, so the game can
   show you the definition of every guess. A wrong guess still
   teaches something, which a pure embedding distance cannot do.

   All pure functions. No database, no network, no model.
   ============================================================ */

const STOP = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are", "be",
  "by", "with", "that", "it", "its", "as", "at", "from", "into", "each", "so",
  "can", "not", "one", "two", "this", "these", "than", "then", "used", "using",
  "use", "other", "which", "where", "what", "when", "only", "over", "such",
]);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

/** A term's document is its own name plus its definition. */
function docFor(t: Term): string[] {
  return tokenise(t.word + " " + t.definition + " " + t.subject);
}

/* ---------------- TF-IDF, computed once ---------------- */

interface Model {
  vectors: Map<string, Map<string, number>>;   // term word -> token -> weight
  norms: Map<string, number>;
}

let MODEL: Model | null = null;

function buildModel(): Model {
  const docs = new Map<string, string[]>();
  for (const t of VOCAB) docs.set(t.word, docFor(t));

  // Document frequency for each token.
  const df = new Map<string, number>();
  for (const tokens of docs.values()) {
    for (const tok of new Set(tokens)) df.set(tok, (df.get(tok) || 0) + 1);
  }

  const N = docs.size;
  const vectors = new Map<string, Map<string, number>>();
  const norms = new Map<string, number>();

  for (const [word, tokens] of docs) {
    const tf = new Map<string, number>();
    for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);

    const vec = new Map<string, number>();
    let sumSq = 0;
    for (const [tok, count] of tf) {
      // Rare tokens carry more signal than ones every definition uses.
      const idf = Math.log(N / (df.get(tok) || 1)) + 1;
      const w = (1 + Math.log(count)) * idf;
      vec.set(tok, w);
      sumSq += w * w;
    }
    vectors.set(word, vec);
    norms.set(word, Math.sqrt(sumSq) || 1);
  }

  return { vectors, norms };
}

function model(): Model {
  if (!MODEL) MODEL = buildModel();
  return MODEL;
}

function cosine(a: string, b: string): number {
  const m = model();
  const va = m.vectors.get(a), vb = m.vectors.get(b);
  if (!va || !vb) return 0;

  // Iterate the smaller vector.
  const [small, large] = va.size <= vb.size ? [va, vb] : [vb, va];
  let dot = 0;
  for (const [tok, w] of small) {
    const other = large.get(tok);
    if (other) dot += w * other;
  }
  return dot / ((m.norms.get(a) || 1) * (m.norms.get(b) || 1));
}

/* ---------------- ranking ---------------- */

/**
 * Every vocabulary term ranked by closeness to the target.
 * Rank 1 is the target itself. Computed the same way every time.
 */
export function rankingFor(target: string): string[] {
  const scored = VOCAB
    .map(t => ({ word: t.word, score: t.word === target ? Infinity : cosine(target, t.word) }))
    .sort((a, b) => b.score - a.score);
  return scored.map(s => s.word);
}

export interface GuessResult {
  word: string;
  known: boolean;
  rank: number | null;       // 1 = the answer
  total: number;
  band: "answer" | "hot" | "warm" | "cool" | "cold" | "unknown";
  definition: string | null;
  subject: string | null;
}

function bandFor(rank: number, total: number): GuessResult["band"] {
  if (rank === 1) return "answer";
  const pct = rank / total;
  if (pct <= 0.08) return "hot";
  if (pct <= 0.25) return "warm";
  if (pct <= 0.55) return "cool";
  return "cold";
}

export function judgeGuess(target: string, guess: string): GuessResult {
  const term = findTerm(guess);
  const total = VOCAB.length;

  if (!term) {
    return {
      word: guess.trim().toLowerCase(), known: false, rank: null, total,
      band: "unknown", definition: null, subject: null,
    };
  }

  const ranking = rankingFor(target);
  const rank = ranking.indexOf(term.word) + 1;

  return {
    word: term.word,
    known: true,
    rank,
    total,
    band: bandFor(rank, total),
    // Showing the definition is the point - a wrong guess should still teach.
    definition: term.definition,
    subject: term.subject,
  };
}

/* ---------------- daily target and scoring ---------------- */

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same target for everyone on a given day. */
export function targetFor(date: string): Term {
  return VOCAB[seedFrom("ladder:" + date) % VOCAB.length];
}

/** A nudge, without giving the answer away. */
export function hintFor(date: string): string {
  const t = targetFor(date);
  return `${t.subject} · ${t.word.length} characters`;
}

/**
 * Fewer guesses scores higher, but finishing always beats giving up.
 * Floors at 100 so a long, persistent solve still registers.
 */
export function scoreLadder(guesses: number): number {
  return Math.max(100, Math.round(1000 - (guesses - 1) * 45));
}

export const MAX_GUESSES = 40;
