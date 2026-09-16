# Viva Preparation - SOU AI HelpDesk Pro

Navlani Jaykrishna Satishkumar (SOU2023CSE69)
Silver Oak University, B.Tech CSE

---

## 1. One-sentence description

A university help desk and IQAC quality-management platform: seven role-based
portals over a PostgreSQL database, with an evidence vault that records,
verifies and approves accreditation evidence, and generates reports in which
every statement links to the source record it came from.

## 2. Stack, and why

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | One deployment for UI and API; serverless functions on Vercel |
| Language | TypeScript, strict build errors | Catches wrong identifiers and shapes before deployment |
| Database | PostgreSQL on Neon | Serverless Postgres; connection pooling suits short-lived functions |
| ORM | Prisma | Schema is source-controlled; migrations are reproducible |
| Auth | JWT, bcrypt (12 rounds) | Stateless; no session store needed on serverless |
| Files | Vercel Blob (private) | No writable filesystem exists on serverless functions |
| Tests | Vitest | 29 tests covering auth, permissions, validation, encryption |

## 3. How each feature actually works

**Authentication.** Login ID plus password. Passwords are bcrypt hashed at 12
rounds. Five failed attempts lock the account for 15 minutes, tracked in the
database (in-memory counters do not work across serverless instances). Tokens
last 8 hours and carry a `tokenVersion`; changing a password increments it,
which invalidates every existing token for that user.

**Authorization.** One capability matrix in `lib/policy.ts`. Endpoints ask
`can(session, capability)` rather than checking role strings inline. Previously
six modules each had their own role array - that is exactly how permissions
drift apart.

**QR attendance.** The CR starts a session; the displayed code is
`HMAC-SHA256(sessionToken, floor(now / 20s))` truncated to six characters. The
server accepts the current and previous window. A screenshot is useless after
20 seconds. Faculty then approves the batch.

**Evidence vault.** Every edit writes an `EvidenceVersion` snapshot rather than
overwriting. Uploads are refused if the SHA-256 checksum already exists on that
record. Approval is blocked unless verification has happened first, and the
verifying role cannot be the approving role.

**Grievance privacy.** The complaint body is stored plainly; the complainant's
identity is AES-256-GCM encrypted with a key held only in the environment.
Only OWNER and SUPER_ADMIN can decrypt, and every such read is audited.

**Report builder.** Queries evidence with `approvalStatus = APPROVED` only.
Each statement carries the IDs of the records behind it. Export is refused
until the IQAC approves the snapshot. Metrics with no approved evidence appear
in an explicit gap list rather than being omitted.

## 4. Questions you should expect

**"Is this NAAC compliant / will it get an A++?"**
No, and it does not claim to be. It is an evidence-management system. Criteria,
indicators, metrics and weightages are database records, not code, because the
framework changes. The seeded framework uses the published criterion names but
every metric definition is a placeholder for the IQAC to replace. The system
never calculates or predicts an accreditation outcome.

**"How do you know the numbers on the dashboard are real?"**
Every metric tile states its own basis and sample size. Where there is no
measurement it says "No verified data available yet" rather than showing zero.
I removed seven fabricated statistics during development - a hardcoded
"92% AI Accuracy", "Rs 18.6 Cr revenue", and a "Rs 30k pending fees" figure
shown identically to every student. None of them were computed from anything.

**"What stops someone approving their own evidence?"**
The capability matrix. ADMIN holds `evidence.verify` but not
`evidence.approve`; only HOI, OWNER and SUPER_ADMIN hold approval. It is
enforced server-side, and there is a unit test asserting ADMIN and FACULTY are
absent from the approval set.

**"Can the QR code be shared with an absent student?"**
Yes. The rotating code proves the scan happened within a 20-second window, not
that the person was in the room. Real proximity would need Bluetooth beacons or
network-level checks. This is a known limitation, not an oversight.

**"Is the grievance channel truly anonymous?"**
It is access-control anonymous, not cryptographically anonymous. The identity
exists, encrypted, and the Owner can decrypt it - which is necessary, because a
harassment complaint may require action. A database administrator holding the
key could read it. That is the same model real institutional systems use.

**"What happens if you lose the encryption key?"**
Those identities are permanently unreadable. That is the correct behaviour and
it is documented in BACKUP_AND_RESTORE.md. The key is kept outside the platform.

**"Have you tested your backup restore?"**
No. The procedure is documented and explicitly marked as unrehearsed. An
untested backup is an assumption.

**"What is the AI in AI HelpDesk?"**
Currently a rule-based assistant: a 33-topic keyword matcher that resolves
common queries client-side and routes personalised or complex ones to a ticket.
It is not retrieval-augmented generation and I do not describe it as such. RAG
with source citation is specified for a later phase.

## 5. Vulnerabilities I found in my own system

Say these before you are asked. Finding and fixing them is the stronger story.

1. **Date of birth was the password.** Every account. Guessable from a student's
   own profile. Replaced with bcrypt-hashed passwords and a forced reset path
   that kept existing users from being locked out.
2. **Public signup could create an OWNER account.** The role came from the
   client and was trusted. Now signup always produces a STUDENT; privileged
   roles are assigned by an administrator. The validation schema has no `role`
   field at all, so a client cannot even send one.
3. **Evidence documents were uploaded publicly.** Anyone with the URL could read
   a CONFIDENTIAL record with no login. Now private storage, served only after a
   session and visibility check, with the access audited.
4. **TypeScript build errors were disabled**, which allowed a missing import to
   reach production and throw at runtime. Re-enabled; it caught a real bug
   within the hour.

## 6. Known limitations

- No MFA (schema fields exist, unimplemented)
- No refresh-token rotation; 8-hour tokens with version-based revocation instead
- No password reset by email
- SOU MIS integration is mock-only; no authorisation was obtained, and the
  system never asks a user for their MIS password
- Seeded demonstration data is fictional and labelled as such
- Restore procedure documented but unrehearsed
- Roughly 26% of the full specification is implemented

## 7. Numbers you can defend

- 7 role portals, 7 quality criteria, 30 key indicators, 43 metrics
- 26 bookable resources across 7 types
- 29 automated tests, all passing
- 15 of 15 grievance identities encrypted at rest
- bcrypt at 12 rounds; AES-256-GCM for identity fields
- CO2 figures use 0.71 kg/kWh (CEA India grid emission factor)

## 8. If you are asked what you would do next

Finish the remaining phases in this order: outcome-based education
(CO/PO attainment), research and extension records, governance and committee
workflows. Before real institutional use: MFA on privileged roles, a rehearsed
restore, and an independent security review.
