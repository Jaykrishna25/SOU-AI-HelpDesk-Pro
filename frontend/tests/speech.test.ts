import { describe, it, expect } from "vitest";
import { detectLanguage, LANGUAGES } from "@/lib/speech";

describe("language detection", () => {
  it("detects English", () => {
    expect(detectLanguage("How do I pay my fees?")).toBe("en-IN");
    expect(detectLanguage("hello")).toBe("en-IN");
  });

  it("detects Marathi by marker words", () => {
    expect(detectLanguage("\u092E\u0932\u093E \u092B\u0940 \u092D\u0930\u093E\u092F\u091A\u0940 \u0906\u0939\u0947")).toBe("mr-IN");
    expect(detectLanguage("\u092A\u0930\u0940\u0915\u094D\u0937\u093E \u0915\u0927\u0940 \u0906\u0939\u0947")).toBe("mr-IN");
  });

  it("detects Hindi by marker words", () => {
    expect(detectLanguage("\u092E\u0941\u091D\u0947 \u092B\u0940\u0938 \u091C\u092E\u093E \u0915\u0930\u0928\u0940 \u0939\u0948")).toBe("hi-IN");
    expect(detectLanguage("\u092A\u0930\u0940\u0915\u094D\u0937\u093E \u0915\u092C \u0939\u0948")).toBe("hi-IN");
  });

  it("prefers Marathi for ambiguous Devanagari", () => {
    expect(detectLanguage("\u092A\u0930\u0940\u0915\u094D\u0937\u093E")).toBe("mr-IN");
  });

  it("detects Gujarati by script", () => {
    expect(detectLanguage("\u0AAB\u0AC0 \u0A95\u0AC7\u0AB5\u0AC0 \u0AB0\u0AC0\u0AA4\u0AC7 \u0AAD\u0AB0\u0AB5\u0AC0")).toBe("gu-IN");
  });

  it("falls back for empty input", () => {
    expect(detectLanguage("")).toBe("en-IN");
    expect(detectLanguage("   ", "mr-IN")).toBe("mr-IN");
  });

  it("detects the major Indian scripts", () => {
    expect(detectLanguage("\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD")).toBe("ta-IN");                 // Tamil
    expect(detectLanguage("\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41")).toBe("te-IN");           // Telugu
    expect(detectLanguage("\u0C95\u0CA8\u0CCD\u0CA8\u0CA1")).toBe("kn-IN");                 // Kannada
    expect(detectLanguage("\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02")).toBe("ml-IN");           // Malayalam
    expect(detectLanguage("\u09AC\u09BE\u0982\u09B2\u09BE")).toBe("bn-IN");                 // Bengali
    expect(detectLanguage("\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40")).toBe("pa-IN");           // Gurmukhi
    expect(detectLanguage("\u0B13\u0B21\u0B3C\u0B3F\u0B06")).toBe("or-IN");                 // Odia
    expect(detectLanguage("\u0627\u0631\u062F\u0648")).toBe("ur-IN");                       // Urdu
  });

  it("offers thirteen languages, English and Marathi first", () => {
    const codes = LANGUAGES.map(l => l.code);
    expect(codes[0]).toBe("en-IN");
    expect(codes[1]).toBe("mr-IN");
    expect(codes.length).toBeGreaterThanOrEqual(13);
    ["ta-IN", "te-IN", "kn-IN", "ml-IN", "bn-IN", "pa-IN", "or-IN", "ur-IN"]
      .forEach(c => expect(codes).toContain(c));
  });
});

