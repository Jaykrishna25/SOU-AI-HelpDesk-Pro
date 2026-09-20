import { describe, it, expect } from "vitest";
import {
  isParticipant, messageProblem, startProblem, snippet, isUnread, MAX_BODY,
} from "@/lib/messages-core";

/* The claim this feature makes to a student is that the conversation is
   between them and their lecturer. These tests pin that claim. The important
   one is the absence of a staff override: if someone later adds "HODs can
   read any thread" the first test below fails, which is the point - the
   interface would otherwise go on promising something it no longer does. */

const c = { studentId: "stu-1", facultyId: "fac-1" };

describe("who can read a conversation", () => {
  it("admits the two people in it", () => {
    expect(isParticipant(c, "stu-1")).toBe(true);
    expect(isParticipant(c, "fac-1")).toBe(true);
  });

  it("admits nobody else, however senior", () => {
    expect(isParticipant(c, "hod-1")).toBe(false);
    expect(isParticipant(c, "owner-1")).toBe(false);
    expect(isParticipant(c, "super-admin")).toBe(false);
  });

  it("is not fooled by an empty or missing id", () => {
    // A session without a userId must not match a conversation whose columns
    // are also somehow blank.
    expect(isParticipant(c, "")).toBe(false);
    expect(isParticipant({ studentId: "", facultyId: "" }, "")).toBe(false);
  });
});

describe("what may be sent", () => {
  it("refuses an empty message", () => {
    expect(messageProblem("")).toMatch(/write a message/i);
    expect(messageProblem("   \n  ")).toMatch(/write a message/i);
  });

  it("holds the length limit", () => {
    expect(messageProblem("x".repeat(MAX_BODY))).toBeNull();
    expect(messageProblem("x".repeat(MAX_BODY + 1))).toMatch(/limited to/i);
  });

  it("requires a recipient and a subject to start", () => {
    expect(startProblem("Lab submission", "hello", "")).toMatch(/who you want to contact/i);
    expect(startProblem("", "hello", "fac-1")).toMatch(/subject/i);
    expect(startProblem("ab", "hello", "fac-1")).toMatch(/subject/i);
    expect(startProblem("Lab submission", "", "fac-1")).toMatch(/write a message/i);
    expect(startProblem("Lab submission", "hello", "fac-1")).toBeNull();
  });
});

describe("thread list", () => {
  it("shortens a snippet without cutting mid-nonsense", () => {
    expect(snippet("one\n\n  two   three")).toBe("one two three");
    const long = snippet("x".repeat(300));
    expect(long.length).toBe(120);
    expect(long.endsWith("…")).toBe(true);
  });

  it("never marks a thread unread because of your own message", () => {
    // The bug every read-receipt ships once: you write, and your own thread
    // lights up as having something new in it.
    const t = { ...c, lastSenderId: "stu-1", readByStudent: true, readByFaculty: false };
    expect(isUnread(t, "stu-1")).toBe(false);
    expect(isUnread(t, "fac-1")).toBe(true);
  });

  it("marks it unread for the side that has not opened it", () => {
    const t = { ...c, lastSenderId: "fac-1", readByStudent: false, readByFaculty: true };
    expect(isUnread(t, "stu-1")).toBe(true);
    expect(isUnread(t, "fac-1")).toBe(false);
  });

  it("says nothing is unread for a stranger", () => {
    const t = { ...c, lastSenderId: "fac-1", readByStudent: false, readByFaculty: false };
    expect(isUnread(t, "someone-else")).toBe(false);
  });
});
