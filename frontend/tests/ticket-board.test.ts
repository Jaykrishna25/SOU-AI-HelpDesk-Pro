import { describe, it, expect } from "vitest";
import {
  COLUMNS, columnFor, buildBoard, batchProblem, actionable, skippable, batchNote,
} from "@/lib/ticket-board";
import type { Ticket } from "@/lib/tickets";

/* The claim this feature makes is that an admin acts on a PERSON, not a row,
   and that a batch can never span two people. The second half is the one
   worth pinning: a batch across students would send one message naming
   several of them, which is a privacy failure wearing the costume of a
   convenience feature. If someone later moves that check into the component,
   these tests fail. */

let n = 0;
function t(over: Partial<Ticket> = {}): Ticket {
  n += 1;
  return {
    code: "TKT-" + n, subject: "s" + n, description: "", category: "GENERAL",
    priority: "MEDIUM", status: "Open", stage: "ADMIN", note: "",
    creator: "Asha", creatorRole: "STUDENT", createdAt: 1000 + n,
    ...over,
  };
}

describe("columns", () => {
  it("maps the categories the portal actually writes", () => {
    expect(columnFor("FEES")).toBe("FEES");
    expect(columnFor("FEE_RECEIPT")).toBe("FEES");
    expect(columnFor("BACKLOG")).toBe("EXAMS");
    expect(columnFor("ID_CARD")).toBe("CERTIFICATE");
    expect(columnFor("ATTENDANCE")).toBe("ATTENDANCE");
  });

  it("is case and whitespace insensitive", () => {
    expect(columnFor("  fees  ")).toBe("FEES");
  });

  it("never drops a ticket whose category nobody mapped", () => {
    // The failure this prevents: a new category is introduced, no column
    // claims it, and the ticket vanishes from the only screen an admin looks
    // at while the student goes on waiting.
    expect(columnFor("SOMETHING_NEW")).toBe("GENERAL");
    expect(columnFor("")).toBe("GENERAL");
    const board = buildBoard([t({ category: "SOMETHING_NEW" })]);
    expect(board.reduce((n, c) => n + c.ticketCount, 0)).toBe(1);
  });
});

describe("grouping by person", () => {
  const board = buildBoard([
    t({ creator: "Asha", category: "FEES", createdAt: 300 }),
    t({ creator: "Asha", category: "FEES", createdAt: 100 }),
    t({ creator: "Bilal", category: "FEES", createdAt: 200 }),
    t({ creator: "Asha", category: "EXAMS", createdAt: 400 }),
  ]);
  const fees = board.find(c => c.key === "FEES")!;

  it("puts one person's tickets in one card", () => {
    expect(fees.groups.length).toBe(2);
    expect(fees.groups.find(g => g.creator === "Asha")!.tickets.length).toBe(2);
  });

  it("does not merge a person's tickets across columns", () => {
    const exams = board.find(c => c.key === "EXAMS")!;
    expect(exams.groups.find(g => g.creator === "Asha")!.tickets.length).toBe(1);
  });

  it("puts the longest-waiting person first", () => {
    // Asha's oldest is 100, Bilal's is 200. Whoever has waited longest is who
    // an admin should see at the top, not whoever filed most recently.
    expect(fees.groups[0].creator).toBe("Asha");
    expect(fees.groups[0].oldestAt).toBe(100);
  });

  it("counts only what is still open", () => {
    const b = buildBoard([
      t({ creator: "Chandni", status: "Open" }),
      t({ creator: "Chandni", status: "Resolved" }),
    ]);
    const g = b.find(c => c.key === "GENERAL")!.groups[0];
    expect(g.tickets.length).toBe(2);
    expect(g.openCount).toBe(1);
  });
});

describe("a batch may never span two people", () => {
  it("refuses a mixed batch and says why", () => {
    const problem = batchProblem([t({ creator: "Asha" }), t({ creator: "Bilal" })], "Faculty");
    expect(problem).toMatch(/different people/i);
  });

  it("allows one person's tickets", () => {
    expect(batchProblem([t({ creator: "Asha" }), t({ creator: "Asha" })], "Faculty")).toBeNull();
  });

  it("requires a recipient and a selection", () => {
    expect(batchProblem([], "Faculty")).toMatch(/at least one/i);
    expect(batchProblem([t()], "")).toMatch(/who this should go to/i);
  });

  it("refuses a batch that is entirely settled", () => {
    expect(batchProblem([t({ status: "Resolved" }), t({ status: "Closed" })], "HOD"))
      .toMatch(/already resolved/i);
  });

  it("acts on the open ones and skips the settled ones", () => {
    const batch = [t({ status: "Open" }), t({ status: "Resolved" }), t({ status: "Escalated" })];
    expect(batchProblem(batch, "HOD")).toBeNull();
    expect(actionable(batch).length).toBe(2);
    expect(skippable(batch).length).toBe(1);
  });
});

describe("the note the student receives", () => {
  it("lists the codes, so one email is still traceable to each query", () => {
    const batch = [t({ code: "TKT-A" }), t({ code: "TKT-B" })];
    const note = batchNote(batch, "HOD");
    expect(note).toContain("TKT-A");
    expect(note).toContain("TKT-B");
    expect(note).toContain("HOD");
  });

  it("does not claim other tickets when there is only one", () => {
    expect(batchNote([t({ code: "TKT-A" })], "HOD")).toContain("no other ticket");
  });

  it("never names a code that was skipped as already resolved", () => {
    const note = batchNote([t({ code: "TKT-OPEN" }), t({ code: "TKT-DONE", status: "Resolved" })], "HOD");
    expect(note).toContain("TKT-OPEN");
    expect(note).not.toContain("TKT-DONE");
  });
});

describe("the board is stable", () => {
  it("returns every column even when empty, so the layout does not jump", () => {
    expect(buildBoard([]).length).toBe(COLUMNS.length);
    expect(buildBoard([]).every(c => c.groups.length === 0)).toBe(true);
  });
});
