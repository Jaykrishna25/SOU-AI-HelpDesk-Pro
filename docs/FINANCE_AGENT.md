# Fee Statement Simplifier — agentic pipeline

An agent inside the SOU portal that reads a fee statement, analyses it
automatically, and answers questions about it by calling tools.

Route: `/finance` · API: `/api/finance/*`

---

## Why this exists

A fee statement is a document students receive and do not understand. The
amounts are split across semesters, the due dates are implicit, and the
consequence of missing one is written in a policy document somewhere else
entirely. Answering "how much do I actually owe, and am I late?" means
combining a record, a calculation, and a policy.

That is three different retrieval problems, which is what makes it an agent
task rather than a chatbot task.

---

## Pipeline

```
   statement (CSV/text upload)          portal fee record (Prisma)
              │                                    │
              └────────────┬───────────────────────┘
                           ▼
                  parseStatement()                  ← loose column matching,
                           │                          unreadable rows counted
                           ▼
                  analyseFeeRows()                  ← ALL arithmetic happens here
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     rendered on screen         renderStudentAnalysis()
     (exact figures)                    │
                                        ▼
                              opening summary (LLM)   ← reword only, never compute
                                        │
                                        ▼
                        ┌───── tool-calling agent ─────┐
                        │  analyse_fee_statement       │  deterministic arithmetic
                        │  analyse_institutional_fees  │  deterministic, role-gated
                        │  search_fee_policy           │  RAG over portal documents
                        └──────────────────────────────┘
```

## Files

| File | Responsibility |
|---|---|
| `lib/finance-math.ts` | Pure arithmetic and statement parsing. No database, no model. Unit tested. |
| `lib/finance-db.ts` | Prisma queries that feed the arithmetic. Fetches rows only; calculates nothing. |
| `lib/finance.ts` | Public entry point re-exporting both. |
| `lib/finance-agent.ts` | Tool definitions and the tool-calling loop. |
| `lib/finance-api.ts` | Endpoints, permission checks, audit. |
| `app/finance/page.tsx` | Upload-first interface. |
| `tests/finance.test.ts` | Arithmetic and parser tests. |

---

## Three design decisions

### 1. The model is forbidden to calculate

Every figure comes from `analyseFeeRows()`, which is ordinary TypeScript
arithmetic. The system prompt's first rule is *"You NEVER calculate. The tools
calculate."* The model receives computed figures and puts them into sentences.

This is not a stylistic preference. A language model asked to total a fee
statement will usually be right and occasionally be wrong, and a fee balance
that is occasionally wrong is worse than no feature at all. Splitting
`finance-math.ts` away from the database means that arithmetic is tested
directly, with no model and no Postgres in the loop.

The screen carries a **"show the exact tool output the assistant was given"**
expander, so any answer can be checked against its own working.

### 2. Authorisation is structural, not a prompt instruction

Tools are bound to the agent **according to the caller's role**, decided by the
existing capability matrix in `lib/policy.ts`:

```ts
const tools = [policyTool()];
if (can(session, "finance.viewOwn"))           tools.push(ownFeesTool(...));
if (can(session, "finance.viewInstitutional")) tools.push(institutionalTool(...));
```

A student's model is never given `analyse_institutional_fees`. There is no
prompt to jailbreak and no instruction to talk around — the function is absent
from the model's tool list. An HOD is additionally pinned to their own
department server-side, so passing a different department in the request body
changes nothing.

The institutional tool returns aggregates only; no individual student is ever
named in that view. Every institutional read is written to the audit log.

### 3. The analysis runs before the first question

The tool executes on ingestion and the result is rendered immediately. The user
is not required to know what to ask, and the opening summary cannot be wrong,
because it is produced by calling the analysis function directly and asking the
model only to reword the output — not by hoping the model chooses to call a
tool.

---

## What it refuses to do

- **Invent a figure.** If the tool returns nothing, the answer says so.
- **Give financial advice.** It explains what the numbers say. It does not
  recommend a loan or tell a student what to do about money. The disclaimer is
  on screen, not buried.
- **Silently drop bad data.** Rows that cannot be parsed are counted and the
  count is shown, so a partial parse is visible rather than hidden.
- **Guess a late fee.** Penalties are a matter of policy, so that question is
  routed to `search_fee_policy` and answered from the document or not at all.

---

## Trying it

1. Sign in to the portal.
2. Go to `/finance`.
3. Either **Upload a statement** (CSV with a semester column and an amount
   column) or **Use my portal record**.
4. The analysis appears immediately. Ask a follow-up; the badges under each
   answer show which tools produced it.

Sample statement:

```csv
Semester,Total Fees,Paid Fees,Status,Due Date
1,110000,110000,PAID,2025-08-01
2,110000,110000,PAID,2026-01-15
3,110000,40000,PENDING,2026-07-15
4,110000,0,PENDING,2027-01-15
```

## Configuration

`GEMINI_API_KEY` must be set. `AI_CHAT_MODEL` defaults to `gemini-3.6-flash`.
No credential is hard-coded. Without the key the deterministic analysis still
renders in full; only the plain-language summary and the chat are unavailable,
and the page says so.
