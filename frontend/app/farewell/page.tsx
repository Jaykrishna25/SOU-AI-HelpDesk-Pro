"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import CampusScene, { Walker } from "@/components/CampusScene";

export default function Farewell() {
  const [stage, setStage] = useState<"pull" | "walk" | "end">("pull");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("walk"), 2400);
    const t2 = setTimeout(() => setStage("end"), 6200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black select-none">
      <motion.div className="absolute inset-0"
        animate={{ x: [0, -4, 3, 0], y: [0, 2, -3, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
        <CampusScene dolly={stage === "pull" ? 1.5 : 0} dawn={true} />

        {stage !== "pull" && (
          <motion.div className="absolute" style={{ top: "71%", zIndex: 20 }}
            initial={{ left: "47%", opacity: 0 }} animate={{ left: "96%", opacity: 1 }}
            transition={{ left: { duration: 3.8, ease: "easeInOut" }, opacity: { duration: 1 } }}>
            <div style={{ transform: "translateY(-100%)" }}>
              <Walker graduate />
            </div>
            <div className="absolute" style={{ left: "-140%", bottom: -3, width: "400%", height: "1.1vh",
              background: "radial-gradient(ellipse, rgba(0,0,0,0.75), transparent 70%)", filter: "blur(4px)" }} />
          </motion.div>
        )}
      </motion.div>

      {stage === "end" && (
        <motion.div className="absolute inset-x-0 text-center" style={{ bottom: "3.5vh", zIndex: 50 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
          <Link href="/" className="inline-block px-7 py-2.5 rounded-full text-xs tracking-widest uppercase text-white/80 border border-white/25 hover:bg-white/10">
            Return to the gate
          </Link>
        </motion.div>
      )}
    </main>
  );
}
