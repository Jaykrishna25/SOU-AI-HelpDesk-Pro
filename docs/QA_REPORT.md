# QA report — 2026-09-18

Scope: black-box probing of the deployed API, and a code review of the
security-critical paths (authentication, authorisation, encryption, audit, and
the new finance modules).

Not covered: browser interaction. The nine checks in
`VERIFICATION_CHECKLIST.md` still need a human.

---

## Findings

| # | Severity | Area | Status |
|---|---|---|---|
| 1 | **High** | Token revocation could be bypassed | Fixed |
| 2 | **Medium** | Identity reveals were never audited | Fixed |
| 3 | **Medium** | Audit log was write-only, unreadable | Fixed |
| 3b | Medium | No rate limiting on AI endpoints | Open — accepted |
| 4 | Low | Agent will analyse client-supplied fee rows | Open — by design |
| 5 | Low | Grievance code acts as a bearer credential | Open — by design |
| 6 | Info | Institutional figures are seed data | Open — disclose in demo |
| 7 | Low | Booking clash check is not atomic | Open — documented |
| 8 | Info | Booking hours are UTC, not IST | Open — consistent internally |
| 9 | Info | Owner dashboard tile contradicts the fee analysis | Open — your call |
| 10 | **Medium** | No password recovery of any kind | Fixed |
| 11 | Low | `/account/password` and `/account/passkeys` were unlinked | Fixed |

---

### 1. Token revocation could be bypassed — HIGH, fixed

`getLiveSession` read:

```ts
if (typeof s.tv === "number" && s.tv !== u.tokenVersion) return null;
```

A token with no `tv` claim skipped the comparison entirely and was accepted.
Bumping `tokenVersion` — the mechanism for "sign out all devices" and for
revoking a leaked token — would not have revoked such a token.

This is not hypothetical for this project. An Owner JWT was exposed in a
screenshot earlier in development. That token has since expired on its own
8-hour TTL, so there is no live exposure, but the revocation control that was
supposed to contain it would not have worked.

All three sign-in paths (password, set-password, passkey) do set `tv`, so a
token without one is stale by definition.

**Fixed** — now fails closed:

```ts
if (typeof s.tv !== "number" || s.tv !== u.tokenVersion) return null;
```

`tokenVersion` is `Int @default(0)`, non-nullable, so a valid session always has
a number to compare against. Effect: any token predating versioning is rejected
and the user signs in again.

### 2. Identity reveals were never audited — MEDIUM, fixed

`VIEW_IDENTITY` was declared in the audit action enum and **never used
anywhere**. `lib/institutional.ts` decrypted `identityRef` for Owner and
Super Admin without importing the audit writer at all.

Encryption without an access log answers "can an ordinary admin see who
complained?" but not "did anyone look?" — and the second question is the one
asked after an incident. `VERIFICATION_CHECKLIST.md` check 8 expected this entry;
it would have failed.

**Fixed** — one `VIEW_IDENTITY` row per request, with the count of identities
revealed and the role that revealed them.

### 3. Audit log was write-only — MEDIUM, fixed

Nothing anywhere read `AuditLog`. No endpoint, no UI, no script. The
`audit.view` capability sat in the policy matrix unused. Every entry the system
wrote — including denied evidence downloads and confidential reads — was
invisible without opening Postgres directly.

An audit trail nobody can read is storage, not accountability. For a platform
whose pitch is IQAC governance, the question "how would you know if an Owner
looked at a complainant's identity?" had no answer from inside the product.

**Fixed** — `GET /api/audit/list` and `/api/audit/summary`, gated on
`audit.view`, plus an **Audit Trail** panel in the Owner dashboard with filters
for sensitive actions. Deliberately read-only: `POST`, `PATCH` and `DELETE`
return 405. An audit log the application can rewrite proves nothing.

### 3b. No rate limiting on AI endpoints — MEDIUM, accepted

`/api/ai/chat`, `/api/finance/ask` and `/api/finance/summary` have no
per-user throttle. Any authenticated user can call them in a loop and exhaust
the shared Gemini quota for everyone.

This already happened once during development — a 429 during testing — and it is
the most likely way the live demo degrades.

Not fixed: adding a throttle hours before a demo risks breaking the working
path. The mitigation already in place is the fallback, which returns exact
figures from the analysis tool when the model is unavailable, so quota
exhaustion degrades the feature rather than breaking it.

**Action:** do not let anyone hammer the chatbot before presenting.

### 4. Agent will analyse client-supplied fee rows — LOW, by design

`/api/finance/ask` and `/summary` accept an `uploaded` array in the request
body, which a user could fabricate. The result is only shown back to that same
user and is labelled `UPLOADED STATEMENT`, so nobody else is misled and no
stored record changes — uploaded rows are never written to the `Fee` table.

Worth stating plainly if a judge asks: uploaded data is user-asserted, and the
output says so.

### 5. Grievance code acts as a bearer credential — LOW, by design

Any authenticated user who knows a grievance code can fetch that grievance by
code. `identityRef` is stripped from that path, so no complainant is exposed.
This is deliberate — it is how a student tracks their own case — but it does
mean codes should stay unguessable.

### 6. Institutional figures are seed data — INFO

The live institutional view reports ₹12,00,000 billed across 8 students in one
department. That is seeded demo data. Say so if asked. This project has already
removed eight fabricated statistics; do not let a vague answer reinstate one.

### 7. Booking clash check is not atomic — LOW

`lib/greenreserve.ts` uses the correct interval-overlap predicate
(`startsAt < newEnd AND endsAt > newStart`), but it runs as a `findFirst`
followed by a separate `create`. Two requests arriving at the same moment can
both pass the check and both insert. There is no unique or exclusion constraint
on `Booking` to catch it at the database level.

Unlikely to surface in a demo, real under concurrent load. The proper fix is a
Postgres exclusion constraint over a `tstzrange`, which Prisma cannot express —
it needs a raw migration. Documented rather than attempted the night before a
demo.

Worth contrasting with QR attendance, which gets this right: `QRScan` carries
`@@unique([sessionId, studentUserId])`, so the duplicate-scan path is enforced
by the database and the application merely catches the error.

### 8. Booking hours are UTC — INFO

Slots are built as `new Date(date + "T" + hour + ":00:00.000Z")` and displayed
with `getUTCHours()`. Internally consistent, so nothing is wrong today, but a
booking shown as 10:00 is 15:30 IST. If any future code formats these with local
time, the two will disagree.

### 9. Owner dashboard tile contradicts the fee analysis — INFO

The Owner dashboard shows **"Not measured — Fees Collected"** while the Fee
Analysis tab computes ₹9,60,000 collected from the same database. Both are
honest; the tile predates the fee agent and is deliberately conservative. A
judge may notice the contradiction. Either wire the tile to
`/api/finance/institutional` or be ready to explain the tile is conservative by
design.

### 10. No password recovery of any kind — MEDIUM, fixed

There was no forgotten-password path. No self-service reset, and no
administrator reset either: `user.manage` was declared in the capability matrix
and used by no endpoint. A user who forgot their password was permanently
locked out of that account.

Email could not solve it. `lib/email.ts` is client-side EmailJS with
`NEXT_PUBLIC_*` credentials, so it cannot deliver a reset token that a browser
could not also forge.

**Fixed** — admin-mediated recovery in `lib/admin-api.ts`, gated on
`user.manage`:

- `POST /api/admin/reset-password` clears `passwordHash`, sets
  `mustChangePassword`, bumps `tokenVersion` and clears any lockout. The account
  falls back to the existing first-time flow: sign in with date of birth, then
  choose a password. No new authentication machinery was invented.
- `POST /api/admin/unlock` clears a lockout without touching the password.
- `GET /api/admin/users?q=` searches accounts. It returns whether a password
  exists, never the hash.

**The rank rule is the important part.** `user.manage` includes ADMIN, and a
reset account is protected only by a date of birth, which is not a secret.
Without a rank check an ADMIN could reset the OWNER and then sign in as the
OWNER — a straight privilege escalation. Reset is therefore permitted strictly
downwards (`RANK[actor] > RANK[target]`), so equal ranks cannot reset each
other either. Denied attempts are audited.

The UI carries the warning that identity must be verified first, because
between the reset and the new password a date of birth is the only thing
protecting the account. That copy is part of the control.

### 10b. No SUPER_ADMIN account exists — INFO, deliberate

`SUPER_ADMIN` is defined in the role enum but no account holds it. Because reset
is permitted strictly downwards and OWNER is the highest role in use, **an owner
account cannot be recovered through the interface** — only through
`node scripts/account.js <LOGIN_ID> --reset`, which needs `DATABASE_URL`.

This is the right shape, not a gap. If an owner could reset another owner, then
compromising any one owner account would compromise all of them. Recovery for
the highest privilege level deliberately sits outside the application, with
whoever operates the deployment.

Verified in practice during testing: an owner locked out of `OWN001` could not
be recovered by the other owner and was restored through the script.

### 11. Account pages were unreachable — LOW, fixed

`/account/password` and `/account/passkeys` existed and worked, but nothing in
the application linked to them — they could only be reached by typing the URL.
Both are now in the sidebar for every role under "Your account".

---

## Verified working

- Every API module authenticates through `getLiveSession`; no handler uses the
  non-revocation-checked `getSession`.
- Unauthenticated requests to `/api/finance/me`, `/api/finance/institutional`
  and `/api/iqac/years` return no data. `/api/ai/status` is public by design and
  exposes only configuration, no records.
- Evidence documents are stored on **private** blob and served through a
  visibility check, with denials audited and `no-store` plus `nosniff` headers.
- Grievance `identityRef` is stripped from responses for every role without
  `grievance.viewIdentity`.
- `JWT_SECRET` refuses to fall back to a default in production.
- Lockout state lives in the database, so it survives serverless cold starts.
- Audit writer redacts passwords, tokens, secrets, OTPs and identity references.
- `.env*` is gitignored and no env file appears anywhere in git history — checked
  across all branches. The public repo carries no secrets.
- TypeScript compiles clean with build errors enabled.
- QR attendance rejects closed and expired sessions (410), validates the
  rotating code against the current and previous 20-second window only, and
  relies on a database unique constraint to make a repeat scan idempotent.
- Booking overlap uses the correct interval predicate (see finding 7 for the
  concurrency caveat).

## Automated coverage added

- `scripts/qa-smoke.js` — exercises the deployed API unauthenticated, as a
  student and as an owner, asserting status codes and proving role separation.
  Notably it checks that a student's agent never invokes
  `analyse_institutional_fees`, which is the central security claim of the fee
  assistant.
- `tests/policy.test.ts` — five new cases pinning the finance capabilities, so
  a student gaining `finance.viewInstitutional` fails the build rather than
  silently handing their agent the institutional tool.

## Still to run

`docs/VERIFICATION_CHECKLIST.md` — nine browser checks, against the deployed
site. Both fixes above need a redeploy before check 8 will pass.
