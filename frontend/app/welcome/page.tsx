"use client";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SkipForward, Play } from "lucide-react";
import { BRAND_LOGO, GOLD } from "@/components/landing/Atoms";
import {
  ActQuestion, ActGate, ActBrand, ActPortal, ActInside, ActTransformed,
} from "@/components/landing/Scenes";

const ACTS = [
  "The question", "Arrival", "Silver Oak", "The portal", "Inside", "The return",
];
const NAV = [
  ["About", "#about"], ["Programs", "/login"], ["Campus Life", "/login"], ["Portal", "/login"],
];

export default function Welcome() {
  const [act, setAct] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const r = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    if (r) setAct(5);
    setReady(true);
  }, []);

  const go = useCallback((n: number) => setAct(Math.max(0, Math.min(5, n))), []);
  const next = useCallback(() => setAct(a => Math.min(5, a + 1)), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") go(act - 1);
      if (e.key === "Escape") go(5);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [act, go, next]);

  if (!ready) return <div className="fixed inset-0 bg-[#05070f]" />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070f] text-white select-none">

      {/* ---------- navigation ---------- */}
      <header className="absolute inset-x-0 top-0 z-[60]">
        <div className={"mx-auto max-w-7xl m-3 md:m-5 px-4 md:px-6 py-3 rounded-2xl flex items-center justify-between gap-4 transition-all duration-500 " +
          (act >= 4 ? "lp-glass" : "bg-transparent")}>
          <button onClick={() => go(0)} className="flex items-center gap-3 shrink-0">
            <img src={BRAND_LOGO} alt="Silver Oak University" className="h-8 md:h-10 w-auto"
              style={{ filter: act >= 5 ? "none" : "brightness(1.6) contrast(1.1)",
                mixBlendMode: act >= 5 ? "normal" : "screen" }} />
          </button>
          <nav className="hidden md:flex items-center gap-7 text-[13px]">
            {NAV.map(([l, h]) => (
              <a key={l} href={h}
                className="relative opacity-70 hover:opacity-100 transition-opacity after:absolute
                  after:left-0 after:-bottom-1.5 after:h-px after:w-0 hover:after:w-full
                  after:bg-current after:transition-all after:duration-300">{l}</a>
            ))}
          </nav>
          <a href="/login"
            className="shrink-0 px-5 py-2 rounded-full text-[13px] font-medium transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg,#7b1220,#a3162a)" }}>Apply Now</a>
        </div>
      </header>

      {/* ---------- the story ---------- */}
      <AnimatePresence mode="wait">
        <motion.div key={act} className="absolute inset-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.85 }}>
          {act === 0 && <ActQuestion onNext={next} />}
          {act === 1 && <ActGate onNext={next} />}
          {act === 2 && <ActBrand onNext={next} />}
          {act === 3 && <ActPortal onNext={next} />}
          {act === 4 && <ActInside onNext={next} />}
          {act === 5 && <ActTransformed />}
        </motion.div>
      </AnimatePresence>

      {/* ---------- progress rail ---------- */}
      <div className="absolute z-[60] hidden md:flex flex-col gap-4 right-6 top-1/2 -translate-y-1/2">
        {ACTS.map((label, i) => (
          <button key={label} onClick={() => go(i)} className="group flex items-center gap-3 justify-end">
            <span className="text-[10px] uppercase tracking-[0.25em] opacity-0 group-hover:opacity-70
              transition-opacity whitespace-nowrap">{label}</span>
            <span className="block rounded-full transition-all duration-400"
              style={{
                width: i === act ? 10 : 6, height: i === act ? 10 : 6,
                background: i === act ? GOLD : "rgba(255,255,255,.35)",
                boxShadow: i === act ? "0 0 14px " + GOLD : "none",
              }} />
          </button>
        ))}
      </div>

      <div className="absolute z-[60] md:hidden inset-x-0 bottom-5 flex justify-center gap-2">
        {ACTS.map((l, i) => (
          <button key={l} onClick={() => go(i)} className="rounded-full transition-all duration-300"
            style={{ width: i === act ? 22 : 6, height: 6,
              background: i === act ? GOLD : "rgba(255,255,255,.3)" }} />
        ))}
      </div>

      {/* ---------- skip / replay ---------- */}
      {act < 5 ? (
        <button onClick={() => go(5)}
          className="absolute z-[60] left-6 bottom-6 flex items-center gap-2 text-[11px] uppercase
            tracking-[0.22em] opacity-45 hover:opacity-100 transition-opacity">
          <SkipForward size={13} /> Skip story
        </button>
      ) : (
        <button onClick={() => go(0)}
          className="absolute z-[60] left-6 bottom-6 flex items-center gap-2 text-[11px] uppercase
            tracking-[0.22em] opacity-45 hover:opacity-100 transition-opacity">
          <Play size={13} /> Replay story
        </button>
      )}

      {reduced && act === 5 && (
        <div className="absolute z-[60] left-1/2 -translate-x-1/2 bottom-16 text-[11px] opacity-50">
          Reduced motion is on - the animated story is available via Replay.
        </div>
      )}
    </div>
  );
}
