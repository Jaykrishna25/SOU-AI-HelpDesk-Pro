"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { ArrowRight, LogOut, SkipForward, RotateCcw } from "lucide-react";
import {
  Plane, Haze, Treeline, LightShafts, Motes, GateArch, BrandingBoard, Portal, Figure,
  KnowledgePanel, WORLDS, LOGO, GOLD, MAROON, rnd,
} from "@/components/journey/Layers";

const EASE = [0.25, 0, 0.18, 1] as any;

/* depth of each plane in the corridor */
const Z = {
  haze: -5400, treeline: -3600, shafts: -3000, gate: -2400,
  seeker: -1450, glyphs: -1900, board: -1750, portal: -1700,
  panels: -800, hero: -900,
};

/* one camera position per chapter */
const CAM = [0, 900, 1500, 1560, 2900, 1560, 560];
const DUR = [0, 3.2, 3.0, 1.2, 2.6, 2.4, 2.8];
const CHAPTERS = ["Uncertainty", "Arrival", "Silver Oak", "The Gateway", "Knowledge", "Return", "Becoming"];

const GLYPHS = [
  "What should I learn?", "Where do I begin?", "What am I good at?",
  "What comes after this?", "Who will guide me?", "Is this enough?",
];

const o = (c: number, map: Record<number, number>, fallback = 0) =>
  map[c] !== undefined ? map[c] : fallback;

export default function Journey() {
  const [ch, setCh] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const z = useMotionValue(0);
  const timers = useRef<any[]>([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const goto = useCallback((n: number) => {
    const t = Math.max(0, Math.min(6, n));
    clear();
    setOpen(null);
    setCh(t);
    animate(z, CAM[t], { duration: reduced ? 0.25 : (DUR[t] || 2), ease: EASE });
    if (!reduced) {
      if (t === 1) timers.current.push(setTimeout(() => goto(2), 3400));
      if (t === 2) timers.current.push(setTimeout(() => goto(3), 3000));   // ~2s clear hold on the logo
      if (t === 5) timers.current.push(setTimeout(() => goto(6), 2000));
    }
  }, [z, reduced]);

  useEffect(() => {
    const r = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    setReady(true);
    if (r) { setCh(6); z.set(CAM[6]); }
    return clear;
  }, [z]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goto(ch + 1);
      if (e.key === "ArrowLeft") goto(ch - 1);
      if (e.key === "Escape") goto(6);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ch, goto]);

  if (!ready) return <div className="fixed inset-0 bg-[#050404]" />;

  const portalLevel = ch === 3 ? 1 : ch === 4 ? 0.85 : ch === 5 ? 0.3 : 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050404] text-[#f4efe3] select-none">

      {/* ================= CORRIDOR ================= */}
      <div className="absolute inset-0" style={{ perspective: "1100px", perspectiveOrigin: "50% 46%" }}>
        <motion.div className="absolute inset-0 jn-3d jn-gpu" style={{ z }}>

          <Plane z={Z.haze}><Haze /></Plane>

          <Plane z={Z.treeline} blur={3}
            opacity={o(ch, { 0: 1, 1: 1, 2: 1, 3: .8, 4: 0, 5: .8, 6: 1 })}>
            <Treeline />
          </Plane>

          <Plane z={Z.shafts} blur={1}
            opacity={o(ch, { 0: .35, 1: .9, 2: 1, 3: .6, 4: 0, 5: .7, 6: 1 })}>
            <LightShafts />
          </Plane>

          <Plane z={Z.gate} opacity={o(ch, { 0: .9, 1: 1, 2: 1, 3: .9, 4: 0, 5: .9, 6: 1 })}>
            <GateArch />
          </Plane>

          {/* drifting questions */}
          <Plane z={Z.glyphs} opacity={o(ch, { 0: 1, 1: .35 })}>
            <div className="absolute inset-0">
              {GLYPHS.map((g, i) => (
                <span key={g} className="absolute jn-glass rounded-full px-4 py-2 text-[12px] jn-display jn-gpu"
                  style={{
                    left: 8 + rnd(i, 11) * 76 + "%", top: 16 + rnd(i, 13) * 58 + "%",
                    color: "rgba(226,222,210,.8)",
                    animation: "jn-bob " + (6 + rnd(i, 15) * 5) + "s ease-in-out " + (-i * 0.9) + "s infinite",
                  }}>{g}</span>
              ))}
            </div>
          </Plane>

          <Plane z={Z.seeker} opacity={o(ch, { 0: 1, 1: .9 })}>
            <div className="absolute" style={{ left: "26%", bottom: "22%" }}>
              <Figure height="30vh" />
            </div>
          </Plane>

          {/* branding board - the anchor of the whole story */}
          <Plane z={Z.board} opacity={o(ch, { 0: .3, 1: .7, 2: 1, 3: 1, 4: 0, 5: 1, 6: 1 })}>
            <BrandingBoard igniting={ch === 3} />
          </Plane>

          <Plane z={Z.portal} opacity={portalLevel > 0 ? 1 : 0}>
            <Portal level={portalLevel} />
          </Plane>

          {/* knowledge corridor - panels you fly between */}
          <div className="absolute inset-0 jn-3d pointer-events-none"
            style={{ transform: "translateZ(" + Z.panels + "px)" }}>
            <div className={"absolute inset-0 jn-3d " + (ch === 4 ? "pointer-events-auto" : "")}>
              {WORLDS.map((w, i) => (
                <KnowledgePanel key={w.t} w={w} i={i} active={ch === 4}
                  open={open === i} onOpen={() => setOpen(open === i ? null : i)} />
              ))}
            </div>
          </div>

          <Plane z={Z.hero} opacity={ch === 6 ? 1 : 0}>
            <div className="absolute" style={{ left: "50%", bottom: "20%", transform: "translateX(-50%)" }}>
              <Figure transformed height="36vh" />
            </div>
          </Plane>

        </motion.div>
      </div>

      {/* atmosphere that never moves with the camera */}
      <Motes n={ch >= 4 ? 44 : 28} tint={ch >= 4 ? "#ffe9b8" : ch === 6 ? "#fff3d0" : "#d8c9a8"} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 32%, rgba(3,2,2,.88) 100%)" }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: ch === 6 ? 1 : 0 }} transition={{ duration: 2.4 }}
        style={{ background: "linear-gradient(180deg,rgba(20,12,30,0) 40%,rgba(201,162,39,.22) 78%,rgba(255,225,150,.35) 100%)" }} />

      {/* ================= NAVBAR ================= */}
      <header className="absolute inset-x-0 top-0 z-50">
        <div className={"mx-auto max-w-[1400px] m-3 md:m-5 px-4 md:px-7 py-3 rounded-full flex items-center justify-between gap-5 transition-all duration-700 " +
          (ch >= 4 ? "jn-glass" : "border border-transparent")}>
          {/* >>> Silver Oak logo <<< */}
          <button onClick={() => goto(0)} className="shrink-0">
            <img src={LOGO} alt="Silver Oak University" className="h-8 md:h-9 w-auto"
              style={{ filter: "brightness(1.55) contrast(1.05)", mixBlendMode: "screen" }} />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-wide jn-display">
            {[["The Journey", 0], ["Campus", 1], ["Portal", 4], ["Outcomes", 6]].map(([l, c]) => (
              <button key={String(l)} onClick={() => goto(c as number)}
                className="relative opacity-60 hover:opacity-100 transition-opacity">{l}</button>
            ))}
          </nav>
          <a href="/login" className="shrink-0 px-5 py-2 rounded-full text-[12px] tracking-wide transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg," + MAROON + ",#a3162a)", color: "#fff" }}>
            Apply Now
          </a>
        </div>
      </header>

      {/* ================= CHAPTER COPY ================= */}
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
        <AnimatePresence mode="wait">
          {ch === 0 && (
            <Copy key="c0" eyebrow="Chapter One" title="Every future begins as a question."
              sub="No map. No certainty. Only the sense that something more is possible.">
              <Btn onClick={() => goto(1)}>Begin the Journey <ArrowRight size={15} /></Btn>
            </Copy>
          )}
          {ch === 1 && (
            <Copy key="c1" eyebrow="Chapter Two" title="Some questions need a place to be answered."
              position="top" />
          )}
          {ch === 3 && (
            <Copy key="c3" eyebrow="Chapter Four" title="Not a gate. A gateway."
              sub="Step through, and the university becomes a world." position="bottom">
              <Btn onClick={() => goto(4)}>Enter SOU Portal <ArrowRight size={15} /></Btn>
            </Copy>
          )}
          {ch === 4 && (
            <Copy key="c4" eyebrow="Chapter Five" title="Seven worlds. One university."
              position="top" small>
              <Btn onClick={() => goto(5)} ghost><LogOut size={15} /> Exit Portal</Btn>
            </Copy>
          )}
          {ch === 6 && (
            <Copy key="c6" eyebrow="Chapter Seven"
              title="From curious learner to confident professional."
              sub="At Silver Oak University, potential becomes knowledge, knowledge becomes skill, and skill becomes real-world impact."
              position="top">
              <Btn href="/login">Explore Programs</Btn>
              <Btn href="/login" ghost>Start Your Journey <ArrowRight size={15} /></Btn>
            </Copy>
          )}
        </AnimatePresence>
      </div>

      {/* ================= SCRUBBER ================= */}
      <div className="absolute inset-x-0 bottom-0 z-50 px-5 pb-5 pt-10 pointer-events-none"
        style={{ background: "linear-gradient(180deg,transparent,rgba(3,2,2,.65))" }}>
        <div className="mx-auto max-w-[1000px] pointer-events-auto">
          <div className="relative h-px w-full" style={{ background: "rgba(255,255,255,.14)" }}>
            <motion.div className="absolute left-0 top-0 h-px"
              animate={{ width: (ch / 6) * 100 + "%" }} transition={{ duration: 0.8, ease: EASE }}
              style={{ background: "linear-gradient(90deg," + MAROON + "," + GOLD + ")" }} />
            {CHAPTERS.map((c, i) => (
              <button key={c} onClick={() => goto(i)}
                className="absolute -translate-x-1/2 group"
                style={{ left: (i / 6) * 100 + "%", top: -5 }}>
                <span className="block rounded-full transition-all duration-500"
                  style={{ width: i === ch ? 11 : 7, height: i === ch ? 11 : 7,
                    background: i <= ch ? GOLD : "rgba(255,255,255,.3)",
                    boxShadow: i === ch ? "0 0 16px " + GOLD : "none",
                    marginTop: i === ch ? -2 : 0 }} />
                <span className={"absolute left-1/2 -translate-x-1/2 top-5 whitespace-nowrap text-[9px] uppercase tracking-[0.22em] transition-opacity duration-300 " +
                  (i === ch ? "opacity-80" : "opacity-0 group-hover:opacity-60")}>{c}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center mt-8 text-[10px] uppercase tracking-[0.22em] opacity-45">
            <button onClick={() => goto(ch < 6 ? 6 : 0)}
              className="flex items-center gap-2 hover:opacity-100 transition-opacity">
              {ch < 6 ? <><SkipForward size={12} /> Skip story</> : <><RotateCcw size={12} /> Replay</>}
            </button>
            <span className="jn-display normal-case tracking-normal">
              {String(ch + 1).padStart(2, "0")} / 07 &nbsp;-&nbsp; {CHAPTERS[ch]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- small UI pieces ---------- */
function Copy({ eyebrow, title, sub, children, position = "center", small }:
  { eyebrow?: string; title: string; sub?: string; children?: React.ReactNode;
    position?: "center" | "top" | "bottom"; small?: boolean }) {
  const pos = position === "top" ? "items-start pt-[16vh]"
    : position === "bottom" ? "items-end pb-[18vh]" : "items-center";
  return (
    <motion.div className={"absolute inset-0 flex justify-center px-6 " + pos}
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 1, ease: EASE }}>
      <div className="text-center max-w-3xl pointer-events-auto">
        {eyebrow && <div className="text-[10px] uppercase tracking-[0.5em] mb-5" style={{ color: GOLD }}>{eyebrow}</div>}
        <h1 className="jn-display font-normal leading-[1.14]"
          style={{ fontSize: small ? "clamp(1.4rem,2.6vw,2.2rem)" : "clamp(1.9rem,4.6vw,3.9rem)",
            textShadow: "0 4px 50px rgba(0,0,0,.85)" }}>{title}</h1>
        {sub && <p className="mt-5 text-sm md:text-[15px] opacity-70 leading-relaxed">{sub}</p>}
        {children && <div className="mt-9 flex gap-3 justify-center flex-wrap">{children}</div>}
      </div>
    </motion.div>
  );
}

function Btn({ children, onClick, href, ghost }:
  { children: React.ReactNode; onClick?: () => void; href?: string; ghost?: boolean }) {
  const cls = "inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] tracking-wide " +
    "transition-all duration-300 hover:scale-[1.05] active:scale-[0.98] " +
    (ghost ? "jn-glass hover:border-[rgba(201,162,39,.6)]" : "text-white");
  const style = ghost ? {} : {
    background: "linear-gradient(135deg," + MAROON + ",#a3162a)",
    boxShadow: "0 12px 44px rgba(123,18,32,.55)",
  };
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button onClick={onClick} className={cls} style={style}>{children}</button>;
}
