"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Where the white tree logo sits in your photo (percent). Tune these two.
const LOGO_X = 46;
const LOGO_Y = 57;
const PHOTO = "url(/sou-campus.jpg)";
const SHOW_LOGO_IMAGE = true; // set false if /sou-logo.jpg looks wrong

type Phase = "arrive" | "notice" | "push" | "bloom" | "done";

const LOOK: Record<string, { scale: number; filter: string; dur: number }> = {
  arrive: { scale: 1.14, filter: "blur(6px) saturate(0.45) brightness(0.44) contrast(1.26)", dur: 3.0 },
  notice: { scale: 1.26, filter: "blur(0px) saturate(0.74) brightness(0.62) contrast(1.16)", dur: 1.3 },
  push:   { scale: 2.30, filter: "blur(1px) saturate(1.08) brightness(0.88) contrast(1.06)", dur: 3.3 },
  bloom:  { scale: 2.85, filter: "blur(4px) saturate(1.30) brightness(1.18) contrast(1.00)", dur: 1.7 },
};

const SKIN = "#b8865c";
const SKIN_D = "#8f6440";
const HAIR = "#1a1410";
const SHIRT = "#3a5f8a";
const SHIRT_D = "#2a4666";
const PANTS = "#2c2f38";
const PANTS_D = "#1e2028";
const SHOE = "#15161a";
const BAG = "#6b4f2a";
const GOWN = "#141a2e";

export function Silhouette({
  graduate = false,
  mood = "curious",
}: { graduate?: boolean; mood?: "curious" | "awe" }) {
  const swing = { duration: 0.8, repeat: Infinity, ease: "easeInOut" as const };
  const awe = mood === "awe";
  return (
    <div style={{ position: "relative", filter: "brightness(0.82) saturate(0.92) contrast(1.06)" }}>
      <div style={{ position: "absolute", bottom: -8, left: "50%", width: "11vh", height: "1.8vh",
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 72%)", filter: "blur(4px)" }} />

      <motion.svg viewBox="0 0 64 152" style={{ height: "40vh", width: "auto", display: "block" }}
        animate={{ y: awe ? 0 : [0, -2.2, 0] }}
        transition={{ duration: 0.4, repeat: awe ? 0 : Infinity, ease: "easeInOut" }}>
        <defs>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffe8c0" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <motion.g style={{ originX: "50%", originY: "54%" }}
          animate={{ rotate: awe ? 3 : [11, -11, 11] }} transition={awe ? { duration: 0.4 } : swing}>
          <rect x="26" y="84" width="11" height="58" rx="5" fill={PANTS_D} />
          <ellipse cx="30" cy="146" rx="9" ry="5" fill={SHOE} />
        </motion.g>
        <motion.g style={{ originX: "50%", originY: "23%" }}
          animate={{ rotate: awe ? -8 : [-17, 17, -17] }} transition={awe ? { duration: 0.4 } : swing}>
          <rect x="15" y="36" width="8.5" height="42" rx="4.2" fill={SHIRT_D} />
          <circle cx="19" cy="79" r="4.4" fill={SKIN_D} />
        </motion.g>

        {graduate ? (
          <path d="M20 36 Q32 31 44 36 L50 92 L14 92 Z" fill={GOWN} />
        ) : (
          <>
            <path d="M20 36 Q32 31 44 36 L46 86 L18 86 Z" fill={SHIRT} />
            <path d="M32 33 L27 44 L32 47 L37 44 Z" fill={SKIN_D} opacity="0.85" />
            <rect x="31" y="44" width="1.6" height="42" fill={SHIRT_D} opacity="0.8" />
            <rect x="18" y="84" width="28" height="9" rx="2" fill={PANTS} />
          </>
        )}
        <path d="M44 36 L46 86 L42 86 L41 37 Z" fill="url(#rim)" />

        {!graduate && (
          <>
            <path d="M22 37 L26 60" stroke={BAG} strokeWidth="3.4" fill="none" opacity="0.9" />
            <path d="M42 37 L38 60" stroke={BAG} strokeWidth="3.4" fill="none" opacity="0.9" />
          </>
        )}

        <rect x="29" y="26" width="7" height="9" rx="3" fill={SKIN_D} />
        <ellipse cx="32" cy="17" rx="10.2" ry="11.6" fill={SKIN} />
        <path d="M42 12 Q43 22 40 27 L37 25 Q41 19 40 12 Z" fill="url(#rim)" />
        <path d="M21.8 15 Q22 3.5 32 3.5 Q42 3.5 42.2 15 Q39 8.5 32 9 Q25 9.5 21.8 15 Z" fill={HAIR} />
        <path d="M21.6 15 Q20.6 21 22.4 25 Q20.4 20 21.6 15 Z" fill={HAIR} />

        <motion.g animate={{ y: awe ? -1.1 : 0 }} transition={{ duration: 0.3 }}>
          <rect x="24.6" y="13.6" width="5.4" height="1.5" rx="0.75" fill={HAIR} />
          <rect x="34" y="13.6" width="5.4" height="1.5" rx="0.75" fill={HAIR} />
        </motion.g>
        <motion.g animate={{ scaleY: awe ? 1.35 : 1 }} style={{ originX: "50%", originY: "50%" }}
          transition={{ duration: 0.3 }}>
          <ellipse cx="27.4" cy="17.6" rx="2.1" ry="1.7" fill="#ffffff" opacity="0.94" />
          <ellipse cx="36.6" cy="17.6" rx="2.1" ry="1.7" fill="#ffffff" opacity="0.94" />
          <circle cx="27.7" cy="17.7" r="1.05" fill="#221a12" />
          <circle cx="36.9" cy="17.7" r="1.05" fill="#221a12" />
        </motion.g>
        <path d="M32 18.4 L31 21.6 L33.2 21.8" stroke={SKIN_D} strokeWidth="0.7" fill="none" strokeLinecap="round" />
        {awe ? (
          <ellipse cx="32" cy="24.4" rx="2.5" ry="3.1" fill="#5d3326" />
        ) : (
          <path d="M29 24.2 Q32 26 35 24.2" stroke="#6b3f2e" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        )}

        <motion.g style={{ originX: "50%", originY: "54%" }}
          animate={{ rotate: awe ? -3 : [-11, 11, -11] }} transition={awe ? { duration: 0.4 } : swing}>
          <rect x="28" y="84" width="11" height="58" rx="5" fill={PANTS} />
          <ellipse cx="34" cy="146" rx="9.4" ry="5.2" fill={SHOE} />
        </motion.g>
        <motion.g style={{ originX: "50%", originY: "23%" }}
          animate={{ rotate: awe ? -46 : [17, -17, 17] }} transition={awe ? { duration: 0.5 } : swing}>
          <rect x="40" y="36" width="8.5" height="42" rx="4.2" fill={SHIRT} />
          <circle cx="44.2" cy="79" r="4.4" fill={SKIN} />
        </motion.g>
      </motion.svg>
    </div>
  );
}

export function Branding({ scale, opacity }: { scale: number; opacity: number }) {
  return (
    <motion.div className="absolute pointer-events-none"
      style={{ left: LOGO_X + "%", top: LOGO_Y + "%", translateX: "-50%", translateY: "-50%", zIndex: 38 }}
      initial={{ opacity: 0, scale: 0.62 }}
      animate={{ opacity, scale }}
      transition={{ duration: 2.0, ease: [0.24, 0.9, 0.28, 1] }}>
      <div style={{ textAlign: "center", padding: "2.2vh 3.4vw",
        background: "radial-gradient(ellipse at 50% 50%, rgba(10,8,20,0.55), rgba(10,8,20,0.05) 72%)",
        borderTop: "1px solid rgba(255,231,186,0.35)", borderBottom: "1px solid rgba(255,231,186,0.35)" }}>
        {SHOW_LOGO_IMAGE && (
          <img src="/sou-logo.jpg" alt=""
            style={{ height: "7vh", margin: "0 auto 1.4vh", display: "block",
              mixBlendMode: "screen", filter: "brightness(1.5) contrast(1.15)" }} />
        )}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#fff7e8",
          fontSize: "3.1vh", letterSpacing: "0.34em", lineHeight: 1.1, whiteSpace: "nowrap",
          textShadow: "0 0 18px rgba(255,224,160,0.85), 0 0 46px rgba(167,139,250,0.55)" }}>
          SILVER OAK
        </div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#fff7e8",
          fontSize: "3.1vh", letterSpacing: "0.34em", lineHeight: 1.3, whiteSpace: "nowrap",
          textShadow: "0 0 18px rgba(255,224,160,0.85), 0 0 46px rgba(167,139,250,0.55)" }}>
          UNIVERSITY
        </div>
        <div style={{ height: 1, margin: "1.5vh auto", width: "72%",
          background: "linear-gradient(90deg,transparent,rgba(255,231,186,0.8),transparent)" }} />
        <div style={{ color: "#e9d5ff", fontSize: "1.35vh", letterSpacing: "0.5em",
          whiteSpace: "nowrap", textShadow: "0 0 14px rgba(167,139,250,0.9)" }}>
          AI HELPDESK PRO
        </div>
      </div>
    </motion.div>
  );
}

export function FilmLayers() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30,
        background: "linear-gradient(115deg, rgba(255,214,150,0.16) 0%, transparent 42%)", mixBlendMode: "screen" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 31,
        background: "radial-gradient(ellipse at 50% 50%, transparent 32%, rgba(0,0,0,0.86) 100%)" }} />
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
      setTimeout(() => setPhase("push"), 4600),
      setTimeout(() => setPhase("bloom"), 7900),
      setTimeout(() => setPhase("done"), 9500),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const look = LOOK[phase] || LOOK.bloom;
  const brandScale = phase === "notice" ? 0.9 : phase === "push" ? 1.75 : phase === "bloom" ? 2.6 : 0.62;
  const brandOpacity = phase === "notice" ? 1 : phase === "push" ? 1 : phase === "bloom" ? 0 : 0;

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: 1.1 } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none bg-black">

          <motion.div className="absolute inset-0"
            animate={{ x: [0, -7, 5, -3, 0], y: [0, 4, -5, 2, 0], rotate: [0, 0.2, -0.16, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div className="absolute bg-center bg-cover"
              style={{ inset: "-6%", backgroundImage: PHOTO,
                transformOrigin: LOGO_X + "% " + LOGO_Y + "%" }}
              initial={{ scale: 1.14, filter: LOOK.arrive.filter }}
              animate={{ scale: look.scale, filter: look.filter }}
              transition={{ duration: look.dur, ease: [0.24, 0.9, 0.28, 1] }} />
          </motion.div>

          <Branding scale={brandScale} opacity={brandOpacity} />

          {(phase === "arrive" || phase === "notice") && (
            <motion.div className="absolute" style={{ bottom: "11.5vh", zIndex: 24 }}
              initial={{ left: "-16%", opacity: 0 }}
              animate={{ left: "24%", opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              transition={{ left: { duration: 3.0, ease: "easeOut" }, opacity: { duration: 1.1 } }}>
              <Silhouette mood={phase === "notice" ? "awe" : "curious"} />
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
