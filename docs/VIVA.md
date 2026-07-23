# Viva Questions & Answers

**Q1. What problem does SOU AI HelpDesk Pro solve?**
Universities juggle scattered ERP, SIS and support systems. Students wait days for simple answers.
Our platform unifies ERP + SIS with a multi-agent AI help desk that answers instantly when confident
and auto-creates SLA-tracked tickets when not — reducing staff load and response time.

**Q2. Explain the multi-agent architecture.**
Twelve single-responsibility agents run as a pipeline: Intent → Entity → Knowledge Retrieval → RAG →
Sentiment → Decision → Ticket → Faculty Routing → Email → Learning → Analytics → Notification
Orchestration. Each enriches a shared context object; the Decision Agent applies the 90% confidence gate.

**Q3. What is RAG and how is it used?**
Retrieval-Augmented Generation grounds the LLM in university data. We embed the query, run semantic
search over the KnowledgeBase (circulars, policies, FAQs), and generate an answer from the top documents.
The top similarity score drives the confidence value.

**Q4. Why a 90% confidence threshold?**
It balances automation with accuracy. Above 90% the answer is reliable enough to send directly; below it,
a human is brought in via a ticket, preserving trust and enabling human oversight (responsible AI).

**Q5. How does authentication work?**
Users log in with an ID + birthdate. The server issues a short-lived JWT access token and a long-lived
refresh token (stored + revocable). RBAC middleware authorizes each route by role. All logins are audited.

**Q6. How is the SLA enforced?**
Every ticket gets `slaDueAt = now + 48h`. A background sweep marks overdue tickets as breached,
auto-escalates them, generates an escalation letter (email via SES) and notifies the student and HOD/Owner.

**Q7. Who gets notified on a ticket?**
Watchers are auto-added: creator, admin, HOD, owner (plus commenters). Events (created, assigned,
escalated, comment, resolved, closed, reopened, SLA warning) fan out to In-App + Email channels.

**Q8. What NLP techniques are implemented?**
Tokenization, stopword removal, lemmatization, keyword-scored intent recognition (15+ intents) and
entity extraction (name, department, semester, subject, date). In production these delegate to OpenAI + LangChain.

**Q9. Which innovation features stand out?**
Sentiment-driven AI prioritization, smart escalation prediction, revenue/admission forecasting,
knowledge auto-learning, faculty recommendation/routing, and planned multilingual + voice assistant.

**Q10. How is it deployed & scaled?**
Dockerized services on AWS EC2/ECS behind an ALB, RDS Multi-AZ, S3 for files, SES for email,
CloudWatch for observability, IAM least-privilege. Stateless API scales horizontally.

**Q11. How did you ensure security & ethics?**
JWT + refresh, RBAC, Helmet, rate limiting, audit logs, encryption in transit, GDPR-aligned consent,
bias reduction and mandatory human oversight on low-confidence answers.

**Q12. What are the database design choices?**
A normalized Prisma schema with 25+ models, enums for statuses, cascade deletes on dependent records,
indexed attendance lookups, and a KnowledgeBase table with an embedding vector (pgvector in production).
