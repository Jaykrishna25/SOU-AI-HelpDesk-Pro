# API Reference — SOU AI HelpDesk Pro
Base URL: `http://localhost:5001/api` · Auth: `Authorization: Bearer <accessToken>`

## Auth
### POST /auth/login
```json
{ "loginId": "SOU2023CSE001", "birthdate": "2005-06-15" }
```
→ `{ success, accessToken, refreshToken, user }`

### POST /auth/refresh
`{ "refreshToken": "..." }` → `{ accessToken }`

### POST /auth/logout
`{ "refreshToken": "..." }` → `{ success }`

## AI Help Desk
### POST /ai/ask  🔒
```json
{ "query": "When will Semester 7 examinations begin?" }
```
→
```json
{
  "success": true,
  "decision": "ANSWER",
  "answer": "Semester 7 examinations begin on 20 November 2026 …",
  "confidence": 0.94,
  "intent": "EXAMS",
  "entities": { "semester": 7 },
  "sentiment": "NEUTRAL",
  "routedTo": "Examination Cell",
  "ticket": null,
  "agentTrace": ["Intent=EXAMS (100%)", "..."]
}
```
When `confidence < 0.90`, `decision = "TICKET"` and a ticket object is returned.

## Tickets  🔒
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/tickets` | all | List (students see only their own) |
| GET | `/tickets/:id` | all | Detail + history + comments + watchers |
| POST | `/tickets/:id/assign` | Admin, HOD | `{ assigneeId }` |
| POST | `/tickets/:id/resolve` | Admin, Faculty, HOD | `{ note }` |
| POST | `/tickets/:id/escalate` | Admin, Faculty, HOD | — |
| POST | `/tickets/sla/sweep` | Owner, Super Admin | Breach + escalate overdue |

## Analytics  🔒
### GET /analytics/overview
→ KPIs: students, faculty, admins, tickets, resolutionRate, revenueCollected, aiAccuracy + ticketsByCategory.

## Data  🔒
| GET `/me` | current user + profile |
| GET `/notifications` | user notifications |
| GET `/knowledge-base` | KB documents |

## Health
`GET /health` → `{ status: "ok" }`

> A machine-readable OpenAPI 3.0 spec can be generated with `swagger-jsdoc`; route annotations follow this contract.
