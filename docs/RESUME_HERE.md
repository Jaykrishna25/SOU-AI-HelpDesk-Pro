# Resume here — 18 September 2026, evening

Everything below was working when we stopped. Nothing is half-finished.

---

## Do this first

Some work may be uncommitted. Check and push:

```powershell
cd C:\dev\sou-ai-helpdesk-pro
git status
git add -A
git commit -m "Add full-page OakMitra assistant; name the help desk assistant"
git push origin main
```

The OakMitra page and the naming change were the last things built. If
`git status` says the tree is clean, they are already pushed.

---

## Where everything is

| Thing | Location |
|---|---|
| Portal | `C:\dev\sou-ai-helpdesk-pro` → `github.com/Jaykrishna25/SOU-AI-HelpDesk-Pro` |
| Live portal | `https://sou-ai-help-desk-pro-frontend.vercel.app` |
| Hackathon entry | `C:\dev\hackathon` → `github.com/Jaykrishna25/sou-study-plan-agent` |
| Database | Neon `neon-chestnut-pendant`, AWS us-east-1. **The only project — do not delete it.** |

---

## Hackathon — complete

Track 3, Education: Transcript & Study Plan Agent, Streamlit.
Working app, public repo, `README.md` maps every required pipeline stage,
`DEMO.md` has the three-minute script.

**Only task left: rehearse the demo twice, timed.**

Run it with:

```powershell
cd C:\dev\hackathon
streamlit run app_edu.py       # Track 3, the submission
streamlit run app_meme.py      # Wildcard - built, not submitted
streamlit run app.py           # Track 2 finance - built, not submitted
```

Model is `qwen3:1.7b` via Ollama. Set `OLLAMA_MODEL` to change it.

---

## Portal — built and deployed

Fee Statement Simplifier · Study Plan adviser · Fun Zone (five daily puzzles,
weekly leaderboard, access window) · Audit Trail viewer · account recovery with
rank enforcement · step-up authentication · OakMitra full-page assistant at
`/assistant` · 126 tests passing across 9 files.

---

## What is actually left

### 1. The ten verification checks — the real remaining risk

`docs/VERIFICATION_CHECKLIST.md`, against the **live site**, about 30 minutes.

**Use `docs/LIVE_CHECKS.md`** — it is the same list written as an exact script
with the questions to type, in the order that wastes the least time.

- [x] **Check 1** — sign-in and lockout. Done, passed.
- [x] **Check 7, code half** — done 19 Sept. Found and fixed QA finding 12: the
      refusal gate was duplicated and the two copies disagreed, so the
      full-page assistant answered "what are my results?" instead of refusing
      it. One shared gate now, `lib/ai-guard.ts`, 38 tests.
- [x] **Check 7, live half** — passed 19 Sept. The Hindi refusal works, and the
      fee assistant declined to invent a late-fee figure while still giving the
      exact overdue amount from its tool. Write-up in `docs/LIVE_CHECKS.md`.
- [ ] Checks 2, 3, 4, 5, 6, 8, 9, 10.

Checks 8 and 9 need two browsers open at once (two roles signed in).

### 2. Play all five games once

Fun Zone is open 12:00–14:00 and 17:00–20:00 only. Outside those hours you get
the locked screen, which is worth seeing once anyway. Mini Grid first — the
cell-cycling UI and the server's checker have to agree exactly.

### 3. Before showing the HOI

- Finish the checks. An HOI will click things that are not in your script.
- **Demo the Study Plan on an account with weak results.** The current student
  record has three subjects at 87–90, so the plan correctly shows nothing to
  revise — which makes a working feature look like it does nothing.
- Have `docs/QA_REPORT.md` open in a tab. If asked what is weak, eleven
  findings with severities is a better answer than improvising.
- Expect two questions: *"won't students play during lectures?"* (access window,
  server-enforced, 30-minute daily budget) and *"is this real data?"*
  (institutional figures are seed data — say so plainly).

---

## Known gaps, deliberate

Documented in `docs/QA_REPORT.md` with reasoning:

- No rate limiting on the AI endpoints
- Booking clash detection is not atomic — correct predicate, no DB constraint
- Booking hours are UTC, so 10:00 displays as 15:30 IST
- Seed data has one department, so the departmental chart is a single bar
- `Subject` has no credits column, so the portal's study plan cannot weight by credits

---

## Things worth remembering

**Nine fabricated statistics have been removed** from this project, including
the "Strategic AI Forecasting" panel and the hard-coded CGPA. If a figure
appears on screen, it should come from the database. Keep it that way.

**Three credentials have been exposed in screenshots** during development — a
Gemini key, an Owner JWT and a student JWT. Keep tokens and keys out of images.

**`GRIEVANCE_KEY` is backed up** outside Vercel. If it is ever lost, every
encrypted grievance identity is permanently unreadable.
