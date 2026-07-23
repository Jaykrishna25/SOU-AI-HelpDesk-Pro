# Testing Documentation

## Strategy
- **Unit** — NLP (intent/entity), RAG (cosine, confidence), agents, JWT utils. (Vitest)
- **Integration** — auth flow, /ai/ask decision branches, ticket workflow + SLA sweep. (Supertest)
- **E2E** — login → dashboard → ask AI → ticket lifecycle. (Playwright, suggested)
- **Manual/UAT** — per-role portal walkthroughs.

## Sample Unit Cases
| ID | Input | Expected |
|----|-------|----------|
| NLP-01 | "When do sem 7 exams begin?" | intent = EXAMS, semester = 7 |
| NLP-02 | "fee payment last date" | intent = FEES |
| RAG-01 | exam query vs KB | top doc = "Semester 7 Examination Schedule", conf ≥ 0.9 |
| DEC-01 | conf 0.94 | decision = ANSWER |
| DEC-02 | conf 0.60 | decision = TICKET |
| SLA-01 | ticket older than 48h | slaBreached = true, status = ESCALATED |

## Sample Integration Cases
| ID | Scenario | Expected |
|----|----------|----------|
| AUTH-01 | valid id+birthdate | 200 + tokens |
| AUTH-02 | wrong birthdate | 401 |
| RBAC-01 | student hits /tickets/:id/assign | 403 |
| TKT-01 | low-confidence /ai/ask | ticket created + watchers added |

## Running
```bash
npm --workspace backend run test
```
