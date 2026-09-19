# Live checks — exact script

Run against `https://sou-ai-help-desk-pro-frontend.vercel.app`, **after** the
next deploy (check 7 depends on the shared refusal gate pushed 19 Sept).

Tick as you go. Write the result even when it fails — a known failure is safe,
an unrun check is what breaks during a demo.

---

## Before you start

```powershell
cd C:\dev\sou-ai-helpdesk-pro\frontend
npx vitest run      # expect 125 passing across 9 files
npx tsc --noEmit    # expect no output
```

Then commit and deploy:

```powershell
cd C:\dev\sou-ai-helpdesk-pro
git add -A
git commit -m "Share one refusal gate between both assistants; tests and QA finding 12"
git push origin main
```

Wait for Vercel to finish before doing check 7.

---

## Check 7 — refusal paths ★ do this first

The strongest thing you have to show. Three parts, about four minutes.

**7a. OakMitra refuses what it does not know.**

Open `/assistant`, signed in as the student. Type:

> what is the hostel curfew time?

Expect: an **amber left border** and a **Raise this as a ticket** button.
It must not produce a time.

- [ ] Amber border shown
- [ ] Ticket button shown
- [ ] No invented time

**7b. It refuses questions about the student's own record.**

Ask all five of these. Every one must get the amber border, not an answer.
These are the exact questions that were answered incorrectly before today's
fix, so they are the ones worth checking:

> what are my results?
> what is my CGPA?
> how many backlogs do I have?
> what is my fee balance?
> मेरी attendance kitni hai

- [ ] All five refused

Then ask the control question — this one **must be answered**, with blue
source chips underneath:

> what is the minimum attendance requirement?

- [ ] Answered, with source chips

If the control question is also refused, the gate is too broad and the
assistant looks broken. Say so and stop.

**7c. The fee assistant will not invent a figure.**

Open `/finance`, ask:

> what will be my penalty?

Expect: it cites a policy search, and says plainly that it found no figure —
rather than producing a rupee amount.

- [ ] No invented figure
- [ ] Says where it looked

---

## Check 5 — multilingual (one minute, do it while you are on /assistant)

> When is the semester fee due?
> सेमेस्टर की फीस कब देनी है?
> સેમેસ્ટર ફી ક્યારે ભરવાની છે?

- [ ] Each answer comes back in the script it was asked in
- [ ] No language selector anywhere on the page

## Check 6 — voice (one minute, same page)

- [ ] Microphone button captures speech
- [ ] Speaker button reads the reply aloud
- [ ] Spoken language matches the question

---

## Check 2 — passkey

- [ ] `/account/passkeys` → register
- [ ] Sign out, sign in with fingerprint or face
- [ ] List shows the credential with a last-used time

## Check 3 — bookings

- [ ] Student creates a booking → PENDING
- [ ] Admin approves it → APPROVED
- [ ] Same slot again → refused, 409

## Check 4 — QR attendance

- [ ] Start a session, watch the code rotate
- [ ] One student scan recorded
- [ ] Scan a closed session → refused, 410

## Check 9 — step-up and recovery (single browser)

- [ ] Owner dashboard money tiles read **Locked**
- [ ] `/finance` → Institutional fee position → asks for the password
- [ ] Wrong password refused, and the attempt appears in the Audit Trail
- [ ] Correct password reveals figures with an "unlocked" badge
- [ ] Dashboard tiles now show amounts
- [ ] Wait five minutes → figures gone, asks again
- [ ] Accounts → a student → **Reset password** offered
- [ ] Accounts → another owner → **outranks you**, no button

## Check 10 — IQAC

- [ ] Upload an evidence document
- [ ] Open it without permission → 403, not served
- [ ] Generate a report → gaps listed, not filled in
- [ ] Export downloads

---

## Checks 8 — two browsers

Needs a normal window and a private window, two roles signed in at once.

- [ ] Student files a grievance
- [ ] HOD can handle the case but **cannot** see who filed it
- [ ] Owner reveals the identity
- [ ] The reveal appears in the audit log as `VIEW_IDENTITY`

---

## Before showing the HOI

- [ ] Seed or find a student with **weak** results. The current record is three
      subjects at 87–90, so the Study Plan correctly shows nothing to revise —
      which makes a working feature look like it does nothing.
- [ ] Play all five Fun Zone games once. **Mini Grid first** — the cell-cycling
      UI and the server's checker have to agree exactly. The Zone only opens
      12:00–14:00 and 17:00–20:00.
- [ ] Have `docs/QA_REPORT.md` open in a tab. Twelve findings with severities is
      a better answer to "what is weak about this?" than improvising.

Two questions to expect:

**"Won't students just play games during lectures?"** — The window is enforced
on the server, not in the browser. A closed window returns 423 and no puzzle,
so leaving the tab open achieves nothing. Thirty minutes a day, across all
games.

**"Is this real data?"** — The institutional figures are seed data. Say so
plainly. Individual fee and result figures come from the database.
