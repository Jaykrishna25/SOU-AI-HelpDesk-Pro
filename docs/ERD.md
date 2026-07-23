# Entity-Relationship Diagram

The full, authoritative schema is in [`../prisma/schema.prisma`](../prisma/schema.prisma) (25+ models).

```mermaid
erDiagram
  USER ||--o| STUDENT : is
  USER ||--o| FACULTY : is
  USER ||--o| ADMIN : is
  USER ||--o{ REFRESHTOKEN : has
  USER ||--o{ AUDITLOG : generates
  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ TICKET : creates
  DEPARTMENT ||--o{ STUDENT : enrolls
  DEPARTMENT ||--o{ FACULTY : employs
  DEPARTMENT ||--o{ COURSE : offers
  COURSE ||--o{ SUBJECT : contains
  SUBJECT ||--o{ LECTURE : scheduled
  FACULTY ||--o{ SUBJECT : teaches
  STUDENT ||--o{ ATTENDANCE : has
  STUDENT ||--o{ FEE : owes
  FEE ||--o{ FEERECEIPT : paid_by
  STUDENT ||--o{ RESULT : earns
  SUBJECT ||--o{ EXAM : has
  EXAM ||--o{ EXAMSEAT : allocates
  EXAM ||--o{ EXAMDUTY : assigns
  FACULTY ||--o{ SALARY : receives
  SALARY ||--o{ SALARYRECEIPT : documented
  TICKET ||--o{ TICKETHISTORY : logs
  TICKET ||--o{ TICKETCOMMENT : has
  TICKET ||--o{ TICKETWATCHER : watched_by
  TICKET ||--o{ EMAILLOG : triggers
  KNOWLEDGEBASE }o--o{ TICKET : informs
```

## Core Tables
Users, Students, Faculty, Admins, Departments, Courses, Subjects, Lectures, Timetables,
Attendance, Fees, FeeReceipts, Salaries, SalaryReceipts, Exams, ExamSeat, ExamDuty, Results,
Notes, Events, Meetings, AcademicCalendar, Tickets, TicketHistory, TicketComment, TicketWatcher,
Notifications, EmailLogs, KnowledgeBase, AuditLogs, RefreshToken.
