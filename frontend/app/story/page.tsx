"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, animate } from "framer-motion";
import {
  ArrowRight, LogOut, FastForward, Wrench, Cpu, Layers, Users, TrendingUp, Rocket, Sparkles,
} from "lucide-react";
import { Environment, Motes, Bag, Student, Portal, LOGO } from "@/components/sv/Parts";

type Stage =
  | "arrival" | "reading" | "bagZoom" | "portalReveal" | "portalEntry"
  | "portalExperience" | "portalExit" | "logoReveal" | "studentDeparture" | "final";

const EASE = [0.22, 0, 0.16, 1] as any;
const EASE_IN = [0.6, 0, 0.9, 0.4] as any;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* =================== the continuous campus shot =================== */
function WorldStage({ stage, setStage, onEnterPortal }: {
  stage: Stage; setStage: (s: Stage) => void; onEnterPortal: () => void;
}) {
  const entry = useRef(stage).current;
  const cam = useMotionValue(entry === "portalExit" ? 9 : 1);
  const sx = useMotionValue(entry === "portalExit" ? -6 : -34);
  const glow = useMotionValue(entry === "portalExit" ? 1 : 0);
  const flap = useMotionValue(entry === "portalExit" ? -70 : 0);
  const pV = useMotionValue(entry === "portalExit" ? 1 : 0);
  const tV = useMotionValue(entry === "portalExit" ? 1 : 0);
  const flash = useMotionValue(0);
  const bagOp = useMotionValue(1);
  const btn = useMotionValue(0);
  const logoCard = useMotionValue(0);

  const [pose, setPose] = useState<"walk" | "read" | "leave">(entry === "portalExit" ? "read" : "walk");
  const [canEnter, setCanEnter] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const A = (mv: any, to: number, d: number, e: any = EASE) => animate(mv, to, { duration: d, ease: e });
    const ok = () => alive.current;

    (async () => {
      if (stage === "arrival") {
        await A(sx, -6, 3.4, "easeOut").finished; if (!ok()) return;
        setStage("reading");
      }
      if (stage === "reading") {
        setPose("read");
        await A(cam, 1.18, 1.4).finished; if (!ok()) return;
        await wait(2000); if (!ok()) return;
        setStage("bagZoom");
      }
      if (stage === "bagZoom") {
        await A(cam, 3.0, 2.6).finished; if (!ok()) return;
        setStage("portalReveal");
      }
      if (stage === "portalReveal") {
        await A(glow, 1, .9).finished; if (!ok()) return;
        A(flap, -72, .8); A(cam, 3.2, 1.6);
        await A(pV, 1, 1.2).finished; if (!ok()) return;
        await A(btn, 1, .5).finished; if (!ok()) return;
        setCanEnter(true);
      }
      if (stage === "portalEntry") {
        setCanEnter(false);
        await A(btn, 0, .45, EASE_IN).finished; if (!ok()) return;
        await A(tV, 1, .8).finished; if (!ok()) return;
        await A(cam, 9, 1.8, EASE_IN).finished; if (!ok()) return;
        await A(flash, 1, .5).finished; if (!ok()) return;
        onEnterPortal();
      }
      if (stage === "portalExit") {
        await A(cam, 3.2, 1.6).finished; if (!ok()) return;
        A(tV, 0, .6);
        await A(pV, 0, .9).finished; if (!ok()) return;
        A(flap, 0, .6);
        await A(glow, .25, .7).finished; if (!ok()) return;
        setStage("logoReveal");
      }
      if (stage === "logoReveal") {
        A(cam, 2.2, 1.6);
        await A(logoCard, 1, .8).finished; if (!ok()) return;
        await wait(1600); if (!ok()) return;
        await A(logoCard, 0, .6).finished; if (!ok()) return;
        setStage("studentDeparture");
      }
      if (stage === "studentDeparture") {
        A(glow, 0, .8);
        await A(cam, 1.1, 1.8).finished; if (!ok()) return;
        setPose("leave");
        A(bagOp, 0, .5);
        await A(sx, 40, 3.2, "easeIn").finished; if (!ok()) return;
        setStage("final");
      }
      if (stage === "final") { A(cam, 1, 1.4); }
    })();

    return () => { alive.current = false; };
  }, [stage]);  // eslint-disable-line

  return (
    <motion.div className="absolute inset-0"
      initial={{ opacity: entry === "portalExit" ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: entry === "portalExit" ? 0 : .9 }}>

      <motion.div className="absolute inset-0 sv-gpu"
        style={{ scale: cam, transformOrigin: "50% 72%" }}>
        <Environment />

        {/* bag - the anchor of the whole story */}
        <motion.div className="absolute sv-z-actor"
          style={{ left: "50%", top: "72%", x: "-50%", y: "-50%", opacity: bagOp }}>
          <Bag glow={glow} open={flap} />
        </motion.div>

        {/* student */}
        <motion.div className="absolute sv-z-actor" style={{ left: "50%", bottom: "20%", x: sx + "vw" as any }}>
          <motion.div style={{ x: sx, translateX: "-50%" }}>
            <Student pose={pose} height={pose === "read" ? "26vh" : "30vh"} />
          </motion.div>
        </motion.div>

        <Portal v={pV} tunnel={tV} />
      </motion.div>

      <Motes n={stage === "portalReveal" || stage === "portalEntry" ? 34 : 18} />

      {/* vignette + flash */}
      <div className="absolute inset-0 sv-z-fx pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 56%,transparent 36%,rgba(10,6,4,.82) 100%)" }} />
      <motion.div className="absolute inset-0 sv-z-fx pointer-events-none"
        style={{ opacity: flash, background: "radial-gradient(circle,#FFFDF5,#FFE9B0 30%,var(--maroon) 70%)" }} />

      {/* closing logo reveal */}
      <motion.div className="absolute inset-0 sv-z-text flex items-center justify-center px-6 pointer-events-none"
        style={{ opacity: logoCard }}>
        <div className="rounded-2xl overflow-hidden"
          style={{ width: "min(560px,80vw)", background: "linear-gradient(158deg,#FAF7EF,#E9E0CD)",
            border: "2px solid rgba(201,162,39,.6)", boxShadow: "0 30px 90px rgba(0,0,0,.65)",
            padding: "clamp(16px,2.6vw,28px)" }}>
          {/* >>> Silver Oak logo - final reveal <<< */}
          <img src={LOGO} alt="Silver Oak University" draggable={false} className="w-full h-auto block" />
        </div>
      </motion.div>

      {/* scene copy - one message at a time */}
      <div className="absolute inset-0 sv-z-text pointer-events-none flex justify-center px-6">
        <AnimatePresence mode="wait">
          {stage === "arrival" && (
            <Copy key="c1" pos="top" title="Every journey begins with curiosity." />
          )}
          {stage === "final" && (
            <Copy key="c9" pos="center" eyebrow="Silver Oak University"
              title="Learn. Grow. Lead."
              sub="Silver Oak University turns curiosity into capability.">
              <Btn href="/login">Explore Programs</Btn>
              <Btn href="/login" ghost>Start Your Journey <ArrowRight size={15} /></Btn>
            </Copy>
          )}
        </AnimatePresence>
      </div>

      {/* Enter button - appears only once the portal has fully formed */}
      <motion.div className="absolute inset-x-0 bottom-[9vh] sv-z-ui flex justify-center px-6"
        style={{ opacity: btn, scale: btn }}>
        <Btn onClick={() => canEnter && setStage("portalEntry")} disabled={!canEnter}>
          Enter SOU Portal <ArrowRight size={15} />
        </Btn>
      </motion.div>
    </motion.div>
  );
}

/* =================== the portal interface =================== */
const ROOMS = [
  { icon: Wrench, t: "Learning and Practical Skills", d: "What you can do, not only what you know." },
  { icon: Cpu, t: "Technology and Innovation", d: "Build with the tools shaping the decade." },
  { icon: Layers, t: "Projects and Hands-on Experience", d: "Ship real work before you graduate." },
  { icon: Users, t: "Expert Mentorship", d: "Guidance from people who have built things." },
  { icon: TrendingUp, t: "Career Development", d: "Prepared, not merely qualified." },
  { icon: Rocket, t: "Leadership and Entrepreneurship", d: "Turn an idea into an organisation." },
  { icon: Sparkles, t: "Campus Community", d: "Find the people who push you further." },
];

function PortalInterface({ onSignOut, busy }: { onSignOut: () => void; busy: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <motion.div className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0, scale: 1.14 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: .9 }} transition={{ duration: .9, ease: EASE }}>
      <div className="absolute inset-0 sv-z-sky"
        style={{ background: "radial-gradient(ellipse at 50% 10%,#2A1622 0%,#140C10 48%,#0A0708 100%)" }} />
      <div className="absolute left-1/2 top-[38%] sv-rot sv-z-far pointer-events-none"
        style={{ width: "82vmin", height: "82vmin", marginLeft: "-41vmin", marginTop: "-41vmin",
          borderRadius: "50%", border: "1px dashed rgba(201,162,39,.14)" }} />
      <Motes n={28} />

      <div className="relative sv-z-text min-h-full flex flex-col justify-center px-5 md:px-10 py-[12vh]">
        <div className="text-center max-w-2xl mx-auto">
          <div className="sv-eyebrow mb-4">Inside the portal</div>
          <h2 className="sv-h1" style={{ fontSize: "clamp(1.3rem,2.6vw,2.1rem)" }}>
            A university you can walk through.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto w-full">
          {ROOMS.map((r, i) => {
            const Icon = r.icon;
            const isOpen = open === i;
            return (
              <motion.button key={r.t} onClick={() => setOpen(isOpen ? null : i)}
                className="sv-glass rounded-2xl p-5 text-left"
                initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .6, delay: .3 + i * .07, ease: EASE }}
                whileHover={{ y: -5 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg,var(--maroon),#3C0A12)", color: "var(--gold)" }}>
                  <Icon size={18} />
                </div>
                <div className="text-[15px] leading-snug">{r.t}</div>
                <div className="sv-body text-[13px] mt-1">{r.d}</div>
                <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: .35 }} className="overflow-hidden">
                  <div className="sv-body text-[12px] mt-3">
                    Delivered through studio labs, live industry briefs and mentor-led reviews
                    in every semester at Silver Oak University.
                  </div>
                </motion.div>
                <div className="text-[10px] uppercase tracking-[.22em] mt-4 opacity-40">
                  {isOpen ? "Close" : "Read more"}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center sv-z-ui">
          <Btn onClick={onSignOut} ghost disabled={busy}><LogOut size={15} /> Sign Out</Btn>
        </div>
      </div>
    </motion.div>
  );
}

/* =================== controller =================== */
export default function StoryPage() {
  const [stage, setStage] = useState<Stage>("arrival");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
    document.body.style.overflow = stage === "portalExperience" ? "auto" : "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [stage]);

  const signOut = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setStage("portalExit");
    setBusy(false);
  }, [busy]);

  const group = stage === "portalExperience" ? "portal" : "world";

  if (!ready) {
    return (
      <main className="sv-stage fixed inset-0 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(246,241,231,.15)", borderTopColor: "var(--gold)" }} />
      </main>
    );
  }

  return (
    <main className="sv-stage fixed inset-0">
      <AnimatePresence mode="wait" initial={false}>
        {group === "world"
          ? <WorldStage key="world" stage={stage} setStage={setStage}
              onEnterPortal={() => setStage("portalExperience")} />
          : <PortalInterface key="portal" onSignOut={signOut} busy={busy} />}
      </AnimatePresence>

      {stage !== "final" && stage !== "portalExperience" && (
        <button onClick={() => setStage("final")}
          className="absolute sv-z-ui right-6 bottom-6 flex items-center gap-2 text-[10px] uppercase
            tracking-[.28em] opacity-40 hover:opacity-90 transition-opacity">
          <FastForward size={12} /> Skip story
        </button>
      )}
    </main>
  );
}

/* =================== small UI =================== */
function Copy({ eyebrow, title, sub, children, pos = "center" }:
  { eyebrow?: string; title?: string; sub?: string; children?: React.ReactNode; pos?: "center" | "top" }) {
  return (
    <motion.div className={"absolute inset-0 flex justify-center " +
      (pos === "top" ? "items-start pt-[13vh]" : "items-center")}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: .9, ease: EASE }}>
      <div className="text-center max-w-2xl px-6 pointer-events-auto">
        {eyebrow && <div className="sv-eyebrow mb-5">{eyebrow}</div>}
        {title && <h1 className="sv-h1" style={{ textShadow: "0 4px 50px rgba(0,0,0,.85)" }}>{title}</h1>}
        {sub && <p className="sv-body mt-5">{sub}</p>}
        {children && <div className="mt-9 flex gap-3 justify-center flex-wrap">{children}</div>}
      </div>
    </motion.div>
  );
}

function Btn({ children, onClick, href, ghost, disabled }:
  { children: React.ReactNode; onClick?: () => void; href?: string; ghost?: boolean; disabled?: boolean }) {
  const cls = "inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] tracking-wide " +
    "transition-all duration-300 hover:scale-[1.04] active:scale-[.98] disabled:opacity-40 " +
    "disabled:pointer-events-none " + (ghost ? "sv-glass" : "");
  const style = ghost ? {} : {
    background: "linear-gradient(135deg,var(--maroon),var(--maroon-lt))",
    color: "var(--cream)", boxShadow: "0 14px 46px rgba(123,18,32,.5)",
  };
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button onClick={onClick} disabled={disabled} className={cls} style={style}>{children}</button>;
}
