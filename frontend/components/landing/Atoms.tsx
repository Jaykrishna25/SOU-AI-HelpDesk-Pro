"use client";
import { motion } from "framer-motion";

export const BRAND_LOGO = "/sou-brand.png";   // replace this file to rebrand
export const MAROON = "#7b1220";
export const GOLD = "#c9a227";
export const GREEN = "#0f5132";

// deterministic pseudo-random so server and client render identically
export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Noise({ opacity = 0.06 }: { opacity?: number }) {
  return <div className="lp-noise absolute inset-0 pointer-events-none" style={{ opacity, zIndex: 3 }} />;
}

export function Particles({ count = 34, tint = "#ffffff", max = 3 }:
  { count?: number; tint?: string; max?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
      {Array.from({ length: count }).map((_, i) => {
        const s = 1 + rnd(i, 2) * max;
        return (
          <span key={i} className="absolute rounded-full lp-gpu"
            style={{
              left: rnd(i, 1) * 100 + "%", top: rnd(i, 3) * 100 + "%",
              width: s, height: s, background: tint,
              opacity: 0.2 + rnd(i, 4) * 0.5,
              boxShadow: "0 0 " + (s * 4) + "px " + tint,
              animation: "lp-drift " + (11 + rnd(i, 5) * 14) + "s linear " + (-rnd(i, 6) * 18) + "s infinite",
            }} />
        );
      })}
    </div>
  );
}

export function Vignette({ strength = 0.86 }: { strength?: number }) {
  return <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4,
    background: "radial-gradient(ellipse at 50% 48%, transparent 34%, rgba(2,3,8," + strength + ") 100%)" }} />;
}

/* ---------- protagonist ---------- */
export function Protagonist({ variant = "seeker", size = "38vh" }:
  { variant?: "seeker" | "graduate"; size?: string }) {
  const pro = variant === "graduate";
  const SKIN = "#c08b5e", SKIN_D = "#95664095";
  const HAIR = "#17110d";
  const TOP = pro ? "#1f2a44" : "#3b4a5f";
  const TOP_D = pro ? "#16203a" : "#2c3849";
  const PANTS = pro ? "#232734" : "#2e323c";
  return (
    <div className={"relative " + (pro ? "sou-awe" : "sou-walking")}
      style={{ filter: pro ? "brightness(1.02)" : "brightness(0.8) saturate(0.9)" }}>
      <div style={{ position: "absolute", bottom: -6, left: "50%", width: "10vh", height: "1.6vh",
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,0,0,.5), transparent 72%)" }} />
      <svg className="sou-fig" viewBox="0 0 64 152" style={{ height: size, width: "auto", display: "block" }}>
        <defs>
          <linearGradient id="lpRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor={pro ? GOLD : "#ffe8c0"} stopOpacity={pro ? 0.75 : 0.5} />
          </linearGradient>
        </defs>
        <g className="lg lg-a"><rect x="26" y="84" width="11" height="58" rx="5" fill={PANTS} opacity=".85" />
          <ellipse cx="30" cy="146" rx="9" ry="5" fill="#14151a" /></g>
        <g className="ar ar-a"><rect x="15" y="36" width="8.5" height="42" rx="4.2" fill={TOP_D} />
          <circle cx="19" cy="79" r="4.4" fill={SKIN_D} /></g>

        <path d={pro ? "M19 36 Q32 30 45 36 L48 88 L16 88 Z" : "M20 36 Q32 31 44 36 L46 86 L18 86 Z"} fill={TOP} />
        {pro && <>
          <path d="M26 34 L32 50 L38 34 L36 33 L32 44 L28 33 Z" fill="#f4f4f6" />
          <path d="M31 44 L33 44 L34 52 L30 52 Z" fill={MAROON} />
          <rect x="16" y="88" width="32" height="9" rx="2" fill={PANTS} />
          <rect x="44" y="70" width="18" height="13" rx="2" fill="#1b1f2b" stroke={GOLD} strokeWidth="0.8" />
          <rect x="46" y="72" width="14" height="8" rx="1" fill={GOLD} opacity=".35" />
        </>}
        {!pro && <>
          <rect x="18" y="84" width="28" height="9" rx="2" fill={PANTS} />
          <path d="M22 37 L26 60" stroke="#6b4f2a" strokeWidth="3.2" fill="none" opacity=".9" />
          <path d="M42 37 L38 60" stroke="#6b4f2a" strokeWidth="3.2" fill="none" opacity=".9" />
        </>}
        <path d="M44 36 L46 86 L42 86 L41 37 Z" fill="url(#lpRim)" />

        <rect x="29" y="26" width="7" height="9" rx="3" fill={SKIN_D} />
        <ellipse cx="32" cy="17" rx="10.2" ry="11.6" fill={SKIN} />
        <path d="M42 12 Q43 22 40 27 L37 25 Q41 19 40 12 Z" fill="url(#lpRim)" />
        <path d="M21.8 15 Q22 3.5 32 3.5 Q42 3.5 42.2 15 Q39 8.5 32 9 Q25 9.5 21.8 15 Z" fill={HAIR} />
        <rect x="24.6" y={pro ? 13 : 13.8} width="5.4" height="1.5" rx=".75" fill={HAIR} />
        <rect x="34" y={pro ? 13 : 13.8} width="5.4" height="1.5" rx=".75" fill={HAIR} />
        <ellipse cx="27.4" cy="17.6" rx="2.1" ry="1.8" fill="#fff" opacity=".95" />
        <ellipse cx="36.6" cy="17.6" rx="2.1" ry="1.8" fill="#fff" opacity=".95" />
        <circle cx="27.7" cy="17.7" r="1.05" fill="#221a12" />
        <circle cx="36.9" cy="17.7" r="1.05" fill="#221a12" />
        <path d="M32 18.4 L31 21.6 L33.2 21.8" stroke={SKIN_D} strokeWidth=".7" fill="none" strokeLinecap="round" />
        <path d={pro ? "M28.4 23.8 Q32 27 35.6 23.8" : "M29.4 24.4 Q32 25.6 34.6 24.4"}
          stroke="#6b3f2e" strokeWidth="1.1" fill="none" strokeLinecap="round" />

        <g className="lg lg-b"><rect x="28" y="84" width="11" height="58" rx="5" fill={PANTS} />
          <ellipse cx="34" cy="146" rx="9.4" ry="5.2" fill="#14151a" /></g>
        <g className="ar ar-b"><rect x="40" y="36" width="8.5" height="42" rx="4.2" fill={TOP} />
          <circle cx="44.2" cy="79" r="4.4" fill={SKIN} /></g>
      </svg>
    </div>
  );
}

/* ---------- campus gate ---------- */
export function Gate() {
  return (
    <svg viewBox="0 0 1000 420" className="absolute inset-x-0 bottom-0 w-full" style={{ zIndex: 1 }}
      preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="lpPillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a3327" /><stop offset="45%" stopColor="#6c6150" />
          <stop offset="100%" stopColor="#2c271f" />
        </linearGradient>
        <linearGradient id="lpSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1020" stopOpacity="0" />
          <stop offset="100%" stopColor="#120d08" stopOpacity=".9" />
        </linearGradient>
      </defs>
      <rect x="0" y="330" width="1000" height="90" fill="#171310" />
      <path d="M300 420 L420 300 L580 300 L700 420 Z" fill="#1d1812" opacity=".85" />
      <rect x="150" y="120" width="70" height="230" fill="url(#lpPillar)" />
      <rect x="780" y="120" width="70" height="230" fill="url(#lpPillar)" />
      <rect x="140" y="104" width="90" height="20" rx="4" fill="#7e7360" />
      <rect x="770" y="104" width="90" height="20" rx="4" fill="#7e7360" />
      <path d="M220 128 Q500 34 780 128 L780 150 Q500 58 220 150 Z" fill="#5e5546" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={i} x={250 + i * 68} y={128 + Math.abs(i - 3.5) * 7} width="5" height={190 - Math.abs(i - 3.5) * 7}
          fill="#4a4336" opacity=".75" />
      ))}
      <rect x="0" y="0" width="1000" height="420" fill="url(#lpSky)" />
    </svg>
  );
}

/* ---------- branding board ---------- */
export function BrandBoard({ glow = false, width = "min(640px, 78vw)" }:
  { glow?: boolean; width?: string }) {
  return (
    <div className="relative lp-gpu" style={{ width }}>
      {glow && (
        <div className="absolute -inset-8 rounded-3xl lp-pulse pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(201,162,39,.45), rgba(123,18,32,.18) 45%, transparent 72%)" }} />
      )}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(160deg,#fdfcf8,#efe9dd)", border: "1px solid rgba(201,162,39,.55)",
          padding: "clamp(14px,2.4vw,26px)" }}>
        <img src={BRAND_LOGO} alt="Silver Oak University" className="w-full h-auto block select-none" draggable={false} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)",
              animation: "lp-shimmer 5.5s ease-in-out infinite" }} />
        </div>
      </div>
      <div className="mx-auto mt-1 rounded-b-md"
        style={{ width: "62%", height: 10, background: "linear-gradient(180deg,#6c6150,#2c271f)" }} />
      <div className="mx-auto flex justify-between" style={{ width: "48%" }}>
        <div style={{ width: 12, height: "9vh", background: "linear-gradient(180deg,#5b5244,#221e18)" }} />
        <div style={{ width: 12, height: "9vh", background: "linear-gradient(180deg,#5b5244,#221e18)" }} />
      </div>
    </div>
  );
}

/* ---------- portal energy ---------- */
export function PortalFX({ level = 1 }: { level?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="absolute rounded-full lp-gpu"
          style={{ left: "50%", top: "50%", width: 160, height: 160,
            border: "2px solid " + (i % 2 ? "rgba(201,162,39,.8)" : "rgba(160,130,255,.8)"),
            animation: "lp-ring " + (3.4 + i * 0.35) + "s cubic-bezier(.16,.7,.3,1) " + (i * 0.5) + "s infinite" }} />
      ))}
      <div className="absolute left-1/2 top-1/2 lp-spin lp-gpu"
        style={{ width: "42vmin", height: "42vmin", marginLeft: "-21vmin", marginTop: "-21vmin",
          borderRadius: "50%", border: "1px dashed rgba(255,255,255,.25)",
          boxShadow: "inset 0 0 80px rgba(160,130,255,.35)" }} />
      <div className="absolute left-1/2 top-1/2 lp-spin-rev lp-gpu"
        style={{ width: "28vmin", height: "28vmin", marginLeft: "-14vmin", marginTop: "-14vmin",
          borderRadius: "50%", border: "1px solid rgba(201,162,39,.35)" }} />
      <motion.div className="absolute left-1/2 top-1/2 rounded-full lp-gpu"
        style={{ width: "34vmin", height: "34vmin", marginLeft: "-17vmin", marginTop: "-17vmin",
          background: "radial-gradient(circle,#ffffff 0%,#ffe9b8 12%,#a78bfa 38%,rgba(123,18,32,.35) 62%,transparent 76%)" }}
        animate={{ opacity: [0.55 * level, 0.95 * level, 0.55 * level], scale: [1, 1.07, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute left-0 right-0 top-1/2 h-[2px] lp-beam"
        style={{ background: "linear-gradient(90deg,transparent,rgba(201,162,39,.7),#fff,rgba(160,130,255,.7),transparent)" }} />
    </div>
  );
}

export function Headline({ eyebrow, title, sub, children, delay = 0 }:
  { eyebrow?: string; title: string; sub?: string; children?: React.ReactNode; delay?: number }) {
  return (
    <motion.div className="relative text-center px-5" style={{ zIndex: 20 }}
      initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0, 0.2, 1] }}>
      {eyebrow && (
        <div className="text-[11px] md:text-xs uppercase tracking-[0.42em] mb-4"
          style={{ color: GOLD }}>{eyebrow}</div>
      )}
      <h2 className="font-semibold leading-[1.12] mx-auto max-w-4xl"
        style={{ fontSize: "clamp(1.8rem,4.4vw,3.6rem)",
          textShadow: "0 2px 40px rgba(0,0,0,.75)" }}>{title}</h2>
      {sub && <p className="mt-4 mx-auto max-w-2xl text-sm md:text-base opacity-75">{sub}</p>}
      {children && <div className="mt-8 flex gap-3 justify-center flex-wrap">{children}</div>}
    </motion.div>
  );
}

export function CTA({ children, onClick, variant = "primary", href }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; href?: string }) {
  const cls = variant === "primary"
    ? "text-white shadow-lg"
    : "lp-glass text-white/85 hover:text-white";
  const style = variant === "primary"
    ? { background: "linear-gradient(135deg," + MAROON + "," + "#a3162a)", boxShadow: "0 10px 40px rgba(123,18,32,.5)" }
    : {};
  const inner = (
    <span className="relative inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium
      transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98] overflow-hidden">
      {children}
    </span>
  );
  return href
    ? <a href={href} className={"inline-block rounded-full " + cls} style={style}>{inner}</a>
    : <button onClick={onClick} className={"rounded-full " + cls} style={style}>{inner}</button>;
}
