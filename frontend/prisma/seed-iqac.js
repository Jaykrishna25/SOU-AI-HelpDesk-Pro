/**
 * Seeds a configurable quality framework skeleton.
 *
 * IMPORTANT: criterion names follow the publicly documented NAAC structure,
 * but all metric codes, definitions, weightages and targets here are
 * PLACEHOLDERS. The IQAC must replace them with the current official
 * framework before any real use. Nothing here is authoritative.
 *
 *   node prisma/seed-iqac.js          add if missing
 *   node prisma/seed-iqac.js --fresh  wipe the framework and reseed
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const FRESH = process.argv.includes("--fresh");

const YEARS = [
  ["2023-24", "2023-06-01", "2024-05-31", false],
  ["2024-25", "2024-06-01", "2025-05-31", false],
  ["2025-26", "2025-06-01", "2026-05-31", false],
  ["2026-27", "2026-06-01", "2027-05-31", true],
];

// [criterionCode, title, [ [kiCode, kiTitle, [ [metricCode, metricTitle, kind, unit, requiredEvidence] ] ] ] ]
const FRAMEWORK = [
  ["1", "Curricular Aspects", [
    ["1.1", "Curricular Planning and Implementation", [
      ["1.1.1", "Curriculum delivered as per academic calendar", "PERCENTAGE", "%", "Academic calendar, lesson plans, completion certificates"],
      ["1.1.2", "Programmes with syllabus revision in the last five years", "COUNT", "programmes", "BoS minutes, revised syllabus copies"],
    ]],
    ["1.2", "Academic Flexibility", [
      ["1.2.1", "Students enrolled in certificate / add-on programmes", "COUNT", "students", "Enrolment registers, completion certificates"],
      ["1.2.2", "Programmes offering elective / CBCS choice", "COUNT", "programmes", "Curriculum structure, university approval"],
    ]],
    ["1.3", "Curriculum Enrichment", [
      ["1.3.1", "Students undertaking project work, internship or field work", "COUNT", "students", "Internship letters, project reports, supervisor sign-off"],
    ]],
    ["1.4", "Feedback System", [
      ["1.4.1", "Structured feedback collected from stakeholders", "TEXT", null, "Feedback forms, analysis report, action-taken report"],
    ]],
  ]],
  ["2", "Teaching-Learning and Evaluation", [
    ["2.1", "Student Enrolment and Profile", [
      ["2.1.1", "Seats filled against sanctioned intake", "PERCENTAGE", "%", "Admission register, sanction letter"],
      ["2.1.2", "Seats filled under reserved categories", "PERCENTAGE", "%", "Category-wise admission list"],
    ]],
    ["2.3", "Teaching-Learning Process", [
      ["2.3.1", "Student-centric methods in use", "TEXT", null, "Photographs, timetable, activity reports"],
      ["2.3.2", "ICT-enabled teaching sessions", "COUNT", "sessions", "Class records, ICT tool logs"],
    ]],
    ["2.4", "Teacher Profile and Quality", [
      ["2.4.1", "Sanctioned teaching posts filled", "PERCENTAGE", "%", "Appointment orders, sanction letter"],
      ["2.4.2", "Teachers with Ph.D.", "COUNT", "teachers", "Degree certificates"],
    ]],
    ["2.5", "Evaluation Process and Reforms", [
      ["2.5.1", "Examination grievances resolved within stated time", "PERCENTAGE", "%", "Grievance register, resolution records"],
    ]],
    ["2.6", "Student Performance and Learning Outcomes", [
      ["2.6.1", "Programme and course outcomes stated and communicated", "TEXT", null, "Course files, website evidence"],
      ["2.6.2", "Pass percentage of final-year students", "PERCENTAGE", "%", "Result sheets from the examination authority"],
    ]],
    ["2.7", "Student Satisfaction Survey", [
      ["2.7.1", "Student satisfaction survey score", "RATIO", "of 5", "Survey instrument, responses, analysis"],
    ]],
  ]],
  ["3", "Research, Innovations and Extension", [
    ["3.1", "Resource Mobilisation for Research", [
      ["3.1.1", "Grants received for research projects", "CURRENCY", "INR", "Sanction letters, utilisation certificates"],
    ]],
    ["3.3", "Research Publications and Awards", [
      ["3.3.1", "Papers published in listed journals", "COUNT", "papers", "Journal page, DOI, indexing proof"],
      ["3.3.2", "Books and chapters published", "COUNT", "publications", "Title page, ISBN, publisher record"],
    ]],
    ["3.4", "Extension Activities", [
      ["3.4.1", "Extension and outreach activities conducted", "COUNT", "activities", "Activity report, photographs, beneficiary list"],
    ]],
    ["3.5", "Collaboration", [
      ["3.5.1", "Functional MoUs with documented activity", "COUNT", "MoUs", "Signed MoU, activity records, outcome note"],
    ]],
  ]],
  ["4", "Infrastructure and Learning Resources", [
    ["4.1", "Physical Facilities", [
      ["4.1.1", "Expenditure on infrastructure augmentation", "CURRENCY", "INR", "Audited statement, bills"],
      ["4.1.2", "Classrooms and laboratories in use", "COUNT", "rooms", "Asset register, utilisation records"],
    ]],
    ["4.2", "Library as a Learning Resource", [
      ["4.2.1", "Library automation and e-resource subscriptions", "TEXT", null, "Subscription invoices, usage reports"],
    ]],
    ["4.3", "IT Infrastructure", [
      ["4.3.1", "Student-computer ratio", "RATIO", "students per system", "IT asset register"],
    ]],
    ["4.4", "Maintenance of Campus Infrastructure", [
      ["4.4.1", "Expenditure on maintenance of facilities", "CURRENCY", "INR", "Audited statement, work orders"],
    ]],
  ]],
  ["5", "Student Support and Progression", [
    ["5.1", "Student Support", [
      ["5.1.1", "Students benefiting from scholarships and freeships", "COUNT", "students", "Sanction lists, disbursement records"],
      ["5.1.2", "Capacity-building and skill-development programmes", "COUNT", "programmes", "Programme reports, attendance"],
    ]],
    ["5.2", "Student Progression", [
      ["5.2.1", "Students placed during the year", "COUNT", "students", "Offer letters, placement register"],
      ["5.2.2", "Students progressing to higher education", "COUNT", "students", "Admission proof from receiving institution"],
    ]],
    ["5.3", "Student Participation and Activities", [
      ["5.3.1", "Awards in sports and cultural competitions", "COUNT", "awards", "Certificates, event reports"],
    ]],
    ["5.4", "Alumni Engagement", [
      ["5.4.1", "Alumni contribution and engagement", "TEXT", null, "Alumni association records, receipts"],
    ]],
  ]],
  ["6", "Governance, Leadership and Management", [
    ["6.1", "Institutional Vision and Leadership", [
      ["6.1.1", "Governance reflected in institutional practice", "TEXT", null, "Vision statement, committee minutes"],
    ]],
    ["6.2", "Strategy Development and Deployment", [
      ["6.2.1", "Strategic plan and deployment documents", "TEXT", null, "Strategic plan, deployment evidence"],
    ]],
    ["6.3", "Faculty Empowerment Strategies", [
      ["6.3.1", "Teachers attending FDPs and professional development", "COUNT", "teachers", "Participation certificates"],
    ]],
    ["6.4", "Financial Management and Resource Mobilisation", [
      ["6.4.1", "Internal and external financial audits conducted", "TEXT", null, "Audit reports, compliance notes"],
    ]],
    ["6.5", "Internal Quality Assurance System", [
      ["6.5.1", "IQAC quality initiatives and their impact", "TEXT", null, "IQAC minutes, AQAR, impact evidence"],
      ["6.5.2", "Grievances resolved within the stated timeline", "PERCENTAGE", "%", "Grievance register, resolution records"],
    ]],
  ]],
  ["7", "Institutional Values and Best Practices", [
    ["7.1", "Institutional Values and Social Responsibilities", [
      ["7.1.1", "Gender equity promotion measures", "TEXT", null, "Action plan, annual gender report, photographs"],
      ["7.1.2", "Energy, waste and water management initiatives", "TEXT", null, "Green audit, bills, installation records"],
      ["7.1.3", "Accessibility and inclusion facilities", "TEXT", null, "Accessibility audit, photographs"],
    ]],
    ["7.2", "Best Practices", [
      ["7.2.1", "Documented best practices", "COUNT", "practices", "Best-practice template with measured outcome"],
    ]],
    ["7.3", "Institutional Distinctiveness", [
      ["7.3.1", "Institutional distinctiveness with evidence", "TEXT", null, "Narrative, supporting evidence, outcomes"],
    ]],
  ]],
];

const SOURCES = [
  ["helpdesk", "SOU AI HelpDesk (tickets)", "INTERNAL", "Student query and resolution records"],
  ["greenreserve", "GreenReserve bookings", "INTERNAL", "Resource utilisation and energy accounting"],
  ["qr-attendance", "QR attendance", "INTERNAL", "Faculty-verified attendance sessions"],
  ["feedback", "Course feedback", "INTERNAL", "Anonymous student feedback responses"],
  ["grievance", "Grievance channel", "INTERNAL", "Grievance register and resolutions"],
  ["exam-cell", "Examination records", "MANUAL", "Results and seating plans"],
  ["sou-mis", "SOU MIS", "EXTERNAL", "University system - integration pending written authorisation"],
];

async function main() {
  if (FRESH) {
    await db.dataQualityIssue.deleteMany({});
    await db.metricTarget.deleteMany({});
    await db.metricOwner.deleteMany({});
    await db.qualityMetric.deleteMany({});
    await db.keyIndicator.deleteMany({});
    await db.qualityCriterion.deleteMany({});
    console.log("Framework cleared (evidence records untouched)");
  }

  for (const [code, from, to, current] of YEARS) {
    await db.academicYear.upsert({
      where: { code },
      update: { isCurrent: current },
      create: { code, startsOn: new Date(from), endsOn: new Date(to), isCurrent: current },
    });
  }
  console.log("Academic years: " + YEARS.length);

  for (const [key, name, kind, description] of SOURCES) {
    await db.dataSource.upsert({
      where: { key }, update: {},
      create: { key, name, kind, description, trusted: kind === "INTERNAL" },
    });
  }
  console.log("Data sources: " + SOURCES.length);

  let nKI = 0, nM = 0;
  for (let ci = 0; ci < FRAMEWORK.length; ci++) {
    const [cCode, cTitle, kis] = FRAMEWORK[ci];
    const crit = await db.qualityCriterion.upsert({
      where: { framework_code: { framework: "NAAC", code: cCode } },
      update: { title: cTitle, sortOrder: ci },
      create: { framework: "NAAC", code: cCode, title: cTitle, sortOrder: ci },
    });
    for (let ki = 0; ki < kis.length; ki++) {
      const [kCode, kTitle, metrics] = kis[ki];
      const ind = await db.keyIndicator.upsert({
        where: { criterionId_code: { criterionId: crit.id, code: kCode } },
        update: { title: kTitle, sortOrder: ki },
        create: { criterionId: crit.id, code: kCode, title: kTitle, sortOrder: ki },
      });
      nKI++;
      for (let mi = 0; mi < metrics.length; mi++) {
        const [mCode, mTitle, kind, unit, req] = metrics[mi];
        await db.qualityMetric.upsert({
          where: { keyIndicatorId_code: { keyIndicatorId: ind.id, code: mCode } },
          update: { title: mTitle, kind, unit, requiredEvidence: req, sortOrder: mi },
          create: { keyIndicatorId: ind.id, code: mCode, title: mTitle, kind, unit, requiredEvidence: req, sortOrder: mi },
        });
        nM++;
      }
    }
  }
  console.log("Criteria: " + FRAMEWORK.length + "  Key indicators: " + nKI + "  Metrics: " + nM);
  console.log("\nAll definitions are placeholders. Replace them with the current official framework before real use.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
