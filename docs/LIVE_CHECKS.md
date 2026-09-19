# Live checks — exact script

Run against `https://sou-ai-help-desk-pro-frontend.vercel.app`, **after** the
next deploy (check 7 depends on the shared refusal gate pushed 19 Sept).

Tick as you go. Write the result even when it fails — a known failure is safe,
an unrun check is what breaks during a demo.

---

## Before you start

- [x] `npx vitest run` — **126 passing across 9 files**, confirmed 2026-09-19.
- [x] Pushed as `13418cd`.
- [ ] Vercel has finished deploying `13418cd`. Check 7 tests the code in that
      commit, so running it against the previous deploy just re-confirms the
      old bug.

---

## Check 7 — refusal paths ★ PASSED 2026-09-19

**7b confirmed live.** `मेरी attendance kitni hai` was refused with the ticket
button — the exact case that passed straight through the gate until the fix
that morning, because `\b` cannot match beside a Devanagari character.

**7c confirmed live, and it is the best answer in the portal.** Asked "what will
be my penalty?", the fee assistant replied:

> According to your portal fee record, your Semester 5 payment of INR 30,000 is
> 35 days overdue. However, the university policy documents I have access to do
> not specify the exact late fee penalty amount. You should contact the
> Accounts Office directly.

Tool chips shown: **Fee arithmetic · Policy search (RAG)**.

Everything true came from a tool. The one thing it did not have — the penalty
rate — it declined to invent, named the gap, and routed the student to a human.
Use this as the closing moment of any demo.

**Follow-up fixed the same day:** the refusal was behaviourally right but
visually near-identical to an answer — a 2px amber edge. Refusals now carry an
amber tint, a heavier left edge and a **NOT ANSWERED FROM DOCUMENTS** label, so
a viewer can tell a refusal from an answer at a glance. Needs a redeploy.

---

## Check 7 — the original script

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

## Check 5 — multilingual ★ PASSED 2026-09-19

Asked the fee-due question in English, Hindi and Gujarati. Each answer came
back in the script it was asked in, the header pill followed the language, and
there is no selector anywhere on the page.

**A content fix came out of this check.** The first run answered, in all three
languages, that it held no information about fee due dates — technically true,
since the knowledge base said exactly that, but it made working retrieval look
broken. The article now routes the student to the Fees page of their own portal
first, where their individual due date genuinely is. Re-embedded through the new
Owner → Audit Trail → **Re-embed the documents** button and confirmed live.

Worth saying out loud in a demo: nobody picks a language. Most multilingual
portals make you choose one from a dropdown.

---

## Check 5 — the original script

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
- [ ] Play the Fun Zone games once. **Mini Grid first** — the cell-cycling UI
      and the server's checker have to agree exactly. Open all day; 30 minutes
      of play per student per day.
- [ ] Have `docs/QA_REPORT.md` open in a tab. Twelve findings with severities is
      a better answer to "what is weak about this?" than improvising.

Two questions to expect:

**"Won't students just play games during lectures?"** — Thirty minutes a day,
enforced on the server rather than in the browser: once the budget is spent the
puzzle endpoint returns 423 and no puzzle, so leaving the tab open achieves
nothing. We chose a budget over a time window deliberately — a window makes a
rule about the timetable, which is not the portal's business.

**"Is this real data?"** — The institutional figures are seed data. Say so
plainly. Individual fee and result figures come from the database.
