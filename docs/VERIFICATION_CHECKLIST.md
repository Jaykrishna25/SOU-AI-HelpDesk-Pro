# Pre-demo verification checklist

Ten checks. Run them against the **deployed** site, not localhost — that is
what judges will see. Roughly 30 minutes.

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
- [ ] `npx vitest run` — 125 tests passing

## If a check fails

Write down what happened and move on. Fix only what would break the demo path
in `docs/DEMO_SCRIPT.md`. Everything else is a known gap, and saying "we know,
it's listed in our changelog" is a stronger answer to a judge than being
surprised.
