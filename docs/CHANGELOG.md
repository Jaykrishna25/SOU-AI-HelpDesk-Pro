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
