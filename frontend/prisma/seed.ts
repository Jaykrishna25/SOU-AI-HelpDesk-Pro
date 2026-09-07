import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const D = (s: string) => new Date(s + "T00:00:00Z");

async function main() {
  console.log("Seeding SOU AI HelpDesk Pro database...");

  await prisma.$transaction([
    prisma.ticketHistory.deleteMany(), prisma.ticket.deleteMany(),
    prisma.notification.deleteMany(), prisma.auditLog.deleteMany(),
    prisma.attendanceSubmission.deleteMany(), prisma.cRAssignment.deleteMany(),
    prisma.result.deleteMany(), prisma.exam.deleteMany(), prisma.fee.deleteMany(),
    prisma.subject.deleteMany(), prisma.knowledgeBase.deleteMany(),
    prisma.student.deleteMany(), prisma.faculty.deleteMany(), prisma.admin.deleteMany(),
    prisma.user.deleteMany(), prisma.department.deleteMany(),
  ]);

  const cse = await prisma.department.create({ data: { name: "Computer Science & Engineering", code: "CSE" } });

  const mkUser = (loginId: string, role: Role, fullName: string, birthdate: string, email: string) =>
    prisma.user.create({ data: { loginId, role, fullName, birthdate: D(birthdate), email } });

  await mkUser("OWN001", Role.OWNER, "Shital Aggrawal Sir", "1990-06-09", "own001@silveroakuni.ac.in");
  await mkUser("OWN002", Role.OWNER, "Poonam Aggrawal Mam", "1990-10-25", "own002@silveroakuni.ac.in");
  await mkUser("HOD002", Role.HOI, "Hemal Patel Mam", "1995-10-05", "hoi@silveroakuni.ac.in");
  await mkUser("HOD001", Role.HOD, "Deepika Chauhan Mam", "1995-09-05", "hod.cse@silveroakuni.ac.in");

  for (const [id, name, bd, scope] of [
    ["ADM001", "Umangini Mam", "2000-05-02", "CAMPUS"],
    ["ADM002", "Dipal Darji Sir", "2000-05-03", "DEPARTMENT"],
  ] as const) {
    const u = await mkUser(id, Role.ADMIN, name, bd, id.toLowerCase() + "@silveroakuni.ac.in");
    await prisma.admin.create({ data: { userId: u.id, adminId: id, scope } });
  }

  const facultyIds: Record<string, string> = {};
  for (const [id, name, bd, desig] of [
    ["FAC001", "Akshay Sir", "2000-10-05", "Assistant Professor"],
    ["FAC002", "Sagar Sir", "2000-08-09", "Assistant Professor"],
  ] as const) {
    const u = await mkUser(id, Role.FACULTY, name, bd, id.toLowerCase() + "@silveroakuni.ac.in");
    const f = await prisma.faculty.create({ data: { userId: u.id, facultyId: id, departmentId: cse.id, designation: desig } });
    facultyIds[id] = f.id;
  }

  const subjects: Record<string, string> = {};
  for (const [code, name, sem, fid] of [
    ["CS301", "Data Structures", 5, "FAC001"],
    ["CS302", "Database Management Systems", 5, "FAC002"],
    ["CS303", "Operating Systems", 5, "FAC001"],
    ["CS401", "Machine Learning", 7, "FAC002"],
  ] as const) {
    const s = await prisma.subject.create({
      data: { code, name, semester: sem, departmentId: cse.id, facultyId: facultyIds[fid] },
    });
    subjects[code] = s.id;
  }

  const students = [
    ["SOU2023CSE69", "Navlani Jaykrishna Satishkumar", "2005-05-02", 5, 8.4],
    ["SOU2023CSE02", "Harsh Barot LaxmanBhai", "2005-05-03", 5, 7.9],
    ["SOU2023CSE65", "Zala Rudraraj Sinh", "2005-09-25", 5, 8.1],
    ["SOU2023CSE05", "Ashok Sharma", "2005-10-10", 5, 7.2],
    ["SOU2023CSE10", "Priya Nair", "2005-01-12", 7, 9.1],
    ["SOU2023CSE11", "Rahul Verma", "2004-11-23", 7, 6.8],
    ["SOU2023CSE12", "Sneha Patel", "2005-03-30", 5, 8.6],
    ["SOU2023CSE13", "Karan Shah", "2005-07-08", 5, 7.5],
    ["SOU2023CSE14", "Ananya Desai", "2005-02-17", 3, 8.9],
    ["SOU2023CSE15", "Vivek Kumar", "2004-12-05", 3, 7.0],
  ] as const;

  for (const [enr, name, bd, sem, cgpa] of students) {
    const u = await mkUser(enr, Role.STUDENT, name, bd, enr.toLowerCase() + "@sou.edu.in");
    const s = await prisma.student.create({
      data: { userId: u.id, enrollmentNo: enr, departmentId: cse.id, semester: sem, program: "B.Tech CSE", cgpa },
    });
    await prisma.fee.create({
      data: { studentId: s.id, semester: sem, totalFees: 120000, paidFees: sem === 7 ? 120000 : 90000,
        status: sem === 7 ? "PAID" : "PARTIAL", dueDate: D("2026-08-15") },
    });
    for (const code of ["CS301", "CS302", "CS303"]) {
      await prisma.result.create({
        data: { studentId: s.id, subjectId: subjects[code], semester: sem,
          internalMarks: 24 + Math.floor(Math.random() * 6),
          externalMarks: 55 + Math.floor(Math.random() * 15), grade: "A" },
      });
    }
  }

  await prisma.exam.create({
    data: { subjectId: subjects["CS401"], title: "Semester 7 End Exam - ML", type: "EXTERNAL", date: D("2026-11-20"), venue: "Exam Hall 1" },
  });

  await prisma.cRAssignment.create({
    data: { subjectCode: "CS301", subjectName: "Data Structures",
      enrollmentNo: "SOU2023CSE69", studentName: "Navlani Jaykrishna Satishkumar", assignedBy: "Akshay Sir" },
  });

  for (const [title, type, content] of [
    ["Semester 7 Examination Schedule", "EXAMS", "Semester 7 end-semester examinations begin on 20 November 2026."],
    ["Fee Payment Policy", "POLICY", "B.Tech fees are Rs 1,20,000 per semester. Last date: 15 August 2026."],
    ["Attendance Requirement", "POLICY", "Minimum 75 percent attendance per subject is mandatory."],
  ] as const) {
    await prisma.knowledgeBase.create({ data: { title, type, content } });
  }

  console.log("Seed complete.");
  console.log("OWNER  : OWN001 | 1990-06-09   OWN002 | 1990-10-25");
  console.log("HOI    : HOD002 | 1995-10-05");
  console.log("HOD    : HOD001 | 1995-09-05");
  console.log("ADMIN  : ADM001 | 2000-05-02   ADM002 | 2000-05-03");
  console.log("FACULTY: FAC001 | 2000-10-05   FAC002 | 2000-08-09");
  console.log("STUDENT: SOU2023CSE69 | 2005-05-02  (also CR for CS301)");
  console.log("STUDENT: SOU2023CSE02 | 2005-05-03  SOU2023CSE65 | 2005-09-25  SOU2023CSE05 | 2005-10-10");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
