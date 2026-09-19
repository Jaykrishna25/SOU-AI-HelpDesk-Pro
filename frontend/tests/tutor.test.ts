import { describe, it, expect } from "vitest";
import {
  outOfScope, SCOPE_MESSAGE, parsePractice, explainPrompt, practicePrompt,
  starterTopics, DEPTHS,
} from "@/lib/tutor-core";

/* The tutor is the one feature in this portal that generates content rather
   than reporting a tool's output. That is legitimate for explaining a concept
   and dangerous for anything else, so the boundary is where the tests go.

   The asymmetry is the whole design: a false positive costs one redirect to a
   source that actually knows; a false negative invents an exam syllabus for a
   student revising the night before. */

describe("the tutor refuses to speak for the university", () => {
  const mustRefuse: [string, string][] = [
    ["what is in the DBMS exam?", "exam"],
    ["which units are included in the internal test?", "exam"],
    ["is unit 4 part of the syllabus?", "exam"],
    ["what is the marks distribution for the paper?", "exam"],
    ["what is the paper pattern?", "exam"],
    ["what will be asked in the viva?", "exam"],
    ["when is the DBMS internal?", "schedule"],
    ["which room is the practical in?", "schedule"],
    ["what is the deadline for the assignment?", "schedule"],
    ["what are my marks in databases?", "record"],
    ["what is my attendance?", "record"],
    ["how many backlogs do I have?", "record"],
    ["will I pass this semester?", "prediction"],
    ["can I clear the exam if I study now?", "prediction"],
  ];

  for (const [q, reason] of mustRefuse) {
    it(`refuses (${reason}): ${q}`, () => {
      expect(outOfScope(q)).toBe(reason);
    });
  }

  it("has a message for every reason, and each names a better source", () => {
    for (const r of ["exam", "schedule", "record", "prediction"] as const) {
      const m = SCOPE_MESSAGE[r];
      expect(m.length).toBeGreaterThan(80);
      /* Never a dead end. Every refusal either names a source that does know
         (class group, department, Study Plan, Results) or offers what the
         tutor CAN do instead — explain the material. */
      expect(m).toMatch(/class group|department|Study Plan|Results|explain|understand the material|which topic/i);
    }
  });
});

describe("the tutor still teaches", () => {
  /* If the boundary fired on these the feature would be useless - these are
     exactly the questions it exists to answer. */
  const mustAnswer = [
    "explain normalisation",
    "what is 3NF?",
    "how does the TCP handshake work?",
    "explain deadlock and the four conditions",
    "why do we need indexing in databases?",
    "what is the difference between TCP and UDP?",
    "explain big-O notation from scratch",
    "how does gradient descent work?",
    "what is the difference between hashing and encryption?",
    "explain joins",
    "when should I use a hash map?",
    "what problem does paging solve?",
  ];

  for (const q of mustAnswer) {
    it(`teaches: ${q}`, () => {
      expect(outOfScope(q)).toBeNull();
    });
  }

  it("handles empty and junk input", () => {
    expect(outOfScope("")).toBeNull();
    expect(outOfScope("   ")).toBeNull();
    expect(outOfScope(undefined as any)).toBeNull();
  });
});

describe("prompts carry the limits", () => {
  it("every explain prompt states what the tutor does not know", () => {
    for (const d of DEPTHS) {
      const p = explainPrompt("Databases", "normalisation", d.id);
      expect(p).toMatch(/do NOT know this university's syllabus/i);
      expect(p).toMatch(/never predict a grade/i);
      expect(p).toContain("Databases");
    }
  });

  it("depth changes the instruction, not just the label", () => {
    const quick = explainPrompt("DBMS", "joins", "quick");
    const scratch = explainPrompt("DBMS", "joins", "scratch");
    expect(quick).not.toBe(scratch);
    expect(quick).toMatch(/four to six sentences/i);
    expect(scratch).toMatch(/no prior exposure/i);
    // The analogy caveat is the point of "from scratch" - an over-trusted
    // analogy is worse than none.
    expect(scratch).toMatch(/breaks down/i);
  });

  it("the practice prompt forbids implying these are past papers", () => {
    const p = practicePrompt("DBMS", "normalisation");
    expect(p).toMatch(/NOT past papers/i);
    expect(p).toMatch(/NOT predictions/i);
    expect(p).toMatch(/wrong worked answer/i);
  });
});

describe("parsing practice questions", () => {
  const good = JSON.stringify({
    questions: [
      { q: "State the definition of 3NF.", answer: "A relation is in 3NF when...", why: "Recall." },
      { q: "Why does 3NF matter?", answer: "It removes transitive dependency...", why: "Understanding." },
    ],
  });

  it("reads a well-formed response", () => {
    expect(parsePractice(good).length).toBe(2);
    expect(parsePractice(good)[0].q).toContain("3NF");
  });

  it("strips a markdown fence", () => {
    expect(parsePractice("```json\n" + good + "\n```").length).toBe(2);
    expect(parsePractice("```\n" + good + "\n```").length).toBe(2);
  });

  it("recovers JSON wrapped in a sentence", () => {
    expect(parsePractice("Here you go:\n" + good + "\nHope that helps!").length).toBe(2);
  });

  it("drops a question with no answer rather than showing a blank", () => {
    /* A student would read the blank as the point. Better to show three
       questions than four with one hollow. */
    const partial = JSON.stringify({
      questions: [
        { q: "Good one", answer: "With an answer", why: "x" },
        { q: "Missing its answer", answer: "", why: "y" },
        { q: "", answer: "orphan answer", why: "z" },
      ],
    });
    const out = parsePractice(partial);
    expect(out.length).toBe(1);
    expect(out[0].q).toBe("Good one");
  });

  it("returns nothing for unparseable output rather than guessing", () => {
    expect(parsePractice("sorry, I cannot do that")).toEqual([]);
    expect(parsePractice("")).toEqual([]);
    expect(parsePractice("{broken json")).toEqual([]);
    expect(parsePractice(JSON.stringify({ questions: "not an array" }))).toEqual([]);
  });
});

describe("starter topics", () => {
  it("suggests real topics for subjects a CSE transcript contains", () => {
    expect(starterTopics("Database Management Systems").join(" ")).toMatch(/normalis/i);
    expect(starterTopics("Computer Networks").join(" ")).toMatch(/TCP/i);
    expect(starterTopics("Operating Systems").join(" ")).toMatch(/deadlock/i);
  });

  it("falls back to something usable for an unmapped subject", () => {
    const t = starterTopics("Environmental Studies");
    expect(t.length).toBeGreaterThan(0);
    expect(t.every(x => x.length > 5)).toBe(true);
  });
});
