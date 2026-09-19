/* ============================================================
   AI tutor — the boundary, and the prompts.

   Pure functions. No Prisma, no network, so the one rule that
   matters here is unit tested.

   The tension this file resolves
   ------------------------------
   Everything else in this portal refuses to produce a figure a
   tool did not return. The tutor is the opposite: it generates
   explanations from the model's own knowledge, and that is the
   point — a model explaining database normalisation is doing the
   same job a textbook does.

   So the line is not "never generate". It is:

     EXPLAINING A CONCEPT is legitimate. Normalisation, TCP
     handshakes, deadlock, Bayes' theorem — these are public
     knowledge and a model holds them.

     CLAIMING TO KNOW THIS UNIVERSITY is not. What is in unit 3.
     What the exam will ask. What the syllabus covers. When the
     test is. What this student scored. The model has no access
     to any of that, and a confident guess about an exam is the
     single most damaging thing this portal could say to a
     student revising at 2am.

   The second is what `outOfScope` catches, before the model is
   called at all. The student is pointed at the source that does
   know: their class group, the study plan, or the department.
   ============================================================ */

export type Depth = "quick" | "normal" | "scratch";

export const DEPTHS: { id: Depth; label: string; blurb: string }[] = [
  { id: "quick", label: "Quick recap", blurb: "You have seen this before and need it back." },
  { id: "normal", label: "Explain it", blurb: "A proper explanation with an example." },
  { id: "scratch", label: "From scratch", blurb: "Assume you have never met this topic." },
];

/* ---------------- the boundary ---------------- */

/** Questions about this university's own courses, exams or records. */
const OUT_OF_SCOPE = [
  {
    // "what is in the exam", "what will they ask", "is unit 4 included"
    re: /\b(what|which|how much|is|are|will)\b[^.?!]{0,40}\b(in|on|for|included in|come in|asked in|part of)\b[^.?!]{0,25}\b(the )?(exam|test|paper|internal|viva|syllabus|unit \d|chapter \d|semester exam)\b/i,
    reason: "exam" as const,
  },
  {
    re: /\b(syllabus|course outline|unit \d|which units?|how many units?|marks distribution|paper pattern|blueprint|question paper)\b/i,
    reason: "exam" as const,
  },
  {
    re: /\b(when is|when are|when's|what date|what time|which room|where is|where are)\b[^.?!]{0,30}\b(exam|test|viva|practical|internal|lecture|class|submission|assignment|deadline|seminar|presentation)\b/i,
    reason: "schedule" as const,
  },
  {
    // "what is the deadline for X" opens with "what is", not "when is".
    re: /\b(deadline|due date|last date|submission date|cut ?off date)\b/i,
    reason: "schedule" as const,
  },
  {
    re: /\b(my|mine)\b[^.?!]{0,25}\b(marks|score|scores|result|results|grade|grades|cgpa|sgpa|gpa|attendance|rank|backlog|backlogs)\b/i,
    reason: "record" as const,
  },
  {
    // The reverse order is just as common: "how many backlogs do I have".
    re: /\b(marks|score|scores|result|results|grade|grades|cgpa|sgpa|gpa|attendance|rank|backlog|backlogs)\b[^.?!]{0,25}\b(do i|did i|have i|i have|i got|i scored|i get)\b/i,
    reason: "record" as const,
  },
  {
    re: /\b(will i|can i|am i going to)\b[^.?!]{0,30}\b(pass|fail|clear|get|score)\b/i,
    reason: "prediction" as const,
  },
];

export type OutOfScope = "exam" | "schedule" | "record" | "prediction" | null;

/**
 * True when a question asks the tutor to speak for the university.
 *
 * Deliberately generous. A false positive costs one redirect to a source that
 * actually knows; a false negative invents an exam syllabus for a student
 * revising the night before. Those are not comparable mistakes.
 */
export function outOfScope(question: string): OutOfScope {
  const q = String(question || "");
  if (!q.trim()) return null;
  for (const { re, reason } of OUT_OF_SCOPE) {
    if (re.test(q)) return reason;
  }
  return null;
}

export const SCOPE_MESSAGE: Record<Exclude<OutOfScope, null>, string> = {
  exam:
    "I can explain the concept, but I do not know your syllabus or what will be asked in " +
    "your exam — I have no access to either, and guessing would be worse than useless the " +
    "night before a paper. Your class group and your department have the real answer. Ask " +
    "me to explain the topic instead and I will.",
  schedule:
    "I do not know your timetable. Dates, rooms and deadlines are announced in your class " +
    "group — the Class Group tab searches it — or check with the department.",
  record:
    "I do not have your marks or attendance. Your Study Plan and Results tabs have your " +
    "actual record. I can help you learn a subject; I cannot tell you how you did in it.",
  prediction:
    "I cannot predict whether you will pass. Nothing in this portal forecasts a result, and " +
    "a confident guess would be worth nothing. What I can do is help you understand the " +
    "material — tell me which topic is giving you trouble.",
};

/* ---------------- prompts ---------------- */

const BOUNDARY = `
ABSOLUTE LIMITS — these matter more than being helpful:
- You do NOT know this university's syllabus, exam pattern, unit divisions,
  question papers, timetable, or which topics are examinable. You have never
  seen them. If asked, say so and point the student at their class group or
  department. Never guess at what an exam will contain.
- You do NOT know this student's marks, attendance or results.
- You never predict a grade or whether someone will pass.
- If you are unsure whether something is standard material or specific to this
  university, say which parts are general and which they should confirm.
`;

const DEPTH_RULES: Record<Depth, string> = {
  quick:
    "The student has studied this before and needs it back quickly. Four to six sentences. " +
    "Lead with the definition in one line, then the two or three things people most often " +
    "forget. No preamble, no history, no 'imagine you are...'.",
  normal:
    "A proper explanation for someone who attended the lecture and did not follow it. " +
    "Define it, explain WHY it exists — what problem it solves — then one concrete worked " +
    "example. Around 200-300 words. The 'why' is the part lectures usually skip.",
  scratch:
    "Assume no prior exposure. Start from the problem that made this idea necessary, build " +
    "up in small steps, and only then name the formal terms. Use one everyday analogy, and " +
    "say plainly where the analogy breaks down — a comparison a student over-trusts is worse " +
    "than none. Around 400-500 words.",
};

export function explainPrompt(subject: string, topic: string, depth: Depth): string {
  return `You are a patient university tutor helping a Silver Oak University student with ${subject}.
${BOUNDARY}
HOW TO EXPLAIN:
${DEPTH_RULES[depth]}

Use plain language. Indian university context. Do not flatter the student, do not
say "great question", and do not end with an offer to help further — the
interface already does that.

If the topic is ambiguous, say which interpretation you are taking and continue.
Do not ask a clarifying question and stop; the student may not come back.`;
}

export function practicePrompt(subject: string, topic: string, count = 4): string {
  return `You are setting practice questions on ${topic} in ${subject} for a university student.
${BOUNDARY}
CRITICAL: these are questions YOU are writing to help someone practise. They are
NOT past papers, NOT from this university, and NOT predictions of what will be
asked. Never imply otherwise.

Write exactly ${count} questions of increasing difficulty:
  1. Recall — can they state it correctly?
  2. Understanding — can they explain why?
  3. Application — can they use it on something concrete?
  4. Judgement — can they say when it does NOT apply, or compare two options?

Return ONLY valid JSON, no markdown fence, in this shape:
{"questions":[{"q":"...","answer":"...","why":"..."}]}

  q       the question
  answer  the worked answer, complete enough to learn from
  why     one sentence on what this question is testing

Every answer must be correct and self-contained. A wrong worked answer teaches
the wrong thing, which is worse than setting no question at all.`;
}

/* ---------------- parsing ---------------- */

export interface PracticeQuestion {
  q: string;
  answer: string;
  why: string;
}

/**
 * Parse the model's practice output.
 *
 * Returns an empty array rather than throwing or half-guessing. A malformed
 * response should surface as "could not generate questions", never as a
 * question with a missing answer — a student would treat the blank as the point.
 */
export function parsePractice(raw: string): PracticeQuestion[] {
  const text = String(raw || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Occasionally a model wraps JSON in a sentence. Take the outermost object.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    try {
      data = JSON.parse(text.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  const list = Array.isArray(data?.questions) ? data.questions : [];
  return list
    .map((x: any) => ({
      q: String(x?.q ?? "").trim(),
      answer: String(x?.answer ?? "").trim(),
      why: String(x?.why ?? "").trim(),
    }))
    .filter((x: PracticeQuestion) => x.q && x.answer);
}

/** Topic suggestions for a subject, so an empty box is not the first thing seen. */
export function starterTopics(subject: string): string[] {
  const s = subject.toLowerCase();
  const map: [string, string[]][] = [
    ["database", ["Normalisation and 3NF", "ACID properties", "Joins and when each is right", "Indexing"]],
    ["dbms", ["Normalisation and 3NF", "ACID properties", "Joins and when each is right", "Indexing"]],
    ["operating system", ["Deadlock and the four conditions", "Paging vs segmentation", "Process scheduling", "Semaphores"]],
    ["network", ["The TCP handshake", "OSI layers, honestly", "Subnetting", "TCP vs UDP"]],
    ["data structure", ["When to use a hash map", "Tree traversals", "Big-O, properly", "Stacks vs queues"]],
    ["algorithm", ["Divide and conquer", "Dynamic programming", "Greedy: when it fails", "Sorting trade-offs"]],
    ["software engineering", ["SDLC models compared", "Coupling and cohesion", "Testing levels", "Agile vs waterfall"]],
    ["discrete", ["Proof by induction", "Set operations", "Graph basics", "Combinatorics"]],
    ["mathematic", ["Integration by parts", "Matrices and determinants", "Probability basics", "Limits"]],
    ["machine learning", ["Overfitting and how to spot it", "Gradient descent", "Bias-variance", "Train/test splits"]],
    ["web", ["How HTTP requests work", "The DOM", "REST principles", "Client vs server rendering"]],
    ["security", ["Symmetric vs asymmetric", "Hashing vs encryption", "SQL injection", "Authentication vs authorisation"]],
  ];
  for (const [key, topics] of map) {
    if (s.includes(key)) return topics;
  }
  return ["The core idea of this subject", "The part most students find hardest"];
}
