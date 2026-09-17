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

## 2026-09-16 (late) - Phase 0 hardening
### Added
- Vitest + 14 tests: password hashing/verification, password policy, capability matrix,
  visibility rules, sensitive-domain access, unknown-role fail-closed
- npm test / npm run test:watch
- frontend/types/three.d.ts

### Changed
- typescript.ignoreBuildErrors: true -> false. Type errors now fail the build.
  (This setting hid the getLiveSession ReferenceError that cost four debugging rounds.)
- Data-quality issue counts and list scoped to the selected academic year (they were
  accumulating across years - 43 became 86)

### Verified in production
- Evidence workflow end to end: create, upload, duplicate refusal by checksum,
  verify, approve, report draft, snapshot, IQAC approval, CSV export
- Separation of duties confirmed: ADMIN can verify but cannot approve

### RESUME HERE (next session)
1. Input validation layer - endpoints still trust req.json() shapes (highest remaining risk)
2. Encrypt Grievance.identityRef (currently plaintext beside the complaint body)
3. MFA for OWNER/SUPER_ADMIN/HOI (schema fields exist, no implementation)
4. Refresh-token rotation and password reset by email
5. Backup and restore documentation
6. More tests: approval ordering, data-quality rules, evidence visibility
7. Then Phase 2 (Outcome-Based Education) or Phase 1 remainder (criteria admin UI)

## 2026-09-16 (night) - Phase 0 near-complete
### Added
- lib/validate.ts - zod schemas for auth, evidence, grievance, booking, QR attendance,
  feedback and exam seating; ValidationError -> 400 with field-level detail
- lib/crypto.ts - AES-256-GCM field encryption (tamper-evident, fails closed with no key)
- tests/validate.test.ts, tests/crypto.test.ts (29 tests total, all passing)
- scripts/encrypt-grievances.js, scripts/check-grievances.js
- docs/BACKUP_AND_RESTORE.md

### Changed
- Validation wired into: evidence creation, grievance submission, bookings,
  QR sessions and scans, feedback responses, exam seating
- Grievance.identityRef now AES-256-GCM encrypted; 15/15 existing rows backfilled
- Owner dashboard: removed "Rs 18.6 Cr Total Revenue", "92% Fees Collected",
  "92% AI Accuracy" (all fabricated - no such measurements exist)
- Landing page: replaced Auto-Resolution 68%, AI Accuracy 92%, Response SLA 48h,
  AI Agents 12 with verifiable counts (7 portals, 7 criteria, 26 resources, 29 tests)
- Student dashboard: removed hardcoded "Pending Fees: Rs 30k" shown to every student

### Deliberate gaps (documented, not attempted)
- MFA for privileged roles: schema fields exist, no implementation
- Refresh-token rotation: 8h tokens with tokenVersion revocation instead
- Password reset by email: set-password requires an authenticated session
- Restore procedure has never been rehearsed (stated in BACKUP_AND_RESTORE.md)

### RESUME HERE (next session)
Choose one:
  A. Phase 2 - Outcome-Based Education (PO/CO/PSO, attainment, course files)
  B. Phase 1 remainder - criteria admin UI, evidence index export
  C. Project documentation deliverables (SRS, architecture, test cases, viva sheet)

## 2026-09-16 (late night) - Documentation pass
### Added
- docs/VIVA_PREPARATION.md - stack rationale, how each feature works, expected
  questions with answers, the four vulnerabilities found and fixed, known
  limitations, defensible numbers
- docs/ARCHITECTURE.md - rewritten with 5 Mermaid diagrams (context, components,
  request flow, evidence lifecycle, ER overview, deployment)
- docs/API.md - rewritten: ~40 endpoints across 8 namespaces, each with method,
  required capability, validation schema; full capability matrix; status codes
- docs/TESTING.md - rewritten: 29 automated tests mapped to what each proves,
  21 manual cases verified on the deployed system, explicit "not tested" section
- docs/BACKUP_AND_RESTORE.md - assets, key warning, pg_dump procedure,
  restore drill marked as unrehearsed

### Corrected (stale documents that contradicted the running system)
- USER_MANUAL.md - login instructions said "enter Birthdate"
- PRESENTATION.md - claimed revenue and AI accuracy analytics
- PROJECT_REPORT.md - claimed birthdate login, revocable refresh tokens,
  ~68% auto-resolution, ~92% AI accuracy, 12 agents (none of which exist)
- API.md - login example used birthdate; KPI list cited aiAccuracy, revenueCollected
- VIVA.md - superseded, now points to VIVA_PREPARATION.md

### Discovered
- Two Neon projects exist. Production is us-east-1 (Vercel-provisioned).
  The personal "sou-helpdesk" project (us-east-2 Ohio) is STALE - it holds the
  original 16 models only. Do not connect to it. Recommend renaming it.

### RESUME HERE (next session)
1. docs/ERD.md is stale - describes 16 models, schema now has 33. Needs rewrite.
2. Read through remaining older docs for staleness: PROJECT_REPORT, ADMIN_MANUAL,
   DEPLOYMENT, RUN_AND_DEPLOY, SOU_MIS_INTEGRATION, FUTURE_SCOPE, PRESENTATION
3. Rehearse the demo path twice (see below)
4. Back up GRIEVANCE_KEY outside Vercel
5. Rename the stale Neon project to UNUSED-old-do-not-connect

### Demo path (7 minutes)
landing -> student books a room -> admin approves -> CR runs QR attendance ->
faculty verifies -> student files anonymous grievance -> Owner resolves it and
the identity decrypts -> IQAC evidence verified then approved -> report draft
with per-statement sources -> export refused until IQAC approval -> approve ->
export CSV

### State at end of session
Phase 0 ~92% | Phase 1 ~90% | Documentation ~80% | Overall ~26%
29 tests passing | TypeScript build errors enabled | 15/15 grievance
identities encrypted | 7 fabricated statistics removed

## 2026-09-17 - Voice, multilingual, LangChain RAG and biometric sign-in
### Added
- lib/speech.ts - Web Speech API wrapper: recognition, synthesis, script-based
  language detection (English / Hindi / Gujarati). No audio leaves the device.
- lib/ai.ts - LangChain chain over Gemini: retrieval, chunking, cosine similarity,
  cross-lingual query translation, grounded prompt. Embeddings called via direct
  REST because LangChain resolved a different model for embedQuery.
- lib/kb-content.ts - 20 curated help-desk entries. Deliberately contain NO figures:
  process only, because fee amounts and dates are not known to this system.
- lib/ai-api.ts + /api/ai/* - chat with conversation memory, ingestion, status
- lib/webauthn.ts + lib/webauthn-api.ts + /api/webauthn/* - passkey registration
  and sign-in (face / fingerprint via platform authenticators)
- app/account/passkeys - register and remove devices
- tests/speech.test.ts, tests/ai.test.ts

### Changed
- Chatbot.tsx - microphone, spoken replies, automatic language detection,
  asks the RAG assistant before falling back to a ticket
- login page - "Sign in with fingerprint or face"; subtitle corrected from
  "ID and birthdate" to "ID and password"
- schema - KnowledgeChunk, ChatSession, ChatTurn, Passkey, WebAuthnChallenge

### Problems found and fixed during this work
- Reply language was read from React state, which had not updated by the time
  send() ran. Now detected from the message itself at send time.
- gemini-1.5-flash, gemini-2.5-flash and text-embedding-004 are all retired for
  newly created API keys, failing with silent 404s. Added scripts/list-gemini-models.js
  to ask the API what a key actually supports rather than guessing.
- The type checker caught an invalid modelName parameter before deployment.

### Known limitations
- Three languages by request (English, Hindi, Gujarati). Detection is by Unicode
  block, so it cannot separate two languages sharing a script.
- Spoken replies depend on voices installed in the operating system. Hindi and
  Gujarati TTS are often absent on Windows; the UI says so rather than failing silently.
- Web Speech API: best in Chrome and Edge. Firefox support is limited.
- Passkeys are bound to an origin. A credential registered on localhost will not
  work on the deployed site, and vice versa.
- The knowledge base is 20 process entries. It contains no institutional figures
  and must be extended by the administration before real use.
- Cosine similarity runs in application code. Correct at this scale; pgvector
  would be needed past a few thousand chunks.
- No automated tests cover the LLM calls themselves - they need network and a key.

### RESUME HERE (unchanged from 2026-09-16)
1. docs/ERD.md is stale - describes 16 models, schema now has 38
2. Read through remaining older docs for staleness
3. Rehearse the demo path twice
4. Back up GRIEVANCE_KEY outside Vercel
5. Rename the stale Neon project to UNUSED-old-do-not-connect
