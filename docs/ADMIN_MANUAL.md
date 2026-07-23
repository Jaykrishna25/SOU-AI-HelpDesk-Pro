# Admin / HOD / Owner Manual

## Admin Portal
- **Classrooms** — occupied vs free rooms, running lectures (dept, faculty, time).
- **Resources** — allocate labs, classrooms, seminar halls.
- **Tickets** — assign, resolve, escalate; watchers auto-notified.
- **Announcements** — student notices, faculty notices, emergency alerts.

## HOD / HOI Portal
- **Analytics** — student/faculty/admin counts, admissions, attrition, revenue & ticket charts.
- **Management** — add / update / remove students, faculty, admins.
- **Meetings & Events** — schedule faculty/student/department meetings, workshops, conferences.
- **Reports** — generate student, faculty, attendance reports.

## Owner Portal
- **Revenue** — total revenue, fees collected, pending, trends.
- **University Analytics** — students, faculty, admins, departments.
- **Workforce** — faculty/admin performance, ticket resolution.
- **Forecasting** — AI projections for admissions, revenue, ticket volume, workload.
- **Governance** — review escalations, monitor KPIs, approve critical decisions.

## SLA Administration
Owners/Super Admins can trigger `POST /tickets/sla/sweep` to breach-check and escalate overdue tickets.
Escalation letters are emailed automatically to the student and HOD/Owner.
