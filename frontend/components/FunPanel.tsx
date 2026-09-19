"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Gamepad2, Trophy, Clock, Lock, Loader2, CheckCircle2, XCircle, Play, RotateCcw,
  Grid3x3, Shuffle, Music, Link2, Smile, Keyboard, ListOrdered, Bug, Terminal,
  Navigation, Braces, Check, Star,
} from "lucide-react";

/* Each game gets its own colour and mark. Eleven identical grey cards is a
   list; eleven distinct ones is a place you choose from. The colours are not
   decoration - they are what makes "the orange one" a usable way to think
   about a game you played yesterday. */
const GAME_STYLE: Record<string, { icon: any; from: string; ring: string; tile: string; glow: string }> = {
  grid:     { icon: Grid3x3,     from: "from-red-800/45",     ring: "border-red-500/45",     tile: "bg-red-700",     glow: "shadow-red-800/30" },
  scramble: { icon: Shuffle,     from: "from-emerald-800/45", ring: "border-emerald-500/45", tile: "bg-emerald-700", glow: "shadow-emerald-800/30" },
  sequence: { icon: Music,       from: "from-amber-700/45",   ring: "border-amber-500/45",   tile: "bg-amber-600",   glow: "shadow-amber-700/30" },
  ladder:   { icon: Link2,       from: "from-orange-800/45",  ring: "border-orange-500/45",  tile: "bg-orange-700",  glow: "shadow-orange-800/30" },
  culture:  { icon: Smile,       from: "from-rose-800/45",    ring: "border-rose-500/45",    tile: "bg-rose-700",    glow: "shadow-rose-800/30" },
  typing:   { icon: Keyboard,    from: "from-teal-800/45",    ring: "border-teal-500/45",    tile: "bg-teal-700",    glow: "shadow-teal-800/30" },
  jumble:   { icon: ListOrdered, from: "from-stone-700/45",   ring: "border-stone-400/45",   tile: "bg-stone-600",   glow: "shadow-stone-700/30" },
  debug:    { icon: Bug,         from: "from-red-900/45",     ring: "border-red-600/45",     tile: "bg-red-800",     glow: "shadow-red-900/30" },
  output:   { icon: Terminal,    from: "from-green-800/45",   ring: "border-green-500/45",   tile: "bg-green-700",   glow: "shadow-green-800/30" },
  robot:    { icon: Navigation,  from: "from-yellow-700/45",  ring: "border-yellow-500/45",  tile: "bg-yellow-600",  glow: "shadow-yellow-700/30" },
  semantic: { icon: Braces,      from: "from-lime-800/45",    ring: "border-lime-500/45",    tile: "bg-lime-700",    glow: "shadow-lime-800/30" },
};
const FALLBACK = { icon: Gamepad2, from: "from-white/15", ring: "border-white/20", tile: "bg-white/20", glow: "shadow-white/10" };
import FunCodeGames from "@/components/FunCodeGames";
import FunProgress from "@/components/FunProgress";
import FunLeaderboard from "@/components/FunLeaderboard";
import { motion } from "framer-motion";
import { stagger, popIn } from "@/lib/motion";

/* Fun Zone.

   Open all day. What limits it is a thirty-minute daily budget, enforced on
   the server - once it is spent the puzzle endpoint returns 423 and no puzzle,
   so leaving the tab open achieves nothing. A budget rather than a time
   window, because a window makes a rule about the timetable and the timetable
   is not this portal's business.

   Puzzles are generated from the date, so everyone gets the same puzzle and the
   weekly board compares like with like. Solutions never reach the client: the
   attempt is posted and the server decides.

   Progression - level, streak, badges - is derived from the score rows rather
   than stored, so the curve can be rewritten without a migration. It leads
   with the STREAK on purpose: the leaderboard already rewards winning, and a
   leaderboard is what makes a student who is not the best stop playing. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

const PADS = [
  { on: "bg-violet-400", off: "bg-violet-500/20 hover:bg-violet-500/35" },
  { on: "bg-emerald-400", off: "bg-emerald-500/20 hover:bg-emerald-500/35" },
  { on: "bg-amber-400", off: "bg-amber-500/20 hover:bg-amber-500/35" },
  { on: "bg-rose-400", off: "bg-rose-500/20 hover:bg-rose-500/35" },
];

type Game =
  | "grid" | "scramble" | "sequence" | "ladder" | "culture"
  | "typing" | "jumble" | "debug" | "output" | "robot" | "semantic";

const CODE_GAMES: Game[] = ["typing", "jumble", "debug", "output", "robot", "semantic"];

const TITLES: Record<Game, string> = {
  grid: "Mini Grid", scramble: "Word Scramble", sequence: "Sequence Recall",
  ladder: "Concept Ladder", culture: "Meme Desk",
  typing: "Typing Sprint", jumble: "Jumble Programming", debug: "Debug It",
  output: "Predict the Output", robot: "Robot Path", semantic: "Semantic Match",
};

export default function FunPanel() {
  const [status, setStatus] = useState<any>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [board, setBoard] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  // per-game state
  const [grid, setGrid] = useState<number[][]>([]);
  const [guess, setGuess] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [seqShow, setSeqShow] = useState<number | null>(null);
  const [seqPhase, setSeqPhase] = useState<"idle" | "showing" | "input">("idle");
  const [recalled, setRecalled] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<any[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const started = useRef<number>(0);

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/fun/status", { headers: AUTH() });
      if (r.ok) setStatus(await r.json());
    } catch { /* leave status null */ }
  }, []);

  const loadBoard = useCallback(async (g?: string) => {
    try {
      const r = await fetch("/api/fun/leaderboard" + (g ? "?game=" + g : ""), { headers: AUTH() });
      if (r.ok) setBoard(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); loadBoard(); }, [loadStatus, loadBoard]);

  async function openGame(g: Game) {
    setErr(""); setResult(null); setBusy("loading"); setMistakes(0);
    setGuess(""); setRecalled([]); setSeqPhase("idle"); setGuesses([]); setAnswers([]);
    try {
      const r = await fetch("/api/fun/puzzle?game=" + g, { headers: AUTH() });
      const d = await r.json();
      if (r.status === 423) { setErr(d.error || "Closed."); await loadStatus(); setBusy(""); return; }
      if (!r.ok) throw new Error(d?.error || "Could not load the puzzle");
      setGame(g); setPuzzle(d);
      if (g === "grid") setGrid(d.puzzle.given.map((r: number[]) => [...r]));
      started.current = Date.now();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  async function submit(payload: any) {
    setBusy("submitting");
    try {
      const r = await fetch("/api/fun/submit", {
        method: "POST", headers: H(),
        body: JSON.stringify({
          game, durationMs: Date.now() - started.current, mistakes, ...payload,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not submit");
      setResult(d);
      await Promise.all([loadStatus(), loadBoard()]);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  /* ---------- concept ladder ---------- */
  async function sendGuess() {
    const g = guess.trim();
    if (!g || busy) return;
    setBusy("guessing"); setGuess("");
    try {
      const r = await fetch("/api/fun/guess", {
        method: "POST", headers: H(), body: JSON.stringify({ guess: g }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not check that guess");
      setGuesses(list => [d, ...list]);
      if (d.band === "answer") {
        await submit({ answer: d.word, guesses: guesses.length + 1 });
      }
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  /* ---------- sequence playback ---------- */
  function playSequence() {
    if (!puzzle?.puzzle?.sequence) return;
    const seq: number[] = puzzle.puzzle.sequence;
    setSeqPhase("showing"); setRecalled([]);
    seq.forEach((pad, i) => {
      setTimeout(() => setSeqShow(pad), i * 700);
      setTimeout(() => setSeqShow(null), i * 700 + 450);
    });
    setTimeout(() => { setSeqPhase("input"); started.current = Date.now(); }, seq.length * 700 + 200);
  }

  const w = status?.window;

  /* ---------- closed ---------- */
  if (status && !w?.open && !game) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Gamepad2 size={20} className="opacity-70" /> Fun Zone
        </h1>
        <div className="panel-solid rounded-xl p-8 mt-6 text-center">
          <Lock size={26} className="mx-auto opacity-40" />
          <div className="text-lg font-medium mt-3">{w?.label}</div>
          <p className="text-sm opacity-55 mt-2 max-w-md mx-auto">
            The Fun Zone is open all day — what is limited is how long you play, not when.
            Thirty minutes each day, across every game, and it resets at midnight.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <span className="text-xs px-3 py-1.5 rounded-lg border border-white/15 opacity-70">
              {w?.usedMinutes ?? 0} of {w?.budgetMinutes ?? 30} minutes used
            </span>
          </div>
          {typeof w?.resetsInMinutes === "number" && w.resetsInMinutes > 0 && (
            <p className="text-xs opacity-40 mt-4">
              Resets in about {Math.floor(w.resetsInMinutes / 60)}h {w.resetsInMinutes % 60}m.
            </p>
          )}
          <p className="text-xs opacity-35 mt-3 max-w-sm mx-auto">
            The board is still below — a spent budget stops you playing, not looking.
          </p>
        </div>
        <FunProgress progress={status?.progress} />
        {board && <FunLeaderboard board={board} onFilter={loadBoard} games={status?.games || []} />}
      </div>
    );
  }

  /* ---------- a game is open ---------- */
  if (game && puzzle) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-8">
        <button onClick={() => { setGame(null); setPuzzle(null); setResult(null); }}
          className="text-xs opacity-60 hover:opacity-100">&larr; Back to the Fun Zone</button>

        <h1 className="text-2xl font-semibold tracking-tight mt-3">{TITLES[game]}</h1>
        <p className="opacity-55 text-sm mt-1">Puzzle for {puzzle.date}. Everyone gets the same one today.</p>

        {puzzle.alreadyPlayed !== null && puzzle.alreadyPlayed !== undefined && (
          <div className="mt-4 px-4 py-3 rounded-lg text-sm border border-sky-500/40 bg-sky-500/10">
            You already scored <b>{puzzle.alreadyPlayed}</b> on this puzzle today. You can play again,
            but only the first result counts.
          </div>
        )}

        {err && <div className="mt-4 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

        {/* ---- the six code games live in their own component ---- */}
        {CODE_GAMES.includes(game) && (
          <FunCodeGames game={game} puzzle={puzzle} result={result} busy={busy} onSubmit={submit} />
        )}

        {/* ---- grid ---- */}
        {game === "grid" && (
          <div className="mt-6">
            <p className="text-sm opacity-60 mb-4">
              Every row, column and 2x2 box must contain 1 to 4 exactly once.
            </p>
            <div className="inline-grid grid-cols-4 gap-1 panel-solid p-3 rounded-xl">
              {grid.map((row, r) => row.map((v, c) => {
                const fixed = puzzle.puzzle.given[r][c] !== 0;
                return (
                  <button key={`${r}-${c}`} disabled={fixed || !!busy}
                    onClick={() => {
                      const next = grid.map(x => [...x]);
                      next[r][c] = (next[r][c] % 4) + 1;
                      setGrid(next);
                    }}
                    className={
                      "w-14 h-14 rounded-lg text-lg font-semibold transition " +
                      (fixed ? "bg-white/10 opacity-80 cursor-default"
                             : "bg-white/5 border border-white/15 hover:border-white/35") +
                      ((c === 1 ? " mr-1" : "") + (r === 1 ? " mb-1" : ""))
                    }>
                    {v === 0 ? "" : v}
                  </button>
                );
              }))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => submit({ attempt: grid })} disabled={!!busy}
                className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm disabled:opacity-40">
                {busy === "submitting" ? "Checking..." : "Check my grid"}
              </button>
              <button onClick={() => { setGrid(puzzle.puzzle.given.map((r: number[]) => [...r])); setMistakes(m => m + 1); }}
                className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm flex items-center gap-1.5">
                <RotateCcw size={14} /> Reset
              </button>
            </div>
            <p className="text-[11px] opacity-40 mt-3">
              Tap a cell to cycle 1 to 4. The answer is checked on the server — it is never sent to your browser.
            </p>
          </div>
        )}

        {/* ---- scramble ---- */}
        {game === "scramble" && (
          <div className="mt-6">
            <div className="panel-solid rounded-xl p-8 text-center">
              <div className="text-3xl font-bold tracking-[0.3em]">{puzzle.puzzle.scrambled}</div>
              <div className="text-xs opacity-45 mt-3">{puzzle.puzzle.hint}</div>
            </div>
            <div className="flex gap-2 mt-4">
              <input value={guess} onChange={e => setGuess(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter" && guess) submit({ answer: guess }); }}
                placeholder="Your answer"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 outline-none focus:border-white/35 text-sm tracking-widest" />
              <button onClick={() => submit({ answer: guess })} disabled={!!busy || !guess}
                className="px-5 rounded-xl border border-white/15 hover:border-white/30 text-sm disabled:opacity-40">
                Submit
              </button>
            </div>
          </div>
        )}

        {/* ---- sequence ---- */}
        {game === "sequence" && (
          <div className="mt-6">
            <p className="text-sm opacity-60 mb-4">
              Watch the pattern, then repeat it. You need at least four correct to score.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {PADS.map((p, i) => (
                <button key={i} disabled={seqPhase !== "input" || !!busy}
                  onClick={() => setRecalled(r => [...r, i])}
                  className={"h-28 rounded-2xl transition " +
                    (seqShow === i ? p.on : p.off) +
                    (seqPhase !== "input" ? " cursor-default" : "")} />
              ))}
            </div>
            <div className="mt-4 flex gap-2 items-center">
              {seqPhase === "idle" && (
                <button onClick={playSequence} disabled={!!busy}
                  className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm flex items-center gap-1.5">
                  <Play size={14} /> Show the pattern
                </button>
              )}
              {seqPhase === "showing" && <span className="text-sm opacity-60">Watch closely...</span>}
              {seqPhase === "input" && (
                <>
                  <span className="text-sm opacity-60">{recalled.length} entered</span>
                  <button onClick={() => submit({ recalled })} disabled={!!busy || !recalled.length}
                    className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm disabled:opacity-40">
                    Done
                  </button>
                  <button onClick={() => setRecalled([])}
                    className="px-3 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm">
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        )}


        {/* ---- concept ladder ---- */}
        {game === "ladder" && (
          <div className="mt-6">
            <p className="text-sm opacity-60 mb-1">
              Guess the hidden subject term. Each guess is ranked against {puzzle.puzzle.vocabSize} terms
              by how much its definition overlaps with the answer&apos;s.
            </p>
            <p className="text-xs opacity-45 mb-4">Hint: {puzzle.puzzle.hint}</p>

            <div className="flex gap-2">
              <input value={guess} onChange={e => setGuess(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendGuess(); }}
                placeholder="Type a term, e.g. index"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 outline-none focus:border-white/35 text-sm" />
              <button onClick={sendGuess} disabled={!!busy || !guess.trim()}
                className="px-5 rounded-xl border border-white/15 hover:border-white/30 text-sm disabled:opacity-40">
                Guess
              </button>
            </div>
            <div className="text-xs opacity-45 mt-2">{guesses.length} guess(es)</div>

            <div className="space-y-2 mt-4">
              {guesses.map((g, i) => (
                <div key={i} className={"panel-solid rounded-xl p-3 border-l-2 " +
                  (g.band === "answer" ? "border-l-emerald-400"
                    : g.band === "hot" ? "border-l-rose-400"
                    : g.band === "warm" ? "border-l-amber-400"
                    : g.band === "cool" ? "border-l-sky-400"
                    : "border-l-white/20")}>
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium">{g.word}</div>
                      {g.definition && <div className="text-xs opacity-55 mt-1">{g.definition}</div>}
                      {!g.known && <div className="text-xs opacity-55 mt-1">Not in the subject vocabulary.</div>}
                    </div>
                    <div className="text-right shrink-0">
                      {g.known ? (
                        <>
                          <div className="text-sm font-semibold">#{g.rank}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-50">{g.band}</div>
                        </>
                      ) : <div className="text-xs opacity-40">unknown</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- culture desk ---- */}
        {game === "culture" && (
          <div className="mt-6">
            <div className="panel-solid rounded-xl p-5">
              <div className="text-[11px] uppercase tracking-wider opacity-50">Meme of the day</div>
              <div className="text-xl font-semibold mt-1">{puzzle.puzzle.entry.name}</div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">{puzzle.puzzle.entry.year}</span>
                {puzzle.puzzle.entry.aliases.map((a: string) => (
                  <span key={a} className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">{a}</span>
                ))}
              </div>
              <div className="text-sm opacity-75 mt-3"><b>Origin.</b> {puzzle.puzzle.entry.origin}</div>
              <div className="text-sm opacity-75 mt-2"><b>Meaning.</b> {puzzle.puzzle.entry.meaning}</div>
              {puzzle.puzzle.entry.note && (
                <div className="text-sm opacity-60 mt-2 border-l-2 border-violet-400/50 pl-3">{puzzle.puzzle.entry.note}</div>
              )}
            </div>

            <h3 className="text-base font-medium mt-6 mb-2">Three questions</h3>
            {puzzle.puzzle.quiz.map((q: any, qi: number) => (
              <div key={qi} className="panel-solid rounded-xl p-4 mb-2">
                <div className="text-sm">{q.question}</div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  {q.options.map((opt: string, oi: number) => (
                    <button key={oi}
                      onClick={() => setAnswers(a => { const n = [...a]; n[qi] = oi; return n; })}
                      className={"text-sm px-3 py-2 rounded-lg border text-left transition " +
                        (answers[qi] === oi ? "border-violet-400/60 bg-violet-400/10" : "border-white/15 hover:border-white/30")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => submit({ answers })}
              disabled={!!busy || answers.filter(a => a !== undefined).length < puzzle.puzzle.quiz.length}
              className="mt-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm disabled:opacity-40">
              Submit answers
            </button>
          </div>
        )}

        {/* ---- result ---- */}
        {result && (
          <div className={"mt-6 px-4 py-4 rounded-xl border " +
            (result.solved ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>
            <div className="flex items-center gap-2 font-medium">
              {result.solved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {result.solved ? `Solved — ${result.score} points` : "Not solved"}
            </div>
            {result.solved && !result.alreadyRecorded && (
              <div className="text-sm opacity-75 mt-1.5">
                Weekly total {result.weeklyTotal} · rank {result.rank} of {result.players}
                {result.leader && " · you lead the board"}
              </div>
            )}
            {result.message && <div className="text-sm opacity-70 mt-1.5">{result.message}</div>}
          </div>
        )}
      </div>
    );
  }

  /* ---------- open: pick a game ---------- */
  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Gamepad2 size={20} className="opacity-70" /> Fun Zone
          </h1>
          <p className="opacity-55 text-sm mt-1">
            Eleven puzzles a day, the same for everyone, so the board is a fair comparison.
            Open all day — thirty minutes of play, whenever you want them.
          </p>
        </div>
        {w?.open && (
          <span className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 flex items-center gap-1.5">
            <Clock size={12} /> {w.label}
          </span>
        )}
      </div>

      {err && <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      <FunProgress progress={status?.progress} />

      {status && (
        <div className="panel-solid rounded-xl p-4 mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            Daily play budget
            <span className="opacity-50 text-xs ml-2">
              {status.minutesUsed} of {status.budgetMinutes} minutes used
            </span>
          </div>
          <div className="w-40 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-violet-400"
              style={{ width: Math.min(100, (status.minutesUsed / status.budgetMinutes) * 100) + "%" }} />
          </div>
        </div>
      )}

      <motion.div
        variants={stagger(0.035)} initial="hidden" animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {(status?.games || []).map((g: any) => {
          const played = (status?.playedToday || []).includes(g.id);
          const st = GAME_STYLE[g.id] || FALLBACK;
          const Icon = st.icon;
          const best = status?.bestByGame?.[g.id] ?? 0;
          const plays = status?.playsByGame?.[g.id] ?? 0;
          return (
            <motion.button key={g.id} variants={popIn} onClick={() => openGame(g.id)} disabled={!!busy}
              className={"group relative overflow-hidden rounded-2xl p-5 pb-4 text-left border transition-all duration-200 " +
                "bg-gradient-to-br " + st.from + " via-transparent to-transparent " + st.ring + " " +
                "hover:-translate-y-1 hover:shadow-xl " + st.glow + " " +
                "disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"}>

              {/* A soft bloom behind the icon, so the colour reads as light
                  rather than as a flat wash. */}
              <span className={"absolute -top-10 -left-8 w-32 h-32 rounded-full blur-2xl opacity-25 " + st.tile} />

              <div className="relative flex items-start gap-3.5">
                <span className={"w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg " + st.tile}>
                  <Icon size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15px] leading-tight">{g.name}</div>
                  <div className="text-[12.5px] opacity-60 mt-1 leading-snug">{g.blurb}</div>
                </div>
              </div>

              {/* Your record with this game, or an invitation to make one. */}
              <div className="relative flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-[11px]">
                {best > 0 ? (
                  <>
                    <Star size={11} className="text-amber-300 shrink-0" />
                    <span className="opacity-75">Best <b className="opacity-100">{best.toLocaleString()}</b></span>
                    <span className="opacity-35">· {plays} play{plays === 1 ? "" : "s"}</span>
                  </>
                ) : (
                  <span className="opacity-45">Not played yet</span>
                )}
                <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-90 transition">
                  <Play size={10} /> Play
                </span>
              </div>

              {played && (
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center backdrop-blur"
                  title="Played today">
                  <Check size={12} className="text-emerald-200" />
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {busy === "loading" && (
        <div className="mt-5 flex items-center gap-2 text-sm opacity-60">
          <Loader2 size={15} className="animate-spin" /> Loading today's puzzle...
        </div>
      )}

      {board && <FunLeaderboard board={board} onFilter={loadBoard} games={status?.games || []} />}

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        Puzzles are generated from the date, so everyone plays the same one. Solutions are checked on
        the server and never sent to your browser. One scoring run per puzzle per day.
      </p>
    </div>
  );
}
