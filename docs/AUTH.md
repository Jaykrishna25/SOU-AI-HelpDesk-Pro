# Authentication and password reset

This document covers how someone proves who they are in this portal, and —
more usefully for anyone reviewing it — where that proof is weaker than it
looks.

## Signing in

Three routes, all landing on the same session token:

| Route | What it proves | Where |
|---|---|---|
| Login ID + password | Knowledge of a bcrypt-verified secret | `POST /api/auth/login` |
| Login ID + date of birth | First sign-in only, before a password exists | same endpoint |
| Passkey (fingerprint / face) | Possession of a registered device | `POST /api/webauthn/login/*` |

A session token is a JWT with an 8-hour TTL carrying `userId`, `role`,
`loginId`, `fullName`, `tv` (token version) and `mcp` (must change password).
`getLiveSession` re-reads the account on every protected request and rejects
the token when `tv` no longer matches `user.tokenVersion` — so bumping that
column signs every device out immediately.

## Forgot password

Two steps, both under `/api/auth`:

1. **`POST /auth/forgot-password`** — `{ loginId, email, birthdate }`.
   All three must match the account. On success it returns a **reset token**
   valid for 15 minutes, plus the registered email masked (`a*****@…`) so the
   right person can confirm which mailbox is on file.

2. **`POST /auth/reset-password`** — `{ resetToken, newPassword }`.
   Sets the new hash, clears any lockout, and increments `tokenVersion`.

### Design notes

**Reset tokens are not session tokens.** They are signed with the same secret,
so without a guard one could be presented in an `Authorization` header. The
reset token carries `purpose: "reset"` and no role, and `verifyToken` rejects
any token with a `purpose` claim or a missing role — see the comment in
`lib/server-auth.ts`. A token minted for one purpose must never work for
another.

**Single use, without a table.** The reset token is bound to the account's
`tokenVersion` at the moment it was issued. Completing the reset increments
that version, which retires the token that was just used along with every
signed-in device. No `password_reset_tokens` table to create, index, expire
or leak.

**The failure message never discriminates.** A wrong login ID, a wrong email
and a wrong date all return the same sentence. Telling the truth about which
field was wrong turns this endpoint into a way to confirm that a given
enrollment number exists and then guess the rest one field at a time.

**It shares the login lockout.** Failed verification calls `noteFailedLogin`,
so five wrong attempts lock the account for 15 minutes exactly as failed
sign-ins do. A reset form sitting outside the rate limiter is the softest way
into an account.

**Three audit actions, not one.** `PASSWORD_RESET_REQUESTED`,
`PASSWORD_RESET_DENIED` and `PASSWORD_RESET`. Only logging the successful
reset hides the interesting pattern: a run of `DENIED` against one login ID
with no `REQUESTED` after it is somebody probing.

### The known limitation

**Identity is verified in-session, not by email.** Anyone holding all three
facts — login ID, registered email address and date of birth — can reset the
password without access to the mailbox. For a student, a classmate could
plausibly know all three.

This is a deliberate trade for a deployment where outbound email is
configured client-side through EmailJS and may not be configured at all, and
it is written down here rather than left for someone to discover.

**The upgrade,** when a server-side mail path exists: have
`/auth/forgot-password` mail the reset token as a link instead of returning
it in the response body, and always answer with the same "if that account
exists, we have sent a link" regardless of whether it matched. The token is
already shaped for that — short-lived, single-use, bound to `tokenVersion`,
and carrying nothing but a user id — so the change is to where it is
delivered, not to what it is.

Until then the lockout and the non-discriminating error are what stand
between this endpoint and a guessing attack, and both are load-bearing.

**An account with no email on file cannot self-reset.** `User.email` is
nullable, and an account without one fails verification like any other
mismatch — it does not fall back to login ID plus date of birth, which would
be the first-sign-in credential doing double duty as a recovery credential.
Those accounts need an administrator. The seed data sets an email on every
account, so this affects only records created by other means.

## Password policy

`passwordProblem` in `lib/server-auth.ts`: at least 10 characters, one
uppercase, one lowercase, one digit, must not contain the login ID, and must
not be a bare date — the last rule exists because the first-sign-in
credential *is* a date, and without it students would "change" their password
to the same date they just used.
