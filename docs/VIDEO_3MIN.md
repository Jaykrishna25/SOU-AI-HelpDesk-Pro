# Three minutes — the whole portal

The 12-minute cut in `PORTAL_VIDEO.md` follows one ticket through six roles.
`DEMO_SCRIPT.md` covers the fee agent alone. **This one is for a panel that has
180 seconds and has already watched four other teams demo a chatbot.**

So it does not tour the menus. A menu tour proves screens exist. Every beat
below proves the system **refuses to do something** — which is the only claim
the other four teams cannot make.

---

## Before you record

- [ ] Four tabs, all signed in already: **student**, **faculty**, **admin**, and the
      landing page. Never sign in on camera.
- [ ] One dry run. The first AI call on a cold deployment is slow, and dead air
      at 0:35 costs you the room.
- [ ] Faculty tab parked on **Content** with a PDF ready to drag.
- [ ] Admin tab parked on **Tickets**, with the board showing at least two
      students who each have two or more queries.
- [ ] Browser at 100%, notifications off, bookmarks hidden.
- [ ] Know your ONE sentence (below) well enough to say it while clicking.

**The one sentence.** If they remember nothing else:

> "The model never calculates, and it refuses rather than guesses."

---

## 0:00 — The claim (15s)

Landing page. Do not read the feature cards aloud.

> "This is a university help desk with thirteen agents behind it. The
> interesting part isn't that it answers — it's what it does when it can't.
> Every number on screen comes from a tool or the database. The model is never
> asked to do arithmetic, and when it doesn't know, it says so."

Click **Launch Platform**.

---

## 0:15 — It computes, then refuses (35s) ★ KEEP

Student tab → **Fee Analysis**. The analysis has already run; nothing was typed.

> "I haven't asked it anything. The statement was parsed and the arithmetic
> was done by code."

Ask: **"What will my penalty be?"**

It gives the exact overdue amount and the day count — then says the policy
documents don't state a penalty rate, and sends you to the Accounts Office.

> "That's the whole thesis in one answer. It did the part it can prove, and
> refused the part it would have had to invent. A chatbot would have quoted
> you a rate."

**This is the beat that wins.** If you run long anywhere, cut from the end, not
from here.

---

## 0:50 — It knows what it is not for (30s)

Student tab → **Ask OakMitra**.

Ask: **"Write a program to reverse a linked list."**

> "It's a help desk, not a tutor. It answers from circulars and policies, so a
> coding answer from it wouldn't be coming from anywhere trustworthy."

It declines and points at the **Tutor** tab. Click through and ask the Tutor
the same thing — it answers properly.

> "The capability didn't disappear. It moved to the surface built for it. And
> notice no ticket was raised — a student asking about recursion has no help
> desk business, and filing one would just put noise in the admin queue."

Now ask OakMitra: **"How do I submit my assignment?"** — it answers normally.

> "That still works. The filter is narrow on purpose. Over-refusing an
> ordinary question is a worse failure than answering one homework question."

---

## 1:20 — Permissions are structural, not prompted (25s)

Admin tab → **Tickets**. The board is grouped by student.

Tick two of one student's queries, choose **HOD**, send.

> "One escalation, one note, one email — not four emails about what is, to
> that student, a single conversation."

Now try to select across two different students. The button refuses and says
why.

> "A batch can't span two students, because one escalation carries one note,
> and that note would name every student in it to whoever receives it. That
> rule is enforced in the database layer, not just greyed out in the UI."

---

## 1:45 — It knows how old it is (25s)

Student tab → **Market & Tech Radar**.

Point at the date on a card, and at the withheld count in the banner.

> "This tells students which AI models launched recently — the single worst
> question to put to a language model, because it names whatever it saw in
> training and presents it as current."

> "So the model supplies no facts here. Everything comes from a dated, sourced
> file, and anything older than 120 days is withheld from it entirely rather
> than shown with a small caveat underneath. Caveats under confident text
> don't get read. Missing text does."

---

## 2:10 — Private means private (25s)

Faculty tab → **Content**. Drag the PDF in, give it a subject, share.

Student tab → **Course Material**. It appears.

> "Files are stored privately and streamed through an authenticated route, not
> linked at a storage URL that would outlive the student."

Student tab → **Ask Faculty**. Open a thread.

> "And a student can reach a lecturer without opening a ticket. There's no
> staff override on these threads — an HOD is not a participant in a
> conversation between a student and a lecturer. Seniority isn't the same as
> being spoken to."

---

## 2:35 — Close (25s)

Admin tab → **Audit Logs**, scroll once.

> "Seven roles, one capability matrix, and a full audit trail. Four hundred
> and twenty-two tests, and the ones that matter don't test that features
> work — they test that the refusals still refuse."

> "Anyone can build something that answers. The hard part, in a university, is
> building something that knows when not to."

Stop.

---

## If you are cut to 90 seconds

Keep **0:15 fee refusal** and **1:20 the batch rule**. Drop everything else.
Those two are the only beats that cannot be faked with a good prompt.

## Questions you will be asked, and the short answers

**"Isn't this just ChatGPT with a login?"**
> "ChatGPT would have told you the penalty rate. The whole system is built so
> this one can't."

**"What if the AI is wrong?"**
> "Every answer shows which document it came from. When retrieval confidence
> falls below the floor, it raises a ticket instead of answering."

**"How do you stop a student seeing another student's data?"**
> "The capability matrix decides which tools get bound to the model at all. A
> tool the caller isn't entitled to is never handed over, so there's no prompt
> to talk it out of."

**"Who maintains the Radar?"**
> "A person, monthly, and the page says when it was last reviewed. If nobody
> maintains it, it degrades into saying 'I don't know' rather than into being
> confidently out of date. That's the correct floor."
