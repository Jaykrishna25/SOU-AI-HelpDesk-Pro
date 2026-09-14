"use client";
import { motion, MotionValue } from "framer-motion";
import { Wrench, Cpu, Users, Layers, TrendingUp, Rocket, Sparkles } from "lucide-react";

/* ===== PUT YOUR IMAGE HERE ==========================================
   Silver Oak logo -> frontend/public/sou-brand.png
   Used on the branding board AND in the navbar.
   =================================================================== */
export const LOGO = "/sou-brand.png";

export const MAROON = "#7b1220";
export const GOLD = "#c9a227";
export const INK = "#070b18";

export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 73.3 + s * 419.1) * 27183.91;
  return x - Math.floor(x);
};

export const RING_COUNT = 30;
export const RING_GAP = 230;
export const TUNNEL_START = -1700;

/* ---------- tunnel: real stacked geometry ---------- */
export function Tunnel({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.div className="absolute inset-0 ir-3d pointer-events-none" style={{ opacity }}>
      {Array.from({ length: RING_COUNT }).map((_, i) => {
        const z = TUNNEL_START - i * RING_GAP;
        const wob = 0.86 + rnd(i, 2) * 0.3;
        const hue = i % 3;
        return (
          <div key={i} className="absolute left-1/2 top-1/2 ir-gpu"
            style={{
              width: "78vmin", height: "78vmin", marginLeft: "-39vmin", marginTop: "-39vmin",
              transform: "translateZ(" + z + "px) scale(" + wob + ") rotate(" + (i * 13) + "deg)",
              borderRadius: "50%",
              border: (1 + (i % 4 === 0 ? 1 : 0)) + "px solid " +
                (hue === 0 ? "rgba(201,162,39,.55)" : hue === 1 ? "rgba(123,18,32,.6)" : "rgba(150,190,255,.32)"),
              boxShadow: i % 4 === 0 ? "0 0 40px rgba(201,162,39,.30), inset 0 0 60px rgba(123,18,32,.28)" : "none",
              opacity: 0.28 + (1 - i / RING_COUNT) * 0.72,
            }} />
        );
      })}
      {/* holographic fragments between rings */}
      {Array.from({ length: 26 }).map((_, i) => {
        const z = TUNNEL_START - rnd(i, 5) * RING_COUNT * RING_GAP;
        const a = rnd(i, 7) * Math.PI * 2;
        const r = 22 + rnd(i, 9) * 16;
        return (
          <div key={"f" + i} className="absolute left-1/2 top-1/2 ir-gpu ir-hover"
            style={{
              width: 8 + rnd(i, 11) * 16, height: 8 + rnd(i, 13) * 16,
              transform: "translate(" + Math.cos(a) * r + "vmin," + Math.sin(a) * r + "vmin) translateZ(" + z + "px) rotate(" + i * 31 + "deg)",
              border: "1px solid " + (i % 2 ? GOLD : "rgba(170,205,255,.6)"),
              borderRadius: i % 3 === 0 ? "50%" : 2,
              opacity: 0.5, animationDelay: -i * 0.7 + "s",
            }} />
        );
      })}
    </motion.div>
  );
}

/* ---------- branding board ---------- */
export function Board({ glow }: { glow: MotionValue<number> }) {
  return (
    <div className="relative ir-gpu" style={{ width: "min(660px,80vw)" }}>
      <motion.div className="absolute -inset-12 rounded-[36px] pointer-events-none"
        style={{ opacity: glow,
          background: "radial-gradient(ellipse,rgba(255,236,170,.75),rgba(201,162,39,.35) 38%,rgba(123,18,32,.15) 60%,transparent 76%)" }} />
      <div className="relative rounded-[18px] overflow-hidden"
        style={{ background: "linear-gradient(158deg,#faf6ec,#e6ddcb)",
          border: "2px solid rgba(201,162,39,.6)",
          boxShadow: "0 34px 100px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.85)",
          padding: "clamp(16px,2.6vw,30px)" }}>
        {/* >>> Silver Oak logo <<< */}
        <img src={LOGO} alt="Silver Oak University" draggable={false} className="w-full h-auto block select-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 w-1/4"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)",
              animation: "ir-sweep 6.5s ease-in-out infinite" }} />
        </div>
        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: glow,
          background: "radial-gradient(circle at 50% 50%,rgba(255,255,255,.85),transparent 60%)" }} />
      </div>
      <div className="mx-auto rounded-b-lg" style={{ width: "56%", height: 14,
        background: "linear-gradient(180deg,#6f6455,#241f1a)" }} />
      <div className="mx-auto flex justify-between" style={{ width: "42%" }}>
        {[0, 1].map(i => <div key={i} style={{ width: 15, height: "12vh",
          background: "linear-gradient(180deg,#564d40,#1a1713)" }} />)}
      </div>
    </div>
  );
}

/* ---------- energy bursting out of the board ---------- */
export function Burst({ v }: { v: MotionValue<number> }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ opacity: v }}>
      {[0, 1, 2, 3].map(i => (
        <motion.span key={i} className="absolute rounded-full ir-gpu"
          style={{ width: "24vmin", height: "24vmin",
            border: "2px solid " + (i % 2 ? "rgba(201,162,39,.85)" : "rgba(190,215,255,.7)"),
            scale: v, opacity: v }} />
      ))}
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2;
        return (
          <motion.span key={"s" + i} className="absolute ir-gpu"
            style={{ width: 2, height: 60 + rnd(i, 3) * 90,
              background: "linear-gradient(180deg,transparent," + (i % 2 ? GOLD : "#cfe0ff") + ",transparent)",
              transform: "rotate(" + (a * 180 / Math.PI) + "deg) translateY(-22vmin)",
              opacity: v, scaleY: v }} />
        );
      })}
    </motion.div>
  );
}

/* ---------- speed streaks (motion-blur proxy) ---------- */
export function Streaks({ v }: { v: MotionValue<number> }) {
  return (
    <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: v }}>
      {Array.from({ length: 30 }).map((_, i) => {
        const a = rnd(i, 17) * 360;
        return (
          <span key={i} className="absolute left-1/2 top-1/2 ir-gpu"
            style={{ width: 1.5, height: 90 + rnd(i, 19) * 260,
              background: "linear-gradient(180deg,transparent,rgba(255,255,255,.65),transparent)",
              transform: "rotate(" + a + "deg) translateY(" + (16 + rnd(i, 21) * 30) + "vmin)",
              filter: "blur(.6px)", opacity: .35 + rnd(i, 23) * .5 }} />
        );
      })}
    </motion.div>
  );
}

/* ---------- drifting knowledge dust ---------- */
export function Dust({ n = 34, tint = "#cfe0ff" }: { n?: number; tint?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: n }).map((_, i) => {
        const s = 1 + rnd(i, 2) * 3;
        return (
          <span key={i} className="absolute rounded-full ir-gpu"
            style={{ left: rnd(i, 1) * 100 + "%", top: rnd(i, 3) * 100 + "%",
              width: s, height: s, background: tint, opacity: .2 + rnd(i, 4) * .5,
              boxShadow: "0 0 " + s * 6 + "px " + tint,
              animation: "ir-rise " + (14 + rnd(i, 5) * 16) + "s linear " + (-rnd(i, 6) * 22) + "s infinite" }} />
        );
      })}
    </div>
  );
}

/* ---------- gate ---------- */
export function Gate() {
  return (
    <svg viewBox="0 0 1300 640" className="w-[min(1300px,98vw)]" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="irStone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#151a2a" /><stop offset="45%" stopColor="#3d4763" />
          <stop offset="100%" stopColor="#10131f" />
        </linearGradient>
      </defs>
      <rect x="100" y="150" width="102" height="490" fill="url(#irStone)" />
      <rect x="1098" y="150" width="102" height="490" fill="url(#irStone)" />
      <rect x="84" y="124" width="134" height="30" rx="6" fill="#4a5470" />
      <rect x="1082" y="124" width="134" height="30" rx="6" fill="#4a5470" />
      <path d="M202 162 Q650 22 1098 162 L1098 200 Q650 60 202 200 Z" fill="url(#irStone)" />
      <path d="M216 174 Q650 42 1084 174" fill="none" stroke={GOLD} strokeWidth="2.5" opacity=".8" className="ir-dash" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={228 + i * 74} y={186 + Math.abs(i - 5.5) * 10} width="5"
          height={420 - Math.abs(i - 5.5) * 10} fill="#232a3d" opacity=".85" />
      ))}
    </svg>
  );
}

/* ---------- back-view figure (we follow them) ---------- */
export function BackFigure({ transformed = false, height = "34vh" }:
  { transformed?: boolean; height?: string }) {
  const body = transformed ? "#1e2b4d" : "#0c101c";
  const rim = transformed ? GOLD : "#7d93b8";
  return (
    <div className="relative ir-gpu">
      <svg viewBox="0 0 90 180" style={{ height, width: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="irRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={rim} stopOpacity={transformed ? .9 : .55} />
            <stop offset="22%" stopColor={rim} stopOpacity="0" />
            <stop offset="78%" stopColor={rim} stopOpacity="0" />
            <stop offset="100%" stopColor={rim} stopOpacity={transformed ? .9 : .55} />
          </linearGradient>
        </defs>
        <ellipse cx="45" cy="176" rx="34" ry="6" fill="#000" opacity=".5" />
        <path d="M31 148 L34 176 L42 176 L41 148 Z M49 148 L48 176 L56 176 L59 148 Z" fill={body} />
        <path d={transformed
          ? "M26 54 Q45 44 64 54 L69 100 Q45 110 21 100 Z"
          : "M28 56 Q45 47 62 56 L66 100 Q45 108 24 100 Z"} fill={body} />
        <rect x="30" y="98" width="30" height="52" rx="7" fill={body} />
        <path d="M24 58 L18 104 L26 106 L30 60 Z M66 58 L72 104 L64 106 L60 60 Z" fill={body} />
        <rect x="38" y="30" width="14" height="12" rx="5" fill={body} />
        <ellipse cx="45" cy="22" rx="14" ry="15" fill={body} />
        <path d="M31 22 Q45 6 59 22 Q45 12 31 22 Z" fill="#05070d" />
        <path d={transformed
          ? "M26 54 Q45 44 64 54 L69 100 Q45 110 21 100 Z"
          : "M28 56 Q45 47 62 56 L66 100 Q45 108 24 100 Z"} fill="url(#irRim)" />
        <ellipse cx="45" cy="22" rx="14" ry="15" fill="url(#irRim)" />
        {transformed && (
          <>
            <rect x="62" y="86" width="24" height="17" rx="2" fill="#0e1626" stroke={GOLD} strokeWidth="1" />
            <rect x="64" y="88" width="20" height="11" rx="1" fill={GOLD} opacity=".3" />
            <path d="M60 92 L64 92" stroke={GOLD} strokeWidth="2" />
          </>
        )}
      </svg>
      {transformed && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="absolute rounded-full ir-hover"
              style={{ left: 50 + Math.cos(i) * 62 + "%", top: 30 + Math.sin(i * 1.7) * 40 + "%",
                width: 3, height: 3, background: GOLD, boxShadow: "0 0 12px " + GOLD,
                animationDelay: -i * 0.8 + "s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- the learning universe ---------- */
export const WORLDS = [
  { icon: Wrench, t: "Practical Skills", d: "What you can do, not just what you know.", x: -30, y: -8, z: -9300 },
  { icon: Cpu, t: "Technology and Innovation", d: "Build with the tools shaping the decade.", x: 29, y: 9, z: -9650 },
  { icon: Users, t: "Industry Mentorship", d: "Guidance from people who have built things.", x: -27, y: 13, z: -10000 },
  { icon: Layers, t: "Hands-on Projects", d: "Ship real work before you graduate.", x: 31, y: -12, z: -10350 },
  { icon: TrendingUp, t: "Career Growth", d: "Prepared, not just qualified.", x: -30, y: -13, z: -10700 },
  { icon: Rocket, t: "Leadership and Enterprise", d: "Turn an idea into an organisation.", x: 27, y: 12, z: -11050 },
  { icon: Sparkles, t: "Community and Campus", d: "Find the people who push you further.", x: -4, y: 19, z: -11400 },
];

export function WorldPanel({ w, i, active, open, onOpen }:
  { w: typeof WORLDS[0]; i: number; active: boolean; open: boolean; onOpen: () => void }) {
  const Icon = w.icon;
  return (
    <motion.button onClick={onOpen}
      className={"absolute ir-glass rounded-2xl text-left ir-gpu " + (active ? "" : "pointer-events-none")}
      style={{
        left: "50%", top: "50%", width: "min(320px,76vw)", padding: "20px 22px",
        transform: "translate(-50%,-50%) translate3d(" + w.x + "vw," + w.y + "vh," + w.z + "px)",
        animation: "ir-hover " + (6.5 + i * 0.6) + "s ease-in-out " + (-i * 0.9) + "s infinite",
      }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.7, delay: active ? 0.15 + i * 0.09 : 0 }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg," + MAROON + ",#3a0a12)", color: GOLD }}>
          <Icon size={17} />
        </span>
        <span className="ir-display text-[10px] uppercase" style={{ color: GOLD }}>
          {String(i + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="text-[17px] leading-snug">{w.t}</div>
      <div className="text-[13px] opacity-60 mt-1">{w.d}</div>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35 }} className="overflow-hidden">
        <div className="text-[12px] opacity-55 mt-3 leading-relaxed">
          Delivered through studio labs, live industry briefs and mentor-led reviews in every semester
          at Silver Oak University.
        </div>
      </motion.div>
    </motion.button>
  );
}
