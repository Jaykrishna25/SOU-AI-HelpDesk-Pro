"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles } from "lucide-react";

interface Msg { role: "user" | "ai"; text: string; meta?: string; }

// Offline-capable demo: mirrors backend agent pipeline logic for the landing demo.
function localAnswer(q: string): { text: string; meta: string } {
  const s = q.toLowerCase();
  if (s.includes("exam") || s.includes("semester 7"))
    return { text: "Semester 7 end-semester examinations begin on 20 November 2026. Hall tickets release 5 days prior.", meta: "Intent: EXAMS · Confidence 94% · Answered directly" };
  if (s.includes("fee"))
    return { text: "B.Tech CSE fees are ₹1,20,000/sem in two installments. Last date: 15 Aug 2026.", meta: "Intent: FEES · Confidence 92% · Answered directly" };
  if (s.includes("attendance"))
    return { text: "Minimum 75% attendance per subject is required to sit for end-sem exams.", meta: "Intent: ATTENDANCE · Confidence 91% · Answered directly" };
  return { text: "I couldn't answer confidently, so I've raised a ticket and routed it to the Academic Office. You'll be notified.", meta: "Confidence < 90% · Ticket TKT-2026-0042 created · Routed: Academic Office" };
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm the SOU multi-agent assistant. Ask me about exams, fees, attendance…", meta: "12 agents online" },
  ]);
  const send = () => {
    if (!input.trim()) return;
    const q = input; setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setTimeout(() => {
      const a = localAnswer(q);
      setMsgs((m) => [...m, { role: "ai", text: a.text, meta: a.meta }]);
    }, 500);
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
            className="fixed bottom-28 right-6 z-[60] w-[92vw] max-w-sm glass p-4 flex flex-col h-[26rem]">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Sparkles size={18} className="text-brand-light" />
              <b>AI Help Desk</b>
              <span className="ml-auto text-xs text-[var(--muted)]">RAG + 12 agents</span>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-sm">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : ""}>
                  <div className={`inline-block px-3 py-2 rounded-2xl ${m.role === "user" ? "bg-brand text-white" : "glass"}`}>{m.text}</div>
                  {m.meta && <div className="text-[10px] text-[var(--muted)] mt-1">{m.meta}</div>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about exams, fees…" className="flex-1 bg-transparent outline-none text-sm px-2" />
              <button onClick={send} className="p-2 rounded-full bg-brand text-white"><Send size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
