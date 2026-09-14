"use client";
import { motion } from "framer-motion";

/* ===== INSERT YOUR IMAGES HERE =====================================
   LOGO      -> frontend/public/sou-brand.png   (navbar + branding board)
   Optional campus photo -> frontend/public/sou-campus.jpg, then set
   USE_PHOTO_BACKDROP = true below to use it behind the gate.
   ================================================================== */
export const LOGO = "/sou-brand.png";
export const USE_PHOTO_BACKDROP = false;
export const PHOTO = "/sou-campus.jpg";

export const MAROON = "#7b1220";
export const GOLD = "#c9a227";
export const EMERALD = "#0f5132";
export const CREAM = "#f4efe3";

export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 91.7 + s * 217.3) * 39187.53;
  return x - Math.floor(x);
};

/** One plane in the corridor, parked at a fixed depth. */
export function Plane({ z, opacity = 1, blur = 0, children, pointer = false }:
  { z: number; opacity?: number; blur?: number; children: React.ReactNode; pointer?: boolean }) {
  return (
    <motion.div className={"absolute inset-0 flex items-center justify-center jn-3d jn-gpu " +
      (pointer ? "" : "pointer-events-none")}
      style={{ transform: "translateZ(" + z + "px)", filter: blur ? "blur(" + blur + "px)" : undefined }}
      animate={{ opacity }} transition={{ duration: 1.1, ease: [0.2, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/* ---------- atmosphere ---------- */
export function Haze() {
  return (
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at 50% 54%, #241a14 0%, #100b09 42%, #050404 100%)" }} />
  );
}

export function Treeline() {
  return (
    <svg viewBox="0 0 1400 300" className="absolute bottom-0 w-[160%] left-[-30%]" preserveAspectRatio="none"
      style={{ height: "46%" }}>
      <path d="M0 300 L0 190 Q70 120 130 180 Q190 110 260 175 Q330 105 400 170 Q470 120 540 175
               Q610 108 680 172 Q750 118 820 178 Q890 112 960 174 Q1030 122 1100 180
               Q1170 114 1240 176 Q1310 126 1400 186 L1400 300 Z"
        fill="#0b1410" opacity=".92" />
    </svg>
  );
}

export function LightShafts() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="absolute jn-flicker"
          style={{ left: 14 + i * 22 + "%", top: "-18%", width: 2 + i, height: "120%",
            transform: "rotate(" + (7 + i * 3.5) + "deg)",
            background: "linear-gradient(180deg,rgba(255,214,140,.55),rgba(255,190,100,.06) 60%,transparent)",
            filter: "blur(1.5px)", animationDelay: i * 1.7 + "s" }} />
      ))}
    </div>
  );
}

export function Motes({ n = 30, tint = "#ffe1a8", size = 3 }:
  { n?: number; tint?: string; size?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => {
        const s = 1 + rnd(i, 2) * size;
        return (
          <span key={i} className="absolute rounded-full jn-gpu"
            style={{ left: rnd(i, 1) * 100 + "%", top: rnd(i, 3) * 100 + "%", width: s, height: s,
              background: tint, opacity: .18 + rnd(i, 4) * .5,
              boxShadow: "0 0 " + s * 5 + "px " + tint,
              animation: "jn-drift " + (13 + rnd(i, 5) * 16) + "s linear " + (-rnd(i, 6) * 20) + "s infinite" }} />
        );
      })}
    </div>
  );
}

/* ---------- the gate ---------- */
export function GateArch() {
  return (
    <svg viewBox="0 0 1200 620" className="w-[min(1200px,96vw)]" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="jnStone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2a251d" /><stop offset="42%" stopColor="#6e6251" />
          <stop offset="72%" stopColor="#4b4337" /><stop offset="100%" stopColor="#211d17" />
        </linearGradient>
        <linearGradient id="jnBrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} /><stop offset="100%" stopColor="#6d5512" />
        </linearGradient>
      </defs>
      <rect x="90" y="150" width="96" height="470" fill="url(#jnStone)" />
      <rect x="1014" y="150" width="96" height="470" fill="url(#jnStone)" />
      <rect x="74" y="126" width="128" height="28" rx="5" fill="#7d7160" />
      <rect x="998" y="126" width="128" height="28" rx="5" fill="#7d7160" />
      <path d="M186 160 Q600 24 1014 160 L1014 196 Q600 62 186 196 Z" fill="url(#jnStone)" />
      <path d="M200 172 Q600 44 1000 172" fill="none" stroke="url(#jnBrass)" strokeWidth="3" opacity=".85"
        className="jn-trace" />
      {Array.from({ length: 11 }).map((_, i) => (
        <rect key={i} x={214 + i * 72} y={182 + Math.abs(i - 5) * 9} width="6"
          height={400 - Math.abs(i - 5) * 9} fill="#3e372c" opacity=".8" />
      ))}
      <ellipse cx="600" cy="616" rx="560" ry="26" fill="#000" opacity=".55" />
    </svg>
  );
}

/* ---------- branding board ---------- */
export function BrandingBoard({ igniting = false }: { igniting?: boolean }) {
  return (
    <div className="relative jn-gpu" style={{ width: "min(680px, 80vw)" }}>
      <div className="absolute -inset-10 rounded-[32px] jn-pulse pointer-events-none"
        style={{ background: "radial-gradient(ellipse,rgba(201,162,39,.5),rgba(123,18,32,.2) 46%,transparent 74%)" }} />
      <div className="relative rounded-[20px] overflow-hidden"
        style={{ background: "linear-gradient(155deg," + CREAM + ",#e5dcca)",
          border: "2px solid rgba(201,162,39,.6)",
          boxShadow: "0 30px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.8)",
          padding: "clamp(16px,2.6vw,30px)" }}>
        {/* >>> Silver Oak logo goes here <<< */}
        <img src={LOGO} alt="Silver Oak University" draggable={false}
          className="w-full h-auto block select-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 w-1/4"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)",
              animation: "jn-sheen 6s ease-in-out infinite" }} />
        </div>
        {igniting && (
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.9), transparent 62%)",
              animation: "jn-pulse 1.1s ease-in-out infinite" }} />
        )}
      </div>
      <div className="mx-auto rounded-b-lg" style={{ width: "58%", height: 14,
        background: "linear-gradient(180deg,#7d7160,#2a251d)" }} />
      <div className="mx-auto flex justify-between" style={{ width: "44%" }}>
        {[0, 1].map(i => <div key={i} style={{ width: 16, height: "13vh",
          background: "linear-gradient(180deg,#5d5344,#1d1a15)" }} />)}
      </div>
    </div>
  );
}

/* ---------- the portal ---------- */
export function Portal({ level = 0 }: { level?: number }) {
  if (level <= 0) return null;
  return (
    <div className="relative jn-3d" style={{ width: "min(70vmin,640px)", height: "min(70vmin,640px)" }}>
      {/* conic iris */}
      <div className="absolute inset-0 rounded-full jn-iris jn-gpu"
        style={{ background: "conic-gradient(from 0deg," + MAROON + ",#b8912a," + GOLD + ",#0f5132,#1b0d10," + MAROON + ")",
          opacity: .55 * level, filter: "blur(2px)", maskImage: "radial-gradient(circle,transparent 30%,#000 44%,#000 72%,transparent 82%)",
          WebkitMaskImage: "radial-gradient(circle,transparent 30%,#000 44%,#000 72%,transparent 82%)" }} />
      {/* hexagonal frame */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 jn-spin-rev" style={{ opacity: .75 * level }}>
        <polygon points="100,14 175,57 175,143 100,186 25,143 25,57" fill="none"
          stroke={GOLD} strokeWidth="0.7" opacity=".8" className="jn-trace" />
        <polygon points="100,34 158,67 158,133 100,166 42,133 42,67" fill="none"
          stroke="#e7d9a8" strokeWidth="0.4" opacity=".5" />
      </svg>
      <svg viewBox="0 0 200 200" className="absolute inset-0 jn-spin" style={{ opacity: .5 * level }}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#7ee0b0" strokeWidth="0.4"
          strokeDasharray="3 9" opacity=".55" />
      </svg>
      {/* light ribbons */}
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute left-1/2 top-1/2 jn-gpu"
          style={{ width: "112%", height: 2, marginLeft: "-56%",
            background: "linear-gradient(90deg,transparent," + (i === 1 ? GOLD : "#7ee0b0") + ",transparent)",
            opacity: .5 * level, filter: "blur(1px)",
            animation: "jn-ribbon " + (17 + i * 6) + "s linear infinite",
            transform: "rotate(" + i * 60 + "deg)" }} />
      ))}
      {/* core */}
      <motion.div className="absolute left-1/2 top-1/2 rounded-full jn-gpu"
        style={{ width: "44%", height: "44%", marginLeft: "-22%", marginTop: "-22%",
          background: "radial-gradient(circle,#fffdf6 0%,#ffe9b0 16%," + GOLD + " 34%," + MAROON + " 62%,transparent 78%)" }}
        animate={{ scale: [1, 1.09, 1], opacity: [.7 * level, level, .7 * level] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }} />
      {/* floating geometry */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <div key={i} className="absolute left-1/2 top-1/2 jn-bob jn-gpu"
            style={{ width: 16 + i * 3, height: 16 + i * 3, marginLeft: -8,
              marginTop: -8, opacity: .55 * level,
              transform: "translate(" + Math.cos(a) * 200 + "px," + Math.sin(a) * 200 + "px) rotate(" + i * 24 + "deg)",
              border: "1px solid " + (i % 2 ? GOLD : "#7ee0b0"),
              borderRadius: i % 3 === 0 ? "50%" : 2,
              animationDelay: -i * 0.9 + "s" }} />
        );
      })}
    </div>
  );
}

/* ---------- line-art figure ---------- */
export function Figure({ transformed = false, height = "42vh" }:
  { transformed?: boolean; height?: string }) {
  const glow = transformed ? GOLD : "#6b7a86";
  const w = transformed ? 2.1 : 1.5;
  return (
    <svg viewBox="0 0 80 180" style={{ height, width: "auto", overflow: "visible" }}
      className="jn-gpu">
      <defs>
        <filter id="jnGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={transformed ? 3.4 : 1.9} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g fill="none" stroke={glow} strokeWidth={w} strokeLinecap="round"
        strokeLinejoin="round" filter="url(#jnGlow)" opacity={transformed ? 1 : 0.78}>
        <circle cx="40" cy="22" r="12" />
        <path d="M40 34 L40 92" />
        <path d={transformed ? "M40 44 L18 64 M40 44 L64 60" : "M40 46 L22 74 M40 46 L58 72"} />
        <path d="M40 92 L27 140 L24 168 M40 92 L53 140 L57 168" />
        <path d="M24 168 L34 168 M57 168 L67 168" />
        {transformed && <>
          <rect x="58" y="54" width="22" height="15" rx="2" />
          <path d="M56 69 L82 69" />
          <path d="M26 44 L40 60 L54 44" />
          <circle cx="40" cy="22" r="18" strokeWidth="0.6" opacity=".45" />
        </>}
        {!transformed && <path d="M28 10 Q40 2 52 10" strokeWidth="1" opacity=".5" />}
      </g>
      <ellipse cx="40" cy="172" rx="30" ry="5" fill="#000" opacity=".45" />
    </svg>
  );
}

/* ---------- knowledge panels ---------- */
export const WORLDS = [
  { t: "Practical Skills", d: "What you can do, not just what you know.", x: -34, y: -6, z: -2500 },
  { t: "Technology and Innovation", d: "Build with the tools shaping the decade.", x: 30, y: 10, z: -2820 },
  { t: "Expert Mentorship", d: "Guidance from people who have built things.", x: -28, y: 14, z: -3160 },
  { t: "Projects and Practice", d: "Ship real work before you graduate.", x: 33, y: -12, z: -3480 },
  { t: "Career Development", d: "Prepared, not just qualified.", x: -32, y: -14, z: -3800 },
  { t: "Entrepreneurship", d: "Turn an idea into an enterprise.", x: 28, y: 12, z: -4120 },
  { t: "Community and Campus", d: "Find the people who push you further.", x: -6, y: 20, z: -4460 },
];

export function KnowledgePanel({ w, i, active, onOpen, open }:
  { w: typeof WORLDS[0]; i: number; active: boolean; onOpen: () => void; open: boolean }) {
  return (
    <motion.button onClick={onOpen}
      className={"absolute jn-glass rounded-2xl text-left jn-gpu " + (active ? "" : "pointer-events-none")}
      style={{
        left: "50%", top: "50%", width: "min(310px,74vw)",
        padding: "18px 20px",
        transform: "translate(-50%,-50%) translate3d(" + w.x + "vw," + w.y + "vh," + w.z + "px)",
        animation: "jn-bob " + (6 + i * 0.5) + "s ease-in-out " + (-i * 0.8) + "s infinite",
      }}
      animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.8, delay: active ? i * 0.06 : 0 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="jn-display text-[11px]" style={{ color: GOLD }}>
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="h-px flex-1" style={{ background: "linear-gradient(90deg," + GOLD + "55,transparent)" }} />
      </div>
      <div className="jn-display text-lg leading-snug">{w.t}</div>
      <div className="text-[13px] opacity-65 mt-1">{w.d}</div>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35 }} className="overflow-hidden">
        <div className="text-[12px] opacity-55 mt-3 leading-relaxed">
          Explored through studio labs, industry briefs and mentor-led reviews across every semester
          at Silver Oak University.
        </div>
      </motion.div>
    </motion.button>
  );
}
