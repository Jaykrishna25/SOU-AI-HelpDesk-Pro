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
`/assistant` · Class Group (WhatsApp) · Tutor · transcript upload · opportunity search ·
253 tests passing across 14 files.

---

## What is actually left

**All ten verification checks passed on 19 September.** See
`docs/VERIFICATION_CHECKLIST.md` for the table and what the run caught. The
portal is demo-ready; what remains is rehearsal and one seeding task.

### 1. ~~The ten verification checks~~ — ALL PASSED 19 Sept

The run caught three real problems, all fixed and deployed. Table and detail in
`docs/VERIFICATION_CHECKLIST.md`; the exact scripts are in `docs/LIVE_CHECKS.md`.

### 2. Play all five games once

Fun Zone is open 12:00–14:00 and 17:00–20:00 only. Outside those hours you get
the locked screen, which is worth seeing once anyway. Mini Grid first — the
cell-cycling UI and the server's checker have to agree exactly.

### 3. Before showing the HOI

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
