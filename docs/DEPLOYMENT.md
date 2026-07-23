# Deployment Guide

## Local (Docker Compose)
```bash
cp .env.example .env
docker compose up --build
```
Services: `db` (Postgres 16), `backend` (5001), `frontend` (3000). The backend container runs
`prisma migrate deploy && seed` on boot.

## Production on AWS
1. **RDS** — provision PostgreSQL (Multi-AZ). Put the endpoint in `DATABASE_URL`.
2. **EC2** — two instances (or ECS/Fargate) behind an **Application Load Balancer**; frontend + backend containers from the provided Dockerfiles.
3. **S3** — buckets for fee receipts, notes, salary slips; presigned URLs from the API.
4. **SES** — verify `SES_FROM_EMAIL`; move out of sandbox for production email.
5. **Cognito** — optional federated identity / MFA in front of the JWT layer.
6. **IAM** — least-privilege roles for EC2 → RDS/S3/SES.
7. **CloudWatch** — ship logs & metrics; alarms on SLA breaches and 5xx rates.
8. **CloudFront** — CDN in front of the frontend.
9. **Bedrock** *(future)* — swap OpenAI for managed foundation models.

## CI/CD (suggested GitHub Actions)
`lint → typecheck → test → docker build → push ECR → deploy ECS`.

## Environment Variables
See [`.env.example`](../.env.example). Never commit real secrets; use AWS Secrets Manager / SSM Parameter Store.

## Migrations
```bash
npm run db:migrate      # dev
npx prisma migrate deploy   # prod
```
