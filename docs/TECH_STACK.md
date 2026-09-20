# Technical reference

Everything in this project, as built. Written to be answerable from — if
someone asks "what did you use and why", the answer is on this page.

Last updated 19 September 2026 · 163 commits.

---

## Scale

| | |
|---|---|
| Database models | 50 (plus 15 enums) |
| API route groups | 19 |
| Library modules | 59 |
| React components | 37 |
| Pages | 25 |
| Application code | ~20,000 lines TypeScript |
| Tests | 284 across 15 files (~2,000 lines) |
| Python agent | ~1,250 lines |
| Documentation | ~3,500 lines |
| Capabilities in the matrix | 30 |

---

## The stack

### Front end

| Technology | Version | Why |
|---|---|---|
| **Next.js** | 16.3 | App Router. Server components for data pages, route handlers for the API — one deployable instead of a separate front end and back end. |
| **React** | 19 | |
| **TypeScript** | 5.6 | Build errors **enabled**. `npx tsc --noEmit` is part of every check; the build fails on a type error rather than shipping it. |
| **Tailwind CSS** | 3.4 | With a token layer in `globals.css` — radius, elevation and type scales as CSS variables, so a change moves the whole portal. |
| **Framer Motion** | 11.11 | One shared vocabulary in `lib/motion.ts`: springs not durations, nothing loops, everything respects `prefers-reduced-motion`. |
| **Recharts** | 2.13 | Charts. |
| **lucide-react** | 0.460 | Icons. |
| **Three.js** | 0.170 | Landing page only. |

**Typography.** Source Serif 4 for display, Inter for body, via `next/font`.
The serif echoes the university wordmark; body copy stays sans because the
portal is mostly dense tables and a serif at 13px is harder to read.

### Data

| Technology | Version | Notes |
|---|---|---|
| **PostgreSQL** | 16 | Neon, AWS `us-east-1`, project `neon-chestnut-pendant`. |
| **Prisma** | 5.22 | 50 models. Type-safe queries; the schema is the source of truth for `docs/ERD.md`. |
| **Vercel Blob** | 2.8 | IQAC evidence documents. **Private** blob, served through a visibility check — never a public URL. |

### AI

| Technology | Notes |
|---|---|
| **LangChain.js** 1.5 + `@langchain/google-genai` | The portal's agents. |
| **Google Gemini** | `AI_CHAT_MODEL`, currently `gemini-3.1-flash-lite`. `gemini-embedding-001` for retrieval. |
| **LangChain (Python)** in `ai-agent/` | The same AI layer rebuilt as a Streamlit app: `TextLoader`, `PyPDFLoader`, HuggingFace `BAAI/bge-small-en-v1.5`, Chroma, `@tool`, `create_agent`, `ChatOllama` on `qwen3:8b`. |

### Authentication and security

| Technology | Notes |
|---|---|
| **jsonwebtoken** | JWT with a `tv` (token version) claim. Incrementing a user's `tokenVersion` kills every existing session immediately. |
| **bcryptjs** 3.0 | Password hashing. |
| **@simplewebauthn** 14 | Passkeys — fingerprint and face sign-in. |
| **Node `crypto`** | AES-256-GCM field encryption for grievance identities. |
| **zod** 4.6 | Every request body validated at the boundary. |

### Testing

**Vitest 5** — 284 tests, 15 files, no database or network required. Every
suite tests pure functions, which is why the maths and the rules are testable
at all.

---

## Architecture

### One repository, two implementations

```
sou-ai-helpdesk-pro/
├── frontend/          Next.js 16 — the deployed portal
│   ├── app/           pages + API route handlers
│   ├── components/    37 React components
│   ├── lib/           59 modules: the actual logic
│   ├── prisma/        50-model schema + seeds
│   └── tests/         284 Vitest tests
├── ai-agent/          the same AI layer in Python/Streamlit
├── backend/           Express service (legacy; the portal is self-contained)
└── docs/              14 documents
```

### The pattern every feature follows

Three files, and the split is the point:

```
lib/<name>-math.ts   pure arithmetic — no Prisma, no network, unit tested
lib/<name>-db.ts     the Prisma queries
lib/<name>-api.ts    the route handler: auth, capability check, response
app/api/<name>/[...path]/route.ts    re-exports the handler
```

`finance`, `study`, `fun` and `transcript` all follow it. The reason is that
**the arithmetic is the part that must be right**, and separating it from the
database is what makes it testable without one. The fee parser bug below was
caught precisely because `finance-math.ts` could be tested in isolation.

---

## The three ideas worth defending

### 1. Authorisation is structural, not instructional

`lib/policy.ts` holds 30 capabilities against 7 roles. For the AI features the
matrix does not merely *check* permission — it decides **which tools are bound
to the agent**.

```ts
const tools = [policyTool()];
if (can(session, "finance.viewOwn"))            tools.push(ownFeesTool(...));
if (can(session, "finance.viewInstitutional"))  tools.push(institutionalTool(...));
```

A student's agent is never handed `analyse_institutional_finance`. The model is
never told it exists. There is no phrasing that reaches a function that was not
passed in.

Most systems do this with a line in the system prompt — *"never reveal
institutional figures to a student"* — which is a **request**, and requests can
be argued with. The question here stops being "will the model comply?" and
becomes "was the function bound?", which is a fact about a list.

`tests/policy.test.ts` pins the matrix, so widening it fails the build.

### 2. The model never calculates

Every figure comes from a tool. The agents are told, in order of importance,
that they may never compute a number and never state one a tool did not return.

The demonstration: ask the fee assistant *"what will be my penalty?"* It gives
the exact overdue amount — ₹30,000, 35 days — because `finance-math.ts`
computed it, then says the policy documents do not state the penalty rate and
routes you to the Accounts Office. It had every opportunity to invent a
percentage.

### 3. Refusing is a feature

Three gates, all server-side, all before the model is called:

- **`lib/ai-guard.ts`** — questions about a student's own record go to a human,
  not to a retrieval model working from policy documents. 40 tests.
- **`lib/tutor-core.ts`** — the tutor explains concepts but will not claim to
  know your syllabus, your exam, your timetable or your marks. 38 tests.
- **Confidence floor** in `lib/ai.ts` — below it, OakMitra says so and offers a
  ticket rather than improvising.

---

## Feature inventory

| Feature | Key modules |
|---|---|
| **OakMitra assistant** | `lib/ai.ts`, `lib/ai-guard.ts`, `app/assistant` — RAG over 20 articles, tri-lingual (English/Hindi/Gujarati), voice in and out, source chips |
| **Fee assistant** | `lib/finance-math.ts`, `lib/finance-agent.ts` — role-bound tools, statement upload, step-up auth for institutional figures |
| **Study plan** | `lib/study-math.ts`, `lib/study-agent.ts` — deterministic priorities, transcript upload, cohort view (staff only) |
| **Tutor** | `lib/tutor-core.ts` — concept explanation at three depths, generated practice questions |
| **Class group** | `lib/whatsapp.ts` — WhatsApp export parsing, phone-number redaction, nothing persisted |
| **Opportunity search** | `lib/careers-math.ts` — keywords from the student's strongest subjects, live Remotive feed |
| **Morning briefing agent** | `lib/briefing-core.ts`, `briefing-api.ts` — unattended Vercel Cron job; plan → act → observe → report → remember; three feeds (Remotive openings, Hugging Face trending models, new-and-starred GitHub repositories); per-student memory of every URL already shown |
| **Fun Zone** | `lib/fun-core.ts`, `fun-code.ts`, `fun-progress.ts` — 11 daily puzzles, levels, streaks, 10 badges, weekly board, 30-minute budget |
| **GreenReserve** | `lib/greenreserve.ts` — room booking with interval clash detection |
| **QR attendance** | `lib/qr.ts` — 20-second rotating code, idempotent scans |
| **Grievances** | `lib/crypto.ts` — AES-256-GCM identity encryption; HOD handles, only Owner reveals, reveal is audited |
| **IQAC** | `lib/iqac*.ts` — evidence chain across four separate hands |
| **Audit trail** | `lib/audit.ts` — redacts passwords, tokens and identity references |
| **Accounts** | `lib/admin-api.ts` — password reset with rank enforcement |
| **Passkeys** | `lib/webauthn.ts` |

---

## Design system

| | |
|---|---|
| **Palette** | From the university logo: maroon `#9B1C26`, oak green `#106B3F`, gold `#C9A227` |
| **Background** | `#120a0c` dark, `#faf6f2` light — warm, not blue-black |
| **Type** | Source Serif 4 display, Inter body, one 6-step scale |
| **Radius** | `--r-sm` 10px → `--r-xl` 26px |
| **Elevation** | Three shadow levels |
| **Theme** | **Light by default**, remembered, system preference on first visit, no flash |
| **Motion** | `lib/motion.ts` — three springs, five variants, reduced-motion aware |

---

## Deployment

| | |
|---|---|
| Host | Vercel, `main` auto-deploys |
| Live | https://sou-ai-help-desk-pro-frontend.vercel.app |
| Repository | https://github.com/Jaykrishna25/SOU-AI-HelpDesk-Pro |
| Database | Neon PostgreSQL, AWS us-east-1 |
| Files | Vercel Blob, private |

**Environment:** `DATABASE_URL`, `JWT_SECRET` (refuses to fall back to a
default in production), `GEMINI_API_KEY`, `AI_CHAT_MODEL`, `GRIEVANCE_KEY`
(backed up outside Vercel — lose it and every encrypted identity is
permanently unreadable), `BLOB_READ_WRITE_TOKEN`.

---

## Bugs the tests caught

Worth knowing, because "what went wrong" is a better answer than a feature
list.

**The fee parser read `"1,50,000"` as `1`.** It split on every candidate
delimiter at once and ignored quoted fields, so in a semicolon-separated file a
student would have been told they owed one rupee. Fixed with per-file delimiter
detection and quote-aware splitting.

**The refusal gate was written twice and the copies disagreed.** The corner
bubble refused *"what are my results?"*; the full-page assistant answered it,
because `\bresult\b` does not match `results`. One shared gate now.

**`\bमेरी\b` can never match.** JavaScript's `\b` is defined over
`[A-Za-z0-9_]`, so in a portal advertised as multilingual, every Hindi and
Gujarati question about a student's own record passed straight through.

**Token revocation could be bypassed.** The check read
`typeof s.tv === "number" && s.tv !== u.tokenVersion` — skipping entirely for
any token without a `tv` claim. Now fails closed.

**Robot Path level 1 was unsolvable** by the route its own hint described, and
every `par` was wrong by 3–4 moves. There is now a breadth-first search in the
test suite asserting `par` is the true shortest path.

**A coin was worth less than speed** in Robot Path, quietly making the coins a
trap. The comment said otherwise; the arithmetic didn't.

---

## Known gaps

Thirteen findings in `docs/QA_REPORT.md` with severities. The accepted ones:

- No rate limiting on the AI endpoints
- Booking clash detection is not atomic — correct predicate, no DB constraint
- Booking hours stored in UTC
- Seed data has one department
- `Subject` has no credits column
- Fun Zone budget can be avoided by never submitting a score (mitigated by a
  2-minute minimum charge; forfeits the leaderboard, which is the point of
  playing)

**Thirteen fabricated statistics have been removed** from this project. If a
figure appears on screen it should come from the database.
