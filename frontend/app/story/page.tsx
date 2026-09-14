"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { ArrowRight, LogOut, FastForward } from "lucide-react";
import {
  Tunnel, Board, Burst, Streaks, Dust, Gate, BackFigure,
  WorldPanel, WORLDS, LOGO, GOLD, MAROON,
} from "@/components/iris/Pieces";

type Phase = "intro" | "approach" | "brand" | "opening" | "travel" | "world" | "exit" | "finale";

const Z = { gate: -2500, figure: -1250, board: -1650, hero: -850 };
const EASE_OUT = [0.16, 0.7, 0.25, 1] as any;
const EASE_IN = [0.6, 0, 0.9, 0.4] as any;
const EASE_IO = [0.5, 0, 0.2, 1] as any;

export default function Story() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const skip = useRef(false);

  const camZ = useMotionValue(0);
  const glow = useMotionValue(0);
  const burst = useMotionValue(0);
  const tunnel = useMotionValue(0);
  const streak = useMotionValue(0);
  const btn = useMotionValue(1);

  /* ---- preload so the click has nothing to build ---- */
  useEffect(() => {
    const r = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    const img = new window.Image();
    img.src = LOGO;
    const done = () => setReady(true);
    if (img.decode) img.decode().then(done).catch(done);
    else { img.onload = done; img.onerror = done; }
    const guard = setTimeout(done, 2500);
    return () => clearTimeout(guard);
  }, []);

  /* ---- awaited step: resolves instantly if skipping ---- */
  const step = useCallback(async (mv: any, to: number, duration: number, ease: any = EASE_IO) => {
    if (skip.current || reduced) { mv.set(to); return; }
    await animate(mv, to, { duration, ease }).finished;
  }, [reduced]);

  const hold = useCallback(async (seconds: number) => {
    if (skip.current || reduced) return;
    const t = useMotionValueDummy();
    await animate(t, 1, { duration: seconds, ease: "linear" }).finished;
  }, [reduced]);

  /* ---- act one: walk up to the board ---- */
  async function begin() {
    if (busy) return;
    setBusy(true);
    setPhase("approach");
    await step(camZ, 800, 2.6, EASE_OUT);
    setPhase("brand");
    await step(camZ, 1400, 2.0, EASE_IO);
    await step(glow, 0.35, 0.8);
    await hold(2.0);                 // logo held clear, nothing over it
    setBusy(false);
  }

  /* ---- the portal opens: one continuous awaited sequence ---- */
  async function enterPortal() {
    if (busy) return;
    setBusy(true); skip.current = false; setShowSkip(true);

    await step(btn, 0, 0.45, EASE_IN);            // 1-2 button dissolves
    setPhase("opening");
    await step(glow, 1, 0.65, EASE_OUT);          // 3 board ignites
    animate(burst, 1, { duration: 0.9, ease: EASE_OUT });   // 4 energy emerges
    await step(tunnel, 1, 0.9, EASE_OUT);         // 5 portal forms
    animate(streak, 0.9, { duration: 0.5 });
    await step(camZ, 2300, 0.8, EASE_IN);         // 6 portal fills the frame
    setPhase("travel");
    await step(camZ, 8900, 1.7, EASE_IO);         // 7 camera flies the tunnel

    setPhase("world");                             // 8 only now does the world exist
    animate(streak, 0, { duration: 0.5 });
    animate(burst, 0, { duration: 0.6 });
    animate(tunnel, 0.3, { duration: 0.8 });
    setShowSkip(false); setBusy(false);
  }

  /* ---- the portal closes ---- */
  async function exitPortal() {
    if (busy) return;
    setBusy(true); skip.current = false; setShowSkip(true);
    setOpen(null);
    setPhase("exit");                              // 1 panels flow away

    await step(tunnel, 1, 0.6, EASE_OUT);
    animate(streak, 0.9, { duration: 0.4 });
    await step(camZ, 2300, 1.6, EASE_IO);          // 2 back through the tunnel
    animate(streak, 0, { duration: 0.5 });
    await step(camZ, 1400, 0.9, EASE_OUT);         // 3 energy returns to the board
    animate(burst, 0, { duration: 0.6 });
    await step(tunnel, 0, 0.8, EASE_IN);
    await step(glow, 0.3, 0.5);

    setPhase("finale");                            // 4-5 pull back, the return
    await step(camZ, 600, 1.5, EASE_IO);
    await step(glow, 0.15, 0.6);
    setShowSkip(false); setBusy(false);
  }

  function doSkip() {
    skip.current = true;
    setShowSkip(false);
  }

  /* ---- plane opacity per phase ---- */
  const op = (m: Partial<Record<Phase, number>>, d = 0) => m[phase] ?? d;

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#070b18" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/70 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse at 50% 46%,#101a33 0%,#070b18 48%,#03050c 100%)", color: "#eef2fb" }}>

      {/* =============== 3D STAGE =============== */}
      <div className="absolute inset-0" style={{ perspective: "1150px", perspectiveOrigin: "50% 47%" }}>
        <motion.div className="absolute inset-0 ir-3d ir-gpu" style={{ z: camZ }}>

          <motion.div className="absolute inset-0 flex items-center justify-center ir-3d pointer-events-none"
            style={{ transform: "translateZ(" + Z.gate + "px)" }}
            animate={{ opacity: op({ intro: .85, approach: 1, brand: 1, opening: .8, travel: 0, world: 0, exit: 0, finale: 1 }) }}
            transition={{ duration: 1 }}>
            <Gate />
          </motion.div>

          <motion.div className="absolute inset-0 ir-3d pointer-events-none"
            style={{ transform: "translateZ(" + Z.figure + "px)" }}
            animate={{ opacity: op({ intro: 1, approach: .85 }) }} transition={{ duration: 1 }}>
            <div className="absolute" style={{ left: "50%", bottom: "18%", transform: "translateX(-50%)" }}>
              <BackFigure height="32vh" />
            </div>
          </motion.div>

          <motion.div className="absolute inset-0 flex items-center justify-center ir-3d pointer-events-none"
            style={{ transform: "translateZ(" + Z.board + "px)" }}
            animate={{ opacity: op({ intro: .45, approach: .8, brand: 1, opening: 1, travel: 0, world: 0, exit: .6, finale: 1 }) }}
            transition={{ duration: 0.9 }}>
            <Board glow={glow} />
          </motion.div>

          {/* tunnel is always mounted - never built at click time */}
          <Tunnel opacity={tunnel} />

          <div className="absolute inset-0 ir-3d">
            {WORLDS.map((w, i) => (
              <WorldPanel key={w.t} w={w} i={i} active={phase === "world"}
                open={open === i} onOpen={() => setOpen(open === i ? null : i)} />
            ))}
          </div>

          <motion.div className="absolute inset-0 ir-3d pointer-events-none"
            style={{ transform: "translateZ(" + Z.hero + "px)" }}
            animate={{ opacity: phase === "finale" ? 1 : 0 }} transition={{ duration: 1.4 }}>
            <div className="absolute" style={{ left: "50%", bottom: "17%", transform: "translateX(-50%)" }}>
              <BackFigure transformed height="36vh" />
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* =============== FIXED FX =============== */}
      <Burst v={burst} />
      <Streaks v={streak} />
      <Dust n={phase === "world" ? 44 : 30} tint={phase === "finale" ? "#ffe8b0" : "#cfe0ff"} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 48%,transparent 33%,rgba(2,4,10,.9) 100%)" }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: phase === "finale" ? 1 : 0 }} transition={{ duration: 2.2 }}
        style={{ background: "linear-gradient(180deg,transparent 42%,rgba(201,162,39,.20) 76%,rgba(255,226,150,.34) 100%)" }} />

      {/* =============== NAVBAR =============== */}
      <header className="absolute inset-x-0 top-0 z-50">
        <div className={"mx-auto max-w-[1400px] m-3 md:m-5 px-5 md:px-7 py-3 rounded-full flex items-center justify-between gap-5 transition-all duration-700 " +
          (phase === "world" ? "ir-glass" : "")}>
          <img src={LOGO} alt="Silver Oak University" className="h-8 md:h-9 w-auto"
            style={{ filter: "brightness(1.6) contrast(1.05)", mixBlendMode: "screen" }} />
          <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase ir-display opacity-60">
            <span>About</span><span>Programs</span><span>Campus Life</span>
          </nav>
          <a href="/login" className="px-5 py-2 rounded-full text-[12px] transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg," + MAROON + ",#a3162a)", color: "#fff" }}>Apply Now</a>
        </div>
      </header>

      {/* =============== COPY LAYER =============== */}
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center px-6">
        <AnimatePresence mode="wait">

          {phase === "intro" && (
            <Copy key="p0" eyebrow="Silver Oak University"
              title="He had questions. Not one of them had an answer yet."
              sub="No direction. No proof of what he could do. Only the sense that it could be different.">
              <Btn onClick={begin}>Begin <ArrowRight size={15} /></Btn>
            </Copy>
          )}

          {phase === "approach" && (
            <Copy key="p1" pos="top" title="Then he found a place built for the asking." />
          )}

          {phase === "brand" && !busy && (
            <Copy key="p2" pos="bottom">
              <motion.div style={{ scale: btn, opacity: btn }}>
                <Btn onClick={enterPortal}>Enter SOU Portal <ArrowRight size={15} /></Btn>
              </motion.div>
            </Copy>
          )}

          {phase === "world" && (
            <Copy key="p5" pos="top" small
              title="Seven worlds. One university."
              sub="Move through them. This is what four years actually builds.">
              <Btn onClick={exitPortal} ghost><LogOut size={15} /> Exit Portal</Btn>
            </Copy>
          )}

          {phase === "finale" && (
            <Copy key="p7" pos="top"
              title="From curious learner to confident professional."
              sub="At Silver Oak University, potential becomes knowledge, knowledge becomes skill, and skill becomes real-world impact.">
              <Btn href="/login">Explore Programs</Btn>
              <Btn href="/login" ghost>Start Your Journey <ArrowRight size={15} /></Btn>
            </Copy>
          )}

        </AnimatePresence>
      </div>

      {/* =============== SKIP (only during a sequence) =============== */}
      <AnimatePresence>
        {showSkip && (
          <motion.button key="skip" onClick={doSkip}
            initial={{ opacity: 0 }} animate={{ opacity: .55 }} exit={{ opacity: 0 }}
            className="absolute z-50 right-6 bottom-6 flex items-center gap-2 text-[10px] uppercase
              tracking-[0.28em] hover:opacity-100 transition-opacity">
            <FastForward size={12} /> Skip animation
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute z-50 left-6 bottom-6 text-[10px] uppercase tracking-[0.28em] opacity-30">
        {phase}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function useMotionValueDummy() {
  // a throwaway value used only to time a hold via a real animation
  return { current: 0, set() {}, get: () => 0, on: () => () => {} } as any;
}

function Copy({ eyebrow, title, sub, children, pos = "center", small }:
  { eyebrow?: string; title?: string; sub?: string; children?: React.ReactNode;
    pos?: "center" | "top" | "bottom"; small?: boolean }) {
  const p = pos === "top" ? "items-start pt-[15vh]" : pos === "bottom" ? "items-end pb-[16vh]" : "items-center";
  return (
    <motion.div className={"absolute inset-0 flex justify-center " + p}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.9, ease: EASE_IO }}>
      <div className="text-center max-w-3xl pointer-events-auto">
        {eyebrow && <div className="text-[10px] uppercase ir-display mb-5" style={{ color: GOLD }}>{eyebrow}</div>}
        {title && <h1 className="font-light leading-[1.15]"
          style={{ fontSize: small ? "clamp(1.3rem,2.4vw,2rem)" : "clamp(1.8rem,4.3vw,3.6rem)",
            textShadow: "0 4px 60px rgba(0,0,0,.9)" }}>{title}</h1>}
        {sub && <p className="mt-5 text-sm md:text-[15px] opacity-65 leading-relaxed">{sub}</p>}
        {children && <div className="mt-9 flex gap-3 justify-center flex-wrap">{children}</div>}
      </div>
    </motion.div>
  );
}

function Btn({ children, onClick, href, ghost }:
  { children: React.ReactNode; onClick?: () => void; href?: string; ghost?: boolean }) {
  const cls = "inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] tracking-wide " +
    "transition-all duration-300 hover:scale-[1.05] active:scale-[0.98] disabled:opacity-40 " +
    (ghost ? "ir-glass" : "text-white");
  const style = ghost ? {} : {
    background: "linear-gradient(135deg," + MAROON + ",#a3162a)",
    boxShadow: "0 14px 48px rgba(123,18,32,.55)",
  };
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button onClick={onClick} className={cls} style={style}>{children}</button>;
}
