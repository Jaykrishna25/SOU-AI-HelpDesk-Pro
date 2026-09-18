# API Reference - SOU AI HelpDesk Pro

All endpoints are Next.js route handlers under `frontend/app/api/`, each a
catch-all (`[...path]`) re-exporting from a library module in `frontend/lib/`.

**Authentication**: `Authorization: Bearer <JWT>` on every endpoint except
`/api/auth/login` and `/api/auth/signup`.

**Session validation**: `getLiveSession()` verifies the JWT, then checks
`tokenVersion` and `isActive` against the database, so a revoked session is
rejected immediately rather than at token expiry.

**Authorization**: newer modules call `can(session, capability)` from
`lib/policy.ts`. The core handler still uses inline role checks - noted below.

**Validation**: `parse(Schema, body)` from `lib/validate.ts`. A failure returns
400 with field-level detail.

**Responses**: `{ success: true, ... }` or `{ success: false, error: "..." }`.

---

## /api - core (lib/api-handler.ts)

| Method | Path | Access | Validation | Notes |
|---|---|---|---|---|
| POST | /api/auth/login | Public | Manual | Password, or date of birth once for un-migrated accounts. 5 failures = 15-min lock. Returns `mustChangePassword`. |
| POST | /api/auth/signup | Public | Manual | Role is **forced to STUDENT**; never read from the client. |
| POST | /api/auth/set-password | Authenticated | Manual | Applies password policy, bumps `tokenVersion`, returns a new token. |
| GET | /api/me | Authenticated | - | Current session profile. |
| GET | /api/tickets | Authenticated | - | Scoped by role stage. |
| POST | /api/tickets | Authenticated | Manual | Creates ticket with history entry. |
| PATCH | /api/tickets/:id | Staff | Manual | Status, stage, assignment. |
| GET | /api/cr | Authenticated | - | Class representative assignments. |
| POST | /api/cr | Staff | Manual | Assign a CR. |
| DELETE | /api/cr/:id | Staff | Manual | Remove a CR. |
| GET | /api/attendance | Authenticated | - | Submissions list. |
| POST | /api/attendance | CR | Manual | Submit a batch. |
| PATCH | /api/attendance/:id | Faculty+ | Manual | Approve or reject. |
| GET | /api/notifications | Authenticated | - | Current user only. |
| GET | /api/soumis/status | Authenticated | - | Reports mock mode honestly; never requests MIS credentials. |

> **Known gap.** This module predates `policy.ts` and `validate.ts`. It uses
> inline role checks and manual field coercion. Functionally correct, but not
> centralised. Migrating it is the largest remaining Phase 0 item.

## /api/gr - GreenReserve bookings (lib/greenreserve.ts)

| Method | Path | Capability | Validation |
|---|---|---|---|
| GET | /api/gr/resources | authenticated | - |
| GET | /api/gr/availability | authenticated | - |
| GET | /api/gr/bookings | `booking.viewAll` for scope=all | - |
| GET | /api/gr/impact | authenticated | - |
| POST | /api/gr/bookings | `booking.create` | `BookingInput` |
| PATCH | /api/gr/bookings | `booking.approve` | Manual |

Conflict checking is server-side: an overlapping PENDING or APPROVED booking on
the same resource is refused with the conflicting code. Energy and CO2 are
computed per booking against the highest-draw resource of the same type.

## /api/qr - QR attendance (lib/qr.ts)

| Method | Path | Capability | Validation |
|---|---|---|---|
| GET | /api/qr/live | authenticated | - |
| GET | /api/qr/sessions | `attendance.verify` for pending/all | - |
| POST | /api/qr/sessions | CR or faculty | `QRSessionInput` |
| POST | /api/qr/scan | authenticated | `QRScanInput` |
| PATCH | /api/qr/sessions | `attendance.verify` | Manual |

Codes are `HMAC-SHA256(sessionToken, floor(now / 20s))` truncated to six
characters; the current and previous window are accepted.

## /api/inst - feedback and grievances (lib/institutional.ts)

| Method | Path | Capability | Validation |
|---|---|---|---|
| GET | /api/inst/forms | authenticated | - |
| GET | /api/inst/aggregate | HOD+ or owning faculty | - |
| GET | /api/inst/grievances | `grievance.handle`; identity only for `grievance.viewIdentity` | - |
| POST | /api/inst/forms | `feedback.createForm` | Manual |
| POST | /api/inst/responses | authenticated | `FeedbackResponseInput` |
| POST | /api/inst/grievances | authenticated | `GrievanceInput` |
| PATCH | /api/inst/grievances | `grievance.handle` | Manual |

Feedback stores `sha256(formId + userId)` and no user ID, so a response cannot
be traced back. Grievance `identityRef` is AES-256-GCM encrypted and decrypted
only for OWNER and SUPER_ADMIN.

## /api/iqac - evidence vault (lib/iqac.ts)

| Method | Path | Capability | Validation |
|---|---|---|---|
| GET | /api/iqac/years | authenticated | - |
| GET | /api/iqac/framework | authenticated | - |
| GET | /api/iqac/evidence | visibility-filtered | - |
| GET | /api/iqac/evidence/one | `canSeeVisibility` | - |
| GET | /api/iqac/evidence/file | `canSeeVisibility` | - |
| POST | /api/iqac/evidence | `evidence.upload` | `EvidenceCreateInput` |
| POST | /api/iqac/evidence/upload | `evidence.upload` | Type and size checked |
| POST | /api/iqac/verify | `evidence.verify` | Manual |
| POST | /api/iqac/approve | `evidence.approve` | Manual |
| PATCH | /api/iqac/evidence | owner or `evidence.verify` | Manual |
| DELETE | /api/iqac/evidence | `evidence.approve` | - |

Uploads: 10 MB limit, allow-list of PDF/JPG/PNG/WEBP/DOC(X)/XLS(X)/CSV/TXT,
SHA-256 duplicate refusal, stored privately. Approval requires prior
verification. Approved records lock against edit and re-upload. Confidential
and restricted views are audited.

## /api/iqac-insight - dashboard and data quality (lib/iqac-insight.ts)

| Method | Path | Capability |
|---|---|---|
| GET | /api/iqac-insight/dashboard | `insights.view` |
| GET | /api/iqac-insight/issues | `insights.view` |
| POST | /api/iqac-insight/scan | `evidence.verify` |
| POST | /api/iqac-insight/resolve | `evidence.verify` |

The scan applies eight rules: missing evidence, unverified metrics, duplicate
titles, dates outside the academic year, future dates, unsourced figures,
expiring documents, and duplicate files by checksum.

## /api/iqac-report - report builder (lib/iqac-report.ts)

| Method | Path | Capability |
|---|---|---|
| GET | /api/iqac-report/draft | `report.generate` |
| GET | /api/iqac-report/saved | authenticated |
| GET | /api/iqac-report/one | authenticated |
| POST | /api/iqac-report/save | `report.generate` |
| POST | /api/iqac-report/approve | `report.publish` |
| POST | /api/iqac-report/export | requires an approved snapshot |

Drafts query `approvalStatus = APPROVED` only. Each statement stores the
evidence IDs behind it. Export is refused until the IQAC approves, and both
approval and export are audited.

## /api/exam - seating (lib/exams.ts)

| Method | Path | Capability | Validation |
|---|---|---|---|
| GET | /api/exam/plans | authenticated | - |
| GET | /api/exam/plan | authenticated | - |
| POST | /api/exam/plans | `exam.generateSeating` | `SeatingPlanInput` |
| DELETE | /api/exam/plan | `exam.generateSeating` | - |

Greedy allocator: never places the same course beside or directly behind
itself. Returns a `violations` count rather than claiming success.

## /api/insights - analytics (lib/insights.ts)

| Method | Path | Capability |
|---|---|---|
| GET | /api/insights/alerts | `insights.view` |
| GET | /api/insights/sustainability | `insights.view` |

Attendance risk requires at least three approved sessions for a class before it
will calculate. The ticket forecast is a least-squares slope over eight weekly
buckets - linear regression, not machine learning.

## /api/reports - NAAC/AICTE annexures (lib/reports.ts)

| Method | Path | Capability |
|---|---|---|
| GET | /api/reports/generate | `report.generate` |
| GET | /api/reports/saved | `report.generate` |
| GET | /api/reports/one | `report.generate` |
| POST | /api/reports | `report.generate` |

## /api/ai - retrieval assistant (lib/ai-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/ai/status` | none | Whether AI is configured, chunk count, model names |
| POST | `/api/ai/chat` | authenticated | RAG answer with conversation memory, sources and confidence |
| POST | `/api/ai/ingest` | `criteria.configure` | Embed and upsert knowledge chunks |

Answers are generated only from retrieved portal content. Below the confidence
floor the assistant says so and offers a ticket rather than guessing.

## /api/webauthn - passkeys (lib/webauthn-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| POST | `/api/webauthn/register/options` | authenticated | Issue a registration challenge |
| POST | `/api/webauthn/register/verify` | authenticated | Store the credential |
| POST | `/api/webauthn/login/options` | none | Issue an authentication challenge |
| POST | `/api/webauthn/login/verify` | none | Verify and issue a session |

Challenges are single-use, expire in 5 minutes and are origin-bound. The
signature counter must advance, which detects a cloned authenticator.

## /api/finance - fee statement simplifier (lib/finance-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/finance/status` | authenticated | Which finance capabilities the caller holds |
| GET | `/api/finance/me` | `finance.viewOwn` | The caller's own fee analysis |
| GET | `/api/finance/institutional` | `finance.viewInstitutional` | Aggregate position; audited as `VIEW_CONFIDENTIAL` |
| POST | `/api/finance/parse` | `finance.analyseStatement` | Parse and analyse an uploaded statement |
| POST | `/api/finance/summary` | `finance.viewOwn` | Plain-language summary of exact figures |
| POST | `/api/finance/ask` | `finance.viewOwn` or `finance.viewInstitutional` | Tool-calling agent; returns `toolsUsed` |

All arithmetic happens server-side in `lib/finance-math.ts`. The model is never
asked to calculate. An HOD is pinned to their own department server-side, so a
`department` value in the request body cannot widen their scope. Uploaded rows
are held per request and are never written to the `Fee` table.

## /api/study - study plan adviser (lib/study-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/study/status` | authenticated | Which study capabilities the caller holds |
| GET | `/api/study/me?threshold=` | `study.viewOwn` | The caller's own prioritised plan |
| GET | `/api/study/cohort?threshold=` | `study.viewCohort` | Per-subject cohort averages; audited as `VIEW_CONFIDENTIAL` |
| POST | `/api/study/summary` | `study.viewOwn` | Plain-language rewrite of the exact figures |
| POST | `/api/study/ask` | `study.viewOwn` or `study.viewCohort` | Tool-calling adviser; returns `toolsUsed` |

All arithmetic is in `lib/study-math.ts`, which imports neither Prisma nor a
model. The adviser is instructed never to calculate and never to predict a
grade. An HOD is pinned to their own department server-side.

## /api/audit - audit trail viewer (lib/audit-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/audit/list` | `audit.view` | Entries, newest first, filterable by action or entity |
| GET | `/api/audit/summary` | `audit.view` | Totals and per-action counts |
| POST/PATCH/DELETE | any | — | **405.** The log is append-only by design. |

## /api/admin - account recovery (lib/admin-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/admin/users?q=` | `user.manage` | Search accounts; returns whether a password exists, never the hash |
| POST | `/api/admin/reset-password` | `user.manage` | Clears the password, forces a change, revokes sessions |
| POST | `/api/admin/unlock` | `user.manage` | Clears a lockout without touching the password |

Reset is permitted **strictly downwards by role rank**. A reset account signs in
with its date of birth, which is not a secret, so without that rule an ADMIN
could reset the OWNER and then sign in as them. Equal ranks cannot reset each
other. Denied attempts are audited.

## /api/fun - Fun Zone (lib/fun-api.ts)

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/api/fun/status` | `fun.play` | Window state, games, today's plays, minutes used |
| GET | `/api/fun/puzzle?game=` | `fun.play` | Today's puzzle. **423** when the window is closed |
| GET | `/api/fun/leaderboard?game=&week=` | `fun.play` | Weekly board, optionally per game |
| POST | `/api/fun/guess` | `fun.play` | Judges one Concept Ladder guess; records no score |
| POST | `/api/fun/submit` | `fun.play` | Server decides whether it was solved, then scores |
| DELETE | any | — | **405.** Scores cannot be deleted. |

Two things the server enforces rather than trusting the client with: the access
window (12:00-14:00 and 17:00-20:00, returning 423 with no puzzle outside it),
and the answers — the grid solution, ladder target and quiz answers never leave
the server. One scoring run per puzzle per day, enforced by a unique constraint.

## Capability reference

Defined in `lib/policy.ts`. Roles: STUDENT, FACULTY, ADMIN, HOD, HOI, OWNER,
SUPER_ADMIN.

| Capability | Roles |
|---|---|
| booking.create | all |
| booking.approve / booking.viewAll | ADMIN, OWNER, SUPER_ADMIN |
| attendance.verify | FACULTY, HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| feedback.createForm / viewAggregate | FACULTY, HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| grievance.handle | ADMIN, HOD, HOI, OWNER, SUPER_ADMIN |
| grievance.viewIdentity | OWNER, SUPER_ADMIN |
| evidence.upload | FACULTY, HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| evidence.verify | HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| evidence.approve | HOI, OWNER, SUPER_ADMIN |
| evidence.viewConfidential | HOI, OWNER, SUPER_ADMIN |
| evidence.viewRestricted | OWNER, SUPER_ADMIN |
| exam.generateSeating | ADMIN, HOD, HOI, OWNER, SUPER_ADMIN |
| insights.view | FACULTY, HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| report.generate | HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| report.publish | HOI, OWNER, SUPER_ADMIN |
| finance.viewOwn / finance.analyseStatement | all |
| finance.viewInstitutional | ADMIN, HOD, HOI, OWNER, SUPER_ADMIN |
| study.viewOwn | all |
| study.viewCohort | FACULTY, HOD, HOI, ADMIN, OWNER, SUPER_ADMIN |
| fun.play | all |
| user.manage | ADMIN, OWNER, SUPER_ADMIN |
| role.assign / audit.view | OWNER, SUPER_ADMIN |

Note that `evidence.verify` and `evidence.approve` deliberately do not overlap
at ADMIN level: the role that checks evidence cannot be the role that accepts it.

`finance.viewInstitutional` is enforced twice over. The endpoint checks it, and
the fee agent uses it to decide which tools to bind — a student's model is never
given the institutional function at all, so there is no prompt to talk around.

## Status codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Validation failure (field detail in `issues`) |
| 401 | Missing, invalid or revoked session |
| 403 | Authenticated but lacking the capability |
| 404 | Not found |
| 409 | Conflict - booking clash, duplicate file, approval ordering |
| 410 | Expired - closed attendance session, closed feedback form |
| 413 | File exceeds 10 MB |
| 415 | File type not allowed |
| 423 | Account locked after repeated failed logins |
| 502 | Upstream storage failure |
