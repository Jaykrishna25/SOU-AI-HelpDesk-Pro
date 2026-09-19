# Pre-demo verification checklist

## ✅ ALL TEN PASSED — 19 September 2026

Run against the deployed site by Navlani Jaykrishna Satishkumar. No check
failed. Two fixes came out of the run and are recorded below; both are
deployed.

| # | Check | Result |
|---|---|---|
| 1 | Sign in and lockout | Pass |
| 2 | Passkey sign-in | Pass |
| 3 | GreenReserve bookings, clash refused | Pass |
| 4 | QR attendance, closed session refused | Pass |
| 5 | Multilingual, three scripts | Pass — one content fix |
| 6 | Voice in and out | Pass |
| 7 | Refusal paths | Pass — one real bug found and fixed |
| 8 | Grievance identity encryption | Pass |
| 9 | Step-up authentication and recovery | Pass |
| 10 | IQAC evidence and export | Pass |

**What the run actually caught**, which is the point of running it:

- **Check 7** exposed QA finding 12 — the refusal gate was written twice and
  the two copies disagreed, so the full-page assistant answered "what are my
  results?" instead of refusing it. Fixed with one shared gate
  (`lib/ai-guard.ts`) and 39 tests. Writing those tests then caught two further
  bugs: `\b` cannot match beside a Devanagari character, so every Hindi and
  Gujarati personal question was passing through; and the welcome screen was
  suggesting a question the gate refused.
- **Check 5** exposed a knowledge-base article that led with what it did not
  know. It now routes students to the Fees page, where their due date is.

A checklist that finds nothing was not worth running. This one found three
things, one of them on the most visible screen in the portal.

---

## The original checklist

Run them against the **deployed** site, not localhost — that is what judges
will see. Roughly 30 minutes.

Record the result honestly. A check that fails and is known about is safe; a
check that was never run is the one that breaks during a demo.

---

### 1. Sign in

- [ ] Sign in with login ID and password → reaches the right dashboard
- [ ] Wrong password five times → account locks (423), message says so
- [ ] Wait out or reset the lock → sign-in works again

### 2. Passkey sign-in

- [ ] Register a passkey at `/account/passkeys`
- [ ] Sign out, sign in with fingerprint or face
- [ ] The passkey list shows the credential with its last-used time

### 3. GreenReserve bookings

- [ ] Student creates a booking
- [ ] Admin sees it and approves it
- [ ] A clashing booking for the same slot is refused (409)

### 4. QR attendance

- [ ] Faculty or CR starts a session; the code rotates
- [ ] A student scan is recorded
- [ ] Scanning a closed session is refused (410)

### 5. Multilingual chatbot

- [ ] Ask in English → English answer
- [ ] Ask in Hindi (Devanagari) → Hindi answer, Devanagari script
- [ ] Ask in Gujarati → Gujarati answer, Gujarati script
- [ ] No language selector appears anywhere

### 6. Voice

- [ ] Microphone captures speech and fills the box
- [ ] The reply is spoken aloud
- [ ] Spoken reply language matches the question

### 7. The refusal path — most important

- [ ] Ask the help desk chatbot something the knowledge base does not cover
- [ ] It says it does not know and offers a ticket, rather than inventing an answer
- [ ] On `/finance`, ask "what will be my penalty?" → cites policy search, refuses
      to invent a figure

### 8. Grievance identity encryption

- [ ] Raise a grievance as a student
- [ ] HOD can handle the case but cannot see who filed it
- [ ] Owner can reveal the identity
- [ ] The reveal appears in the audit log as `VIEW_IDENTITY`

### 9. Step-up authentication and account recovery

- [ ] Owner dashboard money tiles read **Locked**
- [ ] Fee Analysis → Institutional fee position asks for the password
- [ ] A wrong password is refused, and the attempt appears in the Audit Trail
- [ ] The correct password reveals the figures with an "unlocked" badge
- [ ] Dashboard tiles now show real amounts
- [ ] Before unlocking, the assistant cannot answer "what is our collection rate?"
- [ ] After five minutes the figures disappear and it asks again
- [ ] Accounts → search a student → **Reset password** is offered
- [ ] Accounts → search another owner → **outranks you**, no button

### 10. IQAC evidence and report export

- [ ] Upload an evidence document
- [ ] Opening it without permission is refused (403), not silently served
- [ ] Generate a report; gaps are listed rather than filled in
- [ ] Export downloads

---

## Also before demo day

- [ ] `AI_CHAT_MODEL` set in the Vercel environment, then redeploy
      (`.env.local` is local-only; production otherwise uses the `.env` default)
- [ ] Open the deployed `/finance` page and run one question end to end
- [ ] `GRIEVANCE_KEY` backed up somewhere outside Vercel — if it is lost, every
      encrypted grievance identity becomes permanently unreadable
- [x] Stale Neon project — **resolved 2026-09-18**. The Neon organisation now
      holds exactly one project, `neon-chestnut-pendant` (AWS us-east-1), which is
      production. The old `sou-helpdesk` project in us-east-2 no longer exists, so
      there is nothing left to reconnect to by accident.
- [ ] Repo is public and `docs/` renders on GitHub
- [x] `npx vitest run` — 126 tests passing across 9 files. Confirmed 2026-09-19.

## If a check fails

Write down what happened and move on. Fix only what would break the demo path
in `docs/DEMO_SCRIPT.md`. Everything else is a known gap, and saying "we know,
it's listed in our changelog" is a stronger answer to a judge than being
surprised.
