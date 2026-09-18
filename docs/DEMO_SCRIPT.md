# Three-minute demo — Fee Statement Simplifier

Two browser windows, signed in before you start: one **student**, one **owner or
admin**. Open both on the fee screen. Never sign in live.

---

## 0:00 — The problem (20 seconds)

> "A fee statement is a document students receive and don't understand. Answering
> *how much do I owe and am I late* means combining three different things: a
> record, a calculation, and a policy document. That's why this is an agent and
> not a chatbot."

## 0:20 — Upload drives it, not a chat box (30 seconds)

Upload `docs/sample-fee-statement.csv`, or click **Use my portal record**.

> "I haven't asked anything yet. The analysis already ran."

Point at the outstanding total, and at the overdue flag with its day count.

## 0:50 — Tool call one: arithmetic (30 seconds)

Ask: **"How much do I still owe?"**

Point at the blue badge under the answer.

> "It says which tool produced that figure. The model is forbidden to calculate —
> this number came from TypeScript, not from a language model."

Open **"Show the exact tool output the assistant was given."**

> "That's the model's raw input. You can check the answer against its own working."

## 1:20 — Tool call two: it refuses to guess (40 seconds)

Ask: **"What will be my penalty?"**

> "Different question, so it picks a different tool — policy search over the
> university's own documents. And the policy doesn't state a late fee."

Read the reply aloud, then:

> "It doesn't invent a number. It says the documents don't specify and sends the
> student to the Accounts Office. Every language model knows what Indian
> university late fees usually look like. Guessing here would be plausible,
> confident, and wrong — and a student would act on it."

## 2:00 — Role-aware tools (45 seconds)

Switch to the admin window, open **Fee Analysis**, show collection rate by
department.

> "Same agent, different tools."

Switch back to the student window.

> "The student's model was never given the institutional tool. Not told to refuse
> it — the function isn't on its list. There's no prompt to jailbreak. The
> capability matrix that governs the rest of the portal decides which tools get
> bound, and an HOD is pinned to their own department server-side, so changing
> the request body achieves nothing."

### Optional 20 seconds: step-up authentication

If the room is interested in security, open the admin view's institutional
figures. It asks for the password again.

> "Being signed in proves you authenticated at some point today. It doesn't
> prove you're still the person at the keyboard. Financial figures ask again,
> and the unlock lasts five minutes."

Then, before unlocking, ask the assistant *"what's our collection rate?"*

> "It can't answer. Not because we told it to refuse — because without the
> elevation the institutional tool isn't bound to it at all. Same mechanism as
> the role gate. There's no prompt to talk around when the function isn't on
> the list."

Unlock, ask again, and it answers.

### Optional, if a judge asks for advice

If anyone asks the admin view something like **"what should we do to collect
100% of fees?"**, let it answer rather than deflecting. It declines to advise
while still reporting the real position:

> *"I cannot provide advice on how to manage fee collection. According to the
> current institutional data, the university has collected 80% of the total
> billed amount of INR 12,00,000, with INR 2,40,000 currently outstanding
> across 8 students."*

> "It won't tell you what to do about money. It tells you what's true and stops
> there. That boundary is in the system prompt and it holds on questions we
> never anticipated."

## 2:45 — Close (15 seconds)

> "Eleven tests cover the arithmetic with no database and no model in the loop.
> One of them caught a real bug: a statement written `"1,50,000"` was being read
> as ₹1. That's the failure this architecture exists to prevent, and it happened
> at the parsing step, before any arithmetic ran."

---

## Questions to expect

**"Why not let the model do the maths?"**
It's usually right and occasionally wrong. A fee balance that's occasionally
wrong is worse than no feature. The model turns figures into sentences; that's
the job it's reliable at.

**"How do you know the numbers are correct?"**
`finance-math.ts` has no database and no model imports, so it's testable in
isolation — `npx vitest run tests/finance.test.ts`, 11 tests. One of them found
the delimiter bug described above.

**"What stops a student asking for everyone's fees?"**
Their agent is never given that tool. Structural, not conversational.

**"What if the model is down or out of quota?"**
It degrades to exact figures with a note. Demonstrate it if asked — the
arithmetic path never touches Gemini.

**"Is this financial advice?"**
No, and it is built to refuse. It explains what the numbers say; it never
recommends a course of action. The disclaimer is on screen, not buried.

**"What if a student forgets their password?"**
An administrator clears it from the Accounts screen. The account falls back to
date-of-birth sign-in and must choose a new password immediately; every existing
session is revoked. Reset only works downwards, so an administrator cannot reset
a principal or owner and then sign in as them — a reset account is protected only
by a date of birth, which is not a secret.

**"And if an owner forgets theirs?"**
Not through the interface, deliberately. No account outranks OWNER, so owner
recovery requires database access held by whoever operates the deployment. If one
owner could reset another, compromising a single owner account would compromise
all of them.

**"How would you know if someone looked at a complainant's identity?"**
The Audit Trail screen, filtered to sensitive access. Every reveal is logged with
the role that did it. The audit API is read-only — POST, PATCH and DELETE all
return 405.

**"What would you do next?"**
PDF statements, instalment plans, and a payment-history view. Bank integration
deliberately stays out of scope — this reads and explains, it never moves money.

---

## If something breaks

- **Quota exhausted** → the fallback shows exact figures. Say that's the design,
  and it is.
- **No fee record on the account** → upload the sample CSV instead.
- **Slow first answer** → it's making a tool round trip; say what it's doing.

Never debug live. Move to the next beat and mention it afterwards.
