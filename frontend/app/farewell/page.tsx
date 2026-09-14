"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

function Graduate() {
  return (
    <svg width="52" height="96" viewBox="0 0 46 86" fill="none">
      <polygon points="23,2 43,11 23,20 3,11" fill="#8b5cf6" />
      <rect x="21" y="11" width="4" height="12" fill="#8b5cf6" />
      <circle cx="23" cy="27" r="9" fill="#1f1830" />
      <rect x="15" y="37" width="16" height="26" rx="6" fill="#1f1830" />
      <rect x="16" y="62" width="5" height="22" rx="2" fill="#1f1830" />
      <rect x="25" y="62" width="5" height="22" rx="2" fill="#1f1830" />
    </svg>
  );
}

export default function Farewell() {
  const [phase, setPhase] = useState<"collapse" | "walk" | "end">("collapse");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("walk"), 2000);
    const t2 = setTimeout(() => setPhase("end"), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#05040c 0%,#0d0a1f 55%,#140f2b 100%)" }}>

      <motion.div
        className="absolute inset-0 flex items-end justify-center"
        initial={{ scale: 11, y: 220 }}
        animate={{ scale: phase === "collapse" ? 1 : 1, y: 0 }}
        transition={{ duration: 2.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "50% 42%" }}
      >
        <div className="relative w-full max-w-3xl" style={{ height: "62vh" }}>
          <div className="absolute left-[7%] bottom-0 w-5 rounded-t-md"
            style={{ height: "46%", background: "linear-gradient(180deg,#241b3d,#120d24)" }} />
          <div className="absolute right-[7%] bottom-0 w-5 rounded-t-md"
            style={{ height: "46%", background: "linear-gradient(180deg,#241b3d,#120d24)" }} />

          <div className="absolute left-1/2 -translate-x-1/2 rounded-lg px-4 py-3"
            style={{ bottom: "34%", background: "#ffffff", boxShadow: "0 0 60px rgba(139,92,246,0.55)", width: "58%" }}>
            <img src="/sou-logo.jpg" alt="Silver Oak University"
              style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          <div className="absolute left-0 right-0 bottom-0"
            style={{ height: 2, background: "linear-gradient(90deg,transparent,#3b2d63,transparent)" }} />

          {phase !== "collapse" && (
            <motion.div
              className="absolute bottom-0"
              initial={{ x: "42%", opacity: 0 }}
              animate={{ x: "112%", opacity: 1, y: [0, -3, 0] }}
              transition={{ x: { duration: 3.0, ease: "easeInOut" }, opacity: { duration: 0.6 }, y: { duration: 0.5, repeat: 6 } }}
            >
              <Graduate />
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-16 text-center px-6">
        <AnimatePresence mode="wait">
          <motion.div key={phase}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}>
            <p className="text-base sm:text-xl text-white/90 tracking-wide" style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8)" }}>
              {phase === "collapse" ? "Your session ends here." :
               phase === "walk" ? "He walked in with questions. He walks out with answers." :
               "Gyanam Parmam Bhushanam"}
            </p>
            {phase === "end" && (
              <Link href="/"
                className="inline-block mt-6 px-7 py-3 rounded-full bg-brand text-white text-sm font-semibold glow">
                Return to the gate
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
