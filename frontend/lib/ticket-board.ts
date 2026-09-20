import type { Ticket } from "@/lib/tickets";

/* ============================================================
   The admin ticket board — columns, grouping and batching.

   Pure functions. No React, no network, so the rules that decide
   what may be sent together are testable on their own.

   WHY THIS EXISTS
   ---------------
   The old queue was one flat list and one action per row. An
   admin with four tickets from the same student escalated them
   one at a time, which sent that student four separate emails
   about what is, to them, one conversation.

   Two things follow, and both are enforced here rather than in
   the component:

     1. Tickets are grouped BY STUDENT inside each column, so the
        unit an admin acts on is a person, not a row.

     2. A batch is checked before it is allowed. Sending tickets
        belonging to two different students "together" would
        produce one message naming both of them, which is a data
        leak dressed up as a convenience. `batchProblem` refuses
        that, and it is not the component's job to remember.
   ============================================================ */

/** The columns. `key` matches Ticket.category; ORDER is the board order. */
export const COLUMNS: { key: string; label: string; match: string[] }[] = [
  { key: "EXAMS", label: "Exams", match: ["EXAMS", "EXAM", "BACKLOG", "RESULT", "RESULTS", "CONVOCATION"] },
  { key: "FEES", label: "Fees & Accounts", match: ["FEES", "FEE", "FEE_RECEIPT", "SCHOLARSHIP", "REFUND"] },
  { key: "ATTENDANCE", label: "Attendance", match: ["ATTENDANCE"] },
  { key: "CERTIFICATE", label: "Documents", match: ["CERTIFICATE", "ID_CARD", "TRANSCRIPT", "MARKSHEET", "BONAFIDE"] },
  { key: "HOSTEL", label: "Hostel & Campus", match: ["HOSTEL", "CAMPUS", "TRANSPORT", "LIBRARY", "MESS"] },
  { key: "ACADEMIC_OFFICE", label: "Academic Office", match: ["ACADEMIC_OFFICE", "ADMISSION", "FACULTY", "DEPARTMENTS"] },
  { key: "GENERAL", label: "Everything else", match: [] },
];

/**
 * Which column a ticket belongs in.
 *
 * Unknown categories fall to "Everything else" rather than being dropped. A
 * board that silently hides a ticket because nobody added its category to the
 * list above is worse than an untidy last column — the student is waiting
 * either way, and only one of those states is visible to an admin.
 */
export function columnFor(category: string): string {
  const c = String(category || "").toUpperCase().trim();
  for (const col of COLUMNS) {
    if (col.key === c || col.match.includes(c)) return col.key;
  }
  return "GENERAL";
}

export interface StudentGroup {
  /** The creator's name, as the ticket recorded it. */
  creator: string;
  tickets: Ticket[];
  /** Oldest ticket in the group, so a column can surface the longest wait. */
  oldestAt: number;
  openCount: number;
}

export interface Column {
  key: string;
  label: string;
  groups: StudentGroup[];
  ticketCount: number;
}

/** Newest first within a person; people with the longest-waiting ticket first. */
function byOldestWait(a: StudentGroup, b: StudentGroup): number {
  return a.oldestAt - b.oldestAt;
}

export function buildBoard(tickets: Ticket[]): Column[] {
  const byColumn = new Map<string, Map<string, Ticket[]>>();
  for (const col of COLUMNS) byColumn.set(col.key, new Map());

  for (const t of tickets) {
    const col = byColumn.get(columnFor(t.category))!;
    const key = t.creator || "Unknown";
    if (!col.has(key)) col.set(key, []);
    col.get(key)!.push(t);
  }

  return COLUMNS.map(col => {
    const groups: StudentGroup[] = [];
    for (const [creator, list] of byColumn.get(col.key)!) {
      const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
      groups.push({
        creator,
        tickets: sorted,
        oldestAt: Math.min(...sorted.map(t => t.createdAt)),
        openCount: sorted.filter(t => t.status !== "Resolved" && t.status !== "Closed").length,
      });
    }
    groups.sort(byOldestWait);
    return {
      key: col.key,
      label: col.label,
      groups,
      ticketCount: groups.reduce((n, g) => n + g.tickets.length, 0),
    };
  });
}

/* ---------------- batching ---------------- */

/**
 * Why this batch may not be sent, or null when it is fine.
 *
 * The cross-student check is the one that matters. One escalation carries one
 * note and produces one message; if it spanned two students, that message
 * would name both to whoever receives it, and each student would appear in
 * the other's thread. Refusing is the only correct answer, and it belongs
 * here rather than in a component where a later refactor could lose it.
 */
export function batchProblem(tickets: Ticket[], recipient: string): string | null {
  if (!tickets.length) return "Select at least one ticket.";
  if (!recipient) return "Choose who this should go to.";

  const people = new Set(tickets.map(t => t.creator || "Unknown"));
  if (people.size > 1) {
    return "These tickets belong to " + people.size + " different people. "
         + "Send each person's tickets separately — one message naming several "
         + "students would show each of them the others.";
  }

  const settled = tickets.filter(t => t.status === "Resolved" || t.status === "Closed");
  if (settled.length === tickets.length) return "These are already resolved.";

  return null;
}

/** Tickets in a batch that are already settled and will be skipped. */
export function skippable(tickets: Ticket[]): Ticket[] {
  return tickets.filter(t => t.status === "Resolved" || t.status === "Closed");
}

/** The ones a batch will actually act on. */
export function actionable(tickets: Ticket[]): Ticket[] {
  return tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed");
}

/**
 * The single note written onto every ticket in a batch, and the body of the
 * one message the student receives. Listing the codes matters: the student
 * gets one email and must still be able to tell which of their queries moved.
 */
export function batchNote(tickets: Ticket[], recipient: string): string {
  const codes = actionable(tickets).map(t => t.code).join(", ");
  const n = actionable(tickets).length;
  return "Escalated to " + recipient + " together with "
       + (n === 1 ? "no other ticket" : "your other " + (n - 1) + " open " + (n === 2 ? "query" : "queries"))
       + " (" + codes + ").";
}
