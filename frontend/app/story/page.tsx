"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FastForward } from "lucide-react";
import {
  SceneIntro, SceneGate, ScenePortal, SceneWorld, SceneFinal, LOGO,
} from "@/components/sou/Scenes";

type State =
  | "intro" | "universityGate" | "brandingBoard" | "portalOpening"
  | "portalTravel" | "portalWorld" | "portalExit" | "finalTransformation";

/** Scenes that share one mount. AnimatePresence swaps only when this key changes,
 *  so the board stays on screen continuously from brandingBoard through portalExit. */
const GROUP: Record<State, string> = {
  intro: "intro", universityGate: "gate",
  brandingBoard: "portal", portalOpening: "portal", portalTravel: "portal", portalExit: "portal",
  portalWorld: "world", finalTransformation: "final",
};

export default function Story() {
  const [state, setState] = useState<State>("intro");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* preload the logo so the portal click has nothing left to fetch */
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const img = new window.Image();
    img.src = LOGO;
    const done = () => setReady(true);
    if (img.decode) img.decode().then(done).catch(done);
    else { img.onload = done; img.onerror = done; }
    const g = setTimeout(done, 2500);
    return () => clearTimeout(g);
  }, []);

  /* no scroll during the cinematic */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = state === "portalWorld" ? "auto" : "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [state]);

  const enter = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setState("portalOpening");
  }, [busy]);

  const exit = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setState("portalExit");
  }, [busy]);

  const skipAll = useCallback(() => { setBusy(false); setState("finalTransformation"); }, []);

  const mode = state === "portalExit" ? "exiting"
    : state === "brandingBoard" ? "board" : "entering";

  if (!ready) {
    return (
      <main className="sou-stage fixed inset-0 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(245,241,232,.15)", borderTopColor: "var(--gold)" }} />
      </main>
    );
  }

  return (
    <main className="sou-stage fixed inset-0">

      {/* one scene at a time: mode="wait" will not mount the next until this one has exited */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={GROUP[state]} className="absolute inset-0">

          {GROUP[state] === "intro" && (
            <SceneIntro onBegin={() => setState("universityGate")} />
          )}

          {GROUP[state] === "gate" && (
            <SceneGate onDone={() => setState("brandingBoard")} />
          )}

          {GROUP[state] === "portal" && (
            <ScenePortal
              mode={mode as any}
              onEnterClick={enter}
              onTravelStart={() => setState("portalTravel")}
              onEnterDone={() => { setState("portalWorld"); setBusy(false); }}
              onExitDone={() => { setState("finalTransformation"); setBusy(false); }}
            />
          )}

          {GROUP[state] === "world" && (
            <SceneWorld onExit={exit} busy={busy} />
          )}

          {GROUP[state] === "final" && <SceneFinal />}

        </motion.div>
      </AnimatePresence>

      {/* navbar - highest layer, never overlaps scene copy */}
      <header className="absolute inset-x-0 top-0 sou-z-ui pointer-events-none">
        <div className="mx-auto max-w-[1400px] m-3 md:m-5 px-5 py-3 flex items-center justify-between gap-4">
          <img src={LOGO} alt="Silver Oak University" className="h-7 md:h-9 w-auto pointer-events-auto"
            style={{ filter: "brightness(1.7) contrast(1.05)", mixBlendMode: "screen" }} />
          <a href="/login" className="pointer-events-auto px-5 py-2 rounded-full text-[12px] tracking-wide
            transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg,var(--maroon),var(--maroon-lt))", color: "var(--cream)" }}>
            Apply Now
          </a>
        </div>
      </header>

      {state !== "finalTransformation" && (
        <button onClick={skipAll}
          className="absolute sou-z-ui right-6 bottom-6 flex items-center gap-2 text-[10px] uppercase
            tracking-[0.28em] opacity-40 hover:opacity-90 transition-opacity">
          <FastForward size={12} /> Skip story
        </button>
      )}
    </main>
  );
}
