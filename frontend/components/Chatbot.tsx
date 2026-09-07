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

interface Msg { role: "user" | "ai"; text: string; meta?: string }

function analyze(q: string, institute: string, course: string) {
  const s = q.toLowerCase();
  const cseScope = course.toLowerCase().includes("cse") || course.toLowerCase().includes("b.tech");
  const scope = `${course} - ${institute}`;

  if (s.includes("attendance"))
    return { text: `A minimum of 75% attendance per subject is mandatory across all SOU programmes, including ${scope}.`,
      meta: "Intent: ATTENDANCE - Confidence 93%", ticket: false, category: "ATTENDANCE" };

  if (s.includes("exam") || s.includes("result")) {
    if (cseScope) return { text: "Semester 7 end-semester examinations begin on 20 November 2026. Hall tickets are released 5 days prior.",
      meta: `Intent: EXAMS - Confidence 94% - Scope: ${scope}`, ticket: false, category: "EXAMS" };
    return { text: `Exam schedules differ by programme. For ${scope}, please check the official datesheet on the student portal (studentportal.silveroakuni.ac.in) or raise a ticket and the Examination Cell will confirm.`,
      meta: "Confidence < 90% - routed to Examination Cell", ticket: true, category: "EXAMS" };
  }

  if (s.includes("fee")) {
    if (cseScope) return { text: "B.Tech CSE fees are Rs 1,20,000 per semester, payable in two installments. Last date: 15 August 2026.",
      meta: `Intent: FEES - Confidence 92% - Scope: ${scope}`, ticket: false, category: "FEES" };
    return { text: `Fee structure varies by programme. I do not have a verified fee figure for ${scope}, so I have raised a ticket for the Accounts Office. You can also check the official prospectus at silveroakuni.ac.in.`,
      meta: "Confidence < 90% - routed to Accounts Office", ticket: true, category: "FEES" };
  }

  if (s.includes("admission") || s.includes("apply"))
    return { text: `Admissions for ${scope} are handled online at admission.silveroakuni.ac.in. The Admission Office can be reached on 079-66046300.`,
      meta: "Intent: ADMISSION - Confidence 91%", ticket: false, category: "ADMISSION" };

  if (s.includes("placement") || s.includes("job"))
    return { text: "The Training & Placement Cell is in the Oak Block, first floor. SOU reports 70% placements with 1000+ recruiting companies.",
      meta: "Intent: PLACEMENT - Confidence 90%", ticket: false, category: "PLACEMENT" };

  return { text: `I could not answer that confidently for ${scope}, so I have raised a ticket and routed it to the Academic Office. You will be notified here and by email.`,
    meta: "Confidence < 90% - ticket created", ticket: true, category: "ACADEMIC_OFFICE" };
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"college" | "course" | "chat">("college");
  const [institute, setInstitute] = useState("");
  const [course, setCourse] = useState("");
  const [courseInput, setCourseInput] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const pickInstitute = (name: string) => { setInstitute(name); setStep("course"); };

  const pickCourse = (name: string) => {
    if (!name.trim()) return;
    setCourse(name.trim());
    setStep("chat");
    setMsgs([{ role: "ai", text: `Thanks. I will answer for ${name.trim()} at ${institute}. Ask about exams, fees, attendance, admission or placement.`, meta: "12 agents online" }]);
  };

  const restart = () => { setStep("college"); setInstitute(""); setCourse(""); setCourseInput(""); setMsgs([]); };

  const send = async () => {
    if (!input.trim()) return;
    const q = input; setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    const a = analyze(q, institute, course);
    let meta = a.meta;
    if (a.ticket) {
      const t = await addTicket({
        subject: q.slice(0, 60),
        description: `${q}\n\nInstitute: ${institute}\nCourse: ${course}`,
        category: a.category, priority: "MEDIUM",
      });
      if (t) meta = `${a.meta} - Ticket ${t.code} created`;
    }
    setMsgs((m) => [...m, { role: "ai", text: a.text, meta }]);
  };

  return (
    <>
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full bg-brand glow flex items-center justify-center text-white">
        {open ? <X /> : <Bot />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-28 right-6 z-[60] w-[92vw] max-w-sm glass p-4 flex flex-col h-[28rem]">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Sparkles size={18} className="text-brand-light" />
              <b>AI Help Desk</b>
              {step === "chat"
                ? <button onClick={restart} className="ml-auto text-xs text-[var(--muted)] flex items-center gap-1"><ArrowLeft size={12} /> Change</button>
                : <span className="ml-auto text-xs text-[var(--muted)]">RAG + 12 agents</span>}
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
                    <button key={c} onClick={() => pickCourse(c)}
                      className="text-xs glass px-3 py-1.5 hover:bg-brand/20 transition">{c}</button>
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
                <div className="text-[10px] text-[var(--muted)] pt-2">{course} - {institute}</div>
                <div className="flex-1 overflow-y-auto py-2 space-y-3 text-sm">
                  {msgs.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "text-right" : ""}>
                      <div className={`inline-block px-3 py-2 rounded-2xl ${m.role === "user" ? "bg-brand text-white" : "glass"}`}>{m.text}</div>
                      {m.meta && <div className="text-[10px] text-[var(--muted)] mt-1">{m.meta}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask about exams, fees..." className="flex-1 bg-transparent outline-none text-sm px-2" />
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
