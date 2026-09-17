import { describe, it, expect } from "vitest";
import { cosine, chunkText } from "@/lib/ai";

describe("cosine similarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
  it("is 0 for orthogonal vectors", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
  it("is negative for opposing vectors", () => {
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1, 5);
  });
  it("returns 0 for mismatched or empty input", () => {
    expect(cosine([1, 2], [1, 2, 3])).toBe(0);
    expect(cosine([], [])).toBe(0);
  });
});

describe("chunking", () => {
  it("keeps a short document as one chunk", () => {
    expect(chunkText("A short paragraph.").length).toBe(1);
  });
  it("splits a long document into several chunks", () => {
    const para = "x".repeat(400);
    const doc = [para, para, para, para, para].join("\n\n");
    const chunks = chunkText(doc, 800, 100);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThan(1400));
  });
  it("drops empty input", () => {
    expect(chunkText("   ")).toEqual([]);
  });
});
