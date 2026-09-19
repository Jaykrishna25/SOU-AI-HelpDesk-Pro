"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Gamepad2, Trophy, Clock, Lock, Loader2, CheckCircle2, XCircle, Play, RotateCcw,
} from "lucide-react";
import FunCodeGames from "@/components/FunCodeGames";
import FunProgress from "@/components/FunProgress";

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
        {board && <Leaderboard board={board} onFilter={loadBoard} />}
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

      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        {(status?.games || []).map((g: any) => {
          const played = (status?.playedToday || []).includes(g.id);
          return (
            <button key={g.id} onClick={() => openGame(g.id)} disabled={!!busy}
              className="panel-solid rounded-xl p-5 text-left hover:border-white/25 transition disabled:opacity-50">
              <div className="font-medium flex items-center gap-2">
                {g.name}
                {played && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300">played</span>}
              </div>
              <div className="text-sm opacity-55 mt-1.5">{g.blurb}</div>
            </button>
          );
        })}
      </div>

      {busy === "loading" && (
        <div className="mt-5 flex items-center gap-2 text-sm opacity-60">
          <Loader2 size={15} className="animate-spin" /> Loading today's puzzle...
        </div>
      )}

      {board && <Leaderboard board={board} onFilter={loadBoard} />}

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        Puzzles are generated from the date, so everyone plays the same one. Solutions are checked on
        the server and never sent to your browser. One scoring run per puzzle per day.
      </p>
    </div>
  );
}

function Leaderboard({ board, onFilter }: { board: any; onFilter: (g?: string) => void }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Trophy size={17} className="opacity-70" /> This week
        </h2>
        <span className="text-xs opacity-45">{board.week} · {board.players} player(s)</span>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {[["", "All games"], ["grid", "Mini Grid"], ["scramble", "Scramble"], ["sequence", "Sequence"]].map(([id, label]) => (
          <button key={label} onClick={() => onFilter(id || undefined)}
            className={"text-xs px-3 py-1.5 rounded-lg border " +
              (board.game === (id || "all") ? "border-white/40 bg-white/10" : "border-white/15 hover:border-white/30")}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 mt-4">
        {!board.board.length && (
          <div className="panel-solid rounded-xl p-5 text-sm opacity-55">
            Nobody has scored this week yet. Be first.
          </div>
        )}
        {board.board.map((r: any) => (
          <div key={r.userId}
            className={"panel-solid rounded-xl p-3 flex items-center justify-between gap-3 " +
              (r.isYou ? "border-violet-400/50" : "")}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={"w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-semibold " +
                (r.rank === 1 ? "bg-amber-400/20 text-amber-300"
                  : r.rank === 2 ? "bg-white/15"
                  : r.rank === 3 ? "bg-orange-400/15 text-orange-300" : "bg-white/5 opacity-60")}>
                {r.rank}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {r.name}{r.isYou && <span className="text-[10px] ml-2 opacity-60">you</span>}
                </div>
                <div className="text-[11px] opacity-45">{r.role} · {r.plays} puzzle(s)</div>
              </div>
            </div>
            <div className="text-sm font-semibold">{r.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
