"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FastForward } from "lucide-react";
import { SceneIntro, SceneGate, ScenePortal, SceneFinal, LOGO } from "@/components/sou/Scenes";

type State =
  | "intro" | "universityGate" | "brandingBoard" | "portalOpening"
  | "portalTravel" | "portalExit" | "finalTransformation";

const GROUP: Record<State, string> = {
  intro: "intro", universityGate: "gate",
  brandingBoard: "portal", portalOpening: "portal", portalTravel: "portal", portalExit: "portal",
  finalTransformation: "final",
};

export default function Story() {
  const router = useRouter();
  const [state, setState] = useState<State>("intro");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // returning from the portal? open straight into the exit story, not the intro
    let start: State = "intro";
    try {
      if (new URLSearchParams(window.location.search).get("story") === "exit") {
        start = "portalExit";
        window.history.replaceState({}, "", "/");
      }
    } catch {}
    setState(start);

    const img = new window.Image();
    img.src = LOGO;
    const done = () => setReady(true);
    if (img.decode) img.decode().then(done).catch(done);
    else { img.onload = done; img.onerror = done; }
    const g = setTimeout(done, 2500);
    return () => clearTimeout(g);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const enter = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setState("portalOpening");
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={GROUP[state]} className="absolute inset-0">
          {GROUP[state] === "intro" && <SceneIntro onBegin={() => setState("universityGate")} />}
          {GROUP[state] === "gate" && <SceneGate onDone={() => setState("brandingBoard")} />}
          {GROUP[state] === "portal" && (
            <ScenePortal
              mode={mode as any}
              onEnterClick={enter}
              onTravelStart={() => setState("portalTravel")}
              /* the flight ends at the LOGIN page - never at the dashboard */
              onEnterDone={() => router.push("/login?next=/portal")}
              onExitDone={() => { setState("finalTransformation"); setBusy(false); }}
            />
          )}
          {GROUP[state] === "final" && <SceneFinal />}
        </motion.div>
      </AnimatePresence>

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

