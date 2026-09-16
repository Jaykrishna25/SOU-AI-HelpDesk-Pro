# Backup and Restore

## What must be recoverable

| Asset | Where it lives | Loss impact |
|---|---|---|
| PostgreSQL database | Neon (us-east-1), provisioned via the Vercel integration | Total data loss |
| `GRIEVANCE_KEY` | Vercel environment variables (Secret) | **Encrypted grievance identities become permanently unreadable** |
| `JWT_SECRET` | Vercel environment variables (Secret) | All sessions invalid; users must sign in again (recoverable) |
| `BLOB_READ_WRITE_TOKEN` | Vercel environment variables | Evidence documents unreachable until reissued |
| Evidence documents | Vercel Blob store `sou-evidence` (private) | Loss of accreditation evidence files |
| Source code | GitHub: Jaykrishna25/SOU-AI-HelpDesk-Pro | Recoverable from any clone |

## Critical warning

`GRIEVANCE_KEY` is the only way to read encrypted grievance identities. It is not
stored anywhere else and cannot be derived. **Keep a copy outside Vercel** - an
offline password manager entry is sufficient. Losing it destroys that data
irreversibly, by design.

## Database backup

Neon retains point-in-time history on the branch (see Neon console ->
Backup & Restore). For an independent copy, export with pg_dump:

    pg_dump "$DATABASE_URL" --no-owner --no-acl -Fc -f sou-backup-YYYY-MM-DD.dump

Restore into an empty database:

    pg_restore --no-owner --no-acl -d "$TARGET_DATABASE_URL" sou-backup-YYYY-MM-DD.dump

Recommended cadence while the system is in use: weekly, plus before any
`prisma db push` or seed run.

## Schema recovery

The schema is source-controlled at `frontend/prisma/schema.prisma`. To rebuild
an empty database:

    cd frontend
    npx prisma db push
    node prisma/seed-resources.js
    node prisma/seed-iqac.js --fresh

`seed-term.js --fresh` adds fictional demonstration data. Do not run it against
a database holding real institutional records - it deletes feature tables first.

## Evidence documents

Vercel Blob has no bulk export. Document URLs and SHA-256 checksums are stored in
`EvidenceDocument`, so a database backup preserves the index and integrity proof
even if the files are lost. For a genuine file backup, iterate `EvidenceDocument`
and download each `blobPathname` through the authenticated
`/api/iqac/evidence/file` endpoint.

## Restore drill (untested)

This procedure has NOT been rehearsed. Before relying on it, restore into a
scratch Neon branch and confirm:
  1. The app starts against the restored database
  2. A known grievance still decrypts with the stored GRIEVANCE_KEY
  3. Evidence documents still open
An untested backup is an assumption, not a backup.

## Known gaps
- No automated backup schedule
- No offsite copy of the Blob store
- Restore procedure never exercised
- No documented RTO or RPO
