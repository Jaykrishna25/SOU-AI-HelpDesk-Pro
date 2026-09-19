# Portal walkthrough — recording script

**12 minutes, six roles.** This is the **hackathon submission video** as well as
the HOD/HOI walkthrough — the stack and hosting requirements were relaxed, so
the deployed portal is the entry.

For a hackathon cut, record the full thing and trim to the segments marked
**★ KEEP** if a time limit applies. The 9:30 role-map section and the 10:30
refusals are the two that must survive any trim.

Optional closer, 30 seconds: `cd ai-agent && streamlit run app.py`, switch role
from Owner to Student, and show a tool physically disappear. Same idea, second
stack, Python pipeline end to end.

The spine of this video is **one ticket travelling through every role**. Do not
tour the menus. A menu tour shows that screens exist; following one item shows
that the system works.

---

## Before you record

- [ ] Sign in once as each role to confirm the passwords work
- [ ] Three browser profiles or windows, so switching is instant on camera
- [ ] `https://sou-ai-help-desk-pro-frontend.vercel.app/role-map.html` open in a tab
- [ ] `sample-transcript.csv` and `sample-class-group.txt` downloaded
- [ ] Record between **17:00 and 20:00** if you want the Fun Zone open
- [ ] Browser zoom 100%, notifications off, bookmarks bar hidden
- [ ] One dry run. The first AI call on a cold deployment is slow.

**Do not show a real password on screen.** Type it off-frame or blur it. Three
credentials have already leaked through screenshots on this project.

---

## 0:00–0:40 · What it is and why

Landing page.

> "SOU AI HelpDesk Pro. Silver Oak University has over 25,000 students, and a
> help desk built for that has to do two things at once: answer quickly, and
> never be confidently wrong.
>
> Seven roles, one capability matrix, and an AI assistant that refuses rather
> than guesses. I will follow a single ticket through every role, then show the
> three places the system says no."

---

## 0:40–3:00 · STUDENT  ★ KEEP

Sign in. Land on the dashboard.

**Dashboard** — point at the tiles.
> "Everything on this screen comes from the database. There were fabricated
> statistics here early on and they are gone — nine of them. If a figure is on
> screen it has a source."

**Fees** — show the ledger. Then **Results**.
> "Their own record, and only ever their own."

**Study Plan** — the plan, the chart, the threshold slider.
> "The plan is Python arithmetic, not a model. Priority is worst score first
> with credits breaking ties. Moving the slider recomputes the plan itself."

Click **Add a transcript** → `sample-transcript.csv`.
> "A transfer student's earlier semesters exist only on paper. This supplements
> the record — and notice it says the recorded subjects were kept unchanged. An
> uploaded file cannot overwrite a grade the university issued. Nothing is
> saved."

**Class Group** → upload `sample-class-group.txt`. Point at the redaction notes.
> "Exam dates live in the class WhatsApp group and nowhere else. One sender was
> a phone number and became 'Member 1'. Numbers inside messages stripped.
> Nothing stored — there is no database table for this."

Ask: *when is the next internal test and which room?*
> "Room 108. Two messages mention it; the first says 204, a later one moves it.
> It took the later one and said it had changed."

**Ask OakMitra** → *what are the rules for supplementary examinations?*
> "Answered from university documents, with the source shown."

**Raise a ticket** — a real one, about a fee receipt. This is the ticket you
will follow.
> "Remember this ticket. We will watch it move."

---

## 3:00–4:40 · FACULTY

> "Same portal, different person, different portal."

**CR & Attendance / QR Attendance** — start a session, show the rotating code.
> "The code rotates every twenty seconds and is validated against the current
> window only, so a screenshot in a WhatsApp group is worthless thirty seconds
> later. A repeat scan is idempotent at the database level."

**Study Plan → Cohort view.**
> "Here is the first real difference. Faculty hold `study.viewCohort`; a student
> does not. This is aggregate only — it never returns an individual's marks."

**Tickets** — find the student's ticket, add a note, escalate.
> "The ticket moves up. Watchers are added automatically, so nobody has to
> remember to copy anyone in."

---

## 4:40–6:10 · ADMIN

**Tickets** — the escalated ticket arrives. Assign it.

**GreenReserve** — approve the student's booking, then attempt a clashing one.
> "Refused, 409. The interval check is server-side."

**IQAC** — upload an evidence document, then **verify** it.
> "Now watch this. I have verified it. Let me try to approve it."

Attempt approval as Admin → refused.
> "Refused. An Admin may verify evidence and may never approve it. Separation
> of duties, and there is a test asserting it so nobody can widen it quietly."

Switch to the role map tab, point at the four-step evidence chain.

---

## 6:10–7:40 · HOD

**Students / Faculty / Department reports.**
> "Departmental scope — the HOD sees their own department, not the institution."

**Grievance** — open a case.
> "This is the design I am proudest of. The HOD can read the complaint, work it,
> and resolve it. They cannot see who filed it. The identity is encrypted at
> rest with AES-256-GCM."

Show the case with no name attached.
> "A student will only file a complaint they believe is safe to file."

**Accounts** — try to reset another rank-3 account.
> "Refused — outranks you. Admin and HOD share a rank, so neither can reset the
> other."

---

## 7:40–9:30 · OWNER — the three refusals  ★ KEEP

**Dashboard** — money tiles read **Locked**.

**Fee Analysis** → Institutional fee position → password prompt.

**Enter a wrong password first.**
> "Refused. And now the important part —"

**Audit Trail** → the failed attempt is there.
> "A failed attempt to view institutional finance is recorded with a name
> against it. So is a successful one."

Enter the correct password → figures appear, tiles fill in.
> "Five-minute window, then it locks again."

**Ask the fee assistant:** *what will be my penalty?*
> "Thirty thousand rupees, thirty-five days overdue — from a tool, not a guess.
> Then it says the policy documents do not state the penalty rate and sends the
> student to the Accounts Office. It had every chance to invent a percentage."

**Grievance → reveal identity.**
> "The Owner can reveal. It appears in the audit log as VIEW_IDENTITY."

**Accounts** → reset a student's password.
> "Clears the hash, forces a change, and increments the token version — every
> existing session for that account dies immediately."

---

## 9:30–10:30 · How the roles interconnect  ★ KEEP

Full-screen the role map: **`/role-map.html`**

Walk the four diagrams in order — hierarchy, separation of duties, the
grievance path, AI gating.

> "Seven roles, one matrix. Three things worth saying.
>
> First, rank decides recovery, not capability. You can only reset an account
> you outrank, and equal ranks cannot touch each other.
>
> Second, no role holds two links of the same chain. Upload, verify, approve and
> publish are four different hands.
>
> Third, and this is the one I would defend hardest —"

Point at the AI gating panel.

> "Most systems restrict an assistant by telling it what not to do: 'never
> reveal institutional figures to a student.' That is a request, and requests
> can be argued with. People talk models out of their instructions every week.
>
> Here, a student's agent is never handed the institutional function. There is
> no phrasing that reaches a tool that was not passed in. The question stops
> being 'will the model comply' and becomes 'was the function bound' — a fact
> about a list, not a matter of persuasion."

---

## 10:30–11:15 · Where it says no  ★ KEEP

> "Three refusals, because they are the point.
>
> One: ask OakMitra something outside the knowledge base — it says so and offers
> a ticket."

Demonstrate: *what is the hostel curfew time?*

> "Two: ask it about your own record."

Demonstrate: *what are my results?* → the amber panel.

> "That goes to a person. A policy document cannot answer a question about one
> student, and it should not pretend to.
>
> Three: the fee penalty you already saw.
>
> Each of these is a place the system could have produced something plausible
> and chose not to."

---

## 11:15–12:00 · Engineering, and close

> "183 tests across 12 files. A ten-point verification checklist, run against
> the deployed site, all passing — and it earned its keep: it found that the
> refusal rule was written twice and the two copies disagreed, so the assistant
> answered 'what are my results?' on one screen and refused it on another.
>
> A QA report with twelve findings and their severities, including five gaps
> documented as accepted rather than hidden. No rate limiting on the AI
> endpoints. Booking hours are stored in UTC. Those are in the report because
> an HOI asking what is weak deserves a straight answer.
>
> Fifty models, seven roles, one capability matrix. The thing I would want
> judged is not the feature count — it is that every figure on screen has a
> source, and every refusal is a place we decided not to guess.
>
> Thank you."

---

## If something breaks mid-recording

| Problem | What to do |
|---|---|
| AI returns a quota error | Say "the free tier has a daily cap" and move to a non-AI feature. Do not retry on camera. |
| Fun Zone shows the locked screen | That is the feature. Explain the access window and move on. |
| A page is slow | Keep talking. Silence looks worse than latency. |
| Study Plan shows no weak subjects | Upload `sample-transcript.csv`. That is what it is for. |
| Booking approval fails | Check you are on ADMIN, not HOD. HOD deliberately lacks `booking.approve`. |

---

## Questions to expect

**"Is this real student data?"**
No. Seed data throughout, and institutional figures are seeded. Say it plainly.

**"Won't students play games during lectures?"**
The window is server-enforced — a closed window returns 423 and no puzzle, so
leaving the tab open achieves nothing. Thirty minutes a day across all games.

**"What if the AI is wrong?"**
It cannot be wrong about a number, because it never produces one. Every figure
comes from a tool, and the tools that ran are shown as chips under the answer.

**"What is weak about it?"**
`docs/QA_REPORT.md`, twelve findings with severities. Answer from that rather
than improvising — it is a stronger position than claiming nothing is wrong.
