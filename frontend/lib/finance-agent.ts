import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { SystemMessage, HumanMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";

import { retrieve } from "@/lib/ai";
import { can } from "@/lib/policy";
import type { Session } from "@/lib/server-auth";
import {
  analyseStudentFees, analyseInstitutionalFees, analyseFeeRows,
  renderStudentAnalysis, renderInstitutionalAnalysis,
  type FeeRow,
} from "@/lib/finance";

/* ============================================================
   Fee assistant: a tool-calling agent.

   Two things distinguish this from the general help desk chain:

   1. It CALLS TOOLS. The model decides which to invoke; the tools
      do the arithmetic and the retrieval. The model never computes
      a figure, and the tools it ran are returned to the caller so
      an answer can be checked against its own working.

   2. Its tools are BOUND BY ROLE. A student's agent is never given
      the institutional tool, so no prompt-injection or clever
      phrasing can reach aggregate finance data - the function is
      simply not on the model's list. Authorisation is structural,
      not a sentence in a prompt.
   ============================================================ */

const CHAT_MODEL = process.env.AI_CHAT_MODEL || "gemini-3.6-flash";
const MAX_TOOL_ROUNDS = 4;

export function financeAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

const SYSTEM = `You are the Silver Oak University fee assistant.

HARD RULES, in order of importance:
1. You NEVER calculate. The tools calculate. If you need a number, call a
   tool. Never add, subtract, or estimate a figure yourself, and never state
   a number that did not come from a tool result.
2. Always say where a figure came from: the portal fee record, the statement
   the user uploaded, or university policy. If a question mixes these, say
   which is which.
3. You are not a financial adviser and you do not give financial advice. You
   explain what the numbers say. You never recommend taking a loan, and you
   never tell a student what they should do about money.
4. If a tool returns nothing useful, say so plainly. Do not guess, and do not
   fall back on general knowledge about Indian university fees.
5. Amounts are INR. Percentages are percentages, not fractions.
6. Be brief - two to five sentences unless the user asks for a breakdown.
7. Answer in the language the user wrote in.`;

/* ---------------- tools ---------------- */

function policyTool() {
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
      name: "search_fee_policy",
      description:
        "Search official Silver Oak University policy documents for rules about fees, due dates, late payment, " +
        "instalments, refunds, scholarships and concessions. Use this for any question about what the RULES say, " +
        "as opposed to what a particular student owes. Returns extracts from portal policy documents.",
      schema: z.object({
        query: z.string().describe("What to look for, in plain English, e.g. 'late fee penalty for overdue tuition'"),
      }),
    },
  );
}

function ownFeesTool(userId: string, uploaded: FeeRow[] | null) {
  return tool(
    async () => {
      if (uploaded && uploaded.length) {
        return renderStudentAnalysis(analyseFeeRows(uploaded, "uploaded-statement"));
      }
      const a = await analyseStudentFees(userId);
      if (!a) {
        return "No fee record exists in the portal for this account, and no statement has been uploaded. " +
               "Ask the user to upload their fee statement.";
      }
      if (!a.lines.length) {
        return "This account has a student record but no fee rows, so there is nothing to analyse.";
      }
      return renderStudentAnalysis(a);
    },
    {
      name: "analyse_fee_statement",
      description:
        "Analyse the signed-in user's own fee position with exact arithmetic. Returns, per semester: amount billed, " +
        "amount paid, amount outstanding, percentage paid, due date, whether it is overdue and by how many days; " +
        "plus totals and the next payment due. Uses the uploaded statement when the user has provided one, " +
        "otherwise the portal fee record. Call this for any question about what THIS user owes, has paid, or when " +
        "their payment is due. All amounts are INR.",
      schema: z.object({}),
    },
  );
}

function institutionalTool(department: string | null) {
  return tool(
    async ({ departmentFilter }: { departmentFilter?: string }) => {
      const dept = departmentFilter || department || null;
      const a = await analyseInstitutionalFees(dept);
      if (!a.studentsWithFees) {
        return "No fee records were found for that scope, so there is nothing to report.";
      }
      return renderInstitutionalAnalysis(a, dept ? `department: ${dept}` : "institution-wide");
    },
    {
      name: "analyse_institutional_fees",
      description:
        "Analyse fee collection across the institution with exact arithmetic: total billed, total collected, " +
        "outstanding, collection rate as a percentage, how many students are overdue, and breakdowns by semester " +
        "and by department. Aggregate figures only - it never returns an individual student's details. Call this " +
        "for questions about overall collection, departmental comparison, or institutional outstanding dues.",
      schema: z.object({
        departmentFilter: z.string().optional()
          .describe("Restrict to one department by name. Omit for institution-wide figures."),
      }),
    },
  );
}

/* ---------------- the agent loop ---------------- */

export interface FinanceAnswer {
  answer: string;
  toolsUsed: string[];
  toolOutputs: { tool: string; output: string }[];
  rounds: number;
  latencyMs: number;
}

export async function askFinanceAgent(opts: {
  session: Session;
  question: string;
  uploaded?: FeeRow[] | null;
  department?: string | null;
  history?: { role: string; text: string }[];
}): Promise<FinanceAnswer> {
  const started = Date.now();

  if (!financeAiConfigured()) {
    return {
      answer: "The fee assistant is not configured on this deployment.",
      toolsUsed: [], toolOutputs: [], rounds: 0, latencyMs: Date.now() - started,
    };
  }

  /* Role decides the toolset. A student's model never sees the
     institutional function, so it cannot call it. */
  const tools: any[] = [policyTool()];
  if (can(opts.session, "finance.viewOwn")) {
    tools.push(ownFeesTool(opts.session.userId, opts.uploaded || null));
  }
  if (can(opts.session, "finance.viewInstitutional")) {
    tools.push(institutionalTool(opts.department || null));
  }

  const byName = new Map<string, any>(tools.map(t => [t.name, t]));

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: CHAT_MODEL,
    temperature: 0.1,
    maxOutputTokens: 800,
  });
  const bound = llm.bindTools(tools);

  const messages: any[] = [new SystemMessage(SYSTEM)];
  for (const t of (opts.history || []).slice(-6)) {
    messages.push(t.role === "user" ? new HumanMessage(t.text) : new AIMessage(t.text));
  }
  messages.push(new HumanMessage(opts.question));

  const toolsUsed: string[] = [];
  const toolOutputs: { tool: string; output: string }[] = [];
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
          // Model asked for a tool its role does not have. Say so rather than
          // silently ignoring it, so the refusal is visible and auditable.
          output = `The tool "${call.name}" is not available to this user's role.`;
        } else {
          try {
            output = String(await impl.invoke(call.args ?? {}));
          } catch (e: any) {
            output = "That tool failed: " + String(e?.message || e).slice(0, 200);
          }
        }
        toolsUsed.push(call.name);
        toolOutputs.push({ tool: call.name, output });
        messages.push(new ToolMessage({ content: output, tool_call_id: call.id ?? call.name }));
      }
    }

    if (!answer) {
      answer = "I could not complete that after several attempts. Please try rephrasing the question.";
    }
  } catch (e: any) {
    /* The model is unavailable - rate limited, over quota, or unreachable.
       The arithmetic does not depend on it, so rather than returning only an
       error we run the analysis tool directly and hand back the exact figures.
       The user loses the prose, not the answer. */
    const detail = String(e?.message || e);
    const quota = /429|quota|rate limit/i.test(detail);

    let fallback = "";
    if (can(opts.session, "finance.viewOwn")) {
      try {
        fallback = String(await ownFeesTool(opts.session.userId, opts.uploaded || null).invoke({}));
        toolsUsed.push("analyse_fee_statement");
        toolOutputs.push({ tool: "analyse_fee_statement", output: fallback });
      } catch { /* fall through to the plain error below */ }
    }

    answer = fallback
      ? (quota
          ? "The AI explanation is unavailable right now (the model's request quota is exhausted), " +
            "so here are the exact figures straight from the analysis tool:\n\n"
          : "The AI explanation could not be generated, so here are the exact figures straight from the " +
            "analysis tool:\n\n") + fallback
      : "The fee assistant could not be reached just now. Details: " + detail.slice(0, 200);
  }

  return {
    answer: answer.trim(),
    toolsUsed: [...new Set(toolsUsed)],
    toolOutputs,
    rounds,
    latencyMs: Date.now() - started,
  };
}

/**
 * The summary shown the moment a statement is analysed, before any question is
 * asked. The analysis tool is run DIRECTLY here rather than hoping the model
 * chooses to call it, so the figures on screen are always correct; the model is
 * asked only to put them into plain language.
 */
export async function openingSummary(opts: {
  session: Session;
  uploaded?: FeeRow[] | null;
}): Promise<{ raw: string; summary: string }> {
  const raw = opts.uploaded && opts.uploaded.length
    ? renderStudentAnalysis(analyseFeeRows(opts.uploaded, "uploaded-statement"))
    : (await analyseStudentFees(opts.session.userId).then(a => a ? renderStudentAnalysis(a) : "")) || "";

  if (!raw) {
    return { raw: "", summary: "No fee record was found for this account, and no statement has been uploaded yet." };
  }
  if (!financeAiConfigured()) {
    return { raw, summary: "AI explanation is unavailable on this deployment. The figures above are still exact." };
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
        "Restate the fee analysis below in plain language for a student, in three or four sentences. " +
        "Use ONLY the numbers given - do not calculate anything new and do not add any figure that is not " +
        "present. Do not give financial advice. Mention what is outstanding and anything overdue.",
      ),
      new HumanMessage(raw),
    ]);
    const text = typeof res?.content === "string" ? res.content : String(res?.content ?? "");
    return { raw, summary: text.trim() || "See the exact figures below." };
  } catch {
    return { raw, summary: "The plain-language summary could not be generated, but the figures below are exact." };
  }
}
