/* ============================================================
   What OakMitra must not try to answer.

   Two gates, applied before retrieval runs at all:

   1. isPersonalRecordQuestion - "what are my marks?". The
      knowledge base holds policy documents, not student records.
      A retrieval model asked this will happily quote the general
      grading rules, which reads like an answer and is not one.

   2. needsHuman - "my fee was debited twice". A complaint is not
      a question. Answering it correctly still leaves the student
      with the problem.

   Both fail TOWARD a human: a false positive raises an
   unnecessary ticket, a false negative gives a student a
   confident wrong answer about their own record. The first is a
   minor annoyance, the second is the failure this whole portal
   exists to avoid. So the patterns are deliberately generous.

   This lives here rather than inside a component because it was
   previously written twice - once in the corner bubble and once
   in the full-page assistant - and the two copies disagreed.
   "my results" was refused by one and answered by the other. One
   gate, one test file.
   ============================================================ */

/* First person. Split by script on purpose: JavaScript's \b is defined over
   [A-Za-z0-9_], so \bमेरी\b never matches - there is no word boundary beside a
   Devanagari character. The Latin half gets boundaries, the Indic half does
   not. This was a live bug, caught by the test file beside this one. */
const ME_LATIN = "my|mine|i|me|mera|meri|mere|maru|mara|majhe";
const ME_INDIC = "मेरा|मेरी|मेरे|मुझे|મારુ|મારું|મારો|મારી|મને";
const ME = `(?:\\b(?:${ME_LATIN})\\b|(?:${ME_INDIC}))`;

/** Things that exist per-student rather than in a policy document. */
const RECORD_LATIN =
  "attendance|attendence|fee|fees|result|results|marks|mark|grade|grades|" +
  "cgpa|sgpa|gpa|percentage|backlog|backlogs|kt|atkt|" +
  "seat|roll number|enrollment|enrolment|admission|application|" +
  "receipt|invoice|refund|scholarship|concession|instalment|installment|" +
  "certificate|transcript|marksheet|mark sheet|hall ticket|id card|" +
  "room|salary|payslip|leave|status|due|dues|balance|outstanding";
const RECORD_INDIC = "परिणाम|हाजरी|उपस्थिति|फीस|गुण|પરિણામ|હાજરી|ફી|ગુણ";
const RECORD = `(?:\\b(?:${RECORD_LATIN})\\b|(?:${RECORD_INDIC}))`;

/* Up to 30 characters of slack between the pronoun and the noun, so
   "my DBMS exam result" and "what is the status of my refund" both match.
   [^.?!] stops it reaching across a sentence break - without that,
   "I am new here. What are the fees?" would be refused. */
const PERSONAL_RE = new RegExp(`${ME}[^.?!]{0,30}?${RECORD}`, "i");

/* The reverse order is just as common: "how many backlogs do I have". */
const PERSONAL_REVERSE_RE = new RegExp(`${RECORD}[^.?!]{0,20}?${ME}`, "i");

/* "How do I apply for a scholarship?" contains "I" and "scholarship" but is a
   process question with a documented answer. So is "how do I check my
   attendance on the portal?" - the student wants to be told where to look,
   not to be told the number. Procedural phrasing wins over the pronoun. */
const PROCEDURAL_RE =
  /\b(how (do|can|does|to)|where (do|can)|what is the (process|procedure)|steps to|how long does|who (do|should) i (contact|ask))\b/i;

/**
 * True when the question is about this particular person's record.
 *
 * Note it does NOT fire on "what is the attendance requirement?" - that is a
 * policy question with a documented answer, and refusing it would make the
 * assistant useless. The pronoun is what makes it personal.
 */
export function isPersonalRecordQuestion(q: string): boolean {
  const text = String(q || "");
  if (!text.trim()) return false;
  if (PROCEDURAL_RE.test(text)) return false;
  return PERSONAL_RE.test(text) || PERSONAL_REVERSE_RE.test(text);
}

/** A complaint, dispute or failure. Answering it does not resolve it. */
const COMPLEX_RE =
  /(complaint|grievance|dispute|not working|doesn'?t work|didn'?t work|error|failed|failure|wrong|incorrect|mistake|urgent|emergency|escalate|why was|why did|denied|rejected|deducted twice|debited twice|double charge|harass|ragging|unfair)/i;

/** True when the question needs a person, not an answer. */
export function needsHuman(q: string): boolean {
  return COMPLEX_RE.test(String(q || ""));
}

export type GateReason = "personal" | "complaint" | null;

/**
 * One call for both gates, so a caller cannot check one and forget
 * the other. Returns the reason to refuse, or null to proceed.
 */
export function gate(q: string): GateReason {
  if (isPersonalRecordQuestion(q)) return "personal";
  if (needsHuman(q)) return "complaint";
  return null;
}

/** The wording shown to the student. Kept beside the rule that triggers it. */
export const GATE_MESSAGE: Record<Exclude<GateReason, null>, string> = {
  personal:
    "That is a question about your own record, so it should go to staff rather than " +
    "be answered from policy documents. Raise it as a ticket and someone will check it.",
  complaint:
    "This needs a person to look into it rather than a standard answer. Raise it as a " +
    "ticket and it will be routed to the right desk, where you can follow its progress.",
};
