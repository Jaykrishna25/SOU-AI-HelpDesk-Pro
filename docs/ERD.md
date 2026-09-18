# Entity relationship reference

Generated from `frontend/prisma/schema.prisma`.
**50 models, 15 enums.**

> This document previously described 16 models, which was the schema as it stood
> before the IQAC, RAG and WebAuthn work. It has been rebuilt from the schema
> itself. If you change the schema, regenerate this rather than editing by hand.

---

## 1. Identity and academic core

`User` is the single identity. Exactly one of `student` / `faculty` / `admin`
hangs off it, so a role change never means duplicating a person.

```
User ─┬─ Student ── Department
      ├─ Faculty ── Department
      └─ Admin

Department ─┬─ Student[]
            ├─ Faculty[]
            └─ Subject[]

Subject ─┬─ Department
         ├─ Faculty?          (a subject may be unassigned)
         ├─ Result[]
         └─ Exam[]

Student ─┬─ Fee[]
         └─ Result[] ── Subject
```

| Model | Notes |
|---|---|
| `User` | Login identity. Holds `tokenVersion` for revoking all sessions. |
| `Student` | `enrollmentNo` unique. `semester`, `program`, `cgpa`. |
| `Faculty` | `facultyId` unique, `departmentId`, `designation`. |
| `Admin` | Thin profile row. |
| `Department` | Owns students, faculty and subjects. |
| `Subject` | Optional faculty — unassigned subjects are legal. |
| `Fee` | `semester`, `totalFees`, `paidFees`, `status`, `dueDate`. Basis of the fee agent. |
| `Result` | Internal and external marks, grade. |
| `Exam` | Title, type, date, venue. |

## 2. Help desk

```
Ticket ── creator: User
   └─ TicketHistory[]

Notification ── User
KnowledgeBase              (standalone articles)
```

## 3. Attendance and resources

```
QRSession ── QRScan[]
Resource  ── Booking[]
CRAssignment               (standalone)
AttendanceSubmission       (standalone)
```

| Model | Notes |
|---|---|
| `QRSession` | A live attendance session; rotating code. |
| `QRScan` | One student's scan against a session. |
| `Resource` / `Booking` | GreenReserve room and lab booking. |
| `CRAssignment` | Which student represents which subject. |

## 4. Exams and feedback

```
SeatingPlan  ── SeatAllocation[]
FeedbackForm ── FeedbackResponse[]
```

## 5. Grievances

```
Grievance                  (standalone by design)
```

Deliberately holds no foreign key to `User`. The complainant's identity is
stored as an encrypted `identityRef` (AES-256-GCM, `enc:v1:<iv>:<tag>:<ct>`), so
a database read alone does not reveal who raised a grievance. Only
`grievance.viewIdentity` — Owner and Super Admin — can decrypt it, and every
such read is audited.

## 6. IQAC, quality and NAAC evidence

The largest subsystem. `AcademicYear` scopes everything so figures never mix
across years.

```
AcademicYear ─┬─ MetricTarget[]
              ├─ EvidenceRecord[]
              ├─ ActionPlan[]
              ├─ ReportSnapshot[]
              └─ DataQualityIssue[]

QualityCriterion ─┬─ KeyIndicator[] ── QualityMetric[]
                  └─ ActionPlan[]

QualityMetric ─┬─ MetricTarget[]  ── AcademicYear
               ├─ MetricOwner[]
               ├─ EvidenceRecord[]
               └─ DataQualityIssue[]

EvidenceRecord ─┬─ EvidenceDocument[]      (private blob, permission-checked)
                ├─ EvidenceVersion[]
                ├─ EvidenceVerification[]
                ├─ EvidenceApproval[]
                └─ ActionItem[]

ActionPlan ─┬─ AcademicYear
            ├─ QualityCriterion?
            └─ ActionItem[] ── EvidenceRecord?
```

| Model | Notes |
|---|---|
| `QualityCriterion` → `KeyIndicator` → `QualityMetric` | The NAAC framework hierarchy. |
| `MetricTarget` | A target for one metric in one year. |
| `MetricOwner` | Who is accountable for a metric. |
| `EvidenceRecord` | A claim, with visibility public → restricted. |
| `EvidenceDocument` | Stored on **private** blob; served only through a permission-checked, audited endpoint. |
| `EvidenceVersion` | Supersession history — evidence is never edited in place. |
| `EvidenceVerification` / `EvidenceApproval` | Separate steps: verifying a fact is not approving its publication. |
| `DataQualityIssue` | Year-scoped. Counts were double-reporting until scoping was fixed. |
| `ReportSnapshot` | A frozen report; regenerating never rewrites a published one. |
| `DataSource` | Where a metric's numbers come from. |

## 7. AI: RAG, chat memory and passkeys

```
KnowledgeChunk             (standalone: content + embedding vector)
ChatSession ── ChatTurn[]
Passkey                    (standalone, keyed by userId)
WebAuthnChallenge          (standalone, single-use, 5-minute TTL)
```

| Model | Notes |
|---|---|
| `KnowledgeChunk` | Text plus its embedding. Cosine similarity runs in application code — see ARCHITECTURE.md for the pgvector threshold. |
| `ChatSession` / `ChatTurn` | Conversation memory with sources, confidence and latency per turn. |
| `Passkey` | WebAuthn credential; the signature counter is checked to advance. |
| `WebAuthnChallenge` | Single-use, expires in 5 minutes, origin-bound. |

---

## Audit

```
AuditLog ── user: User?
```

Nullable user, so a failed login by an unknown account is still recorded. The
writer in `lib/audit.ts` redacts passwords, tokens, secrets, OTPs and identity
references before anything is persisted.

Actions: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `VERIFY`, `EXPORT`,
`VIEW_CONFIDENTIAL`, `VIEW_IDENTITY`, `LOGIN`, `LOGIN_FAILED`, `LOGOUT`,
`ROLE_CHANGE`, `PASSWORD_RESET`.

There is no `READ` action, deliberately — auditing every read would bury the
entries that matter. Sensitive reads use `VIEW_CONFIDENTIAL` or `VIEW_IDENTITY`.

## 8. Fun Zone

```
GameScore                  (standalone by design)
```

Deliberately carries no foreign key to `User`. A play record is not academic
data and should not widen the `User` model's blast radius; `userId` is stored
plainly so the leaderboard can group by it, with a display name captured at play
time. `@@unique([userId, game, puzzleDate])` enforces one scoring run per puzzle
per day, and `weekKey` makes a weekly board a single indexed lookup.

## Other standalone models

`RiskAlert`, `SustainabilityMetric`, `ReportExport` — no foreign keys; they
record derived or exported state rather than relational entities.

---

## Regenerating this document

```bash
cd frontend
npx prisma validate          # schema is well-formed
grep -c "^model " prisma/schema.prisma   # model count quoted at the top
```
