"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Silhouette, FilmLayers } from "@/components/CinematicIntro";

const LOGO_X = 46;
const LOGO_Y = 57;

export default function Farewell() {
  const [stage, setStage] = useState<"pull" | "walk" | "end">("pull");

  useEffect(() => {
    const t = [
      setTimeout(() => setStage("walk"), 2200),
      setTimeout(() => setStage("end"), 6200),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const scale = stage === "pull" ? 3.6 : 1.24;
  const filter = stage === "pull"
    ? "blur(4px) saturate(1.3) brightness(1.15) contrast(1.0)"
    : "blur(0px) saturate(0.95) brightness(0.72) contrast(1.14)";

  return (
    <main className="fixed inset-0 overflow-hidden bg-black select-none">
      <motion.div className="absolute inset-0"
        animate={{ x: [0, 6, -4, 0], y: [0, -4, 3, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}>
        <motion.div className="absolute bg-center bg-cover"
          style={{ inset: "-6%", backgroundImage: "url(/sou-campus.jpg)",
            transformOrigin: LOGO_X + "% " + LOGO_Y + "%" }}
          initial={{ scale: 4.2, filter: "blur(8px) brightness(1.4) saturate(1.4)" }}
          animate={{ scale, filter }}
          transition={{ duration: stage === "pull" ? 2.2 : 3.6, ease: [0.24, 0.9, 0.28, 1] }} />
      </motion.div>

      <motion.div className="absolute" style={{ bottom: "11.5vh", zIndex: 24 }}
        initial={{ left: "30%", opacity: 0 }}
        animate={{ left: stage === "pull" ? "30%" : "112%", opacity: stage === "pull" ? 0 : 1 }}
        transition={{ left: { duration: 4.0, ease: "easeInOut" }, opacity: { duration: 1.0 } }}>
        <Silhouette graduate />
      </motion.div>

      <FilmLayers />

      <motion.div className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 55 }}
        initial={{ opacity: 0 }} animate={{ opacity: stage === "end" ? 1 : 0 }}
        transition={{ duration: 1.2 }}>
        <div className="text-center">
          <p className="text-white/85 text-lg tracking-[0.3em] uppercase mb-8">Signed out</p>
          <Link href="/"
            className="inline-block px-7 py-3 rounded-full border border-white/30 text-white/80 text-sm tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors">
            Return to the gate
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
