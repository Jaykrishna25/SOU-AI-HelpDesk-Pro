# 🎓 SOU AI HelpDesk Pro

> ### 🏆 Hackathon submission — Track 3, Education
>
> ## → **[https://sou-ai-help-desk-pro-frontend.vercel.app](https://sou-ai-help-desk-pro-frontend.vercel.app)**
>
> A live, deployed university help desk serving 7 roles, backed by 50 database
> models, with an AI assistant that **refuses rather than guesses**. Not a
> prototype — it goes in front of our Head of Institute.
>
> **The one thing to try.** Sign in as a student and ask the fee assistant
> *"what will be my penalty?"* It gives the exact overdue figure — because a
> tool computed it — then says the policy documents do not state the penalty
> rate and sends you to the Accounts Office. It had every opportunity to invent
> a percentage.
>
> **The idea underneath it.** Most systems restrict an assistant by *telling*
> it what to avoid. That is a request, and requests can be argued with. Here a
> tool the caller is not entitled to is **never bound to the agent**, so no
> phrasing reaches it — see [`frontend/lib/policy.ts`](./frontend/lib/policy.ts).
>
> | | |
> |---|---|
> | Live portal | [sou-ai-help-desk-pro-frontend.vercel.app](https://sou-ai-help-desk-pro-frontend.vercel.app) |
> | Role map | [/role-map.html](https://sou-ai-help-desk-pro-frontend.vercel.app/role-map.html) |
> | Tests | 183 across 12 files · `cd frontend && npx vitest run` |
> | QA report | [`docs/QA_REPORT.md`](./docs/QA_REPORT.md) — 12 findings with severities |
> | Verification | [`docs/VERIFICATION_CHECKLIST.md`](./docs/VERIFICATION_CHECKLIST.md) — 10 checks, all passing |
>
> **Also in this repository:** [`ai-agent/`](./ai-agent) — the same AI layer
> rebuilt in Python as a Streamlit app, running the classic RAG pipeline
> end to end: LangChain loaders, HuggingFace embeddings, Chroma, `@tool`,
> `create_agent`, ChatOllama. `agent_core/policy.py` mirrors
> `frontend/lib/policy.ts`, so the role-gating idea is demonstrable in both
> stacks. Run it with `cd ai-agent && streamlit run app.py`.

### Enterprise AI-Powered University ERP · Multi-Agent Help Desk · Management System
**Silver Oak University** · Cloud-Native SaaS Platform

![status](https://img.shields.io/badge/status-production--ready-6d28d9)
![stack](https://img.shields.io/badge/Next.js-15-black) ![node](https://img.shields.io/badge/Node-20-green) ![db](https://img.shields.io/badge/PostgreSQL-16-blue) ![orm](https://img.shields.io/badge/Prisma-5-white)

A unified platform combining a **University ERP + Student Information System** with a
**multi-agent AI Help Desk**, **RAG knowledge engine**, **ticketing + SLA automation**,
**real-time notifications**, and **analytics** — designed to resemble enterprise products such as
Oracle PeopleSoft Campus Solutions, ServiceNow, Jira Service Management and Salesforce Service Cloud.

---

## ✨ Highlights

- **12-agent AI pipeline** (LangChain-style) — intent → entities → RAG → decision → ticket → routing → notify.
- **Confidence-gated help desk** — ≥ 90% answers instantly; below that a ticket is auto-created.
- **7 role-based portals** — Student, Admin, Faculty, HOD, HOI, Owner, Super Admin.
- **48h SLA** with auto-escalation letters and watcher notifications (In-App + AWS SES).
- **RAG knowledge base** with semantic search and auto-learning.
- **Animated premium UI** — Next.js 15 + React 19 + Framer Motion + GSAP + Three.js + Recharts, dark/light mode & glassmorphism.
- **Cloud-native & Dockerized** — EC2, RDS, S3, SES, Cognito, IAM, CloudWatch.

---

## 🧱 Monorepo Structure

```
sou-ai-helpdesk-pro/
├── prisma/schema.prisma        # Full ERD (25+ models)
├── backend/                    # Express + TypeScript API
│   └── src/
│       ├── ai/                 # NLP, RAG, 12 agents
│       ├── routes/             # auth, ai, tickets, analytics, data
│       ├── services/           # ticket workflow, SLA, notifications
│       ├── middleware/         # JWT auth, RBAC, error handling
│       └── seed.ts             # demo users + academic + ticket data
├── frontend/                   # Next.js 15 animated app
│   ├── app/                    # landing, login, 5 role dashboards
│   └── components/             # Three.js bg, chatbot, charts, shell
├── docs/                       # architecture, ERD, API, viva, report, slides…
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Option A — Docker (recommended)
```bash
cp .env.example .env
docker compose up --build
# frontend → http://localhost:3000
# backend  → http://localhost:5001/api/health
```

### Option B — Local dev
```bash
# 1. Install
npm install
npm --workspace backend install
npm --workspace frontend install

# 2. Database
cp .env.example .env            # set DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed

# 3. Run both apps
npm run dev
```

---

## 🔐 Demo Logins  (login = **ID + Birthdate**)

| Role | Login ID | Birthdate |
|------|----------|-----------|
| Student | `SOU2023CSE001` | `2005-06-15` |
| Admin | `ADM001` | `1990-11-02` |
| Faculty | `FAC001` | `1985-07-19` |
| HOD | `HOD001` | `1980-03-15` |
| HOI | `HOI001` | `1975-08-20` |
| Owner | `OWN001` | `1970-05-12` |
| Super Admin | `SUP001` | `1988-09-09` |

> The login screen also has one-click demo buttons. If the backend isn't running, the frontend falls into demo mode so every portal is still explorable.

---

## 🧠 How the AI Help Desk Works

```
Student query
   → Intent Recognition Agent      (15+ intents)
   → Entity Extraction Agent       (name, dept, semester, subject, date)
   → Knowledge Retrieval + RAG     (semantic search over KB)
   → Sentiment Agent               (priority signal)
   → Decision Agent                (confidence ≥ 90%?)
        ├─ YES → answer directly
        └─ NO  → Ticket Agent → Faculty Routing → Email/Notification
   → Learning & Analytics Agents   (KB auto-update + metrics)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full diagrams.

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System, multi-agent, AWS & sequence diagrams |
| [ERD.md](docs/ERD.md) | Entity-Relationship diagram |
| [API.md](docs/API.md) | REST API reference (Swagger-style) |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | AWS + Docker deployment guide |
| [PROJECT_REPORT.md](docs/PROJECT_REPORT.md) | Academic project report |
| [PRESENTATION.md](docs/PRESENTATION.md) | 18-slide deck content |
| [VIVA.md](docs/VIVA.md) | Viva questions & answers |
| [USER_MANUAL.md](docs/USER_MANUAL.md) / [ADMIN_MANUAL.md](docs/ADMIN_MANUAL.md) | End-user guides |
| [TESTING.md](docs/TESTING.md) | Test strategy & cases |
| [FUTURE_SCOPE.md](docs/FUTURE_SCOPE.md) | Roadmap |

---

## 🛡️ Security & Responsible AI
JWT + refresh tokens · RBAC · audit logs · rate limiting · Helmet · encryption in transit ·
human oversight on low-confidence answers · bias reduction · GDPR-aligned consent & data-privacy design.

---

## 🧰 Tech Stack
**Frontend:** Next.js 15, React 19, TypeScript, Tailwind, ShadCN-style UI, Framer Motion, GSAP, Three.js, Recharts
**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
**AI:** OpenAI GPT, LangChain, RAG, embeddings, semantic search, 12-agent architecture
**Cloud:** AWS EC2/RDS/S3/SES/Cognito/IAM/CloudWatch (Bedrock — future), Docker, CI/CD-ready

---
© 2026 Silver Oak University · SOU AI HelpDesk Pro
