# SOU AI HelpDesk — Streamlit agent

The AI layer of the [deployed portal](https://sou-ai-help-desk-pro-frontend.vercel.app),
rebuilt in Python as a Streamlit app — the classic RAG pipeline end to end, over
the same 20 help desk articles the portal answers from, exported from
`frontend/lib/kb-content.ts`.

The portal is the submission; this is here because the idea it demonstrates —
role-bound tool binding — is easier to *see* in one screen than in a
seven-role web application, and because it shows the same design holds in
either stack. `agent_core/policy.py` mirrors `frontend/lib/policy.ts`.

Built by Navlani Jaykrishna Satishkumar (SOU2023CSE69), Silver Oak University.

---

## Run it

```bash
cd ai-agent
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate on Unix
pip install -r requirements.txt

ollama pull qwen3:8b            # or qwen3:4b on a machine short of RAM
streamlit run app.py
```

Everything runs locally. No API key, no account, no network call.

To use a smaller model: `set OLLAMA_MODEL=qwen3:4b`.

To run against a hosted model instead — useful on a machine that cannot hold an
8B model, or on a slow connection:

```bash
set LLM_PROVIDER=gemini
set GOOGLE_API_KEY=your-free-key     # aistudio.google.com/apikey
```

The pipeline is unchanged either way; only the chat model swaps.

---

## The required pipeline, and where each stage lives

| Stage | Implementation | File |
|---|---|---|
| LLM setup | `ChatOllama`, default `qwen3:8b` (switchable to Gemini) | `agent_core/agent.py` |
| Document loading | `TextLoader` for the knowledge base | `agent_core/ingest.py` |
| Document loading | `PyPDFLoader` / pandas for an uploaded transcript | `agent_core/ingest.py` |
| Text splitting | Section-aware, plus one Document per subject | `agent_core/ingest.py` |
| Embeddings | `HuggingFaceEmbeddings`, `BAAI/bge-small-en-v1.5` | `agent_core/ingest.py` |
| Vector store | `Chroma` | `agent_core/ingest.py` |
| Retriever | `as_retriever(search_kwargs={"k": 4})` | `agent_core/ingest.py` |
| Custom tools | Four, each with units stated in its docstring | `agent_core/tools.py` |
| Tool calling | `@tool`, bound by role | `agent_core/tools.py` |
| Agent | `create_agent`, ReAct style | `agent_core/agent.py` |
| Deployment | Streamlit | `app.py` |

---

## The idea worth judging

Select **Student** in the sidebar. Two tools appear struck through. Now ask:

> What is our institutional collection rate?

It cannot answer — and **not because it was told not to**.

Most systems restrict an assistant by telling it what to avoid: *"never reveal
institutional finance figures to a student."* That is a request, and a request
can be argued with. People talk models out of their own instructions every
week.

Here, `analyse_institutional_finance` is never added to a student's tool list,
so the model is never told it exists. There is no phrasing that reaches a
function that was not passed in. The question stops being *"will the model
comply?"* and becomes *"was the function bound?"* — a fact about a list, not a
matter of persuasion.

Switch to **Owner** and ask the same question. Same agent, same prompt, same
model. Different answer, because a different list was built.

| Capability | Student | Faculty | Admin | HOD | HOI | Owner |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `policy.search` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `study.viewOwn` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `finance.viewOwn` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `study.viewCohort` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `finance.viewInstitutional` | — | — | ✓ | ✓ | ✓ | ✓ |
| `audit.view` | — | — | — | — | — | ✓ |

An unknown role falls back to Student, never upward — a typo in a role string
must fail closed. `agent_core/policy.py`, pinned by `tests/test_policy.py`:

```bash
python -m pytest tests/ -q
```

---

## The morning briefing — the agentic part

Everything else in this project answers a question somebody asked. This runs
on a schedule, decides what is worth saying, and says it before anyone asks.

```bash
python run_briefing.py --name "Jaykrishna"     # run it
python run_briefing.py --show                  # last one, without re-running
```

**Windows Task Scheduler** — Program `…\ai-agent\.venv\Scripts\python.exe`,
Arguments `run_briefing.py --name "Jaykrishna"`, Start in `…\ai-agent`,
Trigger daily at 07:30. On Unix: `30 7 * * * cd …/ai-agent && .venv/bin/python run_briefing.py`.

### The loop

| Step | What happens | Where |
|---|---|---|
| **Plan** | Reads the transcript, picks search keywords from the student's *strongest* subjects. Deterministic Python — the model does not choose what the brief is about. | `plan_today()` |
| **Act** | Calls the live Remotive feed for each keyword. | `fetch_market()` |
| **Observe** | Compares today's listings against a stored set of URLs it has already shown. | `diff_against_memory()` |
| **Report** | Writes three to five sentences, leading with what *changed*. | `build_briefing()` |
| **Remember** | Saves the URLs so tomorrow reports what is genuinely new. | `data/briefing_state.json` |

**The Observe step is the one that matters.** A digest that prints the same
thing every morning is ignored by Wednesday. This one keeps state and can say
"three new since Tuesday" — or "nothing new today", which is also useful and
which most digests will not admit.

### Why temperature 1.0 is safe here

`qwen3:8b` at **temperature 1.0** — high, and the model invents freely at that
setting. That is good for prose and dangerous for facts, so the two are split:

- **Every figure and every listing comes from a tool.** Job titles, company
  names, locations, counts, the number of days since the last run — all
  deterministic Python. The model never sees a number it could change.
- **Temperature 1.0 applies only to the writing step**, which receives the
  gathered facts and is instructed it may not add to them.

The result reads differently each morning, which is the point, while the facts
are whatever the feed actually returned. This is the same rule as the rest of
the project — the model never calculates — applied to an unattended job.

The system prompt is worth reading (`briefing.py`, `SYSTEM`). Two rules in it
are there because the failure modes are specific: no flattery, because a
briefing is read at 8am by someone who has not had tea; and if the feed fails
it must say the feed failed, never "a quiet day in the market" — which would
be inventing a market condition out of a network error.

### If the model is unreachable

The facts are already gathered by then, so the brief degrades to the findings
themselves rather than to an error. `run_briefing.py` exits `1` in that case
and `0` on success, so a scheduler can tell the difference.

---

## The four tools

### 1. `analyse_my_results` — runs automatically on upload

Pure Python, no model involvement. For every subject below the threshold it
computes urgency, suggested weekly hours, and the reason it was flagged.
Priority is worst score first. Hours scale with the gap to the threshold, so
the plan spends more time where more is at stake.

The plan shown on upload comes from running this tool **directly** and asking
the model to phrase the result — it does not depend on a small local model
choosing to call it. The numbers are therefore always correct; the model only
ever rewords them. The raw tool output is on screen under an expander so the
summary can be checked against its own working.

### 2. `analyse_cohort_performance` — withheld from Student

Aggregate only. It says plainly that this demonstration holds one transcript,
rather than presenting one student's marks as a cohort average.

### 3. `analyse_institutional_finance` — withheld from Student and Faculty

Returns billed, collected, outstanding, collection rate and overdue count. The
figures are **seed data and the tool says so in its own output**, so the model
cannot report them as real. The portal computes these from the database.

### 4. `search_university_policy` — everyone

Retrieval over the 20 help-desk articles. The agent is told that if the
extracts do not answer the question it must say so rather than fall back on
general knowledge about Indian universities.

---

## Design decisions worth defending

**The model never calculates.** Every figure comes from a tool. This matters
because a student acts on the output: a plan confidently wrong about which
subject is most urgent sends them to revise the wrong thing, and a wrong fee
figure is worse than no fee figure.

**No grade prediction, anywhere.** Nothing in the system produces a forecast,
so offering one would mean inventing it — and a student would believe it.

**Split on sections, not on character count.** A help-desk article is a
self-contained unit of meaning. "What to do if your fee receipt has not been
generated" is three sentences that only work together; a 500-character split
cuts it in half, and the half that gets retrieved reads like a complete answer
while missing the step that matters.

**One Document per subject, as well as whole-transcript chunks.** A fixed split
separates a subject name from its marks, so a narrow question — *"what did I
get in databases?"* — retrieves something that looks right and answers wrong.

**An unknown role fails closed.** `capabilities_for("PRINCIPAL")` returns the
Student set, not the Owner set.

---

## Relationship to the rest of this repository

| | What | Deployment |
|---|---|---|
| `frontend/`, `backend/` | **The submission.** The full help desk portal — 7 roles, 50 models, bookings, attendance, grievances, IQAC. | Next.js on Vercel, [live](https://sou-ai-help-desk-pro-frontend.vercel.app) |
| `ai-agent/` | This directory. The same AI layer in Python. | Streamlit, local |

Two implementations of one idea. The portal is where it runs for real; this is
where the mechanism is visible in a single screen.

The honest note: this is a port, not a second system. The knowledge base is
exported from the portal's content, the capability matrix is a direct
translation of `frontend/lib/policy.ts`, and the institutional finance figures
here are seed values where the portal computes them from the database. It
earns its place by proving the design is not a quirk of one framework — the
same role-bound binding works in TypeScript with Gemini and in Python with a
local Ollama model.
