# Master brief — everything, in one place

For the viva, the demo and the judging panel. If you read one document before
walking into the room, read this one.

**Project:** SOU AI HelpDesk — Silver Oak University
**Built by:** Navlani Jaykrishna Satishkumar · SOU2023CSE69 · B.Tech CSE
**Live:** https://sou-ai-help-desk-pro-frontend.vercel.app
**Repo:** https://github.com/Jaykrishna25/SOU-AI-HelpDesk-Pro
**Scale:** 50 models · 284 tests · 163 commits · ~20,000 lines TypeScript

---

# PART 1 — The 60-second answer

Memorise this. Everything else hangs off it.

> "It's the university help desk. Seven roles, one capability matrix, and an AI
> assistant built on a rule that runs through the whole thing: **the model
> never calculates, and it refuses rather than guesses.**
>
> Every figure on screen comes from a tool or the database. When the assistant
> doesn't know something, it says so and offers a ticket instead of inventing
> an answer. And the permissions aren't a prompt instruction — a tool the
> caller isn't entitled to is never handed to the model at all."

**If they only try one thing:** sign in as a student, open Fee Analysis, ask
*"what will be my penalty?"* It gives the exact overdue figure — ₹30,000, 35
days — because arithmetic computed it, then says the policy documents don't
state the penalty rate and sends you to the Accounts Office.

---

# PART 2 — Where everything lives

## Top level

```
C:\dev\sou-ai-helpdesk-pro\
├── frontend/     the deployed portal (Next.js) — THE PROJECT
├── ai-agent/     the same AI layer in Python/Streamlit
├── backend/      legacy Express service — not used by the live portal
├── docs/         25 documents
└── README.md     opens with the submission banner
```

## The files you might be asked to open

| If they ask about | Open this |
|---|---|
| **Permissions / roles** | `frontend/lib/policy.ts` — 30 capabilities × 7 roles |
| **Role-bound AI tools** | `frontend/lib/finance-agent.ts` ~line 170 |
| **Fee arithmetic** | `frontend/lib/finance-math.ts` |
| **Study plan logic** | `frontend/lib/study-math.ts` |
| **What the assistant refuses** | `frontend/lib/ai-guard.ts` |
| **What the tutor refuses** | `frontend/lib/tutor-core.ts` |
| **RAG / retrieval** | `frontend/lib/ai.ts` — `CONFIDENCE_FLOOR = 0.55` |
| **Knowledge base** | `frontend/lib/kb-content.ts` — 20 articles |
| **Grievance encryption** | `frontend/lib/crypto.ts` — AES-256-GCM |
| **Session / token revocation** | `frontend/lib/server-auth.ts` |
| **Step-up auth** | `frontend/lib/stepup.ts` |
| **Account recovery / rank** | `frontend/lib/admin-api.ts` — `RANK` map |
| **WhatsApp parsing** | `frontend/lib/whatsapp.ts` |
| **Games** | `frontend/lib/fun-core.ts`, `fun-code.ts`, `fun-progress.ts` |
| **Database schema** | `frontend/prisma/schema.prisma` — 50 models |
| **Motion system** | `frontend/lib/motion.ts` |
| **Design tokens** | `frontend/app/globals.css` |
| **Palette** | `frontend/tailwind.config.ts` |

## Documents

| Document | What it is |
|---|---|
| `MASTER_BRIEF.md` | **This file** |
| `TECH_STACK.md` | Every dependency and why |
| `QA_REPORT.md` | **13 findings with severities** — open this if asked what's weak |
| `TESTING.md` | All 284 tests, what each proves |
| `VERIFICATION_CHECKLIST.md` | 10 live checks, all passed |
| `PORTAL_VIDEO.md` | 12-minute recording script |
| `ERD.md` | 50-model diagram |
| `ARCHITECTURE.md` | System diagrams |
| `API.md` | REST reference |
| `/role-map.html` | **Live page** — four diagrams of how roles interconnect |

---

# PART 3 — Technical questions

### "What's the stack?"

Next.js 16 App Router, React 19, TypeScript with build errors enabled,
Tailwind 3.4, Prisma 5.22 on Neon PostgreSQL, Gemini via LangChain.js, Vercel
Blob for files, Vitest for tests, Framer Motion for animation.

### "Why Next.js instead of separate front and back end?"

Route handlers put the API in the same deployment as the pages. One thing to
deploy, one set of types shared between client and server, no CORS. There *is*
an Express service in `backend/` from earlier work — the live portal doesn't
use it, and I'd say so rather than pretend it's part of the architecture.

### "How is the code organised?"

Every feature splits three ways:

```
lib/<name>-math.ts   pure arithmetic — no Prisma, no network
lib/<name>-db.ts     the Prisma queries
lib/<name>-api.ts    the route handler
```

**Why:** the arithmetic is the part that must be right, and separating it from
the database is what makes it testable without one. That split is why the fee
parser bug got caught before a student was told they owed one rupee.

### "How does the AI work?"

Retrieval-augmented generation. 20 knowledge-base articles are embedded with
`gemini-embedding-001` into a `KnowledgeChunk` table; a question is embedded,
cosine similarity picks the top matches, and those go to Gemini as context. If
the best match is below the confidence floor (0.55), the assistant says it
doesn't know rather than answering.

The fee and study assistants are **tool-calling agents** rather than plain RAG.
The model decides which tool to call; the tools do the arithmetic and the
retrieval; the tools that ran are shown to the user as chips.

### "What is actually *agentic* here? Every project has a chatbot."

The **morning briefing agent**, and the distinction is that nobody asks it for
anything. Vercel Cron issues a GET to `/api/briefing/cron` at 02:00 UTC daily,
and the agent runs a five-step loop per student:

| Step | What happens | Where |
|---|---|---|
| **Plan** | Picks search keywords from that student's strongest subjects | `lib/briefing-core.ts` → `planToday()` |
| **Act** | Calls three live feeds | `lib/briefing-api.ts` |
| **Observe** | Diffs the results against what this student has already been shown | `diffAgainstMemory()` |
| **Report** | Gemini at temperature 1.0 writes it up | `lib/briefing-api.ts` |
| **Remember** | Stores every URL shown, so tomorrow differs | `Briefing.seenUrls` |

The three feeds, none of which needs an API key:

- **Remotive** — job openings, matched per student to their own subjects.
- **Hugging Face** (`?sort=trendingScore`) — AI models published recently and
  being picked up now. Sorting by *downloads* instead would return the same
  2018 models every morning; trending score is recent activity.
- **GitHub search** — repositories `created:>60 days ago` **and** `stars:>300`.
  Either half alone is useless: newest repos are empty scaffolding, most-starred
  is a museum. The intersection is what's genuinely new.

Two design points worth volunteering before you're asked:

**Openings are personal, models and tools are shared.** Jobs are fetched per
student. The other two are identical for everyone, so they're fetched once per
run and cached for 30 minutes — partly to avoid 200× the work, mainly because
GitHub's unauthenticated search allows about ten requests a minute and would cut
us off inside the first dozen students.

**Temperature 1.0 is safe here, and that is not a contradiction.** Every figure
— download counts, star counts, ages, the number of new items — is computed by
deterministic TypeScript and handed to the model as fixed text. Temperature
applies only to the *wording*. The prose varies each morning, which is why
anyone reads the second one; the numbers cannot.

The system prompt also forbids the specific failure this feature invites:
treating a download count as a measure of quality. Popularity is not quality,
and a briefing that blurs the two teaches a student the wrong habit.

### "Is this real RAG or just a chatbot?"

Real RAG, and it's checkable: `lib/ai.ts` does embedding, cosine similarity,
a top-K retrieve and a confidence floor. Every answer shows source chips naming
the documents it used. `/api/ai/ingest` re-embeds when the content changes.

### "How do you stop a student seeing other students' data?"

`lib/policy.ts` — a capability matrix. But for the AI features it goes further:
the matrix decides **which tools are bound to the agent**.

```ts
const tools = [policyTool()];
if (can(session, "finance.viewOwn"))           tools.push(ownFeesTool(...));
if (can(session, "finance.viewInstitutional")) tools.push(institutionalTool(...));
```

A student's agent is never handed the institutional tool. The model is never
told it exists. There is no phrasing that reaches a function that wasn't
passed in.

### "How do you handle authentication?"

JWT with a `tv` (token version) claim. Every request re-reads the user and
compares `tv` against `tokenVersion` in the database — so incrementing that
column kills every existing session instantly. Passwords are bcrypt. Passkeys
via SimpleWebAuthn. Sensitive money views need a **step-up**: a five-minute
elevation token requiring the password again.

### "What's in the database?"

50 models, 15 enums. Users and roles, students and results, fees, tickets with
their history, bookings, attendance sessions and scans, grievances, IQAC
evidence and criteria, audit entries, notifications, game scores.

### "How much is tested?"

284 tests across 15 files, all pure — no database, no network. The suite covers
the capability matrix, fee and study arithmetic, encryption round-trips, what
the assistant refuses, the game logic and the progression maths.

`npm test` and `npx tsc --noEmit` both have to pass before anything ships.

---

# PART 4 — Trick questions, and how to answer them

These are the ones designed to catch you out. **The honest answer is the
strong answer in every case.**

### ⚠️ "Is this real student data?"

> "No. It's seed data throughout, and the institutional finance figures are
> demonstration values — the tool that returns them says so in its own output,
> so the model can't report them as real. Individual fee and result figures
> come from the database, but the records in it are seeded."

**Never claim it's real.** The whole project's credibility rests on this.

### ⚠️ "Your AI could still hallucinate. What then?"

> "It can, on anything it generates. That's why the numbers aren't generated —
> every figure comes from a tool, and the tools that ran are shown as chips
> under the answer, so you can check it against its own working. The tutor is
> the one feature that generates freely, and it's the one with the hardest
> boundary: it explains concepts and refuses to claim anything about your
> syllabus, your exam or your marks."

### ⚠️ "What's weak about this?"

Open `docs/QA_REPORT.md`. Thirteen findings with severities.

> "No rate limiting on the AI endpoints. Booking clash detection uses the
> correct predicate but isn't atomic — two simultaneous requests could both
> pass. Booking hours are stored in UTC, so they display wrong for IST. Seed
> data has one department. And the Fun Zone budget can be avoided by never
> submitting a score."

Saying this yourself is worth more than any feature. It's also true.

### ⚠️ "Did you build this or did AI build it?"

> "AI-assisted, and I'd say so. What I can defend is every decision in it — why
> the arithmetic is separated from the database, why permissions are structural
> rather than a prompt instruction, why the fee assistant refuses to invent a
> penalty rate. Ask me about any file and I'll tell you what it does and what
> we got wrong first."

Then offer a bug. The `\bमेरी\b` one lands best.

### ⚠️ "Why does the Fun Zone belong in a university portal?"

> "Thirty minutes a day, enforced server-side — the endpoint returns 423 once
> it's spent. And the games are subject-relevant: Debug It uses real logic
> bugs, Concept Ladder uses syllabus terms, Predict the Output uses traps like
> `typeof null`. A break can still be practice. We chose a budget over a time
> window deliberately, because a window makes a rule about the timetable and
> the timetable isn't the portal's business."

### ⚠️ "Won't students play during lectures?"

Above. Server-enforced, not browser-enforced.

### ⚠️ "Isn't uploading a WhatsApp group a privacy problem?"

> "Yes, and it's handled rather than waved away. An export isn't one person's
> data — it's sixty people's. So phone numbers are stripped before anything is
> parsed further, senders who are numbers become 'Member 1', attachments aren't
> read, and **nothing is stored** — there's no database table for chat
> messages. The redaction has a nine-digit floor so 'room 204' and '10:00 AM'
> survive; mangling the exam time would be worse than not having the feature."

### ⚠️ "What if the GRIEVANCE_KEY is lost?"

> "Every encrypted identity becomes permanently unreadable. It's backed up
> outside Vercel for exactly that reason. It's a real single point of failure
> and it's documented as one."

### ⚠️ "You claim NAAC A grade — can you prove it?"

**The portal makes no accreditation claim.** The grade appears only on the
university's own logo.

> "The portal doesn't assert anything about accreditation. The IQAC module
> manages evidence and its report lists the criteria that have *no* evidence
> rather than filling them in — 1 evidenced, 42 gaps, in the last run."

### ⚠️ "Show me something that doesn't work."

Pick one and be direct. The Exams tab (not connected to the Examination Cell),
the Workforce panel (figures not computed), Strategic Forecasting (no model
exists). Each one says so on screen rather than showing a placeholder.

> "Those say 'not implemented' and list what they'd need. A placeholder
> presented as a real figure is worse than an empty panel — it's a number
> someone might act on."

### ⚠️ "Could a student fake a high score?"

> "No. The answer never leaves the server. For every one of the eleven games
> the client posts an attempt and the server decides — it re-generates the
> puzzle from the date and checks. Robot Path is the clearest case: the server
> walks the command sequence itself rather than trusting 'I reached the goal'."

### ⚠️ "What happens if the AI service is down?"

> "The portal degrades rather than breaks. If Gemini is unreachable the fee
> analysis still runs — the arithmetic is Python-side, so you get the exact
> figures without the plain-language summary. Retrieval failures say so
> explicitly rather than returning an empty answer."

### ⚠️ "Why two implementations of the same thing?"

> "`ai-agent/` is the same AI layer in Python — LangChain, Chroma, HuggingFace
> embeddings, Ollama. It exists because the role-gating idea is easier to *see*
> on one screen than across a seven-role web app, and because it shows the
> design isn't a quirk of one framework. `agent_core/policy.py` is a direct
> translation of `frontend/lib/policy.ts`."

---

# PART 5 — Non-technical questions

### "What problem does it solve?"

> "A student with a question about fees, results, attendance or a deadline has
> to find the right office, during office hours. Most of those questions have
> the same twenty answers. This answers them instantly, cites where the answer
> came from, and routes the rest to a person — with an audit trail."

### "Who is it for?"

Seven roles: students, faculty, admin, HOD, HOI, owner, super admin. Each sees
a different portal built from the same capability matrix.

### "How long did it take?"

163 commits. The AI layer, the games and the design system were the last day.

### "What would you do next?"

> "Rate limiting on the AI endpoints — it's finding 3b in the QA report. A
> database constraint for booking clashes. And integration with the real SOU
> MIS, which is the difference between a working demonstration and something
> the university could actually run."

### "What are you most proud of?"

> "That it refuses. Most of the effort went into places where the system could
> have produced something plausible and chose not to — the penalty rate, a
> question about your own marks, an accreditation gap. Fifty features are easy;
> a system that declines to guess is the harder thing and the more useful one."

### "What did you learn?"

> "That the dangerous failure isn't the error message, it's the plausible
> answer. Thirteen fabricated statistics came out of this project — things like
> '+18% admissions' and a '90% confidence' claim that didn't match the code.
> None of them threw an exception. They just sat there looking correct."

---

# PART 6 — The bugs (have one ready)

Being able to name a bug you found and fixed is worth more than any feature.

| Bug | What happened |
|---|---|
| **Fee parser read `"1,50,000"` as `1`** | Split on every delimiter at once, ignored quotes. A student would have been told they owed one rupee. |
| **Refusal gate written twice, copies disagreed** | Corner bubble refused *"what are my results?"*; the full page answered it — `\bresult\b` doesn't match `results`. |
| **`\bमेरी\b` can never match** | JavaScript's `\b` is ASCII-only, so every Hindi and Gujarati personal question bypassed the gate — in a portal advertised as multilingual. |
| **Token revocation bypassed** | The check skipped entirely for tokens with no `tv` claim. Now fails closed. |
| **Robot Path level 1 unsolvable** | By the route its own hint described. There's now a BFS in the test suite asserting `par` is the true shortest path. |
| **Coins worth less than speed** | Quietly made the coins a trap. The comment said otherwise; the arithmetic didn't. |
| **Real staff names hard-coded** | 33 occurrences across 7 files — including the HOI's — in a public repo. |

---

# PART 7 — Demo running order

Ten minutes. Follow **one ticket** through every role rather than touring menus.

| Time | Role | Show |
|---|---|---|
| 0:00 | — | Landing page, the 60-second answer |
| 0:40 | **Student** | Study Plan → upload `sample-transcript.csv` · Class Group → upload the sample, ask about the room · raise a ticket |
| 3:00 | **Faculty** | QR attendance rotating code · cohort view · escalate the ticket |
| 4:40 | **Admin** | Approve a booking, then a clash (409) · verify IQAC evidence, **try to approve it** → refused |
| 6:10 | **HOD** | Grievance — can handle, cannot see who filed · Accounts → "outranks you" |
| 7:40 | **Owner** | Money tiles Locked → wrong password → **it's in the audit log** → correct password · **the fee penalty refusal** |
| 9:30 | — | `/role-map.html` full screen — the four diagrams |
| 10:30 | — | The three refusals |

**Before you start:** upload `sample-transcript.csv` to the student account, or
the Study Plan correctly shows nothing to revise and looks broken.

**Never show a password on screen.** Three credentials have leaked through
screenshots during development.

---

# PART 8 — Numbers to know

| | |
|---|---|
| Database models | 50 (+ 15 enums) |
| Capabilities × roles | 30 × 7 |
| Tests | 284 across 15 files |
| API route groups | 19 |
| Library modules | 59 |
| React components | 37 |
| Lines of TypeScript | ~20,000 |
| Knowledge-base articles | 20 |
| Fun Zone games | 11 |
| Badges | 10 |
| QA findings | 13 |
| Fabricated figures removed | 13 |
| Confidence floor | 0.55 |
| Daily play budget | 30 minutes |
| QR code rotation | 20 seconds |
| Step-up window | 5 minutes |
| Commits | 163 |

---

# PART 9 — If something breaks live

| Problem | Say this, do that |
|---|---|
| AI returns a quota error | "The free tier has a daily cap." Move to a non-AI feature. Don't retry on camera. |
| Page is slow | Keep talking. Silence looks worse than latency. |
| Study Plan shows nothing | Upload `sample-transcript.csv`. That's what it's for. |
| Booking approval fails | Check you're on ADMIN, not HOD — HOD deliberately lacks `booking.approve`. |
| Fun Zone locked | The 30-minute budget is spent. That *is* the feature. |
| Something genuinely broken | "That's a bug — it's not in the QA report, so it's new. I'll write it up." Honest beats flustered. |

---

## The one line to end on

> "Fifty models and eleven games are easy to build. What I'd want judged is
> that every figure on screen has a source, and every refusal is a place we
> decided not to guess."
