import { describe, it, expect } from "vitest";
import {
  isPersonalRecordQuestion, needsHuman, gate, GATE_MESSAGE,
} from "@/lib/ai-guard";

/* These tests exist because the gate was written twice - once in the corner
   bubble, once in the full-page assistant - and the two copies disagreed.
   "what are my results?" was refused by one and answered by the other.

   The asymmetry below is deliberate and is the point of the whole file: a
   false positive costs a student one unnecessary ticket, a false negative
   tells a student something confident and wrong about their own record. */

describe("personal record questions are refused", () => {
  const personal = [
    "what are my marks?",
    "what are my results?",              // the plural that the old regex missed
    "show me my grades",
    "what is my attendance?",
    "what is my attendance percentage this semester?",
    "what is my CGPA",
    "how many backlogs do I have",
    "what is my fee balance",
    "where is my fee receipt",
    "has my refund been processed",
    "what is the status of my scholarship application",
    "my DBMS exam result",
    "when will I get my marksheet",
    "what is my seat number for the exam",
    "mera result kab aayega",            // transliterated Hindi
    "मेरी attendance kitni hai",          // Devanagari pronoun, Latin noun
    "મારુ result",                        // Gujarati pronoun
    "मेरा परिणाम कब आएगा",                 // entirely Devanagari
  ];

  for (const q of personal) {
    it(`refuses: ${q}`, () => {
      expect(isPersonalRecordQuestion(q)).toBe(true);
      expect(gate(q)).toBe("personal");
    });
  }
});

describe("policy questions are still answered", () => {
  /* If the gate fired on these the assistant would be useless: these are
     exactly the questions the knowledge base is for. The pronoun is what
     makes a question personal, not the noun. */
  const policy = [
    "what is the minimum attendance requirement?",
    "when is the semester fee due?",
    "what are the rules for supplementary examinations?",
    "how is CGPA calculated at the university?",
    "what is the refund policy for withdrawal?",
    "what facilities are available on campus?",
    "how do I apply for a scholarship?",   // "I apply" - process, not record
    "what is the library timing",
    "how do I check my attendance on the portal?",  // wants the route, not the number
    "what is the process to get a bonafide certificate",
  ];

  for (const q of policy) {
    it(`answers: ${q}`, () => {
      expect(isPersonalRecordQuestion(q)).toBe(false);
    });
  }
});

describe("complaints are routed to a person", () => {
  const complaints = [
    "the portal is not working",
    "I got an error while uploading",
    "this is urgent, please escalate",
    "the marks shown are incorrect",
    "why was my application rejected",   // also personal; either reason refuses
    "I want to file a complaint about ragging",
  ];

  for (const q of complaints) {
    it(`routes: ${q}`, () => {
      expect(gate(q)).not.toBeNull();
    });
  }

  it("does not route an ordinary question", () => {
    expect(needsHuman("when is the library open?")).toBe(false);
    expect(gate("when is the library open?")).toBeNull();
  });
});

describe("gate ordering and messages", () => {
  it("prefers the personal reason when a question is both", () => {
    // "my fee was deducted twice" is personal AND a complaint. Personal wins,
    // because the message names the student's own record, which is the more
    // specific and more useful thing to say.
    expect(gate("my fee was deducted twice")).toBe("personal");
  });

  it("has a message for every reason", () => {
    for (const reason of ["personal", "complaint"] as const) {
      expect(GATE_MESSAGE[reason].length).toBeGreaterThan(40);
      expect(GATE_MESSAGE[reason]).toMatch(/ticket/i);
    }
  });

  it("treats empty and junk input as not gated", () => {
    expect(gate("")).toBeNull();
    expect(gate("   ")).toBeNull();
    expect(isPersonalRecordQuestion(undefined as any)).toBe(false);
  });

  it("does not leak across sentence boundaries", () => {
    // Without the [^.?!] restriction this would match "my" in the first
    // sentence against "fees" in the second and refuse a policy question.
    expect(isPersonalRecordQuestion("I am new here. What are the fees?")).toBe(false);
  });
});
