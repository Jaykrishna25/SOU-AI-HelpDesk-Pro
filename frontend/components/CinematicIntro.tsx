"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_X = 46;
const LOGO_Y = 57;
const PHOTO = "/sou-campus.jpg";
const SHOW_LOGO_IMAGE = true;
const T = 9.6;
const TIMES = [0, 0.333, 0.479, 0.833, 1];
const EASE = [[0.4, 0, 0.6, 1], [0.4, 0, 0.3, 1], [0.32, 0, 0.2, 1], [0.55, 0, 0.85, 1]] as any;
const GRAIN = "url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27140%27%20height=%27140%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%273%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27140%27%20height=%27140%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E)";

const SKIN = "#b8865c", SKIN_D = "#8f6440", HAIR = "#1a1410";
const SHIRT = "#3a5f8a", SHIRT_D = "#2a4666";
const PANTS = "#2c2f38", PANTS_D = "#1e2028", SHOE = "#15161a";
const BAG = "#6b4f2a", GOWN = "#141a2e";

export function Silhouette({
  graduate = false, mood = "curious",
}: { graduate?: boolean; mood?: "curious" | "awe" }) {
  const awe = mood === "awe";
  return (
    <div className={awe ? "sou-awe" : "sou-walking"}
      style={{ position: "relative", filter: "brightness(0.82) saturate(0.92) contrast(1.06)" }}>
      <div style={{ position: "absolute", bottom: -8, left: "50%", width: "11vh", height: "1.8vh",
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 72%)" }} />
      <svg className="sou-fig" viewBox="0 0 64 152"
        style={{ height: "40vh", width: "auto", display: "block" }}>
        <defs>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffe8c0" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g className="lg lg-a">
          <rect x="26" y="84" width="11" height="58" rx="5" fill={PANTS_D} />
          <ellipse cx="30" cy="146" rx="9" ry="5" fill={SHOE} />
        </g>
        <g className="ar ar-a">
          <rect x="15" y="36" width="8.5" height="42" rx="4.2" fill={SHIRT_D} />
          <circle cx="19" cy="79" r="4.4" fill={SKIN_D} />
        </g>
        {graduate ? (
          <path d="M20 36 Q32 31 44 36 L50 92 L14 92 Z" fill={GOWN} />
        ) : (
          <>
            <path d="M20 36 Q32 31 44 36 L46 86 L18 86 Z" fill={SHIRT} />
            <path d="M32 33 L27 44 L32 47 L37 44 Z" fill={SKIN_D} opacity="0.85" />
            <rect x="31" y="44" width="1.6" height="42" fill={SHIRT_D} opacity="0.8" />
            <rect x="18" y="84" width="28" height="9" rx="2" fill={PANTS} />
            <path d="M22 37 L26 60" stroke={BAG} strokeWidth="3.4" fill="none" opacity="0.9" />
            <path d="M42 37 L38 60" stroke={BAG} strokeWidth="3.4" fill="none" opacity="0.9" />
          </>
        )}
        <path d="M44 36 L46 86 L42 86 L41 37 Z" fill="url(#rim)" />
        <rect x="29" y="26" width="7" height="9" rx="3" fill={SKIN_D} />
        <ellipse cx="32" cy="17" rx="10.2" ry="11.6" fill={SKIN} />
        <path d="M42 12 Q43 22 40 27 L37 25 Q41 19 40 12 Z" fill="url(#rim)" />
        <path d="M21.8 15 Q22 3.5 32 3.5 Q42 3.5 42.2 15 Q39 8.5 32 9 Q25 9.5 21.8 15 Z" fill={HAIR} />
        <path d="M21.6 15 Q20.6 21 22.4 25 Q20.4 20 21.6 15 Z" fill={HAIR} />
        <rect x="24.6" y={awe ? 12.4 : 13.6} width="5.4" height="1.5" rx="0.75" fill={HAIR} />
        <rect x="34" y={awe ? 12.4 : 13.6} width="5.4" height="1.5" rx="0.75" fill={HAIR} />
        <ellipse cx="27.4" cy="17.6" rx="2.1" ry={awe ? 2.3 : 1.7} fill="#ffffff" opacity="0.94" />
        <ellipse cx="36.6" cy="17.6" rx="2.1" ry={awe ? 2.3 : 1.7} fill="#ffffff" opacity="0.94" />
        <circle cx="27.7" cy="17.7" r="1.05" fill="#221a12" />
        <circle cx="36.9" cy="17.7" r="1.05" fill="#221a12" />
        <path d="M32 18.4 L31 21.6 L33.2 21.8" stroke={SKIN_D} strokeWidth="0.7" fill="none" strokeLinecap="round" />
        {awe
          ? <ellipse cx="32" cy="24.6" rx="2.5" ry="3.1" fill="#5d3326" />
          : <path d="M29 24.2 Q32 26 35 24.2" stroke="#6b3f2e" strokeWidth="1.1" fill="none" strokeLinecap="round" />}
        <g className="lg lg-b">
          <rect x="28" y="84" width="11" height="58" rx="5" fill={PANTS} />
          <ellipse cx="34" cy="146" rx="9.4" ry="5.2" fill={SHOE} />
        </g>
        <g className="ar ar-b">
          <rect x="40" y="36" width="8.5" height="42" rx="4.2" fill={SHIRT} />
          <circle cx="44.2" cy="79" r="4.4" fill={SKIN} />
        </g>
      </svg>
    </div>
  );
}

export function Branding() {
  return (
    <motion.div className="absolute pointer-events-none"
      style={{ left: LOGO_X + "%", top: LOGO_Y + "%", zIndex: 38, willChange: "transform, opacity" }}
      initial={{ opacity: 0, scale: 0.66, x: "-50%", y: "-50%" }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.66, 0.94, 1.9, 2.7] }}
      transition={{ duration: 6.2, times: [0, 0.17, 0.74, 1],
        ease: [[0.2, 0, 0.2, 1], "linear", [0.5, 0, 0.85, 1]] as any }}>
      <div style={{ textAlign: "center", padding: "2.2vh 3.4vw",
        background: "radial-gradient(ellipse at 50% 50%, rgba(10,8,20,0.55), rgba(10,8,20,0.03) 74%)",
        borderTop: "1px solid rgba(255,231,186,0.35)", borderBottom: "1px solid rgba(255,231,186,0.35)" }}>
        {SHOW_LOGO_IMAGE && (
          <img src="/sou-logo.jpg" alt=""
            style={{ height: "7vh", margin: "0 auto 1.4vh", display: "block", opacity: 0.95 }} />
        )}
        {["SILVER OAK", "UNIVERSITY"].map((line, i) => (
          <motion.div key={line}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.3, delay: 0.25 + i * 0.16, ease: [0.2, 0, 0.2, 1] }}
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#fff7e8",
              fontSize: "3.1vh", lineHeight: 1.18, whiteSpace: "nowrap", letterSpacing: "0.34em",
              textShadow: "0 0 18px rgba(255,224,160,0.85), 0 0 46px rgba(167,139,250,0.55)" }}>
            {line}
          </motion.div>
        ))}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, delay: 0.7, ease: [0.2, 0, 0.2, 1] }}
          style={{ height: 1, margin: "1.5vh auto", width: "72%",
            background: "linear-gradient(90deg,transparent,rgba(255,231,186,0.85),transparent)" }} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.95 }}
          style={{ color: "#e9d5ff", fontSize: "1.35vh", letterSpacing: "0.5em",
            whiteSpace: "nowrap", textShadow: "0 0 14px rgba(167,139,250,0.9)" }}>
          AI HELPDESK PRO
        </motion.div>
      </div>
    </motion.div>
  );
}

export function FilmLayers() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 31,
        background: "radial-gradient(ellipse at 50% 50%, transparent 32%, rgba(0,0,0,0.86) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 32, opacity: 0.07, backgroundImage: GRAIN, backgroundRepeat: "repeat" }} />
      <motion.div className="absolute inset-x-0 top-0 bg-black pointer-events-none"
        style={{ height: "11vh", zIndex: 40, willChange: "transform" }}
        initial={{ y: "-100%" }} animate={{ y: 0 }}
        transition={{ duration: 1.2, ease: [0.2, 0, 0.2, 1] }} />
      <motion.div className="absolute inset-x-0 bottom-0 bg-black pointer-events-none"
        style={{ height: "11vh", zIndex: 40, willChange: "transform" }}
        initial={{ y: "100%" }} animate={{ y: 0 }}
        transition={{ duration: 1.2, ease: [0.2, 0, 0.2, 1] }} />
    </>
  );
}

export default function CinematicIntro() {
  const [run, setRun] = useState(false);
  const [focused, setFocused] = useState(false);
  const [awe, setAwe] = useState(false);
  const [walker, setWalker] = useState(true);
  const [brand, setBrand] = useState(false);
  const [bloom, setBloom] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sou_intro_seen")) return;
      sessionStorage.setItem("sou_intro_seen", "1");
    } catch {}
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: any[] = [];
    const begin = () => {
      setRun(true);
      timers = [
        setTimeout(() => { setFocused(true); setAwe(true); }, 3200),
        setTimeout(() => setBrand(true), 3400),
        setTimeout(() => setWalker(false), 4900),
        setTimeout(() => setBloom(true), 8000),
        setTimeout(() => setDone(true), T * 1000),
      ];
    };
    const img = new window.Image();
    img.src = PHOTO;
    const go = () => begin();
    if (img.decode) img.decode().then(go).catch(go);
    else { img.onload = go; img.onerror = go; }
    const guard = setTimeout(go, 2500);
    return () => { clearTimeout(guard); timers.forEach(clearTimeout); };
  }, []);

  const imgStyle: React.CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", filter: "saturate(0.85) contrast(1.1)",
  };

  return (
    <AnimatePresence>
      {run && !done && (
        <motion.div exit={{ opacity: 0, transition: { duration: 1.2, ease: "easeInOut" } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none bg-black">

          <motion.div className="absolute inset-0" style={{ willChange: "transform" }}
            animate={{ x: [0, -6, 4, -2, 0], y: [0, 3, -4, 2, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div className="absolute"
              style={{ inset: "-8%", transformOrigin: LOGO_X + "% " + LOGO_Y + "%", willChange: "transform" }}
              initial={{ scale: 1.16 }} animate={{ scale: [1.16, 1.22, 1.32, 2.30, 2.85] }}
              transition={{ duration: T, times: TIMES, ease: EASE }}>
              <img src={PHOTO} alt="" style={imgStyle} />
              <AnimatePresence>
                {!focused && (
                  <motion.img key="soft" src={PHOTO} alt=""
                    style={{ ...imgStyle, filter: "blur(9px) saturate(0.7)" }}
                    initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }} />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.div className="absolute inset-0" style={{ zIndex: 20, willChange: "opacity",
            background: "linear-gradient(180deg,#070b18 0%,#02030a 100%)" }}
            initial={{ opacity: 0.9 }} animate={{ opacity: [0.9, 0.82, 0.6, 0.28, 0.12] }}
            transition={{ duration: T, times: TIMES, ease: "linear" }} />
          <motion.div className="absolute inset-0" style={{ zIndex: 21, willChange: "opacity",
            background: "radial-gradient(ellipse at " + LOGO_X + "% " + LOGO_Y + "%, rgba(255,206,138,0.5), rgba(255,178,108,0.12) 46%, transparent 72%)" }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.06, 0.28, 0.72, 0.95] }}
            transition={{ duration: T, times: TIMES, ease: "linear" }} />

          {brand && !bloom && <Branding />}

          <AnimatePresence>
            {walker && (
              <motion.div key="w" className="absolute inset-x-0"
                style={{ bottom: "11.5vh", zIndex: 24, willChange: "transform, opacity" }}
                initial={{ x: "-32%", opacity: 0 }} animate={{ x: "20%", opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                transition={{ x: { duration: 3.2, ease: [0.16, 0.6, 0.3, 1] }, opacity: { duration: 1.3 } }}>
                <Silhouette mood={awe ? "awe" : "curious"} />
              </motion.div>
            )}
          </AnimatePresence>

          {bloom && (
            <>
              <motion.div className="absolute inset-0" style={{ zIndex: 45, willChange: "opacity",
                background: "radial-gradient(circle at " + LOGO_X + "% " + LOGO_Y + "%, #ffffff 0%, #fff2d6 11%, #a78bfa 30%, transparent 62%)" }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.9, 0] }}
                transition={{ duration: 1.6, times: [0, 0.14, 0.5, 1], ease: "easeInOut" }} />
              <motion.div className="absolute left-0 right-0"
                style={{ top: LOGO_Y + "%", height: 3, zIndex: 46, willChange: "transform, opacity",
                  background: "linear-gradient(90deg,transparent,rgba(196,181,253,0.6),#ffffff,rgba(196,181,253,0.6),transparent)" }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 0.7, 0] }}
                transition={{ duration: 1.5, times: [0, 0.18, 0.6, 1], ease: [0.2, 0, 0.2, 1] }} />
              {[-0.28, 0.22, 0.44].map((o, i) => (
                <motion.div key={"f" + i} className="absolute rounded-full"
                  style={{ left: (LOGO_X + o * 38) + "%", top: (LOGO_Y + o * 9) + "%",
                    width: 90 - i * 22, height: 90 - i * 22, zIndex: 47, willChange: "transform, opacity",
                    background: "radial-gradient(circle, rgba(255,241,214,0.5), rgba(167,139,250,0.16) 55%, transparent 72%)" }}
                  initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.5, 2.1] }}
                  transition={{ duration: 1.5, delay: 0.12 + i * 0.07, ease: "easeOut" }} />
              ))}
              {[0, 1, 2].map((i) => (
                <motion.div key={"r" + i} className="absolute rounded-full"
                  style={{ left: LOGO_X + "%", top: LOGO_Y + "%", width: 40, height: 40, zIndex: 44,
                    border: "1.5px solid rgba(233,213,255,0.7)", willChange: "transform, opacity" }}
                  initial={{ scale: 0.2, opacity: 0, x: "-50%", y: "-50%" }}
                  animate={{ scale: 26, opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.6, delay: i * 0.16, ease: [0.16, 0.7, 0.3, 1] }} />
              ))}
            </>
          )}

          <FilmLayers />

          <motion.div className="absolute inset-0 bg-black pointer-events-none"
            style={{ zIndex: 55, willChange: "opacity" }}
            initial={{ opacity: 1 }} animate={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }} />

          <motion.button onClick={() => setDone(true)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.8 }}
            className="absolute right-6 text-[11px] tracking-[0.25em] uppercase text-white/45 hover:text-white transition-colors"
            style={{ top: "4vh", zIndex: 60 }}>Skip</motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
