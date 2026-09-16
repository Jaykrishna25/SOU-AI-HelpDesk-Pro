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
| user.manage | ADMIN, OWNER, SUPER_ADMIN |
| role.assign / audit.view | OWNER, SUPER_ADMIN |

Note that `evidence.verify` and `evidence.approve` deliberately do not overlap
at ADMIN level: the role that checks evidence cannot be the role that accepts it.

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
