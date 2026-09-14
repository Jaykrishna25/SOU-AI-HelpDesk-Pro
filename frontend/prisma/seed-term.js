const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const db = new PrismaClient();

// ============ EDIT THIS BLOCK to match your real syllabus and staff ============
const TERM_DAYS = 120;
const TERM = "Odd 2026-27";
const DEPT = "Computer Science and Engineering";

const CLASSES = [
  { name: "IMSCIT 7A", course: "IMSCIT", strength: 62 },
  { name: "BSCIT 5A", course: "BSCIT", strength: 58 },
  { name: "BBA 5A",  course: "BBA",  strength: 54 },
];

const SUBJECTS = [
  { name: "Artificial Intelligence and intelligent Systems",        faculty: "Prof. Sagar Brahmbhatt" },
  { name: "Cloud Native Application and Services",         faculty: "Prof. Deepika Chauhan & Prof. Akshay Parmar" },
  { name: "Ethical and Legal Frameworks for Digital Systems",          faculty: "Prof. Meghna Panara & Prof. Pooja Mahadik" },
  { name: "Research Methodology",      faculty: "Prof. Dr Darshan Chhaya" },
  { name: "Artificial Intelligence and intelligent Systems_Practicals",        faculty: "Prof. Sagar Brahmbhatt" },
  { name: "Cloud Native Application and Services_Practicals",        faculty: "Prof. Akshay Parmar" },
];

const FIRST = ["Aarav","Vivaan","Aditya","Krish","Dhruv","Meet","Jay","Harsh","Kavya","Riya",
  "Ananya","Diya","Isha","Nisha","Pooja","Rohan","Sahil","Tanvi","Yash","Zeel",
  "Parth","Manav","Hetvi","Jinal","Rutvi","Karan","Naman","Shreya","Vansh","Aditi"];
const LAST = ["Patel","Shah","Desai","Mehta","Joshi","Trivedi","Panchal","Bhatt","Chauhan","Rana",
  "Solanki","Vyas","Modi","Parmar","Thakkar","Gandhi","Dave","Pandya","Soni","Raval"];
// ============================================================================

const GRID = 0.71;
const FRESH = process.argv.includes("--fresh");
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dayAgo = (d) => new Date(Date.now() - d * 864e5);
const code = (p) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

function roster() {
  const out = [];
  for (const c of CLASSES) {
    for (let i = 1; i <= c.strength; i++) {
      const enr = "SOU2023" + c.course + String(i).padStart(3, "0");
      out.push({
        name: pick(FIRST) + " " + pick(LAST),
        enrollment: enr,
        userId: "seed-" + enr,
        className: c.name,
        course: c.course,
        // ~8% of students are attendance risks
        rate: Math.random() < 0.08 ? rnd(0.45, 0.72) : rnd(0.84, 0.99),
      });
    }
  }
  return out;
}

async function wipe() {
  await db.qRScan.deleteMany({});
  await db.qRSession.deleteMany({});
  await db.feedbackResponse.deleteMany({});
  await db.feedbackForm.deleteMany({});
  await db.grievance.deleteMany({});
  await db.seatAllocation.deleteMany({});
  await db.seatingPlan.deleteMany({});
  await db.booking.deleteMany({});
  await db.reportExport.deleteMany({});
  console.log("Cleared previous feature data (resources kept)");
}

async function seedBookings(students) {
  const res = await db.resource.findMany({ where: { active: true } });
  if (!res.length) { console.log("No resources - run seed-resources.js first"); return 0; }
  const maxKw = {};
  for (const r of res) maxKw[r.type] = Math.max(maxKw[r.type] || 0, r.powerKw);

  const purposes = ["Departmental review meeting", "Extra lecture", "Project demonstration",
    "Lab practical session", "Placement training", "Club activity", "Guest lecture",
    "Semester exam briefing", "Group study", "Practice session", "Faculty meeting", "Workshop"];
  const rows = [];

  for (let d = TERM_DAYS; d >= 0; d--) {
    const base = dayAgo(d);
    if (base.getUTCDay() === 0) continue;                 // no Sundays
    const n = base.getUTCDay() === 6 ? ri(1, 3) : ri(3, 8);
    for (let i = 0; i < n; i++) {
      const r = pick(res);
      const sh = ri(8, 17);
      const hrs = pick([1, 1, 1, 2, 2, 3]);
      if (sh + hrs > r.closeHour) continue;
      const startsAt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), sh));
      const endsAt = new Date(startsAt.getTime() + hrs * 36e5);
      const att = Math.max(1, Math.round(r.capacity * rnd(0.35, 0.92)));
      const saved = Math.max(0, ((maxKw[r.type] || 0) - r.powerKw) * hrs);
      const recent = d < 4;
      const status = recent ? (Math.random() < 0.55 ? "PENDING" : "APPROVED")
        : (Math.random() < 0.08 ? "REJECTED" : d > 2 ? "COMPLETED" : "APPROVED");
      const s = pick(students);
      rows.push({
        code: code("BK"), resourceId: r.id,
        userId: s.userId, userName: s.name, userRole: Math.random() < 0.35 ? "FACULTY" : "STUDENT",
        purpose: pick(purposes), attendees: att, startsAt, endsAt, status,
        decidedBy: status === "PENDING" ? null : "Admin Desk (ADMIN)",
        decidedAt: status === "PENDING" ? null : new Date(startsAt.getTime() - 36e5),
        energyKwh: Math.round(r.powerKw * hrs * 100) / 100,
        co2Kg: Math.round(saved * GRID * 100) / 100,
        createdAt: new Date(startsAt.getTime() - ri(1, 5) * 864e5),
      });
    }
  }
  for (let i = 0; i < rows.length; i += 200)
    await db.booking.createMany({ data: rows.slice(i, i + 200), skipDuplicates: true });
  return rows.length;
}

async function seedAttendance(students) {
  let sessions = 0, scans = 0;
  for (const c of CLASSES) {
    const cls = students.filter(s => s.className === c.name);
    const subs = SUBJECTS.slice(0, 3);
    for (const sub of subs) {
      for (let w = 16; w >= 1; w--) {
        const when = dayAgo(w * 7 + ri(0, 3));
        if (when.getUTCDay() === 0) continue;
        const ses = await db.qRSession.create({
          data: {
            token: crypto.randomBytes(24).toString("hex"),
            subjectName: sub.name, className: c.name,
            crUserId: cls[0].userId, expectedCount: cls.length,
            sessionDate: when, createdAt: when,
            expiresAt: new Date(when.getTime() + 10 * 60000),
            closed: true, approved: true,
            approvedBy: sub.faculty + " (FACULTY)",
            approvedAt: new Date(when.getTime() + 20 * 60000),
            syncState: "SYNCED (mock - awaiting SOU MIS API access)",
          },
        });
        sessions++;
        const present = cls.filter(s => Math.random() < s.rate);
        if (present.length) {
          await db.qRScan.createMany({
            data: present.map(s => ({
              sessionId: ses.id, studentUserId: s.userId, studentName: s.name,
              enrollment: s.enrollment,
              scannedAt: new Date(when.getTime() + ri(30, 500) * 1000),
            })),
            skipDuplicates: true,
          });
          scans += present.length;
        }
      }
    }
  }
  return { sessions, scans };
}

async function seedFeedback() {
  const good = ["Explains with real industry examples.", "Very approachable during lab hours.",
    "Lectures are well structured.", "Practical sessions are genuinely useful.",
    "Marks papers quickly and fairly."];
  const mixed = ["Pace is a little fast in the second half.", "Would like more solved examples.",
    "More time for doubt clearing would help.", "Slides could be shared before class.",
    "Assignments overlap with other subjects."];
  let forms = 0, resp = 0;
  for (const sub of SUBJECTS) {
    const opened = dayAgo(ri(25, 70));
    const f = await db.feedbackForm.create({
      data: {
        code: code("FB"), subjectName: sub.name, facultyName: sub.faculty,
        department: DEPT, term: TERM, createdBy: "IQAC Cell",
        opensAt: opened, createdAt: opened,
        closesAt: new Date(opened.getTime() + 21 * 864e5),
        active: true,
      },
    });
    forms++;
    const q = rnd(3.3, 4.7);
    const n = ri(24, 46);
    const data = [];
    for (let i = 0; i < n; i++) {
      const j = (base) => Math.max(1, Math.min(5, Math.round(base + rnd(-0.9, 0.9))));
      data.push({
        formId: f.id, respondentHash: crypto.randomBytes(32).toString("hex"),
        clarity: j(q), engagement: j(q - 0.2), fairness: j(q + 0.1),
        availability: j(q - 0.1), overall: j(q),
        comment: Math.random() < 0.4 ? (Math.random() < 0.65 ? pick(good) : pick(mixed)) : null,
        createdAt: new Date(opened.getTime() + ri(1, 18) * 864e5),
      });
    }
    await db.feedbackResponse.createMany({ data, skipDuplicates: true });
    resp += n;
  }
  return { forms, resp };
}

async function seedGrievances() {
  const items = [
    ["Examination", "Re-evaluation result not published", "Applied for re-evaluation of the internal paper six weeks ago and there is still no update on the portal."],
    ["Fees", "Late fee charged despite paying on time", "Payment was made before the due date but a late fee still appears on the fee page."],
    ["Infrastructure", "Lab air conditioning not working", "The AC in the computer lab has been down for two weeks, which makes long practical sessions difficult."],
    ["Academic", "Syllabus not completed before exam", "Two units remain uncovered with the exam a fortnight away."],
    ["Faculty conduct", "Repeatedly cancelled tutorials", "Tutorial slots are cancelled without notice and not rescheduled."],
    ["Hostel", "Drinking water purifier out of service", "The purifier on the second floor has been out of order since the start of the month."],
    ["Infrastructure", "Library seats occupied by belongings", "Seats are reserved with bags for hours while students wait."],
    ["Academic", "Practical batch timings clash", "The elective practical clashes with the core lab for our batch."],
    ["Examination", "Seating arrangement published late", "Hall allocation went up the evening before the exam."],
    ["Fees", "Scholarship amount not credited", "The state scholarship has not been credited for this semester."],
    ["Infrastructure", "Parking overflow at peak hours", "The student parking zone is full by 9am and vehicles are being turned away."],
    ["Other", "Wi-Fi drops in C Block", "The campus network keeps disconnecting on the second floor of C Block."],
    ["Academic", "Project guide not assigned", "Final year project guides have not been allocated to our group yet."],
    ["Harassment", "Uncomfortable remarks during practicals", "Reporting anonymously as the situation is uncomfortable to raise in person."],
  ];
  const replies = [
    "Verified with the department and corrected. Thank you for reporting.",
    "The exam cell has been instructed to publish within three working days.",
    "Maintenance work order raised, completion expected this week.",
    "Discussed with the faculty concerned; extra sessions have been scheduled.",
    "Accounts has reversed the charge; please confirm on the fee page.",
  ];
  let n = 0;
  for (const [cat, subj, body] of items) {
    const at = dayAgo(ri(3, TERM_DAYS));
    const resolved = Math.random() < 0.65;
    const status = resolved ? "RESOLVED" : (Math.random() < 0.5 ? "UNDER_REVIEW" : "OPEN");
    await db.grievance.create({
      data: {
        code: code("GR"), category: cat, subject: subj, body,
        identityRef: "seed-anon | Student | STUDENT",
        status, createdAt: at,
        response: resolved ? pick(replies) : null,
        respondedBy: resolved ? "OWNER" : null,
        respondedAt: resolved ? new Date(at.getTime() + ri(1, 9) * 864e5) : null,
      },
    });
    n++;
  }
  return n;
}

async function seedSeating(students) {
  const rooms = [{ room: "A-301", rows: 6, cols: 6 }, { room: "A-302", rows: 6, cols: 6 }];
  const pool = students.slice(0, 68);
  const seats = [];
  let i = 0;
  for (const r of rooms)
    for (let row = 1; row <= r.rows; row++)
      for (let col = 1; col <= r.cols; col++) {
        const s = pool[i++]; if (!s) break;
        seats.push({
          room: r.room, rowNo: row, colNo: col,
          seatNo: r.room + "-R" + row + "C" + col,
          studentName: s.name, enrollment: s.enrollment, course: s.course,
        });
      }
  await db.seatingPlan.create({
    data: {
      code: code("EX"), examName: "Mid Semester Examination - " + TERM,
      examDate: dayAgo(21), rule: "NO_SAME_COURSE_ADJACENT",
      roomsJson: JSON.stringify(rooms), totalSeats: seats.length,
      createdBy: "Exam Cell (ADMIN)", createdAt: dayAgo(28),
      seats: { create: seats },
    },
  });
  return seats.length;
}

async function seedTickets() {
  const subs = ["Fee receipt not generated", "Unable to view result", "Timetable clash",
    "Library book renewal", "ID card reissue", "Bonafide certificate request",
    "Hostel room change", "Transcript request", "Exam form correction", "Bus pass renewal"];
  try {
    await db.ticket.create({
      data: { code: code("TK"), subject: subs[0], status: "RESOLVED", stage: "ADMIN",
        creatorName: "Seed Student", createdAt: dayAgo(55) },
    });
  } catch (e) {
    console.log("Tickets skipped - model fields differ (" + String(e.message).split("\n")[0] + ")");
    return 0;
  }
  let n = 1;
  for (let w = 7; w >= 0; w--) {
    const count = Math.round(8 + (7 - w) * 2.2 + rnd(-2, 2));   // rising trend
    for (let i = 0; i < count; i++) {
      const at = dayAgo(w * 7 + ri(0, 6));
      try {
        await db.ticket.create({
          data: {
            code: code("TK"), subject: pick(subs),
            status: w > 1 ? (Math.random() < 0.85 ? "RESOLVED" : "OPEN") : (Math.random() < 0.4 ? "RESOLVED" : "OPEN"),
            stage: "ADMIN", creatorName: "Seed Student", createdAt: at,
          },
        });
        n++;
      } catch {}
    }
  }
  return n;
}

async function main() {
  if (FRESH) await wipe();
  const students = roster();
  console.log("Roster: " + students.length + " students across " + CLASSES.length + " classes");
  const b = await seedBookings(students);       console.log("Bookings:   " + b);
  const a = await seedAttendance(students);     console.log("QR sessions: " + a.sessions + " (" + a.scans + " scans)");
  const f = await seedFeedback();               console.log("Feedback:   " + f.forms + " forms, " + f.resp + " responses");
  const g = await seedGrievances();             console.log("Grievances: " + g);
  const s = await seedSeating(students);        console.log("Seating:    " + s + " allocations");
  const t = await seedTickets();                console.log("Tickets:    " + t);
  console.log("\nDone. Open Insights and Accreditation to see it aggregated.");
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
