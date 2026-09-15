# SOU AI HelpDesk Pro - Implementation Plan

## Scope note
This platform supports IQAC evidence collection and reporting. It does **not**
calculate, predict or guarantee any accreditation outcome. Criteria, indicators,
metrics, weightages, academic years and report templates are configurable data,
never hard-coded, because accreditation frameworks change.

## Stack (verified)
- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind 3
- Prisma 5.22 + PostgreSQL (Neon serverless)
- JWT auth, Bearer token, deployed on Vercel
- Catch-all API routes: /api/[...path], /api/gr, /api/qr, /api/inst, /api/insights, /api/exam, /api/reports

## Module status
| Module | State |
|---|---|
| auth | exists - hardening required (see Phase 0b) |
| users | exists |
| roles-permissions | scattered - centralising in lib/policy.ts |
| iqac | not started |
| naac-evidence | not started |
| academic-outcomes | partial (Subject, Result, Exam) |
| research | not started |
| infrastructure | partial (Resource, Booking) |
| student-support | partial (Ticket, Grievance) |
| governance | not started |
| sustainability | partial (derived from bookings) |
| feedback | complete |
| reports | partial - no evidence linkage |
| notifications | partial |
| ai-assistant | keyword matcher, not RAG |
| audit-logs | model exists, not yet written to |

## Open decisions
1. Object storage provider for evidence files (Vercel Blob / S3 / Cloudinary)
2. Test framework adoption (Vitest + Playwright)
3. Whether institution SSO is available from SOU IT

## Phase order
0a docs + policy module + audit logging
0b auth hardening
0c honest metrics
1  IQAC evidence vault
2  outcome-based education
3  research and extension
4  infrastructure and sustainability
5  student support and progression
6  governance and compliance
7  institutional values
8  AI, RAG and notifications
