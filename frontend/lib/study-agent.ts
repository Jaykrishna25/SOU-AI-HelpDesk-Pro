import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";

import { retrieve } from "@/lib/ai";
import { can } from "@/lib/policy";
import type { Session } from "@/lib/server-auth";
import { computeStudyPlan, renderStudyPlan } from "@/lib/study-math";
import { fetchStudentResults, fetchSubjectCohort } from "@/lib/study-db";

/* ============================================================
   Study adviser: a tool-calling agent over the student's own
   examination record.

   Same two principles as the fee assistant:

   1. The model never calculates. Averages, priorities and study
      hours all come from study-math.ts. The model turns those
      figures into sentences.

   2. Tools are bound by role. A student's agent is never given
      the cohort tool, so it cannot reach other students' results
      however the question is phrased.

   One rule specific to this domain: no grade prediction. Nothing
   in the system produces a forecast, so offering one would mean
   inventing it - and a student would act on it.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";
const MAX_TOOL_ROUNDS = 4;

export function studyAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

const SYSTEM = `You are the Silver Oak University study adviser.

HARD RULES, in order of importance:
1. You NEVER calculate. The tools calculate. Scores, averages, priorities and
   study hours all come from a tool. Never estimate one, and never state a
   number a tool did not return.
2. NEVER predict a grade, a rank, a CGPA or a probability of passing. Nothing
   in this system produces a forecast. If asked, say plainly that you cannot
   predict results and explain what the recorded marks show instead.
3. Say where a figure came from: the examination record, or university policy.
4. If a tool returns nothing useful, say so. Do not fall back on general
   knowledge about university courses.
5. Scores are out of 100. Study hours are per week.
6. Be honest and encouraging at once. A weak subject is weak - do not soften it
   into meaninglessness, and do not lecture the student about it either.
7. Be brief: three to six sentences unless a breakdown is requested.`;

/* ---------------- tools ---------------- */

function ownPlanTool(userId: string, threshold: number) {
  return tool(
    async () => {
      const rows = await fetchStudentResults(userId);
      if (!rows) {
        return "No student record exists for this account, so there are no results to analyse.";
      }
      if (!rows.length) {
        return "This student has no examination results recorded yet, so no plan can be built.";
      }
      return renderStudyPlan(computeStudyPlan(rows, threshold));
    },
    {
      name: "analyse_my_results",
      description:
        "Analyse the signed-in student's own examination record with exact arithmetic. Returns, per " +
        "subject: score out of 100, grade, semester, whether it is weak or at risk of failing, a " +
        "suggested number of study hours per week, and why it was flagged; plus the overall average, " +
        "semester averages and strongest subjects. Call this for any question about what to revise, " +
        "how the student is performing, or which subjects are weak. It does not predict future grades.",
      schema: z.object({}),
    },
  );
}

function cohortTool(threshold: number, department: string | null) {
  return tool(
    async ({ departmentFilter }: { departmentFilter?: string }) => {
      const dept = departmentFilter || department || null;
      const subjects = await fetchSubjectCohort(threshold, dept);
      if (!subjects.length) return "No examination results were found for that scope.";

      const lines = [
        `COHORT PERFORMANCE (${dept ? "department: " + dept : "institution-wide"}), ` +
        `weak threshold ${threshold} out of 100:`,
        "",
      ];
      for (const s of subjects) {
        lines.push(
          `- ${s.subjectName} (${s.subjectCode}, semester ${s.semester}): ` +
          `average ${s.average} out of 100 across ${s.students} student(s), ` +
          `${s.belowThreshold} below the threshold`,
        );
      }
      lines.push("");
      lines.push("Aggregate figures only. No individual student is identified in this view.");
      return lines.join("\n");
    },
    {
      name: "analyse_cohort_performance",
      description:
        "Analyse examination performance across a cohort: per subject, the average score out of 100, " +
        "how many students sat it, and how many fell below the weak threshold, sorted worst first. " +
        "Aggregate only - it never returns an individual student's marks. Call this for questions " +
        "about which subjects a department or the institution struggles with.",
      schema: z.object({
        departmentFilter: z.string().optional()
          .describe("Restrict to one department by name. Omit for institution-wide figures."),
      }),
    },
  );
}

function academicPolicyTool() {
  return tool(
    async ({ query }: { query: string }) => {
      try {
        const hits = await retrieve(query, 4);
        const usable = hits.filter(h => h.score > 0.4);
        if (!usable.length) {
          return "No university policy document matching that query was found in the portal knowledge base.";
        }
        return usable
          .map((h, i) => `[${i + 1}] ${h.title} (relevance ${h.score.toFixed(2)})\n${h.content.slice(0, 900)}`)
          .join("\n\n");
      } catch (e: any) {
        return "The policy search could not be completed: " + String(e?.message || e).slice(0, 200);
      }
    },
    {
      name: "search_academic_policy",
      description:
        "Search official university policy documents for rules about examinations, re-assessment, " +
        "attendance requirements, supplementary exams, grading scales and academic progression. " +
        "Use this for questions about what the RULES say, as opposed to what this student scored.",
      schema: z.object({
        query: z.string().describe("What to look for in plain English, e.g. 'supplementary exam eligibility'"),
      }),
    },
  );
}

/* ---------------- the agent loop ---------------- */

export interface StudyAnswer {
  answer: string;
  toolsUsed: string[];
  rounds: number;
  latencyMs: number;
}

export async function askStudyAgent(opts: {
  session: Session;
  question: string;
  threshold: number;
  department?: string | null;
  history?: { role: string; text: string }[];
}): Promise<StudyAnswer> {
  const started = Date.now();

  if (!studyAiConfigured()) {
    return { answer: "The study adviser is not configured on this deployment.", toolsUsed: [], rounds: 0, latencyMs: 0 };
  }

  const tools: any[] = [academicPolicyTool()];
  if (can(opts.session, "study.viewOwn")) tools.push(ownPlanTool(opts.session.userId, opts.threshold));
  if (can(opts.session, "study.viewCohort")) tools.push(cohortTool(opts.threshold, opts.department || null));

  const byName = new Map<string, any>(tools.map(t => [t.name, t]));

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: CHAT_MODEL,
    temperature: 0.2,
    maxOutputTokens: 800,
  });
  const bound = llm.bindTools(tools);

  const messages: any[] = [new SystemMessage(SYSTEM)];
  for (const t of (opts.history || []).slice(-6)) {
    messages.push(t.role === "user" ? new HumanMessage(t.text) : new AIMessage(t.text));
  }
  messages.push(new HumanMessage(opts.question));

  const toolsUsed: string[] = [];
  let rounds = 0;
  let answer = "";

  try {
    for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
      rounds = i + 1;
      const res: any = await bound.invoke(messages);
      const calls = res?.tool_calls || [];

      if (!calls.length) {
        answer = typeof res?.content === "string"
          ? res.content
          : Array.isArray(res?.content)
            ? res.content.map((c: any) => c?.text || "").join("")
            : String(res?.content ?? "");
        break;
      }

      messages.push(res);
      for (const call of calls) {
        const impl = byName.get(call.name);
        let output: string;
        if (!impl) {
          output = `The tool "${call.name}" is not available to this user's role.`;
        } else {
          try {
            output = String(await impl.invoke(call.args ?? {}));
          } catch (e: any) {
            output = "That tool failed: " + String(e?.message || e).slice(0, 200);
          }
        }
        toolsUsed.push(call.name);
        messages.push(new ToolMessage({ content: output, tool_call_id: call.id ?? call.name }));
      }
    }

    if (!answer) answer = "I could not complete that after several attempts. Please rephrase the question.";
  } catch (e: any) {
    /* The model is unavailable. The arithmetic does not depend on it, so hand
       back the exact plan rather than only an error. */
    const detail = String(e?.message || e);
    const quota = /429|quota|rate limit/i.test(detail);
    let fallback = "";
    if (can(opts.session, "study.viewOwn")) {
      try {
        const rows = await fetchStudentResults(opts.session.userId);
        if (rows && rows.length) {
          fallback = renderStudyPlan(computeStudyPlan(rows, opts.threshold));
          toolsUsed.push("analyse_my_results");
        }
      } catch { /* fall through */ }
    }
    answer = fallback
      ? (quota
          ? "The AI explanation is unavailable right now (the model's request quota is exhausted), "
          : "The AI explanation could not be generated, ") +
        "so here is the exact plan straight from the analysis tool:\n\n" + fallback
      : "The study adviser could not be reached just now. Details: " + detail.slice(0, 200);
  }

  return {
    answer: answer.trim(),
    toolsUsed: [...new Set(toolsUsed)],
    rounds,
    latencyMs: Date.now() - started,
  };
}

/**
 * Reword an already-computed plan. The tool has run; the model only phrases it,
 * so the figures on screen cannot be wrong even if the model is.
 */
export async function studySummary(raw: string): Promise<{ summary: string }> {
  if (!raw) return { summary: "No examination results are recorded yet." };
  if (!studyAiConfigured()) {
    return { summary: "AI explanation is unavailable on this deployment. The figures below are still exact." };
  }
  try {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: CHAT_MODEL,
      temperature: 0.2,
      maxOutputTokens: 400,
    });
    const res: any = await llm.invoke([
      new SystemMessage(
        "Rewrite the study plan below for the student in three or four sentences. Use ONLY the " +
        "numbers given - do not calculate anything new, do not add a figure that is not present, " +
        "and never predict a future grade. Name the most urgent subject and give the overall " +
        "picture. Be direct and encouraging.",
      ),
      new HumanMessage(raw),
    ]);
    const text = typeof res?.content === "string" ? res.content : String(res?.content ?? "");
    return { summary: text.trim() || "See the plan below." };
  } catch {
    return { summary: "The plain-language summary could not be generated, but the plan below is exact." };
  }
}
