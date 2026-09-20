/* ============================================================
   Quiz Studio — validation and grading.

   Pure functions. No Prisma, no network, no model.

   The model writes the questions. It does NOT decide whether the
   student got them right, and it does not get to hand back
   malformed output unchecked: `normaliseQuiz` throws away anything
   that would render as a broken question — an answer index pointing
   at nothing, two identical options, a question with one choice.

   This is self-study, not assessment. Nothing here is a mark, it
   does not reach a transcript, and the UI says so. That is also why
   grading can be quick and local: there is nothing to cheat at.
   ============================================================ */

export interface Question {
  q: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  why: string;
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;
export const MAX_QUESTIONS = 10;

function clean(s: any, max = 300): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Accept only questions that will actually render and can actually be graded.
 *
 * Models return JSON that is *nearly* right often enough that trusting it is
 * a mistake: a missing option, an `answer` of 4 in a list of three, the same
 * distractor twice. Each of those produces a question a student cannot get
 * right, which is worse than one fewer question.
 */
export function normaliseQuiz(raw: any, limit = 5): Question[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
  const out: Question[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    const q = clean(item?.q ?? item?.question);
    if (q.length < 8) continue;

    const key = q.toLowerCase();
    if (seen.has(key)) continue;          // the same question twice is padding

    /* Annotated explicitly because `item` is `any`: without a type here the
       array stays `any`, `new Set(...)` resolves to `Set<unknown>`, and
       `unique` becomes `unknown[]` - which fails the build at the
       `findIndex` below. Naming the types is also the honest thing to do at
       a boundary whose whole job is distrusting what a model returned. */
    const rawOptions: unknown[] = Array.isArray(item?.options) ? item.options : [];
    const options: string[] = rawOptions.map(o => clean(o, 200)).filter(Boolean);

    const unique: string[] = [...new Set(options)].slice(0, MAX_OPTIONS);
    if (unique.length < MIN_OPTIONS) continue;
    if (unique.length !== options.slice(0, MAX_OPTIONS).length) {
      /* Duplicate options shift the answer index, so the safe move is to
         drop the question rather than guess which duplicate was meant. */
      continue;
    }

    let answer = Number(item?.answer ?? item?.correct ?? item?.answerIndex);
    if (!Number.isInteger(answer)) {
      // Some models return the answer text rather than its index.
      const asText = clean(item?.answer ?? item?.correct, 200);
      answer = unique.findIndex(o => o.toLowerCase() === asText.toLowerCase());
    }
    if (!Number.isInteger(answer) || answer < 0 || answer >= unique.length) continue;

    seen.add(key);
    out.push({ q, options: unique, answer, why: clean(item?.why ?? item?.explanation, 400) });
    if (out.length >= Math.min(limit, MAX_QUESTIONS)) break;
  }
  return out;
}

export interface Grade {
  correct: number;
  total: number;
  pct: number;
  /** Indexes of the questions answered wrongly or skipped. */
  wrong: number[];
  skipped: number;
}

export function gradeQuiz(questions: Question[], picks: (number | null | undefined)[]): Grade {
  const qs = questions || [];
  const wrong: number[] = [];
  let correct = 0, skipped = 0;

  qs.forEach((q, i) => {
    const pick = picks?.[i];
    if (pick === null || pick === undefined) { skipped++; wrong.push(i); return; }
    if (pick === q.answer) correct++;
    else wrong.push(i);
  });

  return {
    correct,
    total: qs.length,
    pct: qs.length ? Math.round((correct / qs.length) * 100) : 0,
    wrong,
    skipped,
  };
}

/**
 * A label for a score.
 *
 * Deliberately not flattering, and deliberately not a grade. "Solid" is the
 * ceiling because five self-marked multiple-choice questions do not justify
 * telling anybody they have mastered a subject.
 */
export function masteryLabel(pct: number): string {
  const p = Number.isFinite(pct) ? pct : 0;
  if (p >= 90) return "Solid — worth moving on";
  if (p >= 70) return "Mostly there — review the misses";
  if (p >= 40) return "Shaky — worth another pass";
  return "Not yet — go back to the material";
}

export const QUIZ_SYSTEM = `You write short active-recall practice questions for a university student.

Return ONLY a JSON array. No prose, no code fence, no explanation around it.
Each element must be exactly:
{"q": "...", "options": ["...", "...", "...", "..."], "answer": 0, "why": "..."}

RULES:
1. "answer" is the INDEX of the correct option, counting from 0.
2. Exactly four options. All four must be plausible to someone who has not
   studied the topic — an obviously silly distractor teaches nothing.
3. All four options must be different from each other.
4. Test understanding, not trivia. Prefer "why does X happen" and "which of
   these would break if Y" over "in which year was X published".
5. "why" is one sentence explaining why the answer is right. It must not begin
   with "Correct!" or any other congratulation.
6. If you are given source passages, every question must be answerable from
   them alone, and you must not use outside knowledge.`;
