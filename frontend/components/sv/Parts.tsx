"use client";
import { motion, MotionValue } from "framer-motion";

/* ============ PUT YOUR LOGO HERE ==================================
   frontend/public/sou-brand.png
   Used twice, never distorted: printed on the bag, and the final reveal.
   ================================================================= */
export const LOGO = "/sou-brand.png";

export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 57.3 + s * 311.7) * 18731.4;
  return x - Math.floor(x);
};

/* ---------- golden-hour campus ---------- */
export function Environment() {
  return (
    <>
      <div className="absolute inset-0 sv-z-sky"
        style={{ background: "linear-gradient(180deg,#2B1C2E 0%,#6B3A26 42%,#B9702F 68%,#E8A94C 88%,#F3C877 100%)" }} />
      <div className="absolute sv-z-sky sv-pulse"
        style={{ left: "62%", top: "46%", width: "34vmin", height: "34vmin", marginLeft: "-17vmin",
          borderRadius: "50%", background: "radial-gradient(circle,rgba(255,236,182,.95),rgba(255,196,110,.35) 42%,transparent 70%)" }} />

      {/* distant academic block */}
      <svg viewBox="0 0 1600 420" className="absolute inset-x-0 sv-z-far" preserveAspectRatio="none"
        style={{ bottom: "26%", height: "30%", opacity: .55 }}>
        <rect x="120" y="120" width="330" height="300" fill="#3A2318" />
        <rect x="1150" y="90" width="300" height="330" fill="#3A2318" />
        <rect x="520" y="160" width="540" height="260" fill="#43281B" />
        <path d="M520 160 L790 60 L1060 160 Z" fill="#332016" />
        {Array.from({ length: 30 }).map((_, i) => (
          <rect key={i} x={150 + (i % 10) * 32} y={170 + Math.floor(i / 10) * 70} width="16" height="34"
            fill="#F2C97E" opacity={.25 + rnd(i, 3) * .5} />
        ))}
      </svg>

      {/* treeline */}
      <svg viewBox="0 0 1600 260" className="absolute inset-x-0 sv-z-far" preserveAspectRatio="none"
        style={{ bottom: "24%", height: "22%" }}>
        <path d="M0 260 L0 150 Q90 70 170 140 Q250 60 340 135 Q430 70 520 140 Q610 62 700 138
                 Q790 72 880 142 Q970 66 1060 136 Q1150 74 1240 144 Q1330 68 1420 138 Q1510 84 1600 150 L1600 260 Z"
          fill="#1D2A18" opacity=".95" />
      </svg>

      {/* walkway */}
      <div className="absolute inset-x-0 bottom-0 sv-z-mid"
        style={{ height: "26%", background: "linear-gradient(180deg,#4A3524 0%,#31221A 40%,#241811 100%)" }} />
      <div className="absolute inset-x-0 sv-z-mid" style={{ bottom: "26%", height: 2,
        background: "linear-gradient(90deg,transparent,rgba(255,214,150,.6),transparent)" }} />

      {/* light shafts */}
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute sv-z-mid pointer-events-none"
          style={{ left: 44 + i * 12 + "%", top: "-14%", width: 3 + i, height: "110%",
            transform: "rotate(" + (10 + i * 4) + "deg)", filter: "blur(2px)",
            background: "linear-gradient(180deg,rgba(255,226,160,.5),transparent 72%)" }} />
      ))}

      {/* drifting leaves */}
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="absolute sv-z-mid sv-gpu"
          style={{ left: rnd(i, 7) * 90 + "%", top: 0, width: 9, height: 5, borderRadius: "60% 0",
            background: "rgba(150,110,50,.6)",
            animation: "sv-leaf " + (11 + rnd(i, 9) * 9) + "s linear " + (-rnd(i, 11) * 12) + "s infinite" }} />
      ))}
    </>
  );
}

export function Motes({ n = 22, tint = "rgba(201,162,39," }: { n?: number; tint?: string }) {
  return (
    <div className="absolute inset-0 sv-z-fx pointer-events-none overflow-hidden">
      {Array.from({ length: n }).map((_, i) => {
        const s = 1 + rnd(i, 2) * 2.4;
        return (
          <span key={i} className="absolute rounded-full sv-gpu"
            style={{ left: rnd(i, 1) * 100 + "%", top: rnd(i, 3) * 100 + "%", width: s, height: s,
              background: tint + (.35 + rnd(i, 4) * .5) + ")",
              boxShadow: "0 0 " + s * 6 + "px rgba(201,162,39,.55)",
              animation: "sv-mote " + (12 + rnd(i, 5) * 12) + "s linear " + (-rnd(i, 6) * 18) + "s infinite" }} />
        );
      })}
    </div>
  );
}

/* ---------- the branded bag: logo printed, never distorted ---------- */
export function Bag({ glow, open }: { glow: MotionValue<number>; open: MotionValue<number> }) {
  return (
    <div className="relative sv-gpu" style={{ width: "min(220px,26vw)" }}>
      <motion.div className="absolute -inset-10 rounded-[40px] pointer-events-none" style={{ opacity: glow,
        background: "radial-gradient(ellipse,rgba(227,197,88,.9),rgba(201,162,39,.4) 36%,rgba(123,18,32,.18) 60%,transparent 78%)" }} />

      {/* flap lifts as the portal opens */}
      <motion.div className="absolute left-[8%] right-[8%] rounded-t-2xl sv-gpu"
        style={{ top: "-6%", height: "34%", transformOrigin: "50% 100%", background: "linear-gradient(180deg,#5B1A24,#3E0F17)",
          border: "1px solid rgba(201,162,39,.4)", rotateX: open }} />

      <div className="relative rounded-2xl overflow-hidden"
        style={{ aspectRatio: "1 / 1.05", background: "linear-gradient(160deg,#6E1723,#43101A 60%,#2C0A11)",
          border: "1px solid rgba(201,162,39,.45)", boxShadow: "0 24px 60px rgba(0,0,0,.6)" }}>
        {/* logo panel - fixed aspect, contained, never stretched */}
        <div className="absolute left-[8%] right-[8%] top-[30%] rounded-md overflow-hidden"
          style={{ background: "rgba(246,241,231,.94)", padding: "6% 5%" }}>
          <img src={LOGO} alt="Silver Oak University" draggable={false}
            className="w-full h-auto block" style={{ objectFit: "contain" }} />
          <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: glow,
            background: "radial-gradient(circle,rgba(255,255,255,.9),transparent 68%)" }} />
        </div>
        {/* seams catching the light */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: glow }}>
          <div className="absolute inset-x-[6%] top-[26%] h-px" style={{ background: "rgba(227,197,88,.9)" }} />
          <div className="absolute inset-x-[6%] bottom-[10%] h-px" style={{ background: "rgba(227,197,88,.7)" }} />
          <div className="absolute inset-y-[10%] left-[6%] w-px" style={{ background: "rgba(227,197,88,.6)" }} />
          <div className="absolute inset-y-[10%] right-[6%] w-px" style={{ background: "rgba(227,197,88,.6)" }} />
        </motion.div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 w-1/4"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)",
              animation: "sv-sheen 7s ease-in-out infinite" }} />
        </div>
      </div>

      {/* strap */}
      <svg viewBox="0 0 100 60" className="absolute -top-[18%] left-0 w-full" style={{ overflow: "visible" }}>
        <path d="M22 52 Q50 -4 78 52" fill="none" stroke="#4A121C" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="mx-auto" style={{ width: "76%", height: 8, borderRadius: "50%",
        background: "radial-gradient(ellipse,rgba(0,0,0,.65),transparent 72%)", marginTop: 4 }} />
    </div>
  );
}

/* ---------- student: walks, sits and reads, walks away ---------- */
export function Student({ pose, height = "34vh" }:
  { pose: "walk" | "read" | "leave"; height?: string }) {
  const walking = pose !== "read";
  const SKIN = "#C08A5E", SKIN_D = "#96694292";
  const HAIR = "#17100C";
  const TOP = pose === "leave" ? "#1F3A2C" : "#3B4A5C";
  const TOP_D = pose === "leave" ? "#16291F" : "#2B3745";
  const PANT = "#2B2620";
  return (
    <div className={"relative sv-gpu " + (walking ? "sv-walking" : "sv-seated")}>
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{ width: "13vh", height: "1.6vh", borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(0,0,0,.5),transparent 72%)" }} />
      {walking ? (
        <svg className="sv-fig" viewBox="0 0 70 160" style={{ height, width: "auto", display: "block" }}>
          <g className="lg lg-a"><rect x="28" y="86" width="11" height="60" rx="5" fill="#1F1B16" />
            <ellipse cx="32" cy="150" rx="9" ry="5" fill="#120F0C" /></g>
          <g className="ar ar-a"><rect x="17" y="38" width="8.5" height="42" rx="4" fill={TOP_D} />
            <circle cx="21" cy="81" r="4.4" fill={SKIN_D} /></g>
          <path d="M22 38 Q35 32 48 38 L50 88 L20 88 Z" fill={TOP} />
          <rect x="20" y="86" width="30" height="9" rx="2" fill={PANT} />
          <rect x="31" y="27" width="7" height="10" rx="3" fill={SKIN_D} />
          <ellipse cx="35" cy="18" rx="10.4" ry="11.8" fill={SKIN} />
          <path d="M24.6 16 Q25 4 35 4 Q45 4 45.4 16 Q42 9 35 9.6 Q28 10.2 24.6 16 Z" fill={HAIR} />
          <circle cx="31" cy="18.4" r="1.05" fill="#221A12" />
          <path d="M31.4 24.4 Q35 26.4 38.6 24.4" stroke="#6B3F2E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <g className="lg lg-b"><rect x="30" y="86" width="11" height="60" rx="5" fill={PANT} />
            <ellipse cx="36" cy="150" rx="9.4" ry="5.2" fill="#181410" /></g>
          <g className="ar ar-b"><rect x="44" y="38" width="8.5" height="42" rx="4" fill={TOP} />
            <circle cx="48" cy="81" r="4.4" fill={SKIN} /></g>
        </svg>
      ) : (
        <svg viewBox="0 0 120 130" style={{ height, width: "auto", display: "block" }}>
          <path d="M40 126 L104 126 L100 112 L44 112 Z" fill={PANT} />
          <path d="M40 112 L44 78 L70 78 L66 112 Z" fill={PANT} />
          <path d="M34 50 Q52 42 68 52 L72 92 L32 92 Z" fill={TOP} />
          <path d="M34 50 Q52 42 68 52 L69 62 L34 62 Z" fill={TOP_D} opacity=".5" />
          <rect x="47" y="34" width="8" height="11" rx="3" fill={SKIN_D} />
          <ellipse cx="51" cy="24" rx="11" ry="12" fill={SKIN} />
          <path d="M40 22 Q40 9 51 9 Q62 9 62 22 Q58 14 51 14.6 Q44 15.2 40 22 Z" fill={HAIR} />
          <circle cx="56" cy="25" r="1.1" fill="#221A12" />
          <path d="M52 31 Q56 33 60 31" stroke="#6B3F2E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M66 58 L92 76" stroke={TOP} strokeWidth="9" strokeLinecap="round" />
          {/* open book */}
          <g transform="translate(74,72)">
            <path d="M0 14 L22 6 L22 26 L0 32 Z" fill="#E9E2D2" />
            <path className="sv-page" d="M22 6 L44 14 L44 32 L22 26 Z" fill="#F6F1E7" />
            <path d="M0 14 L22 6 L44 14" fill="none" stroke="#C9A227" strokeWidth="1.2" />
          </g>
        </svg>
      )}
    </div>
  );
}

/* ---------- portal born from the bag ---------- */
export function Portal({ v, tunnel }: { v: MotionValue<number>; tunnel: MotionValue<number> }) {
  return (
    <div className="absolute inset-0 sv-z-fx pointer-events-none flex items-center justify-center">
      <motion.div style={{ opacity: v, scale: v }} className="relative sv-gpu"
      >
        <div className="relative" style={{ width: "44vmin", height: "44vmin" }}>
          <div className="absolute inset-0 rounded-full sv-rot"
            style={{ background: "conic-gradient(from 0deg,var(--maroon),#9C7A1E,var(--gold),var(--green),#2A0E13,var(--maroon))",
              filter: "blur(2px)",
              maskImage: "radial-gradient(circle,transparent 34%,#000 46%,#000 72%,transparent 84%)",
              WebkitMaskImage: "radial-gradient(circle,transparent 34%,#000 46%,#000 72%,transparent 84%)" }} />
          <svg viewBox="0 0 200 200" className="absolute inset-0 sv-rot-r">
            <polygon points="100,16 173,58 173,142 100,184 27,142 27,58" fill="none"
              stroke="var(--gold)" strokeWidth=".7" strokeDasharray="14 9" opacity=".85" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--green-lt)" strokeWidth=".4"
              strokeDasharray="3 8" opacity=".6" />
          </svg>
          <div className="absolute left-1/2 top-1/2 rounded-full sv-pulse"
            style={{ width: "46%", height: "46%", marginLeft: "-23%", marginTop: "-23%",
              background: "radial-gradient(circle,#FFFDF5 0%,#FFE9B0 16%,var(--gold) 36%,var(--maroon) 64%,transparent 80%)" }} />
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute left-1/2 top-1/2 sv-gpu"
              style={{ width: "116%", height: 2, marginLeft: "-58%",
                background: "linear-gradient(90deg,transparent," + (i === 1 ? "var(--gold)" : "var(--green-lt)") + ",transparent)",
                filter: "blur(1px)", opacity: .6, transform: "rotate(" + i * 60 + "deg)",
                animation: "sv-rot " + (18 + i * 7) + "s linear infinite" }} />
          ))}
        </div>
      </motion.div>

      {/* tunnel rings - only visible during travel */}
      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: tunnel }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span key={i} className="absolute rounded-full sv-gpu"
            style={{ width: (12 + i * 7) + "vmin", height: (12 + i * 7) + "vmin",
              border: "1px solid " + (i % 3 === 0 ? "rgba(201,162,39,.65)"
                : i % 3 === 1 ? "rgba(123,18,32,.6)" : "rgba(246,241,231,.25)"),
              opacity: 1 - i / 20 }} />
        ))}
      </motion.div>
    </div>
  );
}

