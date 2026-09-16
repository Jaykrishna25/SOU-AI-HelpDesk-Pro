# Testing - SOU AI HelpDesk Pro

## Automated tests

Framework: Vitest. Run with `npm test` from `frontend/`.
Current state: **29 tests across 4 files, all passing.**

### tests/auth.test.ts (6)

| Test | Proves |
|---|---|
| produces a bcrypt hash that is not the plaintext | Passwords are hashed, not stored |
| verifies the right password and rejects the wrong one | Comparison is correct in both directions |
| produces a different hash each time | Salting works; identical passwords differ at rest |
| rejects short, weak and date-shaped passwords | Policy blocks `2007-05-14` and `20070514` |
| rejects a password containing the login ID | Blocks `SOU2023CSE69x` |
| accepts a reasonable password | Policy is not so strict it blocks valid input |

These exist because a bcryptjs v3 import change silently broke every password
operation in production and took three debugging rounds to find.

### tests/policy.test.ts (8)

| Test | Proves |
|---|---|
| separates verification from approval | ADMIN can verify, cannot approve |
| keeps students out of privileged actions | STUDENT denied approve, role.assign, audit.view |
| restricts grievance identity to the Owner | HOD can handle a case but not see who filed it |
| denies everything to an absent session | No session means no capability |
| treats an unknown role as a student | A typo in a role string fails closed, not open |
| public visible, confidential not | Visibility tiers enforced |
| counselling and ICC restricted to Owner | Sensitive domains isolated |
| rolesWith returns the expected sets | ADMIN and FACULTY absent from approval |

The last one is a regression guard: if anyone widens the approval set later,
this test fails and the separation of duties is protected.

### tests/validate.test.ts (11)

| Test | Proves |
|---|---|
| accepts a well-formed evidence record | Schema does not block valid input |
| rejects a future evidence date | Cannot back-date or forward-date evidence |
| rejects a two-character title | Minimum descriptiveness |
| rejects URL evidence with no URL | Type and payload must agree |
| rejects an unknown visibility level | Enum is closed |
| signup never accepts a role from the client | The OWNER-signup vulnerability cannot return |
| rejects a malformed email | Basic format enforcement |
| grievance requires a substantive body | Blocks empty complaints |
| accepts a valid booking slot | Schema does not block valid input |
| rejects an end time before the start | Temporal sanity |
| rejects a 25th hour | Range enforcement |

### tests/crypto.test.ts (4)

| Test | Proves |
|---|---|
| round-trips a value | Encryption and decryption agree |
| produces different ciphertext each time | Random IV per record |
| returns null for tampered ciphertext | GCM auth tag detects modification |
| passes through legacy plaintext unchanged | Backfill can run safely on mixed data |

## Manual verification performed on the deployed system

| ID | Scenario | Expected | Result |
|---|---|---|---|
| M-01 | Sign in with date of birth, no password | Forced to "Choose a password" | Pass |
| M-02 | Set password containing login ID | Rejected | Pass |
| M-03 | Set password as a date | Rejected | Pass |
| M-04 | Sign in with new password | Reaches dashboard | Pass |
| M-05 | Sign in with old date of birth | Rejected | Pass |
| M-06 | Sign up selecting OWNER | Account created as STUDENT | Pass |
| M-07 | Book a room as student | Status PENDING | Pass |
| M-08 | Book the same slot again | Refused with conflict code | Pass |
| M-09 | Approve booking as ADMIN | Status APPROVED | Pass |
| M-10 | Upload evidence document | Stored, listed | Pass |
| M-11 | Upload the same file again | Refused, duplicate checksum | Pass |
| M-12 | Approve evidence before verifying | Refused | Pass |
| M-13 | Approve as ADMIN after verifying | Refused - IQAC only | Pass |
| M-14 | Approve as OWNER after verifying | Approved | Pass |
| M-15 | Open evidence document | Streams after permission check | Pass |
| M-16 | Generate report draft | 1 evidenced, 42 gaps listed | Pass |
| M-17 | Export report before IQAC approval | Refused | Pass |
| M-18 | Export after approval | CSV downloaded | Pass |
| M-19 | File grievance, inspect database | identityRef reads `enc:v1:...` | Pass |
| M-20 | View grievance queue as Owner | Identity decrypts correctly | Pass |
| M-21 | Run data-quality scan twice | Count stays 42, does not accumulate | Pass |

## Not tested

- No integration tests against a live database
- No end-to-end browser tests (Playwright specified but not adopted)
- No load or performance testing
- Restore procedure documented but never rehearsed
- Accessibility not audited

## How to run

    cd frontend
    npm test           # once
    npm run test:watch # during development
    npx tsc --noEmit   # type check
    npm run build      # full build, fails on type errors
