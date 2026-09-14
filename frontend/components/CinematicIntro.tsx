"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Where the white tree logo sits in your photo (percent). Tune these two.
const LOGO_X = 46;
const LOGO_Y = 57;
const PHOTO = "url(/sou-campus.jpg)";

type Phase = "arrive" | "notice" | "push" | "bloom" | "done";

const LOOK: Record<string, { scale: number; filter: string; dur: number }> = {
  arrive: { scale: 1.20, filter: "blur(7px) saturate(0.40) brightness(0.46) contrast(1.28)", dur: 3.0 },
  notice: { scale: 1.36, filter: "blur(0px) saturate(0.72) brightness(0.66) contrast(1.16)", dur: 1.3 },
  push:   { scale: 3.20, filter: "blur(0px) saturate(1.10) brightness(0.96) contrast(1.04)", dur: 3.3 },
  bloom:  { scale: 4.30, filter: "blur(3px) saturate(1.30) brightness(1.20) contrast(1.00)", dur: 1.7 },
};

export function Silhouette({ graduate = false }: { graduate?: boolean }) {
  const swing = { duration: 0.78, repeat: Infinity, ease: "easeInOut" as const };
  const ink = "#05060a";
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", bottom: -6, left: "50%", width: "9vh", height: "1.6vh",
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)", filter: "blur(3px)" }} />
      <motion.svg viewBox="0 0 34 104" style={{ height: "30vh", width: "auto", display: "block", opacity: 0.94 }}
        animate={{ y: [0, -2.4, 0] }} transition={{ duration: 0.39, repeat: Infinity, ease: "easeInOut" }}>
        <motion.rect x="14.6" y="55" width="5" height="49" rx="2.5" fill={ink}
          style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [16, -16, 16] }} transition={swing} />
        <motion.rect x="8.4" y="32" width="3.9" height="27" rx="1.9" fill={ink}
          style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-21, 21, -21] }} transition={swing} />
        <path d="M11 30 L23 30 L25 57 L9 57 Z" fill={ink} />
        <circle cx="17" cy="21" r="6.6" fill={ink} />
        {graduate && (
          <>
            <rect x="7" y="15.4" width="20" height="1.8" rx="0.9" fill={ink} />
            <rect x="14" y="11.5" width="6" height="4" rx="1" fill={ink} />
            <path d="M25 17 L26.6 27" stroke={ink} strokeWidth="1.1" fill="none" />
            <path d="M11 31 L7.5 60 L26.5 60 L23 31 Z" fill={ink} opacity="0.95" />
          </>
        )}
        <motion.rect x="14.6" y="55" width="5" height="49" rx="2.5" fill={ink}
          style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-16, 16, -16] }} transition={swing} />
        <motion.rect x="21.7" y="32" width="3.9" height="27" rx="1.9" fill={ink}
          style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [21, -21, 21] }} transition={swing} />
      </motion.svg>
    </div>
  );
}

export function FilmLayers() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30,
        background: "linear-gradient(115deg, rgba(255,214,150,0.16) 0%, transparent 42%)", mixBlendMode: "screen" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 31,
        background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.86) 100%)" }} />
      <svg className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 32, opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id="souGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#souGrain)" />
      </svg>
      <div className="absolute inset-x-0 top-0 bg-black pointer-events-none" style={{ height: "11vh", zIndex: 40 }} />
      <div className="absolute inset-x-0 bottom-0 bg-black pointer-events-none" style={{ height: "11vh", zIndex: 40 }} />
    </>
  );
}

export default function CinematicIntro() {
  const [phase, setPhase] = useState<Phase>("arrive");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sou_intro_seen")) return;
      sessionStorage.setItem("sou_intro_seen", "1");
    } catch {}
    setShow(true);
    const t = [
      setTimeout(() => setPhase("notice"), 3000),
      setTimeout(() => setPhase("push"), 4300),
      setTimeout(() => setPhase("bloom"), 7600),
      setTimeout(() => setPhase("done"), 9200),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const look = LOOK[phase] || LOOK.bloom;

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: 1.1 } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none bg-black">

          <motion.div className="absolute inset-0"
            animate={{ x: [0, -7, 5, -3, 0], y: [0, 4, -5, 2, 0], rotate: [0, 0.22, -0.18, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div
              className="absolute bg-center bg-cover"
              style={{ inset: "-6%", backgroundImage: PHOTO,
                transformOrigin: LOGO_X + "% " + LOGO_Y + "%" }}
              initial={{ scale: 1.2, filter: LOOK.arrive.filter }}
              animate={{ scale: look.scale, filter: look.filter }}
              transition={{ duration: look.dur, ease: [0.24, 0.9, 0.28, 1] }}
            />
          </motion.div>

          {(phase === "arrive" || phase === "notice") && (
            <motion.div className="absolute" style={{ bottom: "11.5vh", zIndex: 24 }}
              initial={{ left: "-14%", opacity: 0 }}
              animate={{ left: phase === "arrive" ? "31%" : "31%", opacity: phase === "notice" ? 1 : 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              transition={{ left: { duration: 3.0, ease: "easeOut" }, opacity: { duration: 1.1 } }}>
              <Silhouette />
            </motion.div>
          )}

          {phase === "bloom" && (
            <>
              <motion.div className="absolute inset-0" style={{ zIndex: 45,
                background: "radial-gradient(circle at " + LOGO_X + "% " + LOGO_Y + "%, #ffffff 0%, #fff2d6 11%, #a78bfa 30%, transparent 62%)" }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.85, 0] }}
                transition={{ duration: 1.7, times: [0, 0.16, 0.45, 1] }} />
              <motion.div className="absolute left-0 right-0"
                style={{ top: LOGO_Y + "%", height: 3, zIndex: 46 }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 0.7, 0] }}
                transition={{ duration: 1.5, times: [0, 0.2, 0.6, 1] }}>
                <div className="w-full h-full"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(196,181,253,0.6),#ffffff,rgba(196,181,253,0.6),transparent)", filter: "blur(5px)" }} />
              </motion.div>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="absolute rounded-full"
                  style={{ left: LOGO_X + "%", top: LOGO_Y + "%", width: 40, height: 40, zIndex: 44,
                    border: "1.5px solid rgba(233,213,255,0.7)", translateX: "-50%", translateY: "-50%" }}
                  initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 26, opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.6, delay: i * 0.17, ease: "easeOut" }} />
              ))}
            </>
          )}

          <FilmLayers />

          <button onClick={() => setPhase("done")}
            className="absolute right-6 text-[11px] tracking-[0.25em] uppercase text-white/45 hover:text-white transition-colors"
            style={{ top: "4vh", zIndex: 60 }}>Skip</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
