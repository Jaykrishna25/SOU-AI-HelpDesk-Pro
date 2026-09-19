# Testing - SOU AI HelpDesk Pro

## Automated tests

Framework: Vitest. Run with `npm test` from `frontend/`.
Current state: **125 tests across 9 files, all passing.**

| File | Tests | Covers |
|---|---|---|
| `auth.test.ts` | 6 | Password hashing and policy |
| `policy.test.ts` | 12 | Capability matrix, separation of duties, finance capabilities |
| `validate.test.ts` | 11 | Zod schemas |
| `crypto.test.ts` | 4 | AES-256-GCM field encryption |
| `ai.test.ts` | 7 | Retrieval, chunking, language handling |
| `speech.test.ts` | 6 | Language detection by script |
| `finance.test.ts` | 11 | Fee arithmetic and statement parsing |
| `fun.test.ts` | 30 | Access window, puzzle validity, score forgery, ladder ranking |
| `ai-guard.test.ts` | 38 | What the assistant refuses to answer |

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

### tests/policy.test.ts (12)

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

| every role can read their own fees | finance.viewOwn is universal |
| institutional finance is denied to STUDENT and FACULTY | The fee agent's role gating holds |
| institutional finance granted to ADMIN, HOD, HOI, OWNER, SUPER_ADMIN | The intended set, no wider |
| an unknown role gets own-fee access only | A typo cannot grant institutional finance |

The `rolesWith` case is a regression guard: if anyone widens the approval set
later, this test fails and the separation of duties is protected.

The four finance cases guard the fee assistant's central claim. Its tools are
bound from this matrix, so if a student ever gained `finance.viewInstitutional`
their agent would silently be handed the institutional tool. That now fails the
test suite instead of failing quietly in production.

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

### tests/ai.test.ts (7)

Covers chunking boundaries, cosine similarity, the cross-lingual search-query
path, and the confidence floor below which retrieval is not trusted.

### tests/speech.test.ts (6)

Covers Unicode-block language detection for English, Hindi and Gujarati,
including mixed-script input and the fallback when no script matches.

### tests/finance.test.ts (11)

| Test | Proves |
|---|---|
| computes outstanding, totals and percentage paid | Core arithmetic is correct |
| flags an unpaid row past its due date, with the day count | Overdue detection and day arithmetic |
| does not call a fully paid row overdue | A passed date alone is not overdue |
| never reports a negative balance when overpaid | Outstanding floors at zero |
| treats unreadable amounts as zero, not NaN | One bad cell cannot poison every total |
| identifies the next payment due | Correct ordering by due date |
| reads a well-formed statement | Happy path |
| matches column names loosely, strips currency formatting | Real statements vary in wording |
| counts unreadable rows instead of guessing | Partial parses are visible, not silent |
| returns nothing when required columns are absent | Fails closed rather than inventing rows |
| labels the source in rendered output | The model cannot confuse uploaded with portal data |

### tests/ai-guard.test.ts (38)

| Group | Cases | Proves |
|---|---|---|
| Personal record questions are refused | 18 | "my marks", "my results", "my CGPA", "how many backlogs do I have", and the same questions in Devanagari and Gujarati |
| Policy questions are still answered | 10 | "what is the attendance requirement?" is not refused — the pronoun is what makes a question personal, not the noun |
| Complaints are routed to a person | 7 | An error, a dispute or a ragging report reaches a human rather than an answer |
| Ordering, messages, empty input | 3 | A question that is both personal and a complaint refuses as personal |

This file was written for verification check 7 and immediately paid for itself.
It caught three real bugs, two of them in the code it was written to test:

1. The gate was **duplicated** across the corner bubble and the full-page
   assistant, and the copies disagreed. `"what are my results?"` was refused by
   one and answered by the other — `\bresult\b` does not match `results`.
2. `\bमेरी\b` can never match. JavaScript's `\b` is defined over
   `[A-Za-z0-9_]`, so in a portal advertised as multilingual, every Hindi and
   Gujarati question about a student's own record went straight through.
3. The broadened pattern then refused `"how do I apply for a scholarship?"`,
   which is a process question with a documented answer.

Full write-up in `docs/QA_REPORT.md`, finding 12.

The eighth of the finance cases caught a live bug: the parser split on every candidate
delimiter at once, so `"1,50,000"` in a semicolon-separated file was read as
`1`. A student would have been told they owed one rupee. Fixed by detecting one
delimiter per file and respecting quoted fields.

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
