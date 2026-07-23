# System Architecture — SOU AI HelpDesk Pro

## 1. High-Level System Architecture

```mermaid
flowchart TB
  subgraph Client["Client Layer"]
    W[Next.js 15 Web App<br/>Framer Motion · GSAP · Three.js]
  end
  subgraph Edge["API Gateway / Edge"]
    NG[Nginx / ALB]
  end
  subgraph App["Application Layer (Node.js + Express)"]
    AUTH[Auth Service<br/>JWT + Refresh + RBAC]
    TKT[Ticket Service<br/>Workflow + SLA]
    NOTIF[Notification Service<br/>In-App + SES]
    AI[AI Orchestrator<br/>12 Agents]
    ANALYTICS[Analytics Service]
  end
  subgraph AILayer["AI / RAG Layer"]
    NLP[NLP: intent · entities]
    RAG[RAG Pipeline]
    VEC[(Vector Store / pgvector)]
    LLM[OpenAI GPT via LangChain]
  end
  subgraph Data["Data Layer"]
    PG[(PostgreSQL / AWS RDS)]
    S3[(AWS S3<br/>files, receipts, notes)]
  end
  W --> NG --> AUTH & TKT & NOTIF & AI & ANALYTICS
  AI --> NLP --> RAG --> VEC
  RAG --> LLM
  AUTH & TKT & NOTIF & ANALYTICS --> PG
  TKT --> S3
  NOTIF --> SES[AWS SES]
```

## 2. Multi-Agent Architecture

```mermaid
flowchart LR
  Q[Student Query] --> A1[1. Intent Recognition]
  A1 --> A2[2. Entity Extraction]
  A2 --> A3[3. Knowledge Retrieval]
  A3 --> A4[4. RAG Agent]
  A4 --> A5[5. Sentiment]
  A5 --> A6{6. Decision<br/>conf ≥ 90%?}
  A6 -- Yes --> ANS[Direct Answer]
  A6 -- No --> A7[7. Ticket Agent]
  A7 --> A8[8. Faculty Routing]
  A8 --> A9[9. Email Agent]
  A9 --> A10[10. Learning Agent]
  A10 --> A11[11. Analytics Agent]
  A11 --> A12[12. Notification Orchestration]
  ANS --> A11
```

## 3. Ticket Workflow

```mermaid
flowchart TB
  S[Student] --> C[AI Chatbot]
  C --> CC{Confidence Check}
  CC -- High --> ANS[Answer + KB]
  CC -- Low --> T[Create Ticket]
  T --> AD[Assign Admin]
  AD --> F[Faculty]
  F --> H[HOD]
  H --> O[Owner]
  O --> R[Resolution]
  R --> KB[Knowledge Base Update]
  KB --> N[Student Notification]
```

## 4. Sequence Diagram — Ask AI / Auto-Ticket

```mermaid
sequenceDiagram
  participant U as Student
  participant FE as Next.js
  participant API as Express API
  participant AG as Agent Pipeline
  participant DB as PostgreSQL
  participant SES as AWS SES
  U->>FE: "When do Sem 7 exams begin?"
  FE->>API: POST /api/ai/ask (JWT)
  API->>AG: runAgentPipeline(query)
  AG->>DB: semantic search KnowledgeBase
  DB-->>AG: top docs + score
  alt confidence >= 90%
    AG-->>API: ANSWER + sources
    API-->>FE: answer, trace
  else confidence < 90%
    AG->>DB: create Ticket + watchers
    AG->>SES: email watchers
    API-->>FE: TICKET created (code)
  end
  FE-->>U: response + agent trace
```

## 5. AWS Production Architecture

```mermaid
flowchart TB
  U[Users] --> CF[CloudFront CDN]
  CF --> ALB[Application Load Balancer]
  ALB --> EC2A[EC2 · Frontend]
  ALB --> EC2B[EC2 · Backend API]
  EC2B --> RDS[(RDS PostgreSQL<br/>Multi-AZ)]
  EC2B --> S3[(S3 Buckets)]
  EC2B --> SES[SES Email]
  EC2B --> BR[Bedrock · future]
  COG[Cognito] --> EC2B
  IAM[IAM Roles/Policies] --- EC2A & EC2B
  CW[CloudWatch<br/>logs · metrics · alarms] --- EC2A & EC2B & RDS
```

## 6. RBAC Matrix (summary)

| Capability | Student | Admin | Faculty | HOD | Owner | Super Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Raise/track tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign tickets | | ✅ | | ✅ | | ✅ |
| Resolve/escalate | | ✅ | ✅ | ✅ | | ✅ |
| Mark attendance | | | ✅ | | | |
| Add/remove members | | | | ✅ | | ✅ |
| Revenue & forecasting | | | | | ✅ | ✅ |
| SLA sweep / global config | | | | | ✅ | ✅ |
