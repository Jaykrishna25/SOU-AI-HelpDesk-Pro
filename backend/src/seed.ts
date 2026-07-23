import { PrismaClient, Role, FeeStatus, AttendanceStatus } from "@prisma/client";
import { embed } from "./ai/rag";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s + "T00:00:00Z");

async function main() {
  console.log("Seeding SOU AI HelpDesk Pro (custom roster)...");

  await prisma.$transaction([
    prisma.ticketWatcher.deleteMany(), prisma.ticketHistory.deleteMany(),
    prisma.ticketComment.deleteMany(), prisma.emailLog.deleteMany(),
    prisma.notification.deleteMany(), prisma.ticket.deleteMany(),
    prisma.attendance.deleteMany(), prisma.result.deleteMany(),
    prisma.feeReceipt.deleteMany(), prisma.fee.deleteMany(),
    prisma.salaryReceipt.deleteMany(), prisma.salary.deleteMany(),
    prisma.examSeat.deleteMany(), prisma.examDuty.deleteMany(), prisma.exam.deleteMany(),
    prisma.note.deleteMany(), prisma.lecture.deleteMany(), prisma.timetable.deleteMany(),
    prisma.subject.deleteMany(), prisma.course.deleteMany(),
    prisma.knowledgeBase.deleteMany(), prisma.academicCalendar.deleteMany(),
    prisma.event.deleteMany(), prisma.meeting.deleteMany(),
    prisma.refreshToken.deleteMany(), prisma.auditLog.deleteMany(),
    prisma.student.deleteMany(), prisma.faculty.deleteMany(), prisma.admin.deleteMany(),
    prisma.user.deleteMany(), prisma.department.deleteMany(),
  ]);

  const cse = await prisma.department.create({ data: { name: "Computer Science & Engineering", code: "CSE" } });
  const courseCSE = await prisma.course.create({ data: { name: "B.Tech CSE", code: "BTECH-CSE", durationYrs: 4, departmentId: cse.id } });

  const mkUser = (loginId: string, role: Role, fullName: string, birthdate: string, email: string) =>
    prisma.user.create({ data: { loginId, role, fullName, birthdate: D(birthdate), email } });

  await mkUser("OWN001", Role.OWNER, "Shital Aggrawal Sir", "1990-06-09", "own001@silveroakuni.ac.in");
  await mkUser("OWN002", Role.OWNER, "Poonam Aggrawal Mam", "1990-10-25", "own002@silveroakuni.ac.in");
  await mkUser("HOD002", Role.HOI, "Hemal Patel Mam", "1995-10-05", "hoi@silveroakuni.ac.in");
  const hodCSE = await mkUser("HOD001", Role.HOD, "Deepika Chauhan Mam", "1995-09-05", "hod.cse@silveroakuni.ac.in");
  await prisma.department.update({ where: { id: cse.id }, data: { hodId: hodCSE.id } });

  const admins: [string, string, string, string][] = [
    ["ADM001", "Umangini Mam", "2000-05-02", "CAMPUS"],
    ["ADM002", "Dipal Darji Sir", "2000-05-03", "DEPARTMENT"],
  ];
  for (const [id, name, bd, scope] of admins) {
    const u = await mkUser(id, Role.ADMIN, name, bd, id.toLowerCase() + "@silveroakuni.ac.in");
    await prisma.admin.create({ data: { userId: u.id, adminId: id, scope } });
  }

  const facultyData: [string, string, string, string][] = [
    ["FAC001", "Akshay Sir", "2000-10-05", "Assistant Professor"],
    ["FAC002", "Sagar Sir", "2000-08-09", "Assistant Professor"],
  ];
  const facultyRecs: Record<string, string> = {};
  for (const [id, name, bd, desig] of facultyData) {
    const u = await mkUser(id, Role.FACULTY, name, bd, id.toLowerCase() + "@silveroakuni.ac.in");
    const f = await prisma.faculty.create({ data: { userId: u.id, facultyId: id, departmentId: cse.id, designation: desig } });
    facultyRecs[id] = f.id;
  }

  const subjects = await Promise.all([
    ["Data Structures & Algorithms", "CS301", 5, facultyRecs["FAC001"]],
    ["Database Management Systems", "CS302", 5, facultyRecs["FAC002"]],
    ["Operating Systems", "CS303", 5, facultyRecs["FAC001"]],
    ["Machine Learning", "CS401", 7, facultyRecs["FAC002"]],
  ].map(([name, code, sem, fid]) =>
    prisma.subject.create({ data: { name: name as string, code: code as string, semester: sem as number, departmentId: cse.id, courseId: courseCSE.id, facultyId: fid as string } })));

  const studentsData: [string, string, string, number][] = [
    ["SOU2023CSE69", "Navlani Jaykrishna Satishkumar", "2005-05-02", 5],
    ["SOU2023CSE02", "Harsh Barot LaxmanBhai", "2005-05-03", 5],
    ["SOU2023CSE65", "Zala Rudraraj Sinh", "2005-09-25", 5],
    ["SOU2023CSE05", "Ashok Sharma", "2005-10-10", 5],
    ["SOU2023CSE10", "Priya Nair", "2005-01-12", 7],
    ["SOU2023CSE11", "Rahul Verma", "2004-11-23", 7],
    ["SOU2023CSE12", "Sneha Patel", "2005-03-30", 5],
    ["SOU2023CSE13", "Karan Shah", "2005-07-08", 5],
    ["SOU2023CSE14", "Ananya Desai", "2005-02-17", 3],
    ["SOU2023CSE15", "Vivek Kumar", "2004-12-05", 3],
  ];
  const cgpas = [8.4, 7.9, 8.1, 7.2, 9.1, 6.8, 8.6, 7.5, 8.9, 7.0];
  let i = 0;
  for (const [enr, name, bd, sem] of studentsData) {
    const cgpa = cgpas[i++] ?? 8.0;
    const u = await mkUser(enr, Role.STUDENT, name, bd, enr.toLowerCase() + "@sou.edu.in");
    const s = await prisma.student.create({
      data: { userId: u.id, enrollmentNo: enr, departmentId: cse.id, courseId: courseCSE.id, semester: sem, program: "B.Tech CSE", cgpa },
    });
    const total = 120000;
    const paid = sem === 7 ? 120000 : 90000;
    const fee = await prisma.fee.create({
      data: { studentId: s.id, semester: sem, totalFees: total, paidFees: paid,
        status: paid >= total ? FeeStatus.PAID : FeeStatus.PARTIAL, dueDate: D("2026-08-15") },
    });
    if (paid > 0) await prisma.feeReceipt.create({ data: { feeId: fee.id, amount: paid, method: "ONLINE", txnId: "TXN-" + enr + "-" + sem } });
    for (const subj of subjects.slice(0, 3)) {
      for (let d = 0; d < 6; d++) {
        await prisma.attendance.create({ data: { studentId: s.id, subjectId: subj.id,
          date: D("2026-07-" + (10 + d)), status: d % 5 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT } });
      }
      await prisma.result.create({ data: { studentId: s.id, subjectId: subj.id, semester: sem,
        internalMarks: 24 + Math.floor(Math.random() * 6), externalMarks: 55 + Math.floor(Math.random() * 15),
        grade: "A", sgpa: cgpa } });
    }
  }

  const tt = await prisma.timetable.create({ data: { semester: 5, program: "B.Tech CSE" } });
  await prisma.lecture.createMany({ data: [
    { timetableId: tt.id, subjectId: subjects[0].id, facultyId: facultyRecs["FAC001"], dayOfWeek: 1, startTime: "09:00", endTime: "10:00", classroom: "A-301", building: "Silver Block" },
    { timetableId: tt.id, subjectId: subjects[1].id, facultyId: facultyRecs["FAC002"], dayOfWeek: 1, startTime: "10:00", endTime: "11:00", classroom: "A-302", building: "Silver Block" },
    { timetableId: tt.id, subjectId: subjects[2].id, facultyId: facultyRecs["FAC001"], dayOfWeek: 2, startTime: "11:00", endTime: "12:00", classroom: "Lab-2", building: "Oak Block" },
  ]});

  const exam = await prisma.exam.create({ data: { subjectId: subjects[3].id, title: "Semester 7 End Exam - ML", type: "EXTERNAL", date: D("2026-11-20"), venue: "Exam Hall 1", duration: 180 } });
  await prisma.examDuty.create({ data: { examId: exam.id, facultyId: facultyRecs["FAC001"], role: "Invigilator" } });
  for (const fid of Object.values(facultyRecs)) {
    await prisma.salary.create({ data: { facultyId: fid, month: "2026-07", basic: 90000, allowances: 25000, deductions: 12000, netPay: 103000 } });
  }

  await prisma.academicCalendar.createMany({ data: [
    { title: "Semester 7 Exams Begin", type: "EVENT", startDate: D("2026-11-20") },
    { title: "Diwali Break", type: "HOLIDAY", startDate: D("2026-10-29"), endDate: D("2026-11-03") },
    { title: "Fee Payment Deadline", type: "DEADLINE", startDate: D("2026-08-15") },
  ]});
  await prisma.event.create({ data: { title: "AI & Cloud Summit 2026", type: "CONFERENCE", date: D("2026-09-10"), venue: "Auditorium", organizer: "CSE Dept" } });

  const kb: [string, string, string][] = [
    ["Semester 7 Examination Schedule", "EXAMS", "Semester 7 end-semester examinations begin on 20 November 2026. Hall tickets release 5 days before."],
    ["Fee Payment Policy", "POLICY", "Tuition fees for B.Tech are Rs 1,20,000 per semester in two installments. Last date: 15 August 2026."],
    ["Revaluation Procedure", "FAQ", "Apply for revaluation within 10 days of results via the Examination Cell, Rs 300 per subject."],
    ["Attendance Requirement", "POLICY", "Minimum 75 percent attendance per subject is mandatory to sit for end-semester examinations."],
    ["Bonafide Certificate Request", "FAQ", "Bonafide and transcript certificates are issued by the Academic Office within 2 working days."],
  ];
  for (const [title, type, content] of kb) {
    await prisma.knowledgeBase.create({ data: { title, type, content, tags: [type.toLowerCase()], embedding: embed(content), source: "seed" } });
  }

  console.log("Seed complete.");
  console.log("OWNER  : OWN001 | 1990-06-09  (Shital Aggrawal Sir)");
  console.log("OWNER  : OWN002 | 1990-10-25  (Poonam Aggrawal Mam)");
  console.log("HOI    : HOD002 | 1995-10-05  (Hemal Patel Mam)");
  console.log("HOD    : HOD001 | 1995-09-05  (Deepika Chauhan Mam)");
  console.log("ADMIN  : ADM001 | 2000-05-02  (Umangini Mam)");
  console.log("ADMIN  : ADM002 | 2000-05-03  (Dipal Darji Sir)");
  console.log("FACULTY: FAC001 | 2000-10-05  (Akshay Sir)");
  console.log("FACULTY: FAC002 | 2000-08-09  (Sagar Sir)");
  console.log("STUDENT: SOU2023CSE69 | 2005-05-02  (Navlani Jaykrishna Satishkumar)");
  console.log("STUDENT: SOU2023CSE02 | 2005-05-03  (Harsh Barot LaxmanBhai)");
  console.log("STUDENT: SOU2023CSE65 | 2005-09-25  (Zala Rudraraj Sinh)");
  console.log("STUDENT: SOU2023CSE05 | 2005-10-10  (Ashok Sharma)");
  console.log("STUDENT: +6 random (CSE10-CSE15)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
