"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bot, Ticket, BrainCircuit, Bell, ShieldCheck, Cloud, GraduationCap, Users,
  BarChart3, Workflow, Database, Sparkles, ArrowRight, MessageSquare, Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ThreeBackground from "@/components/ThreeBackground";
import Chatbot from "@/components/Chatbot";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const features = [
  { icon: Bot, title: "Multi-Agent AI Help Desk", desc: "12 cooperating agents detect intent, retrieve knowledge, decide, route & notify." },
  { icon: BrainCircuit, title: "RAG Knowledge Engine", desc: "Semantic search over circulars, policies & FAQs with confidence-gated answers." },
  { icon: Ticket, title: "Smart Ticketing + SLA", desc: "Auto-ticketing below 90% confidence, 48h SLA, auto-escalation letters." },
  { icon: Bell, title: "Real-Time Notifications", desc: "Watchers auto-added across the chain; In-App + AWS SES email on every event." },
  { icon: BarChart3, title: "Analytics Dashboards", desc: "Revenue, admissions, attendance, AI accuracy & workforce KPIs via Recharts." },
  { icon: Workflow, title: "Workflow Automation", desc: "Student → AI → Admin → Faculty → HOD → Owner → Resolution → KB learning." },
  { icon: ShieldCheck, title: "RBAC + Audit Logs", desc: "JWT + refresh tokens, 7 role portals, full audit trail & responsible AI." },
  { icon: Cloud, title: "Cloud-Native (AWS)", desc: "EC2, RDS, S3, SES, Cognito, IAM, CloudWatch — Dockerized & CI/CD ready." },
];

const agents = [
  "Intent Recognition", "Entity Extraction", "Knowledge Retrieval", "RAG",
  "Decision", "Ticket", "Faculty Routing", "Email",
  "Learning", "Analytics", "Notification Orchestration", "Sentiment",
];

const portals = [
  { icon: GraduationCap, name: "Student", pts: ["Timetable & attendance", "Fees & receipts", "Results, SGPA/CGPA", "AI assistant & tickets"] },
  { icon: Users, name: "Admin", pts: ["Classroom management", "Resource allocation", "Ticket assignment", "Announcements"] },
  { icon: BrainCircuit, name: "Faculty", pts: ["Mark attendance", "Upload content", "Exam duties", "Salary & tickets"] },
  { icon: Layers, name: "HOD / HOI", pts: ["Student/faculty analytics", "Add/remove members", "Meetings & events", "Department reports"] },
  { icon: BarChart3, name: "Owner", pts: ["Revenue analytics", "AI forecasting", "Workforce KPIs", "Governance & escalations"] },
  { icon: ShieldCheck, name: "Super Admin", pts: ["Global config", "RBAC control", "Audit logs", "SLA sweeps"] },
];

const stack = ["Next.js 15", "React 19", "TypeScript", "Tailwind", "Framer Motion", "GSAP", "Three.js", "Recharts", "Node.js", "Express", "PostgreSQL", "Prisma", "OpenAI", "LangChain", "AWS", "Docker"];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="aurora" />
      <ThreeBackground />
      <Navbar />
      <Chatbot />

      {/* HERO */}
      <section className="relative z-10 pt-40 pb-24 px-6 text-center max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 glass px-4 py-1.5 text-xs mb-6">
          <Sparkles size={14} className="text-brand-light" /> Silver Oak University · Enterprise SaaS
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold leading-tight">
          <span className="gradient-text">SOU AI HelpDesk Pro</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto">
          A cloud-native University ERP + Student Information System fused with a multi-agent AI
          help desk, RAG knowledge engine, ticketing, workflow automation & real-time analytics.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link href="/login" className="px-7 py-3 rounded-full bg-brand text-white font-semibold glow hover:bg-brand-light transition flex items-center gap-2">
            Launch Platform <ArrowRight size={18} />
          </Link>
          <a href="#agents" className="px-7 py-3 rounded-full glass font-semibold flex items-center gap-2">
            <MessageSquare size={18} /> See the AI Agents
          </a>
        </motion.div>

        {/* stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Auto-Resolution", 68, "%"], ["AI Accuracy", 92, "%"], ["Response SLA", 48, "h"], ["AI Agents", 12, ""]].map(([l, n, s], i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
              className="glass p-6">
              <div className="text-4xl font-bold gradient-text"><Counter to={n as number} suffix={s as string} /></div>
              <div className="text-sm text-[var(--muted)] mt-1">{l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <Reveal><h2 className="text-4xl font-bold text-center mb-4">Everything a university needs, <span className="gradient-text">unified</span></h2></Reveal>
        <Reveal delay={0.1}><p className="text-center text-[var(--muted)] mb-14 max-w-2xl mx-auto">ERP, SIS, help desk, AI, cloud & analytics in one production-ready platform.</p></Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <motion.div whileHover={{ y: -8, scale: 1.02 }} className="glass p-6 h-full">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mb-4">
                  <f.icon className="text-brand-light" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--muted)]">{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <Reveal><h2 className="text-4xl font-bold text-center mb-4">A <span className="gradient-text">multi-agent</span> brain</h2></Reveal>
        <Reveal delay={0.1}><p className="text-center text-[var(--muted)] mb-14 max-w-2xl mx-auto">Every query flows through a LangChain-style pipeline. Confidence ≥ 90% answers instantly; below that, a ticket is born.</p></Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {agents.map((a, i) => (
            <Reveal key={a} delay={i * 0.04}>
              <motion.div whileHover={{ scale: 1.05 }} className="glass p-5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                <span className="text-sm font-medium">{a} Agent</span>
              </motion.div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div className="glass mt-10 p-6 text-center text-sm text-[var(--muted)]">
            <b className="text-[var(--text)]">Flow:</b> Student → AI Chatbot → Confidence Check → (Answer or Ticket) → Admin → Faculty → HOD → Owner → Resolution → Knowledge Base Update → Student Notification
          </div>
        </Reveal>
      </section>

      {/* PORTALS */}
      <section id="portals" className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <Reveal><h2 className="text-4xl font-bold text-center mb-14">Seven role-based <span className="gradient-text">portals</span></h2></Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <motion.div whileHover={{ y: -6 }} className="glass p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <p.icon className="text-brand-light" />
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                </div>
                <ul className="space-y-2 text-sm text-[var(--muted)]">
                  {p.pts.map((pt) => <li key={pt} className="flex gap-2"><span className="text-brand-light">▹</span>{pt}</li>)}
                </ul>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics" className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <Reveal><h2 className="text-4xl font-bold text-center mb-14">Live <span className="gradient-text">analytics</span> at every level</h2></Reveal>
        <Reveal delay={0.1}><AnalyticsCharts /></Reveal>
      </section>

      {/* STACK */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto text-center">
        <Reveal><h2 className="text-4xl font-bold mb-10 flex items-center justify-center gap-3"><Database className="text-brand-light" /> Built on a modern stack</h2></Reveal>
        <div className="flex flex-wrap justify-center gap-3">
          {stack.map((s, i) => (
            <Reveal key={s} delay={i * 0.03}>
              <span className="glass px-4 py-2 text-sm">{s}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA / FOOTER */}
      <footer className="relative z-10 py-20 px-6 text-center">
        <Reveal>
          <div className="glass max-w-3xl mx-auto p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to explore <span className="gradient-text">SOU AI HelpDesk Pro?</span></h2>
            <p className="text-[var(--muted)] mb-8">Sign in with any demo role and experience the full enterprise platform.</p>
            <Link href="/login" className="px-8 py-3 rounded-full bg-brand text-white font-semibold glow inline-flex items-center gap-2">
              Enter the Platform <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
        <p className="mt-12 text-xs text-[var(--muted)]">© 2026 Silver Oak University · SOU AI HelpDesk Pro · Enterprise University ERP & Multi-Agent Help Desk</p>
      </footer>
    </main>
  );
}
