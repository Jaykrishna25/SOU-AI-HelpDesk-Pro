# 🚀 Run & Deploy Guide — SOU AI HelpDesk Pro

Four ways to run this project, from easiest to production:
**A. Local dev** · **B. Docker (one command)** · **C. GitHub** · **D. Render** · **E. AWS**

---

## Prerequisites (install once)
- **Node.js 20+** and npm — https://nodejs.org
- **Git** — https://git-scm.com
- **Docker Desktop** (for the Docker / AWS paths) — https://docker.com
- **PostgreSQL 16** *(only for local path A if you don't use Docker)*

Check:
```bash
node -v      # v20+
npm -v
git --version
docker -v
```

---

## A. Run Locally (Node + Postgres)

```bash
# 1. Unzip and enter the project
cd sou-ai-helpdesk-pro

# 2. Create your env file
cp .env.example .env
#   -> edit DATABASE_URL to point at YOUR local Postgres, e.g.:
#   postgresql://postgres:password@localhost:5432/sou_helpdesk?schema=public

# 3. Install dependencies
npm install
npm --workspace backend install
npm --workspace frontend install

# 4. Create the database schema + demo data
npm --workspace backend run prisma:generate
npm --workspace backend exec prisma db push
npm --workspace backend run seed

# 5. Start BOTH apps together
npm run dev
```
Open:
- Frontend → http://localhost:3000
- Backend health → http://localhost:5001/api/health

**Demo login:** `SOU2023CSE001` / `2005-06-15` (or use the role buttons on the login page).

> No local Postgres? Jump to **B (Docker)** — it starts the database for you.

---

## B. Run with Docker (one command — recommended)

```bash
cd sou-ai-helpdesk-pro
cp .env.example .env          # optional; compose already has defaults
docker compose up --build
```
This starts three containers: **Postgres**, **backend** (auto-runs `prisma db push` + seed), **frontend**.

- Frontend → http://localhost:3000
- Backend → http://localhost:5001/api/health

Stop with `Ctrl+C`, then `docker compose down` (add `-v` to also wipe the DB volume).

---

## C. Push to GitHub

```bash
cd sou-ai-helpdesk-pro
git init
git add .
git commit -m "SOU AI HelpDesk Pro - initial commit"

# create an EMPTY repo on github.com first (no README), then:
git branch -M main
git remote add origin https://github.com/<your-username>/sou-ai-helpdesk-pro.git
git push -u origin main
```
`.gitignore` already excludes `node_modules`, `.env`, `dist`, `.next` — **never commit real secrets.**

> If GitHub asks for a password, use a **Personal Access Token** (GitHub → Settings → Developer settings → Tokens) or `gh auth login` with the GitHub CLI.

---

## D. Deploy on Render (free, easiest cloud)

Render hosts the **backend**, **frontend**, and a **managed Postgres** — all from your GitHub repo.

### Option 1 — Blueprint (automated, uses `render.yaml`)
1. Push to GitHub (step C).
2. Go to https://dashboard.render.com → **New → Blueprint**.
3. Connect your repo. Render reads `render.yaml` and creates the DB + both services.
4. After first deploy, set the two "sync: false" env vars:
   - **sou-backend** → `CORS_ORIGIN` = your frontend URL (e.g. `https://sou-frontend.onrender.com`)
   - **sou-frontend** → `NEXT_PUBLIC_API_URL` = `https://sou-backend.onrender.com/api`
5. Click **Manual Deploy → Clear build cache & deploy** on the frontend (so the API URL is baked in).

### Option 2 — Manual (click-through)
1. **Database:** New → PostgreSQL → copy the **Internal Connection String**.
2. **Backend:** New → Web Service → pick repo → **Root Directory:** `backend`
   - Build: `npm install && npx prisma generate && npm run build && npx prisma db push --accept-data-loss && npm run seed`
   - Start: `node dist/index.js`
   - Env vars: `DATABASE_URL` (from step 1), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT=5001`, `CORS_ORIGIN`.
3. **Frontend:** New → Web Service → same repo → **Root Directory:** `frontend`
   - Build: `npm install && npm run build`  ·  Start: `npm start`
   - Env var: `NEXT_PUBLIC_API_URL = https://<your-backend>.onrender.com/api`

> Free Render services sleep when idle and cold-start in ~30s — fine for demos/viva.

---

## E. Deploy on AWS

### E1. Quick: Docker on a single EC2 instance
1. **Launch EC2** (Ubuntu 22.04, t3.small+). Security group: open ports **22, 80, 3000, 5001**.
2. **SSH in** and install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
   sudo usermod -aG docker $USER && newgrp docker
   ```
3. **Clone & run:**
   ```bash
   git clone https://github.com/<you>/sou-ai-helpdesk-pro.git
   cd sou-ai-helpdesk-pro
   docker compose up --build -d
   ```
4. Visit `http://<EC2-public-IP>:3000`.
   *(For a real domain + HTTPS, put Nginx or an ALB in front and use ACM certificates.)*

### E2. Production: managed services (recommended)
| Component | AWS Service | Notes |
|-----------|-------------|-------|
| Database | **RDS PostgreSQL** (Multi-AZ) | put its endpoint in `DATABASE_URL` |
| Backend + Frontend | **ECS Fargate** (or EC2) | build the two Dockerfiles, push to **ECR** |
| Load balancing / HTTPS | **ALB + ACM** | routes `/api` → backend, `/` → frontend |
| File storage | **S3** | receipts, notes, salary slips (presigned URLs) |
| Email | **SES** | verify `SES_FROM_EMAIL`, exit sandbox for prod |
| Auth (optional) | **Cognito** | MFA / federated login in front of JWT |
| Secrets | **Secrets Manager / SSM** | store JWT + DB creds, inject as env |
| Logs & alarms | **CloudWatch** | 5xx + SLA-breach alarms |
| CDN | **CloudFront** | in front of the frontend |

**ECR + ECS outline:**
```bash
# build & push images
aws ecr create-repository --repository-name sou-backend
aws ecr create-repository --repository-name sou-frontend
docker build -t sou-backend ./backend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api -t sou-frontend ./frontend
# tag + docker push to the ECR URIs, then create an ECS service/task for each,
# with RDS DATABASE_URL and secrets wired via the task definition.
```
Run migrations once against RDS: `DATABASE_URL=<rds-url> npx prisma db push` (from `backend/`).

---

## Environment Variables Reference
| Variable | Where | Example |
|----------|-------|---------|
| `DATABASE_URL` | backend | `postgresql://user:pass@host:5432/sou_helpdesk?schema=public` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | backend | long random strings |
| `PORT` | backend | `5001` |
| `CORS_ORIGIN` | backend | your frontend URL |
| `ADMIN_RESPONSE_SLA_HOURS` | backend | `48` |
| `OPENAI_API_KEY` | backend (optional) | enables live LLM instead of offline fallback |
| `NEXT_PUBLIC_API_URL` | frontend (**build-time**) | `https://<backend>/api` |

---

## Troubleshooting
- **Frontend can't reach API** → `NEXT_PUBLIC_API_URL` must be set **at build time**, then rebuild the frontend. Also check backend `CORS_ORIGIN`.
- **Prisma "Environment variable not found: DATABASE_URL"** → ensure `.env` exists in `backend/` (local) or the env var is set (cloud).
- **`prisma db push` vs migrations** → `db push` is used here for quick setup. For versioned production changes use `npx prisma migrate dev` / `migrate deploy`.
- **Port already in use** → change `PORT` (backend) or the `3000`/`5001` mappings in `docker-compose.yml`.
- **npm registry blocked / 403** → run installs on a network with public npm access (Render, EC2 and normal machines are fine).
