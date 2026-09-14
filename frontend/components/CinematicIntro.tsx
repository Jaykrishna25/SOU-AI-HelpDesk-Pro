"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CampusScene, { Walker } from "@/components/CampusScene";

export default function CinematicIntro() {
  const [phase, setPhase] = useState<"walk" | "push" | "flash" | "done">("walk");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("sou_intro_seen")) return;
      sessionStorage.setItem("sou_intro_seen", "1");
    } catch {}
    setShow(true);
    const t1 = setTimeout(() => setPhase("push"), 3400);
    const t2 = setTimeout(() => setPhase("flash"), 6000);
    const t3 = setTimeout(() => setPhase("done"), 7600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const dolly = phase === "walk" ? 0 : phase === "push" ? 1 : 1.5;

  return (
    <AnimatePresence>
      {show && phase !== "done" && (
        <motion.div exit={{ opacity: 0, transition: { duration: 1 } }}
          className="fixed inset-0 z-[300] overflow-hidden select-none bg-black">
          <motion.div className="absolute inset-0"
            animate={{ x: [0, -4, 3, 0], y: [0, 2, -3, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
            <CampusScene dolly={dolly} dawn={phase !== "walk"} />

            {phase === "walk" && (
              <motion.div className="absolute" style={{ top: "71%", zIndex: 20 }}
                initial={{ left: "6%", opacity: 0 }} animate={{ left: "47%", opacity: 1 }}
                transition={{ left: { duration: 3.4, ease: "easeOut" }, opacity: { duration: 1 } }}>
                <div style={{ transform: "translateY(-100%)" }}>
                  <Walker />
                </div>
                <div className="absolute" style={{ left: "-140%", bottom: -3, width: "400%", height: "1.1vh",
                  background: "radial-gradient(ellipse, rgba(0,0,0,0.75), transparent 70%)", filter: "blur(4px)" }} />
              </motion.div>
            )}
          </motion.div>

          {phase === "flash" && (
            <>
              <motion.div className="absolute inset-0" style={{ zIndex: 45 }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, times: [0, 0.16, 1] }}
                style2={{}}
              />
              <motion.div className="absolute inset-0" style={{ zIndex: 45,
                background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #c4b5fd 20%, #8b5cf6 38%, transparent 66%)" }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, times: [0, 0.16, 1] }} />
              <motion.div className="absolute left-0 right-0" style={{ top: "50%", height: 2, zIndex: 46 }}
                initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.2 }}>
                <div className="w-full h-full" style={{ background: "linear-gradient(90deg,transparent,#e0e7ff,#8b5cf6,#e0e7ff,transparent)", filter: "blur(4px)" }} />
              </motion.div>
            </>
          )}

          <button onClick={() => setPhase("done")}
            className="absolute right-6 text-[11px] tracking-widest uppercase text-white/45 hover:text-white/90"
            style={{ top: "4vh", zIndex: 50 }}>
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
