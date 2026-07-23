// Retrieval-Augmented Generation pipeline.
// embed() -> vector; cosineSimilarity for semantic search over KnowledgeBase.
import { prisma } from "../config/db";
import { tokenize } from "./nlp";

// Deterministic bag-of-words hashing embedding (stand-in for OpenAI embeddings).
export function embed(text: string, dim = 128): number[] {
  const vec = new Array(dim).fill(0);
  for (const tok of tokenize(text)) {
    let h = 0;
    for (const ch of tok) h = (h * 31 + ch.charCodeAt(0)) % dim;
    vec[h] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * (b[i] ?? 0);
  return dot;
}

export interface RetrievedDoc { id: string; title: string; content: string; score: number; }

export async function semanticSearch(query: string, topK = 3): Promise<RetrievedDoc[]> {
  const q = embed(query);
  const docs = await prisma.knowledgeBase.findMany();
  return docs
    .map((d) => ({
      id: d.id, title: d.title, content: d.content,
      score: cosine(q, d.embedding.length ? d.embedding : embed(d.content)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// RAG answer generation. Uses retrieved context; confidence = top doc score.
export async function generateAnswer(query: string) {
  const docs = await semanticSearch(query, 3);
  const top = docs[0];
  const confidence = top ? Math.min(0.99, 0.55 + top.score * 0.5) : 0.2;
  const answer = top
    ? `${top.content}\n\n(Source: ${top.title})`
    : "I could not find a confident answer in the knowledge base.";
  return { answer, confidence, sources: docs };
}
