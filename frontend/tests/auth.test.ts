import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, passwordProblem } from "@/lib/server-auth";

/**
 * These exist because a bcryptjs v3 import change silently broke every
 * password operation in production and took three rounds to find.
 */
describe("password hashing", () => {
  it("produces a bcrypt hash that is not the plaintext", async () => {
    const h = await hashPassword("CorrectHorse9");
    expect(h).toMatch(/^\$2[aby]\$/);
    expect(h).not.toContain("CorrectHorse9");
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const h = await hashPassword("CorrectHorse9");
    expect(await verifyPassword("CorrectHorse9", h)).toBe(true);
    expect(await verifyPassword("correcthorse9", h)).toBe(false);
    expect(await verifyPassword("", h)).toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const a = await hashPassword("CorrectHorse9");
    const b = await hashPassword("CorrectHorse9");
    expect(a).not.toBe(b);
    expect(await verifyPassword("CorrectHorse9", b)).toBe(true);
  });
});

describe("password policy", () => {
  it("rejects short, weak and date-shaped passwords", () => {
    expect(passwordProblem("short1A")).toBeTruthy();
    expect(passwordProblem("alllowercase1")).toBeTruthy();
    expect(passwordProblem("ALLUPPERCASE1")).toBeTruthy();
    expect(passwordProblem("NoDigitsHere")).toBeTruthy();
    expect(passwordProblem("2007-05-14")).toBeTruthy();
    expect(passwordProblem("20070514")).toBeTruthy();
  });

  it("rejects a password containing the login ID", () => {
    expect(passwordProblem("SOU2023CSE69x", "SOU2023CSE69")).toBeTruthy();
  });

  it("accepts a reasonable password", () => {
    expect(passwordProblem("SilverOak2026", "SOU2023CSE69")).toBeNull();
  });
});
