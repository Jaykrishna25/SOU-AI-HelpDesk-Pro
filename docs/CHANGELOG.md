# Changelog

## [Unreleased] - Phase 0a
### Added
- docs/IMPLEMENTATION_PLAN.md
- docs/CHANGELOG.md

### Notes
- No schema or runtime changes yet.

## 2026-09-16 - Phase 0a / 0b / 0c (partial)
### Added
- lib/policy.ts - central capability matrix, sensitive-domain and visibility rules (WRITTEN, NOT YET WIRED)
- lib/audit.ts - redacting audit writer; AuditLog extended with actorRole, entityId, summary, detail, ip, userAgent
- components/Metric.tsx - MetricValue, DataBadge, DemoNotice (WRITTEN, NOT YET APPLIED)
- app/account/password - forced password-set screen
- scripts/account.js - account inspector, --reset, --list

### Changed
- server-auth.ts: bcrypt hashing (12 rounds), password policy, DB-backed lockout (5 attempts / 15 min),
  token TTL 7d -> 8h, tokenVersion for revocation, JWT_SECRET fallback now throws in production
- api-handler.ts: login accepts password; date of birth accepted once for un-migrated accounts then retired;
  /auth/set-password added; signup role forced to STUDENT (was self-selectable up to OWNER)
- login page: password field, date of birth demoted to first sign-in, mustChangePassword redirect
- Six feature modules switched from getSession to getLiveSession (revocation now enforced)

### Security fixed
- CRITICAL: date of birth was the password for every account
- CRITICAL: public signup could create OWNER / HOI / ADMIN accounts
- HIGH: no lockout or rate limiting on login
- HIGH: 7-day tokens with no revocation path

### Known gaps carried forward
- api-handler.ts still uses synchronous getSession - revocation not enforced on those endpoints
- policy.ts not yet imported by any module; role arrays still duplicated in six files
- Metric.tsx not yet applied to any dashboard; 0% tiles still misleading
- No input validation layer, no MFA, no refresh rotation, no password reset by email
- Grievance identityRef still stored in plaintext
- Seeded term data is not badged as demo data

### RESUME HERE (next session)
1. Convert api-handler.ts to getLiveSession (make the call sites await)
2. Apply Metric.tsx to Owner and Admin dashboards - needs screenshots of the 0% tiles
3. Wire policy.ts into the six modules, deleting their local role arrays
4. Then Phase 1: IQAC evidence vault - BLOCKED until object storage is chosen
   (recommendation: Vercel Blob)

## 2026-09-16 (evening) - Phase 1: IQAC Evidence Vault
### Added
- 17 quality/evidence entities: AcademicYear, QualityCriterion, KeyIndicator, QualityMetric,
  MetricTarget, MetricOwner, EvidenceRecord, EvidenceDocument, EvidenceVersion,
  EvidenceVerification, EvidenceApproval, ActionPlan, ActionItem, ReportSnapshot,
  DataSource, DataQualityIssue (+ existing Department)
- prisma/seed-iqac.js - configurable framework skeleton (7 criteria, 30 indicators, 43 metrics,
  4 academic years, 7 data sources). ALL DEFINITIONS ARE PLACEHOLDERS.
- lib/iqac.ts + /api/iqac/* - evidence CRUD, private Blob upload, versioning,
  verification and approval, permission-checked document serving
- lib/iqac-insight.ts + /api/iqac-insight/* - dashboard and data-quality engine (8 rules)
- app/iqac - workspace UI (Overview, Evidence Vault, Data quality); wired into Admin/HOD/Owner

### Controls proven in testing
- Approval requires prior verification (enforced server-side)
- Verifier and approver are different roles: ADMIN verifies, HOI/OWNER approves
- Duplicate uploads refused by SHA-256 checksum, not filename
- Approved records lock against edit and re-upload
- Documents stored PRIVATE; served only after session + visibility check, with audit

### Fixed (production bugs found today)
- Duplicate module specifiers ("./server-auth" vs "@/lib/server-auth") caused the bundler to
  ship two module copies -> ReferenceError: getLiveSession is not defined
- bcryptjs v3 default export is undefined at runtime; switched to named imports
- Prisma enums require one value per line
- Evidence documents were being uploaded with access:"public" - anyone with the URL could
  read a CONFIDENTIAL record. Now private + permission-checked.
- Bearer-token auth cannot travel on an <a href>; documents now fetched with the header

### Known gaps in Phase 1
- No evidence-index export (PDF/Excel/CSV)
- No admin UI to create or edit criteria/indicators/metrics (data is configurable, UI is not)
- Report builder not built: SSR/DVV drafts from approved evidence with per-statement source links
- Document download loads the whole file into browser memory; should use a short-lived signed token

### RESUME HERE (next session)
1. Decide: finish Phase 0 or start Phase 2
2. Phase 0 remainder: input validation layer, MFA, refresh-token rotation, password reset,
   encryption-ready fields, backup/restore docs, and TESTS
   - first test to write: hashPassword/verifyPassword, then policy.can(), then approval ordering
   - then turn OFF typescript.ignoreBuildErrors (it hid today's ReferenceError)
3. Phase 1 remainder: report builder, criteria admin UI, evidence export
4. Phase 2: Outcome-Based Education (PO/CO/PSO, attainment, course files)
