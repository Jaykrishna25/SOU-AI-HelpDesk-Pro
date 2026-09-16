import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

beforeAll(() => { process.env.GRIEVANCE_KEY = crypto.randomBytes(32).toString("base64"); });

describe("field encryption", () => {
  it("round-trips a value", async () => {
    const { encryptField, decryptField } = await import("@/lib/crypto");
    const enc = encryptField("u123 | Test Student | STUDENT");
    expect(enc).toMatch(/^enc:v1:/);
    expect(enc).not.toContain("Test Student");
    expect(decryptField(enc)).toBe("u123 | Test Student | STUDENT");
  });

  it("produces different ciphertext each time", async () => {
    const { encryptField } = await import("@/lib/crypto");
    expect(encryptField("same")).not.toBe(encryptField("same"));
  });

  it("returns null for tampered ciphertext", async () => {
    const { encryptField, decryptField } = await import("@/lib/crypto");
    const enc = encryptField("secret")!;
    const parts = enc.split(":");
    parts[4] = Buffer.from("tampered").toString("base64");
    expect(decryptField(parts.join(":"))).toBeNull();
  });

  it("passes through legacy plaintext unchanged", async () => {
    const { decryptField } = await import("@/lib/crypto");
    expect(decryptField("u1 | Old Row | STUDENT")).toBe("u1 | Old Row | STUDENT");
  });
});
