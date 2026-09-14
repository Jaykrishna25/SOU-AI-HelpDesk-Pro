"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "walk" | "zoom" | "burst" | "done";

const CAPTIONS: Record<string, string> = {
  walk: "He arrived with questions, and no idea where to begin.",
  zoom: "Then he saw the gate.",
  burst: "Gyanam Parmam Bhushanam",
};

// depth: 0 = far background, 1 = foreground. Drives parallax + blur.
function layer(phase: Phase, depth: number) {
  const push = phase === "walk" ? 0 : phase === "zoom" ? 1 : 1.7;
  return {
    scale: 1 + depth * 5.2 * push,
    y: depth * 140 * push,
  };
}

function Walker() {
  const swing = { duration: 0.62, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <motion.svg width="54" height="104" viewBox="0 0 54 104" fill="none"
      animate={{ y: [0, -2.5, 0] }} transition={{ duration: 0.31, repeat: Infinity, ease: "easeInOut" }}>
      <motion.rect x="24" y="52" width="6" height="30" rx="3" fill="#15101f"
        style={{ originX: "50%", originY: "0%" }}
        animate={{ rotate: [18, -18, 18] }} transition={swing} />
      <motion.rect x="14" y="34" width="5" height="24" rx="2.5" fill="#1b1428"
        style={{ originX: "50%", originY: "0%" }}
        animate={{ rotate: [-22, 22, -22] }} transition={swing} />
      <rect x="19" y="30" width="18" height="26" rx="7" fill="#221a33" />
      <circle cx="28" cy="20" r="9.5" fill="#2a2040" />
      <motion.rect x="24" y="52" width="6" height="30" rx="3" fill="#221a33"
        style={{ originX: "50%", originY: "0%" }}
        animate={{ rotate: [-18, 18, -18] }} transition={swing} />
      <motion.rect x="36" y="34" width="5" height="24" rx="2.5" fill="#2a2040"
        style={{ originX: "50%", originY: "0%" }}
        animate={{ rotate: [22, -22, 22] }} transition={swing} />
    </motion.svg>
  );
}

export default function CinematicIntro() {
  const [phase, setPhase] = useState<Phase>("walk");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sou_intro_seen")) return;
      sessionStorage.setItem("sou_intro_seen", "1");
    } catch {}
    setShow(true);
    const t1 = setTimeout(() => setPhase("zoom"), 3000);
    const t2 = setTimeout(() => setPhase("burst"), 5600);
    const t3 = setTimeout(() => setPhase("done"), 7400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const dawn = phase !== "walk";
  const motes = Array.from({ length: 18 });
  const sparks = Array.from({ length: 30 });

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div exit={{ opacity: 0, transition: { duration: 1 } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none">

          <motion.div className="absolute inset-0"
            animate={{ background: dawn
              ? "linear-gradient(180deg,#1a1030 0%,#3b2450 42%,#8a5a6b 74%,#e0a878 100%)"
              : "linear-gradient(180deg,#04030a 0%,#0a0818 45%,#141028 78%,#1d1638 100%)" }}
            transition={{ duration: 2.6 }} />

          <motion.div className="absolute inset-0"
            animate={{ opacity: dawn ? 0 : 0.85 }} transition={{ duration: 2 }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="absolute rounded-full bg-white"
                style={{
                  left: ((i * 37) % 100) + "%", top: ((i * 53) % 45) + "%",
                  width: i % 5 === 0 ? 2.5 : 1.5, height: i % 5 === 0 ? 2.5 : 1.5,
                  opacity: 0.2 + ((i % 7) / 10),
                }} />
            ))}
          </motion.div>

          <motion.div className="absolute inset-0"
            animate={{ x: [0, -5, 3, 0], y: [0, 3, -4, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>

            <motion.div className="absolute inset-x-0" style={{ bottom: "38%", filter: "blur(3px)" }}
              animate={layer(phase, 0.14)} transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}>
              <svg viewBox="0 0 1200 120" className="w-full" style={{ height: "16vh" }} preserveAspectRatio="none">
                <path fill="#0d0a1a" d="M0,120 L0,70 Q40,38 80,66 Q120,26 165,60 Q210,20 250,58 Q300,30 345,64 Q395,24 440,62 Q490,34 535,66 Q585,22 630,58 Q680,30 725,64 Q775,26 820,60 Q870,34 915,66 Q965,24 1010,58 Q1060,32 1105,64 Q1150,40 1200,68 L1200,120 Z" />
              </svg>
            </motion.div>

            <motion.div className="absolute inset-x-0" style={{ bottom: "30%", height: "18vh" }}
              animate={{ opacity: dawn ? 0.5 : 0.28 }} transition={{ duration: 2 }}>
              <div className="w-full h-full" style={{ background: "linear-gradient(180deg,transparent,rgba(190,160,200,0.30),transparent)", filter: "blur(14px)" }} />
            </motion.div>

            <motion.div className="absolute inset-0 flex items-end justify-center"
              animate={layer(phase, 0.55)} transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "50% 46%" }}>
              <div className="relative w-full max-w-3xl" style={{ height: "60vh" }}>
                <div className="absolute left-[9%] bottom-0 w-7 rounded-t"
                  style={{ height: "50%", background: "linear-gradient(90deg,#0f0b1c,#2d2149 45%,#120d22)" }} />
                <div className="absolute right-[9%] bottom-0 w-7 rounded-t"
                  style={{ height: "50%", background: "linear-gradient(90deg,#0f0b1c,#2d2149 45%,#120d22)" }} />
                <div className="absolute left-[9%] right-[9%]" style={{ bottom: "50%", height: 10, background: "linear-gradient(180deg,#2d2149,#140f26)" }} />

                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "52%", width: 10, height: "7%" }}>
                  <div className="w-full h-full" style={{ background: "#241a3c" }} />
                </div>
                <motion.div className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: "58%", width: 26, height: 12, borderRadius: "50%", background: "#ffd9a0" }}
                  animate={{ opacity: [0.75, 1, 0.82, 1] }} transition={{ duration: 3.5, repeat: Infinity }} />
                <div className="absolute left-1/2 -translate-x-1/2" style={{
                  bottom: "20%", width: "70%", height: "40%",
                  background: "linear-gradient(180deg,rgba(255,214,160,0.26),transparent)",
                  clipPath: "polygon(44% 0%, 56% 0%, 100% 100%, 0% 100%)", filter: "blur(10px)" }} />

                <motion.div className="absolute left-1/2 -translate-x-1/2 rounded-md"
                  style={{
                    bottom: "30%", width: "56%", padding: "14px 18px", background: "#ffffff",
                    boxShadow: "0 0 70px rgba(255,205,150,0.45), 0 18px 40px rgba(0,0,0,0.6)",
                  }}
                  animate={{ opacity: phase === "burst" ? 0 : 1 }} transition={{ duration: 0.45 }}>
                  <img src="/sou-logo.jpg" alt="Silver Oak University" style={{ width: "100%", height: "auto", display: "block" }} />
                </motion.div>

                <div className="absolute left-0 right-0 bottom-0" style={{ height: "14%", background: "linear-gradient(180deg,#161029,#0a0714)" }} />

                {phase === "walk" && (
                  <>
                    <motion.div className="absolute" style={{ bottom: "12%" }}
                      initial={{ x: "-20vw", opacity: 0 }} animate={{ x: "40%", opacity: 1 }}
                      transition={{ x: { duration: 3.0, ease: "easeOut" }, opacity: { duration: 0.8 } }}>
                      <div className="absolute left-1/2 -translate-x-1/2" style={{
                        bottom: -8, width: 70, height: 12, borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)", filter: "blur(7px)" }} />
                      <Walker />
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div className="absolute inset-x-0 bottom-0" style={{ height: "22vh", filter: "blur(9px)" }}
              animate={layer(phase, 1)} transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}>
              <div className="w-full h-full" style={{ background: "linear-gradient(180deg,transparent,#07050f 70%)" }} />
            </motion.div>
          </motion.div>

          {motes.map((_, i) => (
            <motion.span key={i} className="absolute rounded-full"
              style={{ left: ((i * 61) % 100) + "%", width: 3, height: 3, background: "rgba(255,225,190,0.8)", filter: "blur(1px)" }}
              initial={{ bottom: "8%", opacity: 0 }}
              animate={{ bottom: ["8%", "68%"], opacity: [0, 0.85, 0], x: [0, i % 2 ? 24 : -24] }}
              transition={{ duration: 7 + (i % 5), repeat: Infinity, delay: i * 0.35, ease: "easeOut" }} />
          ))}

          {phase === "burst" && (
            <>
              <motion.div className="absolute inset-0"
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.3, times: [0, 0.18, 1] }}
                style={{ background: "radial-gradient(circle at 50% 46%, #ffffff 0%, #c4b5fd 22%, #8b5cf6 40%, transparent 68%)" }} />
              <motion.div className="absolute left-0 right-0" style={{ top: "46%", height: 3 }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.1 }}>
                <div className="w-full h-full" style={{ background: "linear-gradient(90deg,transparent,#dbeafe,#8b5cf6,#dbeafe,transparent)", filter: "blur(3px)" }} />
              </motion.div>
              {sparks.map((_, i) => {
                const a = (i / sparks.length) * Math.PI * 2;
                return (
                  <motion.span key={i} className="absolute rounded-full"
                    style={{ left: "50%", top: "46%", width: 6, height: 6, background: i % 2 ? "#a78bfa" : "#67e8f9" }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: Math.cos(a) * (380 + (i % 5) * 60), y: Math.sin(a) * (380 + (i % 5) * 60), opacity: 0 }}
                    transition={{ duration: 1.6, ease: "easeOut" }} />
                );
              })}
            </>
          )}

          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(0,0,0,0.72) 100%)" }} />

          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.07, mixBlendMode: "overlay" }}>
            <filter id="souGrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#souGrain)" />
          </svg>

          <div className="absolute inset-x-0 bottom-14 text-center px-6">
            <AnimatePresence mode="wait">
              <motion.p key={phase}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.8 }}
                className="text-base sm:text-2xl text-white/92 tracking-wide font-light"
                style={{ textShadow: "0 2px 30px rgba(0,0,0,0.9)" }}>
                {CAPTIONS[phase]}
              </motion.p>
            </AnimatePresence>
          </div>

          <button onClick={() => setPhase("done")}
            className="absolute top-6 right-6 text-xs text-white/55 hover:text-white border border-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
