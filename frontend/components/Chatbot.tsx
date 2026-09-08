"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles, ArrowLeft } from "lucide-react";
import { addTicket } from "@/lib/tickets";

const INSTITUTES = [
  "College of Engineering and Technology",
  "Silver Oak College of Computer Application",
  "Silver Oak Institute of Management",
  "Silver Oak Institute of Business Management",
  "Silver Oak Commerce College",
  "Silver Oak Institute of Design",
  "Silver Oak College of Aviation Technology",
  "Silver Oak College of Animation and Multimedia",
  "College of Pharmacy",
  "Silver Oak College of Nursing",
  "Silver Oak College of Physiotherapy",
  "Silver Oak College of Allied and Health Care",
  "Silver Oak Law College",
  "Silver Oak Institute of Science",
  "Silver Oak College of Humanities and Social Science",
  "Silver Oak Institute of Liberal & Professional Studies",
  "Silver Oak College of Vocational Education",
];

const COMMON_COURSES: Record<string, string[]> = {
  "College of Engineering and Technology": ["B.Tech CSE", "B.Tech IT", "B.Tech AI/ML", "B.Tech Mechanical", "B.Tech Civil", "Diploma"],
  "Silver Oak College of Computer Application": ["BCA", "MCA"],
  "Silver Oak Institute of Management": ["BBA", "MBA"],
  "Silver Oak Commerce College": ["B.Com", "M.Com"],
};

const CONTACT = "079-35201300 / 079-66046300 / +91 9099063464";

interface Faq { intent: string; keywords: string[]; answer: string }

const KB: Faq[] = [
  { intent: "ATTENDANCE", keywords: ["attendance", "75", "percentage", "present", "absent", "shortage"],
    answer: "A minimum of 75% attendance per subject is mandatory to be eligible for end-semester examinations. Shortfall requires a medical certificate and HOD approval. Attendance is recorded in the official SOU MIS by your subject faculty or class representative." },
  { intent: "EXAMS", keywords: ["exam", "examination", "datesheet", "timetable", "hall ticket", "schedule"],
    answer: "End-semester examination datesheets are published on the student portal (studentportal.silveroakuni.ac.in) roughly two weeks in advance, and hall tickets release about 5 days before the first paper. Carry your hall ticket and college ID to every paper." },
  { intent: "RESULTS", keywords: ["result", "marks", "grade", "sgpa", "cgpa", "marksheet"],
    answer: "Results are declared on the student portal (studentportal.silveroakuni.ac.in). Each subject carries internal and external components, and SGPA/CGPA are calculated on the standard 10-point scale. Printed marksheets are issued by the Examination Cell." },
  { intent: "REVALUATION", keywords: ["revaluation", "recheck", "rechecking", "reassess", "recount"],
    answer: "Revaluation must be applied for within 10 days of result declaration through the Examination Cell, with a fee of Rs 300 per subject. Revised results are normally published within three weeks." },
  { intent: "FEES", keywords: ["fee", "fees", "tuition", "payment", "installment", "due date"],
    answer: "Tuition fees vary by programme and are payable per semester, usually in two installments. B.Tech CSE is Rs 1,20,000 per semester. Exact fee structures for every programme are in the official prospectus at silveroakuni.ac.in, and payment is made through the student portal." },
  { intent: "FEE_RECEIPT", keywords: ["receipt", "invoice", "payment proof", "transaction"],
    answer: "Fee receipts can be downloaded from the Fees section of your student portal immediately after a successful payment. If a receipt has not generated within 24 hours of payment, the Accounts Office can reissue it." },
  { intent: "SCHOLARSHIP", keywords: ["scholarship", "stipend", "waiver", "freeship", "financial aid"],
    answer: "Silver Oak offers merit and category-based scholarships, plus government schemes such as MYSY. Applications are made through the Scholarship Cell with your marksheets, income certificate and caste certificate where applicable. Deadlines are announced on the notice board each academic year." },
  { intent: "ADMISSION", keywords: ["admission", "apply", "enroll", "enrol", "seat", "eligibility"],
    answer: "Admissions are handled online at admission.silveroakuni.ac.in. You can also download the prospectus from silveroakuni.ac.in or call the Admission Office on 079-66046300. Silver Oak offers 150+ programmes across 17 colleges and institutes." },
  { intent: "PLACEMENT", keywords: ["placement", "job", "recruiter", "company", "interview", "package"],
    answer: "The Training and Placement Cell reports around 70% placements with 1000+ recruiting companies including TCS, Accenture, Royal Enfield, Zomato and Adani Power. The cell runs pre-placement training, aptitude sessions and mock interviews. The placement season generally runs from August to February." },
  { intent: "INTERNSHIP", keywords: ["internship", "intern", "stipend based", "training"],
    answer: "Silver Oak runs a Stipend-Based Internship Program - a full-time two-year internship with a stipend at partner companies. Details are at silveroakuni.ac.in/paid-internship, and the Placement Cell can guide you on eligibility." },
  { intent: "HOSTEL", keywords: ["hostel", "accommodation", "room", "mess", "warden", "pg"],
    answer: "Hostel accommodation is available on campus with separate blocks for boys and girls. Room allotment, mess charges and rules are handled by the Hostel Office. Details are on silveroakuni.ac.in/accomodation, and applications open before each academic year." },
  { intent: "LIBRARY", keywords: ["library", "book", "borrow", "issue", "return", "journal"],
    answer: "The central library holds print and digital resources including e-journals and reference collections. Books are issued against your college ID. Borrowing limits, due dates and fine rules are displayed at the library help desk. More at silveroakuni.ac.in/library." },
  { intent: "CERTIFICATE", keywords: ["bonafide", "certificate", "transcript", "migration", "degree", "provisional"],
    answer: "Bonafide certificates, transcripts and migration certificates are issued by the Academic Office. Standard processing time is about 2 working days for a bonafide certificate. Apply at the Academic Office counter with your enrollment number." },
  { intent: "ID_CARD", keywords: ["id card", "identity card", "lost card", "duplicate card"],
    answer: "College ID cards are issued at admission. If yours is lost or damaged, apply for a duplicate at the Administrative Office - you will usually need a written application and a passport photograph." },
  { intent: "TIMETABLE", keywords: ["timetable", "lecture", "class", "period", "slot", "schedule"],
    answer: "Your lecture timetable is published on the student portal and on your department notice board at the start of each semester, showing subject, faculty, classroom and building for every slot." },
  { intent: "FACULTY", keywords: ["faculty", "professor", "teacher", "hod", "mentor"],
    answer: "Each subject has an assigned faculty member, and every student is allotted a faculty mentor. Faculty are available during posted office hours; your HOD can help if you need to reach someone urgently. Many SOU faculty hold Harvard Graduate School of Education certification." },
  { intent: "DEPARTMENTS", keywords: ["college", "institute", "department", "branch", "faculty of", "courses offered"],
    answer: "Silver Oak University has 17 colleges and institutes covering Engineering, Computer Application, Management, Business Management, Commerce, Design, Aviation, Animation, Pharmacy, Nursing, Physiotherapy, Allied Health Care, Law, Science, Humanities, Liberal Studies and Vocational Education - 150+ programmes in total." },
  { intent: "SYLLABUS", keywords: ["syllabus", "curriculum", "subject", "credit", "course structure"],
    answer: "Semester-wise syllabus and credit structure are published on the student portal and shared by your subject faculty at the start of term. Your department office keeps the authoritative copy." },
  { intent: "BACKLOG", keywords: ["backlog", "kt", "fail", "atkt", "supplementary", "reappear"],
    answer: "Students with a backlog can appear in the supplementary/remedial examination conducted by the Examination Cell. Registration and fee details are announced along with the result. Check the Examination Cell notice for the current cycle." },
  { intent: "CAMPUS", keywords: ["campus", "address", "location", "reach", "where", "gota"],
    answer: "Silver Oak University is at Silveroak Campus and Research Foundation, 352/353, 370/371, Gota Gam, S. G. Road, Ahmedabad, Gujarat 382481. You can also take a 360-degree virtual tour at virtualtour.silveroakuni.ac.in." },
  { intent: "CONTACT", keywords: ["contact", "phone", "number", "email", "helpline", "call"],
    answer: "University contact numbers are 079-35201300, 079-66046300 and +91 9099063464. General enquiries can be emailed to the address listed on silveroakuni.ac.in/contact." },
  { intent: "LAB", keywords: ["lab", "laboratory", "practical", "workshop", "equipment"],
    answer: "The university maintains department-wise laboratories for practicals and project work. Lab timings follow your timetable, and access outside those hours needs permission from the lab in-charge. More at silveroakuni.ac.in/laboratories." },
  { intent: "CLUBS", keywords: ["club", "society", "event", "fest", "cultural", "sports", "activity"],
    answer: "Silver Oak has a wide range of student clubs covering technical, cultural, sports and entrepreneurial interests, plus an IEEE Student Branch. Events such as Kalpvruksh run through the year. Details at silveroakuni.ac.in/student-clubs." },
  { intent: "INCUBATION", keywords: ["incubation", "startup", "innovation", "ignite", "entrepreneur"],
    answer: "The university runs an incubation centre (IGNITE) supporting student startups with mentoring and workspace. Visit ignite.silveroakuni.ac.in for the current cohort and application process." },
  { intent: "MEDICAL", keywords: ["medical", "health", "doctor", "clinic", "first aid", "sick"],
    answer: "Health care services are available on campus for first aid and basic medical support during college hours. For a medical leave application, submit your certificate to your class coordinator and HOD." },
  { intent: "TRANSPORT", keywords: ["bus", "transport", "shuttle", "route", "pickup"],
    answer: "University bus transport operates on set routes across Ahmedabad. Route lists, stops and fees are available at the Transport Office; passes are issued at the start of each semester." },
  { intent: "WIFI", keywords: ["wifi", "internet", "network", "login id", "password reset"],
    answer: "Campus Wi-Fi is available to enrolled students using your university credentials. If your access is not working, the IT Help Desk can reset it. Follow the Handbook of Cyber Hygiene published on the university website." },
  { intent: "ANTI_RAGGING", keywords: ["ragging", "harassment", "bullying", "grievance", "complaint", "discrimination"],
    answer: "Silver Oak has a strict anti-ragging policy and a grievance redressal mechanism. Any incident of ragging, harassment or discrimination should be reported immediately to the Anti-Ragging Committee, your HOD or the Student Welfare Office. Complaints are treated confidentially." },
  { intent: "CONVOCATION", keywords: ["convocation", "graduation", "degree ceremony", "alumni"],
    answer: "Convocation is held annually and eligible graduating students are notified by the Examination Cell with registration details. Degree certificates are distributed at the ceremony or issued afterwards by the Academic Office." },
  { intent: "RANKING", keywords: ["ranking", "rank", "naac", "accreditation", "recognition", "award"],
    answer: "Silver Oak University is a State Private University under the Gujarat Private Universities Act. It has been ranked 7th by The Times of India and 12th by The Week, and was recognised as Most Innovative Engineering College by My FM." },
  { intent: "ABOUT", keywords: ["about", "history", "founded", "motto", "vision", "mission", "students"],
    answer: "Silver Oak University began in 2009 with 240 students and has grown to over 25,000 students across one of Gujarat's largest campuses. Its motto is Gyanam Parmam Bhushanam - knowledge is the highest virtue." },
  { intent: "PORTAL", keywords: ["portal", "login", "student portal", "soumis", "mis"],
    answer: "The official student portal is at studentportal.silveroakuni.ac.in, where you can see attendance, results, fees and notices. If you cannot sign in, the IT Help Desk or Academic Office can reset your access." },
];

interface Msg { role: "user" | "ai"; text: string; meta?: string }

const PERSONAL = /\b(my|mine|i)\b.{0,25}\b(attendance|fee|fees|result|marks|cgpa|sgpa|seat|receipt|certificate|admission|application|scholarship|room|id card|hall ticket|backlog|salary|refund)\b/i;
const COMPLEX = /(complaint|dispute|not working|error|wrong|incorrect|refund|urgent|escalate|why was|denied|rejected|failed to)/i;

function normalize(q: string): string[] {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function bestMatch(q: string): { faq: Faq | null; score: number } {
  const text = " " + q.toLowerCase() + " ";
  const tokens = normalize(q);
  let best: Faq | null = null;
  let bestScore = 0;
  for (const faq of KB) {
    let hits = 0;
    for (const kw of faq.keywords) {
      if (kw.includes(" ") ? text.includes(kw) : tokens.includes(kw)) hits++;
    }
    const score = hits === 0 ? 0 : Math.min(1, 0.55 + hits * 0.15);
    if (score > bestScore) { bestScore = score; best = faq; }
  }
  return { faq: best, score: bestScore };
}

interface Decision { text: string; meta: string; ticket: boolean; category: string }

function decide(q: string, institute: string, course: string): Decision {
  const scope = `${course} - ${institute}`;
  const { faq, score } = bestMatch(q);

  if (PERSONAL.test(q))
    return { text: "That question is about your personal record, which I cannot look up directly. I have raised a ticket so the right desk can check your account and reply.",
      meta: "Personalised query - routed to a human", ticket: true, category: faq?.intent || "ACADEMIC_OFFICE" };

  if (COMPLEX.test(q))
    return { text: "This looks like an issue that needs someone to investigate rather than a standard answer. I have raised a ticket and routed it for you.",
      meta: "Complex query - routed to a human", ticket: true, category: faq?.intent || "ACADEMIC_OFFICE" };

  if (faq && score >= 0.7)
    return { text: faq.answer, meta: `Intent: ${faq.intent} - Confidence ${Math.round(score * 100)}% - Answered by AI`, ticket: false, category: faq.intent };

  if (faq && score >= 0.55)
    return { text: `${faq.answer}\n\nIf this does not cover your case for ${scope}, reply "raise ticket" and I will send it to the right desk.`,
      meta: `Intent: ${faq.intent} - Confidence ${Math.round(score * 100)}% - Answered by AI`, ticket: false, category: faq.intent };

  return { text: `I could not answer that confidently for ${scope}, so I have raised a ticket and routed it to the Academic Office. You will be notified here and by email.`,
    meta: "No confident match - ticket created", ticket: true, category: "ACADEMIC_OFFICE" };
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"college" | "course" | "chat">("college");
  const [institute, setInstitute] = useState("");
  const [course, setCourse] = useState("");
  const [courseInput, setCourseInput] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stats, setStats] = useState({ answered: 0, ticketed: 0 });

  const pickInstitute = (name: string) => { setInstitute(name); setStep("course"); };
  const pickCourse = (name: string) => {
    if (!name.trim()) return;
    setCourse(name.trim());
    setStep("chat");
    setMsgs([{ role: "ai", text: `Thanks. I can answer questions about ${name.trim()} at ${institute} - fees, exams, attendance, results, hostel, library, placements, certificates and more. Personal record checks are sent to staff as a ticket.`, meta: "Knowledge base loaded" }]);
  };
  const restart = () => { setStep("college"); setInstitute(""); setCourse(""); setCourseInput(""); setMsgs([]); };

  const send = async () => {
    if (!input.trim()) return;
    const q = input; setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);

    const forced = /raise ticket|raise a ticket/i.test(q);
    const d = forced
      ? { text: "I have raised a ticket for you and routed it to the Academic Office.", meta: "Ticket requested by student", ticket: true, category: "ACADEMIC_OFFICE" }
      : decide(q, institute, course);

    let meta = d.meta;
    if (d.ticket) {
      const t = await addTicket({
        subject: q.slice(0, 60),
        description: `${q}\n\nInstitute: ${institute}\nCourse: ${course}`,
        category: d.category, priority: "MEDIUM",
      });
      if (t) meta = `${d.meta} - Ticket ${t.code}`;
      setStats((s) => ({ ...s, ticketed: s.ticketed + 1 }));
    } else {
      setStats((s) => ({ ...s, answered: s.answered + 1 }));
    }
    setMsgs((m) => [...m, { role: "ai", text: d.ticket ? d.text + "\n\nIf it is urgent you can also call " + CONTACT : d.text, meta }]);
  };

  const total = stats.answered + stats.ticketed;
  const rate = total ? Math.round((stats.answered / total) * 100) : 0;

  return (
    <>
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full bg-brand glow flex items-center justify-center text-white">
        {open ? <X /> : <Bot />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-28 right-6 z-[60] w-[92vw] max-w-sm p-4 flex flex-col h-[28rem] panel-solid shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Sparkles size={18} className="text-brand-light" />
              <b>AI Help Desk</b>
              {step === "chat"
                ? <button onClick={restart} className="ml-auto text-xs text-[var(--muted)] flex items-center gap-1"><ArrowLeft size={12} /> Change</button>
                : <span className="ml-auto text-xs text-[var(--muted)]">{KB.length} topics</span>}
            </div>

            {step === "college" && (
              <div className="flex-1 overflow-y-auto py-3">
                <p className="text-sm mb-3">Which college or institute are you asking about?</p>
                <div className="space-y-1">
                  {INSTITUTES.map((i) => (
                    <button key={i} onClick={() => pickInstitute(i)}
                      className="w-full text-left text-xs glass px-3 py-2 hover:bg-brand/20 transition">{i}</button>
                  ))}
                </div>
              </div>
            )}

            {step === "course" && (
              <div className="flex-1 overflow-y-auto py-3">
                <p className="text-sm mb-1">{institute}</p>
                <p className="text-xs text-[var(--muted)] mb-3">Which course or programme are you asking from?</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(COMMON_COURSES[institute] || []).map((c) => (
                    <button key={c} onClick={() => pickCourse(c)} className="text-xs glass px-3 py-1.5 hover:bg-brand/20 transition">{c}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={courseInput} onChange={(e) => setCourseInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && pickCourse(courseInput)}
                    placeholder="Type your course (e.g. B.Sc Nursing)"
                    className="flex-1 glass px-3 py-2 bg-transparent outline-none text-xs" />
                  <button onClick={() => pickCourse(courseInput)} className="px-3 py-2 rounded-full bg-brand text-white text-xs">Next</button>
                </div>
                <button onClick={() => setStep("college")} className="mt-3 text-xs text-[var(--muted)] flex items-center gap-1"><ArrowLeft size={12} /> Back</button>
              </div>
            )}

            {step === "chat" && (
              <>
                <div className="flex justify-between text-[10px] text-[var(--muted)] pt-2">
                  <span>{course} - {institute}</span>
                  {total > 0 && <span>{rate}% resolved by AI</span>}
                </div>
                <div className="flex-1 overflow-y-auto py-2 space-y-3 text-sm">
                  {msgs.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "text-right" : ""}>
                      <div className={`inline-block px-3 py-2 rounded-2xl whitespace-pre-line ${m.role === "user" ? "bg-brand text-white" : "glass"}`}>{m.text}</div>
                      {m.meta && <div className="text-[10px] text-[var(--muted)] mt-1">{m.meta}</div>}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--muted)] pt-2 border-t border-[var(--border)] leading-relaxed">
                  Not solved here? Call {CONTACT}
                </div>
                <div className="flex gap-2 pt-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask about fees, exams, hostel, library..." className="flex-1 bg-transparent outline-none text-sm px-2" />
                  <button onClick={send} className="p-2 rounded-full bg-brand text-white"><Send size={16} /></button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



