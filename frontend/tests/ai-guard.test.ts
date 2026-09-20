import { describe, it, expect } from "vitest";
import {
  isPersonalRecordQuestion, needsHuman, isAcademicQuestion, gate, GATE_MESSAGE,
} from "@/lib/ai-guard";
import { SUGGESTIONS } from "@/lib/assistant-suggestions";

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

  /* The welcome screen once offered "When is my semester fee due...", which
     the widened gate then refused. The most obvious button on the page
     produced a refusal, and nothing in the build complained. */
  it("never suggests a question the assistant would refuse", () => {
    expect(SUGGESTIONS.length).toBeGreaterThan(0);
    for (const s of SUGGESTIONS) {
      expect(gate(s.q), `suggestion "${s.label}" would be refused`).toBeNull();
    }
  });

  it("does not leak across sentence boundaries", () => {
    // Without the [^.?!] restriction this would match "my" in the first
    // sentence against "fees" in the second and refuse a policy question.
    expect(isPersonalRecordQuestion("I am new here. What are the fees?")).toBe(false);
  });
});


/* ============================================================
   Gate 3: coursework.

   The asymmetry here runs the OPPOSITE way to the two gates
   above, and these tests exist to hold it that way.

   Gates 1 and 2 are generous: over-refusing costs one ticket.
   This gate is narrow, because over-refusing means an ordinary
   help desk question - "how do I submit my assignment?" - gets
   turned away. The negative cases below are therefore the
   important half of this block, not an afterthought.
   ============================================================ */

describe("coursework goes to the tutor, not the help desk", () => {
  const academic = [
    "write a program to reverse a linked list",
    "give me the code for binary search",
    "sql query for finding duplicate rows",
    "my code is not working, can you debug it",
    "what is the output of this code",
    "explain the concept of normalisation",
    "what is polymorphism",
    "what is a deadlock",
    "difference between TCP and UDP",
    "solve this numerical for me",
    "solve the following question",
    "clear my doubt about recursion",
    "what is the time complexity of quicksort",
    "prove this theorem",
  ];

  for (const q of academic) {
    it(`refuses: ${q}`, () => {
      expect(isAcademicQuestion(q)).toBe(true);
      expect(gate(q)).toBe("academic");
    });
  }

  it("points at the tutor instead of at a ticket", () => {
    // The message must name where to go. A bare refusal removes a capability
    // students already had and tells them nothing about getting it back.
    expect(GATE_MESSAGE.academic).toMatch(/tutor/i);
    expect(GATE_MESSAGE.academic).not.toMatch(/raise it as a ticket/i);
  });
});

describe("the coursework gate does not swallow help desk questions", () => {
  /* Every one of these contains a word the gate looks for, and every one is
     ordinary help desk business. This is the list that will fail first if
     someone widens the patterns above. */
  const helpDesk = [
    "how do I submit my assignment",
    "what is the last date to submit the assignment",
    "I have a doubt about the fee deadline",          // "doubt" = "question" in Indian English
    "I have a doubt regarding hostel admission",
    "where do I pay the exam form fee",
    "what is the process to get a bonafide certificate",
    "what is the minimum attendance requirement",
    "what are the rules for supplementary examinations",
    "the library portal is not working",              // a complaint, not a code question
    "how do I reset my portal password",
    "what facilities are available on campus",
    "when is the last date for scholarship registration",
  ];

  for (const q of helpDesk) {
    it(`still handles: ${q}`, () => {
      expect(isAcademicQuestion(q)).toBe(false);
    });
  }

  it("an administrative subject beats a coursework word outright", () => {
    // The allowlist runs first and wins. Without that ordering, the word
    // "doubt" alone would refuse a large share of the portal's real traffic.
    expect(isAcademicQuestion("clear my doubt about the fee structure")).toBe(false);
    expect(isAcademicQuestion("clear my doubt about recursion")).toBe(true);
  });

  it("keeps every welcome-screen suggestion answerable", () => {
    // The same trap as before, now with a third gate able to spring it.
    for (const s of SUGGESTIONS) {
      expect(isAcademicQuestion(s.q), `suggestion "${s.label}"`).toBe(false);
    }
  });

  it("sends a broken submission to a person, and broken code to the tutor", () => {
    expect(gate("the assignment upload page is not working")).toBe("complaint");
    expect(gate("my code is not working")).toBe("academic");
  });

  it("still puts a personal record question first", () => {
    // "why are my marks wrong" is personal; the coursework gate must not
    // intercept it and send a student to a tutor about their own result.
    expect(gate("why are my marks wrong")).toBe("personal");
  });
});
