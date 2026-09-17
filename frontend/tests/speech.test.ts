import { describe, it, expect } from "vitest";
import { detectLanguage, LANGUAGES } from "@/lib/speech";

describe("language detection", () => {
  it("detects English", () => {
    expect(detectLanguage("How do I pay my fees?")).toBe("en-IN");
    expect(detectLanguage("hello")).toBe("en-IN");
  });

  it("detects Hindi by Devanagari script", () => {
    expect(detectLanguage("\u092E\u0941\u091D\u0947 \u092B\u0940\u0938 \u091C\u092E\u093E \u0915\u0930\u0928\u0940 \u0939\u0948")).toBe("hi-IN");
    expect(detectLanguage("\u092A\u0930\u0940\u0915\u094D\u0937\u093E \u0915\u092C \u0939\u0948")).toBe("hi-IN");
  });

  it("detects Gujarati by script", () => {
    expect(detectLanguage("\u0AAB\u0AC0 \u0A95\u0AC7\u0AB5\u0AC0 \u0AB0\u0AC0\u0AA4\u0AC7 \u0AAD\u0AB0\u0AB5\u0AC0")).toBe("gu-IN");
  });

  it("does not confuse the two Indic scripts", () => {
    const hi = detectLanguage("\u0939\u093F\u0928\u094D\u0926\u0940");
    const gu = detectLanguage("\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0");
    expect(hi).toBe("hi-IN");
    expect(gu).toBe("gu-IN");
    expect(hi).not.toBe(gu);
  });

  it("falls back for empty input", () => {
    expect(detectLanguage("")).toBe("en-IN");
    expect(detectLanguage("   ", "hi-IN")).toBe("hi-IN");
  });

  it("offers exactly three languages", () => {
    expect(LANGUAGES.map(l => l.code)).toEqual(["en-IN", "hi-IN", "gu-IN"]);
  });
});
