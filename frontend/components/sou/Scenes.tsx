"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { ArrowRight, LogOut, Wrench, Cpu, Users, Layers, TrendingUp, Rocket, Sparkles } from "lucide-react";

/* ===== PUT YOUR LOGO HERE: frontend/public/sou-brand.png ===== */
export const LOGO = "/sou-brand.png";

const EASE = [0.22, 0, 0.16, 1] as any;
const EASE_IN = [0.6, 0, 0.9, .4] as any;
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ---------- shared ---------- */
export function Dust({ n = 26, tint = "rgba(201,162,39," }: { n?: number; tint?: string }) {
  return (
    <div className="absolute inset-0 sou-z-fx overflow-hidden pointer-events-none">
      {Array.from({ length: n }).map((_, i) => {
        const r = (k: number) => { const x = Math.sin(i * 61.7 + k * 173.1) * 21317.7; return x - Math.floor(x); };
        const s = 1 + r(2) * 2.6;
        return (
          <span key={i} className="absolute rounded-full sou-gpu"
            style={{ left: r(1) * 100 + "%", top: r(3) * 100 + "%", width: s, height: s,
              background: tint + (.3 + r(4) * .5) + ")",
              boxShadow: "0 0 " + s * 6 + "px rgba(201,162,39,.5)",
              animation: "sou-rise " + (14 + r(5) * 14) + "s linear " + (-r(6) * 20) + "s infinite" }} />
        );
      })}
    </div>
  );
}

export function Btn({ children, onClick, href, ghost, disabled }:
  { children: React.ReactNode; onClick?: () => void; href?: string; ghost?: boolean; disabled?: boolean }) {
  const cls = "inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[13px] tracking-wide " +
    "transition-all duration-300 hover:scale-[1.04] active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none " +
    (ghost ? "sou-card" : "");
  const style = ghost ? {} : {
    background: "linear-gradient(135deg,var(--maroon),var(--maroon-lt))",
    color: "var(--cream)", boxShadow: "0 14px 46px rgba(123,18,32,.5)",
  };
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button onClick={onClick} disabled={disabled} className={cls} style={style}>{children}</button>;
}

/** Every scene uses this. One heading, one line, one row of actions. Never absolute. */
export function SceneCopy({ eyebrow, title, sub, children, align = "center" }:
  { eyebrow?: string; title?: string; sub?: string; children?: React.ReactNode; align?: "center" | "bottom" }) {
  return (
    <div className={"relative sou-z-text w-full h-full flex flex-col items-center px-6 " +
      (align === "bottom" ? "justify-end pb-[12vh]" : "justify-center")}>
      <div className="text-center max-w-2xl">
        {eyebrow && <div className="sou-eyebrow mb-5">{eyebrow}</div>}
        {title && <h1 className="sou-h1">{title}</h1>}
        {sub && <p className="sou-body mt-5">{sub}</p>}
        {children && <div className="mt-9 flex gap-3 justify-center flex-wrap">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- figure ---------- */
export function Figure({ transformed = false, height = "30vh" }:
  { transformed?: boolean; height?: string }) {
  const body = transformed ? "#2A1A18" : "#0E0A09";
  const rim = transformed ? "var(--gold)" : "rgba(201,162,39,.42)";
  return (
    <svg viewBox="0 0 90 180" style={{ height, width: "auto", overflow: "visible" }} className="sou-gpu">
      <defs>
        <linearGradient id="souRim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={rim} /><stop offset="20%" stopColor={rim} stopOpacity="0" />
          <stop offset="80%" stopColor={rim} stopOpacity="0" /><stop offset="100%" stopColor={rim} />
        </linearGradient>
      </defs>
      <ellipse cx="45" cy="176" rx="32" ry="6" fill="#000" opacity=".5" />
      <path d="M31 148 L34 176 L42 176 L41 148 Z M49 148 L48 176 L56 176 L59 148 Z" fill={body} />
      <path d="M27 55 Q45 45 63 55 L68 100 Q45 109 22 100 Z" fill={body} />
      <rect x="30" y="98" width="30" height="52" rx="7" fill={body} />
      <path d="M24 58 L18 104 L26 106 L30 60 Z M66 58 L72 104 L64 106 L60 60 Z" fill={body} />
      <rect x="38" y="30" width="14" height="12" rx="5" fill={body} />
      <ellipse cx="45" cy="22" rx="14" ry="15" fill={body} />
      <path d="M27 55 Q45 45 63 55 L68 100 Q45 109 22 100 Z" fill="url(#souRim)" />
      <ellipse cx="45" cy="22" rx="14" ry="15" fill="url(#souRim)" />
      {transformed && (
        <>
          <rect x="62" y="86" width="24" height="17" rx="2" fill="#150C0B" stroke="var(--gold)" strokeWidth="1" />
          <rect x="64" y="88" width="20" height="11" rx="1" fill="var(--gold)" opacity=".3" />
          <path d="M31 55 L45 70 L59 55" fill="none" stroke="var(--gold)" strokeWidth="1.2" opacity=".8" />
        </>
      )}
    </svg>
  );
}

/* ---------- 1. intro ---------- */
export function SceneIntro({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="absolute inset-0">
      <Dust n={20} />
      <div className="absolute inset-0 sou-z-obj flex items-end justify-center pb-[8vh] pointer-events-none">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: .9, y: 0 }}
          transition={{ duration: 1.6, ease: EASE }}>
          <Figure height="28vh" />
        </motion.div>
      </div>
      <motion.div className="absolute inset-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: .5 }}>
        <SceneCopy eyebrow="Silver Oak University"
          title="Every future begins with a question."
          sub="No direction yet. No proof of what he could do. Only the sense that it could be different.">
          <Btn onClick={onBegin}>Begin <ArrowRight size={15} /></Btn>
        </SceneCopy>
      </motion.div>
    </div>
  );
}

/* ---------- 2. university gate ---------- */
export function SceneGate({ onDone }: { onDone: () => void }) {
  useEffect(() => { let a = true; (async () => { await wait(3600); if (a) onDone(); })(); return () => { a = false; }; }, [onDone]);
  return (
    <motion.div className="absolute inset-0"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .9 }}>
      <motion.div className="absolute inset-0 sou-z-bg sou-gpu"
        initial={{ scale: 1, filter: "saturate(.45) brightness(.6)" }}
        animate={{ scale: 1.22, filter: "saturate(1) brightness(1)" }}
        transition={{ duration: 3.8, ease: EASE }}>
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 68%,rgba(201,162,39,.28),transparent 58%)" }} />
        <div className="absolute inset-0 flex items-end justify-center">
          <svg viewBox="0 0 1300 620" className="w-[min(1300px,100vw)]">
            <defs>
              <linearGradient id="souStone" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#241814" /><stop offset="45%" stopColor="#5A4A3C" />
                <stop offset="100%" stopColor="#1B120F" />
              </linearGradient>
            </defs>
            <rect x="110" y="150" width="100" height="470" fill="url(#souStone)" />
            <rect x="1090" y="150" width="100" height="470" fill="url(#souStone)" />
            <path d="M210 162 Q650 26 1090 162 L1090 200 Q650 62 210 200 Z" fill="url(#souStone)" />
            <path d="M224 174 Q650 46 1076 174" fill="none" stroke="var(--gold)" strokeWidth="2.5" opacity=".75" />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={i} x={236 + i * 72} y={186} width="5" height="420" fill="#2A1D18" opacity=".8" />
            ))}
          </svg>
        </div>
      </motion.div>
      <Dust n={24} />
      <motion.div className="absolute inset-0 sou-z-obj flex items-end justify-center pb-[9vh] pointer-events-none"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: .85 }} transition={{ duration: 2.4, ease: EASE }}>
        <Figure height="22vh" />
      </motion.div>
      <motion.div className="absolute inset-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: .8, delay: .8 }}>
        <SceneCopy title="He found a place built for the asking." align="bottom" />
      </motion.div>
    </motion.div>
  );
}

/* ---------- 3-4-5 + 7. portal: ONE mount across board, opening, travel and exit ---------- */
const RINGS = 24, GAP = 260, TUNNEL_Z = -1280;

export function ScenePortal({ mode, onBoardReady, onEnterDone, onExitDone, onEnterClick, onTravelStart }: {
  mode: "board" | "entering" | "exiting";
  onBoardReady?: () => void; onEnterDone?: () => void; onExitDone?: () => void;
  onEnterClick?: () => void; onTravelStart?: () => void;
}) {
  const camZ = useMotionValue(mode === "exiting" ? 7000 : 0);
  const zoom = useMotionValue(mode === "board" ? .55 : 1);
  const glow = useMotionValue(mode === "board" ? 0 : 1);
  const burst = useMotionValue(mode === "exiting" ? 1 : 0);
  const tun = useMotionValue(mode === "board" ? 0 : 1);
  const streak = useMotionValue(0);
  const btn = useMotionValue(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const A = (mv: any, to: number, d: number, e: any = EASE) => animate(mv, to, { duration: d, ease: e });
    const run = async () => {
      if (mode === "board") {
        await A(zoom, 1, 2.4).finished; if (!alive.current) return;
        await A(glow, .35, .8).finished; if (!alive.current) return;
        await wait(2000); if (!alive.current) return;          // logo held clear, nothing over it
        await A(btn, 1, .6).finished; if (!alive.current) return;
        onBoardReady?.();
      }
      if (mode === "entering") {
        await A(btn, 0, .45, EASE_IN).finished; if (!alive.current) return;   // 2 button dissolves
        await A(glow, 1, .6).finished; if (!alive.current) return;            // 3 board glows
        A(burst, 1, .9);                                                      // 4 energy emerges
        await A(tun, 1, .9).finished; if (!alive.current) return;             // 5 portal forms
        A(streak, .9, .5);
        await A(camZ, 1600, .8, EASE_IN).finished; if (!alive.current) return; // 6 fills the screen
        onTravelStart?.();
        await A(camZ, 7000, 1.7).finished; if (!alive.current) return;        // 7 camera enters
        onEnterDone?.();                                                      // 8 only now
      }
      if (mode === "exiting") {
        A(streak, .9, .4);
        await A(camZ, 1600, 1.6).finished; if (!alive.current) return;        // back through the tunnel
        A(streak, 0, .5);
        await A(camZ, 0, .9).finished; if (!alive.current) return;            // portal shrinks to the board
        A(burst, 0, .7);
        await A(tun, 0, .8, EASE_IN).finished; if (!alive.current) return;    // energy returns
        await A(glow, .25, .5).finished; if (!alive.current) return;
        await A(zoom, .62, 1.2).finished; if (!alive.current) return;         // pull back to the entrance
        onExitDone?.();
      }
    };
    run();
    return () => { alive.current = false; };
  }, [mode]);   // eslint-disable-line

  return (
    <motion.div className="absolute inset-0"
      initial={{ opacity: mode === "exiting" ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: mode === "exiting" ? 0 : .8 }}>

      <div className="absolute inset-0 sou-z-bg" style={{ perspective: "1150px", perspectiveOrigin: "50% 47%" }}>
        <motion.div className="absolute inset-0 sou-3d sou-gpu" style={{ z: camZ }}>
          <motion.div className="absolute inset-0 sou-3d pointer-events-none" style={{ opacity: tun }}>
            {Array.from({ length: RINGS }).map((_, i) => (
              <div key={i} className="absolute left-1/2 top-1/2 sou-gpu"
                style={{ width: "76vmin", height: "76vmin", marginLeft: "-38vmin", marginTop: "-38vmin",
                  transform: "translateZ(" + (TUNNEL_Z - i * GAP) + "px) rotate(" + i * 15 + "deg)",
                  borderRadius: "50%",
                  border: "1px solid " + (i % 3 === 0 ? "rgba(201,162,39,.6)"
                    : i % 3 === 1 ? "rgba(123,18,32,.65)" : "rgba(245,241,232,.22)"),
                  boxShadow: i % 4 === 0 ? "0 0 40px rgba(201,162,39,.28)" : "none",
                  opacity: .3 + (1 - i / RINGS) * .7 }} />
            ))}
          </motion.div>

          <motion.div className="absolute inset-0 sou-3d flex items-center justify-center pointer-events-none"
            style={{ transform: "translateZ(-1150px)" }}>
            <motion.div style={{ scale: zoom }} className="sou-gpu" >
              <div className="relative" style={{ width: "min(660px,82vw)" }}>
                <motion.div className="absolute -inset-12 rounded-[36px] pointer-events-none" style={{ opacity: glow,
                  background: "radial-gradient(ellipse,rgba(227,197,88,.8),rgba(201,162,39,.35) 38%,rgba(123,18,32,.16) 62%,transparent 78%)" }} />
                <div className="relative rounded-[18px] overflow-hidden"
                  style={{ background: "linear-gradient(158deg,#FAF7EF,#E8DFCC)",
                    border: "2px solid rgba(201,162,39,.65)",
                    boxShadow: "0 34px 100px rgba(0,0,0,.72)", padding: "clamp(16px,2.6vw,30px)" }}>
                  {/* >>> Silver Oak logo <<< */}
                  <img src={LOGO} alt="Silver Oak University" draggable={false} className="w-full h-auto block" />
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-y-0 w-1/4"
                      style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)",
                        animation: "sou-sweep 6.5s ease-in-out infinite" }} />
                  </div>
                </div>
                <div className="mx-auto rounded-b-lg" style={{ width: "54%", height: 13,
                  background: "linear-gradient(180deg,#6A5A48,#221812)" }} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* energy bursting from the board */}
      <motion.div className="absolute inset-0 sou-z-fx flex items-center justify-center pointer-events-none"
        style={{ opacity: burst }}>
        {[0, 1, 2].map(i => (
          <motion.span key={i} className="absolute rounded-full"
            style={{ width: (22 + i * 10) + "vmin", height: (22 + i * 10) + "vmin", scale: burst,
              border: "2px solid " + (i % 2 ? "rgba(201,162,39,.85)" : "rgba(245,241,232,.5)") }} />
        ))}
      </motion.div>

      {/* speed streaks */}
      <motion.div className="absolute inset-0 sou-z-fx pointer-events-none overflow-hidden" style={{ opacity: streak }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * 360;
          return <span key={i} className="absolute left-1/2 top-1/2"
            style={{ width: 1.5, height: "26vmin",
              background: "linear-gradient(180deg,transparent,rgba(245,241,232,.7),transparent)",
              transform: "rotate(" + a + "deg) translateY(22vmin)", filter: "blur(.6px)" }} />;
        })}
      </motion.div>

      <Dust n={22} />

      {/* Enter button - below the board, never over the logo */}
      <motion.div className="absolute inset-x-0 bottom-[10vh] sou-z-ui flex justify-center px-6"
        style={{ opacity: btn, scale: btn }}>
        <Btn onClick={onEnterClick} disabled={mode !== "board"}>
          Enter SOU Portal <ArrowRight size={15} />
        </Btn>
      </motion.div>
    </motion.div>
  );
}

/* ---------- 6. portal world: real responsive grid, no absolute stacking ---------- */
const WORLDS = [
  { icon: Wrench, t: "Practical Skills", d: "What you can do, not only what you know." },
  { icon: Cpu, t: "Technology and Innovation", d: "Build with the tools shaping the decade." },
  { icon: Users, t: "Expert Mentorship", d: "Guidance from people who have built things." },
  { icon: Layers, t: "Hands-on Projects", d: "Ship real work before you graduate." },
  { icon: TrendingUp, t: "Career Development", d: "Prepared, not merely qualified." },
  { icon: Rocket, t: "Entrepreneurship and Leadership", d: "Turn an idea into an organisation." },
  { icon: Sparkles, t: "Campus Community", d: "Find the people who push you further." },
];

export function SceneWorld({ onExit, busy }: { onExit: () => void; busy: boolean }) {
  return (
    <motion.div className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: .92 }} transition={{ duration: .9, ease: EASE }}>
      <div className="absolute inset-0 sou-z-bg pointer-events-none">
        <div className="absolute left-1/2 top-[40%] sou-rot"
          style={{ width: "78vmin", height: "78vmin", marginLeft: "-39vmin", marginTop: "-39vmin",
            borderRadius: "50%", border: "1px dashed rgba(201,162,39,.16)" }} />
        <div className="absolute left-1/2 top-[40%] sou-breathe"
          style={{ width: "44vmin", height: "44vmin", marginLeft: "-22vmin", marginTop: "-22vmin",
            borderRadius: "50%", background: "radial-gradient(circle,rgba(123,18,32,.28),transparent 68%)" }} />
      </div>
      <Dust n={26} />
      <div className="relative sou-z-text min-h-full flex flex-col justify-center px-5 md:px-10 py-[12vh]">
        <div className="text-center max-w-2xl mx-auto">
          <div className="sou-eyebrow mb-4">Inside Silver Oak</div>
          <h2 className="sou-h2">Seven worlds. One university.</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto w-full">
          {WORLDS.map((w, i) => {
            const Icon = w.icon;
            return (
              <motion.div key={w.t} className="sou-card rounded-2xl p-5 sou-hover"
                initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .6, delay: .25 + i * .07, ease: EASE }}
                style={{ animationDelay: -i * .9 + "s" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg,var(--maroon),#3C0A12)", color: "var(--gold)" }}>
                  <Icon size={18} />
                </div>
                <div className="text-[15px] leading-snug">{w.t}</div>
                <div className="sou-body mt-1 text-[13px]">{w.d}</div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-12 flex justify-center sou-z-ui">
          <Btn onClick={onExit} ghost disabled={busy}><LogOut size={15} /> Exit Portal</Btn>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- 8. final transformation ---------- */
export function SceneFinal() {
  return (
    <motion.div className="absolute inset-0"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
      <div className="absolute inset-0 sou-z-bg"
        style={{ background: "linear-gradient(180deg,transparent 38%,rgba(201,162,39,.18) 76%,rgba(227,197,88,.3) 100%)" }} />
      <Dust n={30} />
      <div className="absolute inset-0 sou-z-obj flex items-end justify-center pb-[7vh] pointer-events-none">
        <motion.div initial={{ opacity: 0, y: 50, scale: .82 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 2.2, ease: EASE, delay: .3 }}>
          <Figure transformed height="30vh" />
        </motion.div>
      </div>
      <motion.div className="absolute inset-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.1 }}>
        <div className="relative sou-z-text w-full h-full flex flex-col items-center justify-start pt-[14vh] px-6">
          <div className="text-center max-w-2xl">
            <div className="sou-eyebrow mb-5">The return</div>
            <h1 className="sou-h1">From curious learner to confident professional.</h1>
            <p className="sou-body mt-5">
              At Silver Oak University, potential becomes knowledge, knowledge becomes skill,
              and skill becomes real-world impact.
            </p>
            <div className="mt-9 flex gap-3 justify-center flex-wrap sou-z-ui">
              <Btn href="/login">Explore Programs</Btn>
              <Btn href="/login" ghost>Start Your Journey <ArrowRight size={15} /></Btn>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

