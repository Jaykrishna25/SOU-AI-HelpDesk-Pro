"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "walk" | "zoom" | "burst" | "done";

const CAPTIONS: Record<string, string> = {
  walk: "He arrived with questions, and no idea where to begin.",
  zoom: "Then he saw the gate.",
  burst: "Knowledge is the highest virtue.",
};

function Figure({ graduate = false }: { graduate?: boolean }) {
  return (
    <svg width="46" height="86" viewBox="0 0 46 86" fill="none">
      {graduate && (
        <g>
          <polygon points="23,2 43,11 23,20 3,11" fill="#8b5cf6" />
          <rect x="21" y="11" width="4" height="12" fill="#8b5cf6" />
        </g>
      )}
      <circle cx="23" cy="27" r="9" fill="#1f1830" />
      <rect x="15" y="37" width="16" height="26" rx="6" fill="#1f1830" />
      <rect x="16" y="62" width="5" height="22" rx="2" fill="#1f1830" />
      <rect x="25" y="62" width="5" height="22" rx="2" fill="#1f1830" />
    </svg>
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
    const t1 = setTimeout(() => setPhase("zoom"), 2400);
    const t2 = setTimeout(() => setPhase("burst"), 4800);
    const t3 = setTimeout(() => setPhase("done"), 6600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const skip = () => setPhase("done");
  const particles = Array.from({ length: 26 });

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9 } }}
          className="fixed inset-0 z-[300] overflow-hidden"
          style={{ background: "linear-gradient(180deg,#05040c 0%,#0d0a1f 55%,#140f2b 100%)" }}
        >
          <motion.div
            className="absolute inset-0 flex items-end justify-center"
            animate={{
              scale: phase === "walk" ? 1 : phase === "zoom" ? 6.5 : 11,
              y: phase === "walk" ? 0 : phase === "zoom" ? 120 : 220,
            }}
            transition={{ duration: phase === "zoom" ? 2.4 : 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "50% 42%" }}
          >
            <div className="relative w-full max-w-3xl" style={{ height: "62vh" }}>
              <div className="absolute left-[7%] bottom-0 w-5 rounded-t-md"
                style={{ height: "46%", background: "linear-gradient(180deg,#241b3d,#120d24)" }} />
              <div className="absolute right-[7%] bottom-0 w-5 rounded-t-md"
                style={{ height: "46%", background: "linear-gradient(180deg,#241b3d,#120d24)" }} />

              <motion.div
                className="absolute left-1/2 -translate-x-1/2 rounded-lg px-4 py-3"
                style={{
                  bottom: "34%",
                  background: "#ffffff",
                  boxShadow: "0 0 60px rgba(139,92,246,0.55)",
                  width: "58%",
                }}
                animate={{ opacity: phase === "burst" ? 0 : 1 }}
                transition={{ duration: 0.5 }}
              >
                <img src="/sou-logo.jpg" alt="Silver Oak University"
                  style={{ width: "100%", height: "auto", display: "block" }} />
              </motion.div>

              <div className="absolute left-0 right-0 bottom-0"
                style={{ height: 2, background: "linear-gradient(90deg,transparent,#3b2d63,transparent)" }} />

              {phase === "walk" && (
                <motion.div
                  className="absolute bottom-0"
                  initial={{ x: "-18vw", opacity: 0 }}
                  animate={{ x: "42%", opacity: 1, y: [0, -3, 0] }}
                  transition={{ x: { duration: 2.4, ease: "easeOut" }, opacity: { duration: 0.6 }, y: { duration: 0.5, repeat: 5 } }}
                >
                  <Figure />
                </motion.div>
              )}
            </div>
          </motion.div>

          {phase === "burst" && (
            <>
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, times: [0, 0.25, 1] }}
                style={{ background: "radial-gradient(circle at 50% 45%, #ffffff 0%, #8b5cf6 28%, transparent 62%)" }}
              />
              {particles.map((_, i) => {
                const angle = (i / particles.length) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="absolute rounded-full"
                    style={{ left: "50%", top: "45%", width: 7, height: 7, background: i % 2 ? "#8b5cf6" : "#06b6d4" }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: Math.cos(angle) * 460, y: Math.sin(angle) * 460, opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                );
              })}
            </>
          )}

          <div className="absolute inset-x-0 bottom-16 text-center px-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={phase}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="text-base sm:text-xl text-white/90 tracking-wide"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)" }}
              >
                {CAPTIONS[phase]}
              </motion.p>
            </AnimatePresence>
          </div>

          <button onClick={skip}
            className="absolute top-6 right-6 text-xs text-white/60 hover:text-white border border-white/20 rounded-full px-4 py-2">
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
