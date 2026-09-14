"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Point the camera at the signboard in YOUR photo (percent of image).
const SIGN_X = 50;
const SIGN_Y = 42;

function Silhouette() {
  const swing = { duration: 0.7, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <motion.svg viewBox="0 0 30 100" style={{ height: "22vh", width: "auto", display: "block" }}
      animate={{ y: [0, -2, 0] }} transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}>
      <motion.rect x="13" y="52" width="4.6" height="48" rx="2.3" fill="#000"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [15, -15, 15] }} transition={swing} />
      <motion.rect x="8" y="30" width="3.6" height="26" rx="1.8" fill="#000"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-20, 20, -20] }} transition={swing} />
      <path d="M10 28 L20 28 L22 54 L8 54 Z" fill="#000" />
      <circle cx="15" cy="20" r="6.2" fill="#000" />
      <motion.rect x="13" y="52" width="4.6" height="48" rx="2.3" fill="#000"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-15, 15, -15] }} transition={swing} />
      <motion.rect x="18.5" y="30" width="3.6" height="26" rx="1.8" fill="#000"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [20, -20, 20] }} transition={swing} />
    </motion.svg>
  );
}

export default function CinematicIntro() {
  const [phase, setPhase] = useState<"drift" | "push" | "bloom" | "done">("drift");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sou_intro_seen")) return;
      sessionStorage.setItem("sou_intro_seen", "1");
    } catch {}
    setShow(true);
    const t1 = setTimeout(() => setPhase("push"), 3200);
    const t2 = setTimeout(() => setPhase("bloom"), 6200);
    const t3 = setTimeout(() => setPhase("done"), 7800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const scale = phase === "drift" ? 1.08 : phase === "push" ? 2.1 : 3.4;
  const grade = phase === "drift"
    ? "saturate(0.75) brightness(0.62) contrast(1.12)"
    : "saturate(1.05) brightness(0.9) contrast(1.06)";

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div exit={{ opacity: 0, transition: { duration: 1 } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none bg-black">

          <motion.div className="absolute inset-0"
            animate={{ x: [0, -6, 4, 0], y: [0, 3, -4, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: "url(/campus-gate.jpg)",
                transformOrigin: SIGN_X + "% " + SIGN_Y + "%",
              }}
              animate={{ scale, filter: grade }}
              transition={{ duration: phase === "push" ? 3.0 : 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          {phase === "drift" && (
            <motion.div className="absolute" style={{ bottom: "13vh", zIndex: 20 }}
              initial={{ left: "-12%", opacity: 0 }} animate={{ left: "34%", opacity: 1 }}
              transition={{ left: { duration: 3.2, ease: "easeOut" }, opacity: { duration: 1.2 } }}>
              <Silhouette />
            </motion.div>
          )}

          {phase === "bloom" && (
            <>
              <motion.div className="absolute inset-0" style={{ zIndex: 45,
                background: "radial-gradient(circle at " + SIGN_X + "% " + SIGN_Y + "%, #ffffff 0%, #ffe9c4 14%, #8b5cf6 34%, transparent 64%)" }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, times: [0, 0.18, 1] }} />
              <motion.div className="absolute left-0 right-0" style={{ top: SIGN_Y + "%", height: 2, zIndex: 46 }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.2 }}>
                <div className="w-full h-full" style={{ background: "linear-gradient(90deg,transparent,#fff,#c4b5fd,#fff,transparent)", filter: "blur(4px)" }} />
              </motion.div>
            </>
          )}

          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 34%, rgba(0,0,0,0.82) 100%)" }} />

          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.08, mixBlendMode: "overlay" }}>
            <filter id="souGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#souGrain)" />
          </svg>

          <div className="absolute inset-x-0 top-0 bg-black pointer-events-none" style={{ height: "10vh", zIndex: 40 }} />
          <div className="absolute inset-x-0 bottom-0 bg-black pointer-events-none" style={{ height: "10vh", zIndex: 40 }} />

          <button onClick={() => setPhase("done")}
            className="absolute right-6 text-[11px] tracking-widest uppercase text-white/50 hover:text-white"
            style={{ top: "3.5vh", zIndex: 50 }}>Skip</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
