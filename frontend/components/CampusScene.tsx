"use client";
import { motion } from "framer-motion";

export function Walker({ graduate = false }: { graduate?: boolean }) {
  const swing = { duration: 0.68, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <motion.svg viewBox="0 0 30 100" style={{ height: "9vh", width: "auto", display: "block" }}
      animate={{ y: [0, -1.4, 0] }} transition={{ duration: 0.34, repeat: Infinity, ease: "easeInOut" }}>
      <motion.rect x="13" y="52" width="4.6" height="48" rx="2.3" fill="#0b0812"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [15, -15, 15] }} transition={swing} />
      <motion.rect x="8" y="30" width="3.6" height="26" rx="1.8" fill="#0d0a16"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-20, 20, -20] }} transition={swing} />
      <path d="M10 28 L20 28 L22 54 L8 54 Z" fill="#120e1e" />
      <circle cx="15" cy="20" r="6.2" fill="#150f22" />
      {graduate && (
        <g>
          <polygon points="15,8 27,13 15,18 3,13" fill="#2a1f45" />
          <rect x="14" y="13" width="2" height="8" fill="#2a1f45" />
        </g>
      )}
      <motion.rect x="13" y="52" width="4.6" height="48" rx="2.3" fill="#120e1e"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [-15, 15, -15] }} transition={swing} />
      <motion.rect x="18.5" y="30" width="3.6" height="26" rx="1.8" fill="#150f22"
        style={{ originX: "50%", originY: "0%" }} animate={{ rotate: [20, -20, 20] }} transition={swing} />
    </motion.svg>
  );
}

export default function CampusScene({ dolly, dawn }: { dolly: number; dawn: boolean }) {
  const push = (depth: number) => ({
    scale: 1 + depth * 5.0 * dolly,
    y: depth * 130 * dolly,
  });
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <>
      <motion.div className="absolute inset-0"
        animate={{ background: dawn
          ? "linear-gradient(180deg,#0a0a1c 0%,#241a3d 38%,#5d3c52 60%,#b97a63 70%,#0b0812 71%)"
          : "linear-gradient(180deg,#03030a 0%,#0a0918 38%,#171029 60%,#2a1d3a 70%,#07050e 71%)" }}
        transition={{ duration: 3 }} />

      <motion.div className="absolute inset-0" animate={{ opacity: dawn ? 0.1 : 0.7 }} transition={{ duration: 2.5 }}>
        {Array.from({ length: 46 }).map((_, i) => (
          <span key={i} className="absolute rounded-full bg-white"
            style={{ left: ((i * 41) % 100) + "%", top: ((i * 29) % 52) + "%",
              width: i % 6 === 0 ? 2 : 1.2, height: i % 6 === 0 ? 2 : 1.2, opacity: 0.15 + ((i % 6) / 12) }} />
        ))}
      </motion.div>

      <motion.div className="absolute inset-x-0" style={{ top: "62%", height: "9%", filter: "blur(2.5px)" }}
        animate={push(0.10)} transition={{ duration: 2.6, ease }}>
        <svg viewBox="0 0 1200 90" className="w-full h-full" preserveAspectRatio="none">
          <path fill="#0b0916" d="M0,90 L0,58 Q45,30 92,52 Q140,18 188,48 Q240,24 292,52 Q345,20 398,50 Q452,28 505,54 Q560,18 614,48 Q668,26 722,52 Q778,20 832,50 Q888,30 942,54 Q996,22 1050,48 Q1104,30 1200,56 L1200,90 Z" />
        </svg>
      </motion.div>

      <motion.div className="absolute inset-x-0" style={{ top: "63%", height: "8%" }}
        animate={{ opacity: dawn ? 0.55 : 0.3 }} transition={{ duration: 2.5 }}>
        <div className="w-full h-full" style={{ background: "linear-gradient(180deg,transparent,rgba(200,170,180,0.35),transparent)", filter: "blur(16px)" }} />
      </motion.div>

      <motion.div className="absolute inset-0" animate={push(0.5)} transition={{ duration: 2.6, ease }}
        style={{ transformOrigin: "50% 58%" }}>
        <div className="absolute left-1/2 -translate-x-1/2" style={{
          top: "71%", width: "46%", height: "29%",
          background: "linear-gradient(180deg,#1b1526,#0a0812)",
          clipPath: "polygon(41% 0%, 59% 0%, 100% 100%, 0% 100%)" }} />

        <div className="absolute" style={{ left: "34%", top: "47%", width: "1.5%", height: "24%",
          background: "linear-gradient(90deg,#080611,#221933 42%,#0c0917)" }} />
        <div className="absolute" style={{ right: "34%", top: "47%", width: "1.5%", height: "24%",
          background: "linear-gradient(90deg,#080611,#221933 42%,#0c0917)" }} />

        <div className="absolute left-1/2 -translate-x-1/2 rounded-sm"
          style={{ top: "44.5%", width: "23%", padding: "0.5% 0.7%", background: "#f7f5f2",
            boxShadow: "0 0 46px rgba(255,206,150,0.35), 0 10px 26px rgba(0,0,0,0.7)" }}>
          <img src="/sou-logo.jpg" alt="Silver Oak University" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>

        <motion.div className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ top: "42.4%", width: "1.6%", height: "0.9%", background: "#ffd9a3" }}
          animate={{ opacity: [0.72, 1, 0.8, 1] }} transition={{ duration: 4, repeat: Infinity }} />
        <div className="absolute left-1/2 -translate-x-1/2" style={{
          top: "43%", width: "30%", height: "29%",
          background: "linear-gradient(180deg,rgba(255,214,160,0.20),transparent 72%)",
          clipPath: "polygon(46% 0%, 54% 0%, 100% 100%, 0% 100%)", filter: "blur(9px)" }} />
      </motion.div>

      <div className="absolute inset-x-0" style={{ top: "71%", bottom: 0, background: "linear-gradient(180deg,#0a0812,#05040b)" }} />

      {Array.from({ length: 16 }).map((_, i) => (
        <motion.span key={i} className="absolute rounded-full"
          style={{ left: ((i * 67) % 100) + "%", width: 2.5, height: 2.5, background: "rgba(255,228,195,0.75)", filter: "blur(1px)" }}
          initial={{ top: "70%", opacity: 0 }}
          animate={{ top: ["70%", "40%"], opacity: [0, 0.8, 0], x: [0, i % 2 ? 26 : -26] }}
          transition={{ duration: 8 + (i % 4), repeat: Infinity, delay: i * 0.5, ease: "easeOut" }} />
      ))}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 30%, rgba(0,0,0,0.80) 100%)" }} />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.075, mixBlendMode: "overlay" }}>
        <filter id="souGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#souGrain)" />
      </svg>

      <div className="absolute inset-x-0 top-0 bg-black pointer-events-none" style={{ height: "11vh", zIndex: 40 }} />
      <div className="absolute inset-x-0 bottom-0 bg-black pointer-events-none" style={{ height: "11vh", zIndex: 40 }} />
    </>
  );
}
