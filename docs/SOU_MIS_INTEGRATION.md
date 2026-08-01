# SOU MIS Integration (account.soumis.in / curriculum.soumis.in)

## Status: architected, pending official approval

SOU AI HelpDesk Pro is designed to integrate with Silver Oak University's official
MIS. The integration layer is fully implemented and running in mock mode; enabling
live data is a configuration change once the SOU MIS/IT department issues API access.

## Why mock mode is the default

account.soumis.in and curriculum.soumis.in are the university's PRODUCTION systems
holding real student, academic and financial records. They are login-gated web
applications, not public APIs. Connecting to them requires:

1. Written authorisation from the SOU MIS/IT department.
2. An officially documented API endpoint (or an approved export/webhook).
3. Service credentials issued to the project - never a student's personal login.

Automating a personal login or scraping those pages would breach the university's
Terms & Conditions ("unauthorised access to restricted areas is prohibited") and could
write incorrect records into the live attendance system.

## Architecture

Frontend -> /api/integrations/soumis/* -> SouMisAdapter -> mock fixtures
                                                        -> SOU MIS API (live)

| Method | Purpose | Direction |
|--------|---------|-----------|
| status() | integration health + mode | - |
| getStudents(dept, sem) | roster pull | read |
| getAttendanceSummary(enrollmentNo) | subject-wise % | read |
| postAttendance(records, idempotencyKey) | push marked attendance | write |
| syncRoster(dept, sem) | scheduled reconciliation | read |

## API endpoints

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/integrations/soumis/status | any signed-in user |
| GET | /api/integrations/soumis/students | Admin, Faculty, HOD, HOI, Owner |
| GET | /api/integrations/soumis/attendance/:enrollmentNo | any signed-in user |
| POST | /api/integrations/soumis/attendance | Faculty, Admin (write) |
| POST | /api/integrations/soumis/sync | HOD, Owner, Super Admin |

## Safety controls

- Mode gate - live calls impossible without SOUMIS_BASE_URL + SOUMIS_API_KEY.
- Idempotency key on every attendance write, preventing duplicate submissions.
- RBAC - only Faculty/Admin can trigger a write; students are read-only.
- Timeouts - requests abort after SOUMIS_TIMEOUT_MS so the portal never hangs.
- Graceful degradation - a 503 with a clear "action required" message.
- No credential capture - the system never asks users for their SOU MIS password.

## Enabling live mode (after IT approval)

SOUMIS_MODE=live
SOUMIS_BASE_URL=https://<official-api-host-provided-by-IT>
SOUMIS_API_KEY=<service-credential-issued-by-IT>
SOUMIS_TIMEOUT_MS=10000

Restart the backend. GET /api/integrations/soumis/status should report live: true.
No application code changes are required.

## Direct portal access (implemented today)

Every portal links out to the official systems, so users reach authoritative data
through the university's own authenticated session:

- All roles -> SOU MIS Account - https://account.soumis.in/
- Faculty -> Attendance Portal - https://curriculum.soumis.in/PostAttendance/Index

## Viva talking point

"Our help desk is designed to sit alongside the university's official MIS rather than
duplicate it. We implemented the full integration layer - data contracts, RBAC,
idempotent writes, timeouts and a scheduled sync - and it runs against a mock provider
today. We deliberately did not connect to the production MIS without IT authorisation,
because that system holds live academic records. Switching to live data is a
four-line environment change once access is granted."
