# Changelog

## 2026-09-18 (later) - QA pass, account recovery, step-up authentication

A QA review of the security-critical paths. Eleven findings, six fixed.

### Security fixed
- **Token revocation could be bypassed.** `getLiveSession` only compared token
  versions when the token carried a `tv` claim, so a token without one was
  accepted and could not be revoked by bumping `tokenVersion`. Now fails closed.
- **Identity reveals were never audited.** `VIEW_IDENTITY` was declared in the
  audit enum and called from nowhere; `institutional.ts` decrypted complainant
  identities without importing the audit writer. Every reveal is now logged.
- **The audit log was unreadable.** Nothing in the codebase read `AuditLog`, and
  `audit.view` was unused. An audit trail nobody can read is storage, not
  accountability.

### Added
- `lib/audit-api.ts` + Audit Trail panel - read-only viewer gated on
  `audit.view`, with filters for sensitive actions. `POST`, `PATCH` and `DELETE`
  return 405: an audit log the application can rewrite proves nothing.
- `lib/admin-api.ts` + Accounts panel - admin-mediated password recovery and
  lockout clearing. Reset is permitted **strictly downwards** by role rank,
  because a reset account is protected only by a date of birth; without that
  rule an ADMIN could reset the OWNER and then sign in as them.
- `lib/stepup.ts` + `lib/stepup-client.ts` - step-up authentication. Institutional
  financial figures require re-entering the password; elevation is a separate
  five-minute token, held in memory only, bound to `tokenVersion` so a password
  change or forced sign-out drops it. **The agent is affected too: without
  elevation the institutional tool is not bound**, so the figures cannot be
  reached by asking nicely.
- `scripts/create-super-admin.js` - creates the SUPER_ADMIN operator account,
  the only role that outranks OWNER. Sets no password; the account signs in once
  with its date of birth and chooses its own.
- `scripts/qa-smoke.js` - API smoke test across unauthenticated, student and
  owner, asserting role separation on the live deployment.
- Sidebar links for Change password and Passkeys. Both pages existed but were
  reachable only by typing the URL.
- Four policy tests pinning the finance capabilities.

### Changed
- Owner dashboard money tiles now show real figures behind step-up:
  **Fees Collected** and **Fees Outstanding**, replacing "Total Revenue", which
  had no source data anywhere in the schema.
- `scripts/account.js --reset` now bumps `tokenVersion`, matching the endpoint.

### Removed
- **The "Strategic AI Forecasting" panel.** It displayed four hard-coded strings
  as AI forecasts, including "+18% admissions" and "Rs 4.2 Cr Q4 revenue". No
  forecasting model exists in this system. Replaced with a statement that it is
  not implemented and a list of the data each forecast would require. This was
  the ninth fabricated statistic removed from this project.

### Fixed
- Step-up prompt was unreachable from the finance page's empty state: the
  component returned the empty branch before rendering the password panel, so
  the click was a silent no-op. The server check was correct throughout.

### Known gaps carried forward
- No rate limiting on the AI endpoints. Documented in `docs/QA_REPORT.md` with
  the reasoning; the quota fallback mitigates the practical risk.
- Booking clash detection is not atomic - correct predicate, but a read followed
  by a write with no database constraint behind it.
- The nine verification checks in `docs/VERIFICATION_CHECKLIST.md`.

## 2026-09-18 - Fee Statement Simplifier (agentic pipeline)

### Added
- `lib/finance-math.ts` - all fee arithmetic and statement parsing. No Prisma
  and no model imports, so it is unit testable in isolation. This separation is
  the point of the feature, not an incidental tidy-up.
- `lib/finance-db.ts` - Prisma queries feeding the arithmetic. Fetches rows,
  calculates nothing.
- `lib/finance.ts` - public entry point re-exporting both.
- `lib/finance-agent.ts` - tool-calling agent over Gemini with three tools:
  `analyse_fee_statement`, `analyse_institutional_fees`, `search_fee_policy`.
  Explicit tool loop rather than a prebuilt agent, so the tools that ran are
  returned to the caller and shown in the UI.
- `lib/finance-api.ts` + `app/api/finance/[...path]/route.ts` - six endpoints.
- `app/finance/page.tsx` + `components/FinancePanel.tsx` - upload-first screen.
- `tests/finance.test.ts` - 11 tests over arithmetic and parsing.
- `docs/FINANCE_AGENT.md`, `docs/DEMO_SCRIPT.md`, `docs/sample-fee-statement.csv`.
- Capabilities `finance.viewOwn`, `finance.viewInstitutional`,
  `finance.analyseStatement` in the policy matrix.
- Nav entries: student **Fees**, and **Fee Analysis** for ADMIN, HOD and OWNER.

### Changed
- The student Fees tab previously rendered hard-coded figures
  (`Rs 1.2L / Rs 90k / Rs 30k`). These were fabricated placeholders of the same
  kind removed from the dashboards on 2026-09-16, and are now replaced by the
  student's real fee record, analysed server-side.
- `docs/ERD.md` rebuilt from the schema. It described 16 models; there are 49.
- Test counts corrected across TESTING.md, VIVA_PREPARATION.md and
  PROJECT_REPORT.md - 29 across 4 files was stale, the real figure is 53 across 7.
- API.md gained the `/api/ai`, `/api/webauthn` and `/api/finance` families, none
  of which had ever been documented.

### Fixed
- **Statement parser read `"1,50,000"` as `1`.** The splitter used
  `/[,;\t|]/`, so a semicolon-separated file was also split on the thousands
  separators inside a quoted amount. A student would have been shown a balance
  of one rupee. Now the delimiter is detected once from the header row and
  quoted fields are respected. Found by a unit test before it ever ran on real
  data.
- Audit calls used a non-existent `READ` action; TypeScript would have failed
  the build. Institutional reads now record `VIEW_CONFIDENTIAL`.

### Design decisions worth defending
- **The model never calculates.** Every figure comes from `analyseFeeRows()`.
  The opening summary runs the analysis function directly and asks the model
  only to reword it, so the figures cannot be wrong even if the model ignores
  its tools.
- **Authorisation is structural.** Tools are bound per role from the existing
  capability matrix. A student's model does not receive the institutional
  function, so there is no prompt to jailbreak. HOD scope is pinned server-side.
- **It degrades instead of failing.** When Gemini is rate-limited or over quota,
  the agent runs the analysis tool directly and returns exact figures with a
  note. Verified in practice during a 429.

### Known gaps
- The nine portal verification checks are still unrun, now with ~22 commits
  since the last end-to-end walkthrough.
- Statement upload accepts CSV and text only; PDF is not parsed.
- The seed data holds one department, so the by-department chart is a single
  bar. Do not seed fictional departments to improve it.

### RESUME HERE (next session)
1. Add `AI_CHAT_MODEL` to the Vercel environment and redeploy - `.env.local`
   is local-only, so production still uses the `.env` default.
2. Run the nine verification checks.
3. Back up `GRIEVANCE_KEY` outside Vercel. Losing it makes every encrypted
   grievance identity permanently unreadable.
4. Rename the stale Neon project (`sou-helpdesk`, us-east-2, 16 models) to
   `UNUSED-old-do-not-connect`.

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
