"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hammer, Briefcase, Users, Lightbulb, Rocket, HeartHandshake, Crown, ArrowRight, LogOut,
} from "lucide-react";
import {
  Particles, Noise, Vignette, Protagonist, Gate, BrandBoard, PortalFX,
  Headline, CTA, GOLD, MAROON, rnd,
} from "./Atoms";

const EASE = [0.2, 0, 0.2, 1] as any;

/* ============ ACT 1 - the uncertain beginning ============ */
const QUESTIONS = [
  "What should I learn?", "What career fits me?",
  "How do I build my future?", "Where do I begin?",
  "Am I good enough?", "What comes after this?",
];

export function ActQuestion({ onNext }: { onNext: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(180deg,#05070f 0%,#0a0c16 55%,#050609 100%)" }}>
      <Particles count={26} tint="#7c8ba1" max={2} />

      {QUESTIONS.map((q, i) => (
        <motion.div key={q} className="absolute lp-glass rounded-full px-4 py-2 text-[11px] md:text-xs lp-gpu"
          style={{
            left: 8 + rnd(i, 7) * 78 + "%",
            top: 16 + rnd(i, 9) * 62 + "%",
            color: "rgba(226,232,240,.75)",
            animation: "lp-float " + (6 + rnd(i, 11) * 5) + "s ease-in-out " + (-i * 0.8) + "s infinite",
          }}
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.5 + i * 0.22 }}>
          {q}
        </motion.div>
      ))}

      <motion.div className="absolute bottom-[16vh] left-[16%] lp-gpu"
        initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.6, ease: EASE }}>
        <Protagonist variant="seeker" size="34vh" />
      </motion.div>

      <div className="relative" style={{ zIndex: 20 }}>
        <Headline eyebrow="Silver Oak University" title="Every great future starts with a question."
          sub="Most journeys begin without a map. This one begins with curiosity." delay={0.9}>
          <CTA onClick={onNext}>Begin Your Journey <ArrowRight size={16} /></CTA>
        </Headline>
      </div>

      <Vignette />
      <Noise />
    </div>
  );
}

/* ============ ACT 2 - arrival ============ */
export function ActGate({ onNext }: { onNext: () => void }) {
  return (
    <motion.div className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#1b2438 0%,#4a3a2a 48%,#2a1e14 100%)" }}
      onAnimationComplete={() => setTimeout(onNext, 1400)}>
      <motion.div className="absolute inset-0 lp-gpu"
        initial={{ scale: 1 }} animate={{ scale: 1.34 }}
        transition={{ duration: 5.2, ease: EASE }}>
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 72%, rgba(255,196,110,.42), transparent 58%)" }} />
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute lp-beam"
            style={{ left: 28 + i * 18 + "%", top: "-10%", width: 2, height: "90%",
              transform: "rotate(" + (8 + i * 4) + "deg)",
              background: "linear-gradient(180deg,rgba(255,220,150,.55),transparent)",
              animationDelay: i * 1.3 + "s" }} />
        ))}
        <Gate />
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="absolute lp-gpu"
            style={{ left: rnd(i, 21) * 100 + "%", top: "-4%", width: 7, height: 4, borderRadius: "60% 0",
              background: "rgba(120,150,90,.55)",
              animation: "lp-leaf " + (9 + rnd(i, 23) * 8) + "s linear " + (-rnd(i, 25) * 9) + "s infinite" }} />
        ))}
      </motion.div>

      <motion.div className="absolute bottom-[14vh] lp-gpu" style={{ zIndex: 5 }}
        initial={{ left: "6%", opacity: 0 }} animate={{ left: "44%", opacity: 1 }}
        transition={{ left: { duration: 5.0, ease: "easeOut" }, opacity: { duration: 1.2 } }}>
        <Protagonist variant="seeker" size="26vh" />
      </motion.div>

      <div className="absolute inset-x-0 top-[16vh] flex justify-center">
        <Headline title="A place to discover what you can become." delay={1.4} />
      </div>

      <Particles count={22} tint="#ffd9a0" max={2.4} />
      <Vignette strength={0.78} />
      <Noise />
    </motion.div>
  );
}

/* ============ ACT 3 - branding reveal ============ */
export function ActBrand({ onNext }: { onNext: () => void }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg,#241a12 0%,#3a2a1c 50%,#150e09 100%)" }}>
      <motion.div className="absolute inset-0 lp-gpu"
        initial={{ scale: 1.5, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.6, ease: EASE }}>
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(201,162,39,.30), transparent 62%)" }} />
      </motion.div>

      <motion.div className="relative lp-gpu" style={{ zIndex: 10 }}
        initial={{ scale: 0.62, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 2.4, ease: EASE }}
        onAnimationComplete={() => setTimeout(onNext, 2000)}>
        <BrandBoard glow />
      </motion.div>

      <motion.div className="absolute bottom-[9vh] text-center px-6" style={{ zIndex: 20 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6, duration: 1 }}>
        <div className="text-[11px] uppercase tracking-[0.42em]" style={{ color: GOLD }}>
          Gyanam Parmam Bhushanam
        </div>
      </motion.div>

      <Particles count={34} tint="#ffe6a8" max={3} />
      <Vignette strength={0.8} />
      <Noise />
    </motion.div>
  );
}

/* ============ ACT 4 - portal ============ */
export function ActPortal({ onNext }: { onNext: () => void }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 50%,#241536 0%,#0d0718 55%,#05030c 100%)" }}
      animate={{ x: [0, -3, 3, -2, 0], y: [0, 2, -3, 1, 0] }}
      transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.7, 1] }}>

      <motion.div className="absolute lp-gpu" style={{ zIndex: 5 }}
        initial={{ scale: 1, opacity: 1 }} animate={{ scale: 0.34, opacity: 0.22 }}
        transition={{ duration: 1.8, ease: EASE }}>
        <BrandBoard width="min(520px, 70vw)" />
      </motion.div>

      <PortalFX level={1} />

      <div className="relative" style={{ zIndex: 20 }}>
        <Headline eyebrow="The gateway opens" title="Step into your future."
          sub="Silver Oak is not a destination. It is the doorway." delay={1.3}>
          <CTA onClick={onNext}>Enter SOU Portal <ArrowRight size={16} /></CTA>
        </Headline>
      </div>

      <Particles count={44} tint="#c4b5fd" max={3.4} />
      <Noise opacity={0.05} />
    </motion.div>
  );
}

/* ============ ACT 5 - inside the portal ============ */
const WORLDS = [
  { icon: Hammer, t: "Learn by Building", d: "Turn ideas into real projects.",
    more: "Studio-style labs, hackathons and semester projects where the deliverable is something that works, not something that was written about." },
  { icon: Briefcase, t: "Industry Exposure", d: "Gain the skills employers value.",
    more: "Internships, live client briefs and industry-designed electives that map to what hiring teams actually test for." },
  { icon: Users, t: "Expert Guidance", d: "Learn with mentors who challenge and support you.",
    more: "Faculty who have shipped, researched and built, available beyond the lecture hour." },
  { icon: Lightbulb, t: "Innovation Culture", d: "Explore technology, research and entrepreneurship.",
    more: "Research cells, incubation support and funding pathways for students who want to build their own thing." },
  { icon: Rocket, t: "Career Ready", d: "Build confidence for the real world.",
    more: "Placement training, mock interviews, portfolio reviews and aptitude preparation from year two onward." },
  { icon: HeartHandshake, t: "Campus Life", d: "Find your people and your place.",
    more: "Thirty-plus clubs, sport, cultural festivals and a campus that stays busy after the last lecture." },
  { icon: Crown, t: "Leadership", d: "Turn initiative into enterprise.",
    more: "Student governance, event ownership and entrepreneurship tracks that reward people who step forward." },
];

export function ActInside({ onNext }: { onNext: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <motion.div className="absolute inset-0 overflow-y-auto"
      style={{ background: "radial-gradient(ellipse at 50% -10%,#2a1b47 0%,#0d0a1a 50%,#06060c 100%)" }}
      initial={{ opacity: 0, scale: 1.16 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, ease: EASE }}>

      <div className="absolute left-1/2 top-[38%] lp-spin pointer-events-none"
        style={{ width: "70vmin", height: "70vmin", marginLeft: "-35vmin", marginTop: "-35vmin",
          borderRadius: "50%", border: "1px dashed rgba(255,255,255,.09)" }} />
      <div className="absolute left-1/2 top-[38%] lp-spin-rev pointer-events-none"
        style={{ width: "48vmin", height: "48vmin", marginLeft: "-24vmin", marginTop: "-24vmin",
          borderRadius: "50%", border: "1px solid rgba(201,162,39,.14)" }} />

      <div className="relative px-5 md:px-10 py-[10vh]" style={{ zIndex: 20 }}>
        <Headline eyebrow="Inside Silver Oak" title="An ecosystem, not a syllabus."
          sub="Seven worlds that turn knowledge into capability." />

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
          {WORLDS.map((w, i) => {
            const Icon = w.icon;
            const isOpen = open === i;
            return (
              <motion.button key={w.t} onClick={() => setOpen(isOpen ? null : i)}
                className="lp-glass rounded-2xl p-5 text-left lp-gpu relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: EASE }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                style={{ animation: "lp-float-s " + (5 + i * 0.4) + "s ease-in-out " + (-i * 0.6) + "s infinite" }}>
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0
                  group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle,rgba(201,162,39,.22),transparent 70%)" }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg," + MAROON + ",#3c0a14)", color: GOLD }}>
                  <Icon size={20} />
                </div>
                <div className="font-medium">{w.t}</div>
                <div className="text-sm opacity-65 mt-1">{w.d}</div>
                <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.35 }} className="overflow-hidden">
                  <div className="text-xs opacity-60 mt-3 leading-relaxed">{w.more}</div>
                </motion.div>
                <div className="text-[10px] uppercase tracking-widest mt-4 opacity-40">
                  {isOpen ? "Close" : "Read more"}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-14 flex justify-center">
          <CTA onClick={onNext} variant="ghost"><LogOut size={16} /> Exit Portal</CTA>
        </div>
      </div>

      <Particles count={30} tint="#a78bfa" max={2.6} />
      <Noise opacity={0.045} />
    </motion.div>
  );
}

/* ============ ACT 6 - the transformed person ============ */
const SKILLS = ["Machine Learning", "Cloud", "Leadership", "Research", "Product Thinking",
  "Teamwork", "Communication", "Entrepreneurship"];

export function ActTransformed() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#0b1430 0%,#3d2a5e 38%,#b8763a 78%,#f2c46b 100%)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>

      <motion.div className="absolute inset-0 lp-gpu"
        initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 3.4, ease: EASE }}>
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 84%, rgba(255,236,180,.6), transparent 56%)" }} />
        <svg viewBox="0 0 1200 300" className="absolute bottom-0 w-full" preserveAspectRatio="none"
          style={{ height: "34vh", opacity: 0.5 }}>
          {[60, 150, 250, 360, 470, 590, 700, 820, 930, 1050].map((x, i) => (
            <rect key={x} x={x} y={300 - (70 + rnd(i, 31) * 150)} width={54 + rnd(i, 33) * 30}
              height={70 + rnd(i, 31) * 150} fill="#2a1c3d" opacity={0.5 + rnd(i, 35) * 0.4} />
          ))}
        </svg>
      </motion.div>

      {SKILLS.map((s, i) => (
        <motion.div key={s} className="absolute lp-glass rounded-full px-3.5 py-1.5 text-[11px] lp-gpu"
          style={{
            left: 6 + rnd(i, 41) * 84 + "%", top: 14 + rnd(i, 43) * 46 + "%",
            color: "#fff", borderColor: "rgba(255,225,150,.3)",
            animation: "lp-float " + (6 + rnd(i, 45) * 4) + "s ease-in-out " + (-i * 0.7) + "s infinite",
          }}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 1.2 + i * 0.16 }}>
          {s}
        </motion.div>
      ))}

      <motion.div className="absolute left-1/2 bottom-[13vh] lp-gpu"
        style={{ marginLeft: "-8vh", zIndex: 10 }}
        initial={{ scale: 0.55, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 3.0, ease: EASE, delay: 0.4 }}>
        <Protagonist variant="graduate" size="40vh" />
      </motion.div>

      <div className="absolute inset-x-0 top-[11vh] flex justify-center" style={{ zIndex: 20 }}>
        <Headline eyebrow="The return" title="From curious learner to confident professional."
          sub="At Silver Oak University, knowledge becomes capability, and potential becomes impact."
          delay={1.8}>
          <CTA href="/login">Explore Programs</CTA>
          <CTA href="/login" variant="ghost">Start Your Journey <ArrowRight size={16} /></CTA>
        </Headline>
      </div>

      <Particles count={30} tint="#fff1c9" max={3} />
      <Noise opacity={0.04} />
    </motion.div>
  );
}
