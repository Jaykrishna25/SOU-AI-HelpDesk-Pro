"use client";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, CheckCircle2, XCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Undo2, Play, GripVertical,
} from "lucide-react";

/* The six code games.

   Split out of FunPanel because that file was already 500 lines and six games
   in one component is how a file becomes unreadable.

   Every one of these follows the same contract as the original five: the
   solution is not in `puzzle`, the client posts an attempt, and the server
   decides. Nothing here checks an answer locally — the checking that looks
   like it happens in this file (typing accuracy, the robot preview) is for
   feedback while playing, and the score comes from the server's own run.

   None of them executes code. Predict the Output is multiple choice and Robot
   Path has a four-command vocabulary, precisely so nothing a student types is
   ever run. A lunch-break game is not worth an RCE. */

type Submit = (payload: any) => void;

interface Props {
  game: string;
  puzzle: any;
  result: any;
  busy: string;
  onSubmit: Submit;
}

export default function FunCodeGames({ game, puzzle, result, busy, onSubmit }: Props) {
  if (game === "typing") return <Typing p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  if (game === "jumble") return <Jumble p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  if (game === "debug") return <Debug p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  if (game === "output") return <Output p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  if (game === "robot") return <Robot p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  if (game === "semantic") return <Semantic p={puzzle.puzzle} result={result} busy={busy} onSubmit={onSubmit} />;
  return null;
}

const CODE = "font-mono text-[13px] leading-relaxed whitespace-pre";

/* ============================ typing sprint ============================ */

function Typing({ p, result, busy, onSubmit }: any) {
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const target: string = p.text;
  const done = typed.length >= target.length;

  // Live accuracy, for feedback only. The score comes from the server.
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        Type this exactly. <b>{p.lang}</b> · accuracy must reach 90% to score, so
        speed alone will not do it.
      </p>

      <div className={"panel-solid rounded-lg p-4 " + CODE}>
        {target.split("").map((ch, i) => {
          const t = typed[i];
          const cls = t === undefined ? "opacity-45"
            : t === ch ? "text-emerald-300"
            : "text-rose-300 bg-rose-500/20";
          return <span key={i} className={cls}>{ch === "\n" ? "↵\n" : ch}</span>;
        })}
      </div>

      <textarea
        ref={ref}
        value={typed}
        disabled={!!result}
        onChange={e => { if (started === null) setStarted(Date.now()); setTyped(e.target.value); }}
        spellCheck={false}
        rows={4}
        className={"w-full mt-3 bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--border-strong)] " + CODE}
        placeholder="Start typing…"
      />

      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="opacity-55">{typed.length} / {target.length}</span>
        <span className={acc >= 90 ? "text-emerald-300" : "text-amber-300"}>{acc}% accurate</span>
        <button
          onClick={() => onSubmit({ typed })}
          disabled={!!busy || !!result || typed.length < target.length * 0.5}
          className="ml-auto text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : done ? "Submit" : "Submit anyway"}
        </button>
      </div>

      {result?.detail && (
        <div className="mt-4 panel-solid rounded-lg p-4 text-sm">
          <b>{result.detail.wpm} wpm</b> at <b>{result.detail.accuracy}%</b> accuracy.
          {result.detail.accuracy < 90 && (
            <span className="opacity-60"> Below 90% does not score — typing code fast and
              wrongly is not a skill.</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================== jumble programming ========================== */

function Jumble({ p, result, busy, onSubmit }: any) {
  const [lines, setLines] = useState<string[]>(p.lines);
  const [showHint, setShowHint] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    setLines(next);
  }

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        <b>{p.title}</b> — these lines are shuffled. Put them back in order.
        Indentation is already correct, so this is about logic, not whitespace.
      </p>

      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={l + i} className="flex items-center gap-2 panel-solid rounded-lg px-3 py-2">
            <GripVertical size={13} className="opacity-25 shrink-0" />
            <code className={"flex-1 " + CODE}>{l}</code>
            <button onClick={() => move(i, -1)} disabled={i === 0 || !!result}
              className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-15">
              <ArrowUp size={13} />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === lines.length - 1 || !!result}
              className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-15">
              <ArrowDown size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button onClick={() => setShowHint(true)} disabled={showHint}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] disabled:opacity-40">
          Hint
        </button>
        {showHint && <span className="text-xs opacity-60">{p.hint}</span>}
        <button onClick={() => onSubmit({ order: lines })} disabled={!!busy || !!result}
          className="ml-auto text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Check the order"}
        </button>
      </div>
    </div>
  );
}

/* ================================ debug it ================================ */

function Debug({ p, result, busy, onSubmit }: any) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = !!result?.detail;

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        <b>{p.title}</b> ({p.lang}) — exactly one line has a bug. Click it.
        It is a logic bug, not a typo.
      </p>

      <div className="panel-solid rounded-lg overflow-hidden">
        {p.lines.map((l: string, i: number) => {
          const isAnswer = answered && i === result.detail.buggyLine;
          const isWrongPick = answered && i === picked && !isAnswer;
          return (
            <button key={i} onClick={() => !answered && setPicked(i)} disabled={answered}
              className={"w-full text-left flex gap-3 px-3 py-1.5 transition " +
                (isAnswer ? "bg-emerald-500/20"
                  : isWrongPick ? "bg-rose-500/20"
                  : picked === i ? "bg-brand/20"
                  : "hover:bg-[var(--panel)]")}>
              <span className="opacity-30 text-[11px] w-5 text-right shrink-0 pt-0.5">{i + 1}</span>
              <code className={CODE}>{l}</code>
            </button>
          );
        })}
      </div>

      {!answered ? (
        <button onClick={() => onSubmit({ line: picked })} disabled={!!busy || picked === null}
          className="mt-4 text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "That is the bug"}
        </button>
      ) : (
        <div className="mt-4 panel-solid rounded-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            {result.solved
              ? <><CheckCircle2 size={15} className="text-emerald-400" /> Correct</>
              : <><XCircle size={15} className="text-rose-400" /> Line {result.detail.buggyLine + 1} was the bug</>}
          </div>
          <p className="opacity-70 mt-2">{result.detail.explanation}</p>
          <code className={"block mt-2 text-emerald-300 " + CODE}>{result.detail.fixed}</code>
        </div>
      )}
    </div>
  );
}

/* =========================== predict the output =========================== */

function Output({ p, result, busy, onSubmit }: any) {
  const [choice, setChoice] = useState<number | null>(null);
  const answered = !!result?.detail;

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        What does this <b>{p.lang}</b> print? Some of these are traps — read carefully.
      </p>

      <pre className={"panel-solid rounded-lg p-4 " + CODE}>{p.code}</pre>

      <div className="grid sm:grid-cols-2 gap-2 mt-4">
        {p.options.map((o: string, i: number) => {
          const isAnswer = answered && i === result.detail.answerIndex;
          const isWrongPick = answered && i === choice && !isAnswer;
          return (
            <button key={i} onClick={() => !answered && setChoice(i)} disabled={answered}
              className={"text-left px-4 py-2.5 rounded-lg border transition " + CODE + " " +
                (isAnswer ? "border-emerald-500/50 bg-emerald-500/15"
                  : isWrongPick ? "border-rose-500/50 bg-rose-500/15"
                  : choice === i ? "border-brand/60 bg-brand/15"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]")}>
              {o}
            </button>
          );
        })}
      </div>

      {!answered ? (
        <button onClick={() => onSubmit({ choice })} disabled={!!busy || choice === null}
          className="mt-4 text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Submit"}
        </button>
      ) : (
        <div className="mt-4 panel-solid rounded-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            {result.solved
              ? <><CheckCircle2 size={15} className="text-emerald-400" /> Correct</>
              : <><XCircle size={15} className="text-rose-400" /> Not quite</>}
          </div>
          <p className="opacity-70 mt-2">{result.detail.explanation}</p>
        </div>
      )}
    </div>
  );
}

/* ============================== robot path ============================== */

const CMDS = [
  { id: "up", icon: ArrowUp }, { id: "left", icon: ArrowLeft },
  { id: "down", icon: ArrowDown }, { id: "right", icon: ArrowRight },
] as const;

function Robot({ p, result, busy, onSubmit }: any) {
  const [cmds, setCmds] = useState<string[]>([]);
  const grid: string[] = p.grid;
  const path: [number, number][] | undefined = result?.detail?.path;
  const visited = new Set((path || []).map(([r, c]) => `${r},${c}`));

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        Build a sequence of moves to reach <b>G</b>. Walls stop the robot.
        Coins (<span className="text-amber-300">*</span>) are optional and worth more
        than finishing quickly. Optimal route is <b>{p.par} moves</b>.
      </p>

      <div className="inline-block panel-solid rounded-lg p-3">
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.split("").map((cell, c) => {
              const on = visited.has(`${r},${c}`);
              return (
                <div key={c}
                  className={"w-9 h-9 m-0.5 rounded flex items-center justify-center text-xs font-mono " +
                    (cell === "#" ? "bg-[var(--panel-raised)]"
                      : cell === "G" ? "bg-emerald-500/30 text-emerald-200"
                      : cell === "S" ? "bg-brand/30 text-white"
                      : cell === "*" ? "bg-amber-500/20 text-amber-300"
                      : on ? "bg-sky-500/25" : "bg-[var(--panel)]")}>
                  {cell === "." ? "" : cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        {CMDS.map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => setCmds(c => [...c, id])} disabled={!!result}
            className="p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] disabled:opacity-40">
            <Icon size={15} />
          </button>
        ))}
        <button onClick={() => setCmds(c => c.slice(0, -1))} disabled={!cmds.length || !!result}
          title="Undo the last move"
          className="p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] disabled:opacity-40">
          <Undo2 size={15} />
        </button>
        <button onClick={() => onSubmit({ commands: cmds })} disabled={!!busy || !cmds.length || !!result}
          className="ml-auto text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40 flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
        </button>
      </div>

      <div className="mt-3 text-xs opacity-55 min-h-[1.2rem]">
        {cmds.length ? `${cmds.length} move(s): ${cmds.join(" → ")}` : "No moves yet."}
      </div>

      {result?.detail && (
        <div className="mt-3 panel-solid rounded-lg p-4 text-sm">
          {result.solved ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              Reached the goal in {result.detail.steps} moves
              {result.detail.coins > 0 && <> · {result.detail.coins} coin(s)</>}
              {result.detail.steps === result.detail.par && <> · optimal</>}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <XCircle size={15} className="text-rose-400" />
              {result.detail.failed === "wall" ? "Walked into a wall"
                : result.detail.failed === "offgrid" ? "Walked off the grid"
                : "Ran out of moves before reaching the goal"} after {result.detail.steps}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ semantic match ============================ */

function Semantic({ p, result, busy, onSubmit }: any) {
  const terms: { term: string; subject: string }[] = p.terms;
  const [guesses, setGuesses] = useState<string[]>(() => terms.map(() => ""));
  const answered = !!result?.detail;

  return (
    <div className="mt-6">
      <p className="text-sm opacity-60 mb-3">
        For each term, type one word that belongs with it — a mechanism, a
        consequence, a related idea. Spelling is forgiving; the association is
        what counts.
      </p>

      <div className="space-y-2">
        {terms.map((t, i) => (
          <div key={t.term} className="panel-solid rounded-lg p-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-[9rem]">
              <div className="text-sm font-medium">{t.term}</div>
              <div className="text-[11px] opacity-45">{t.subject}</div>
            </div>
            <input
              value={guesses[i]}
              disabled={answered}
              onChange={e => setGuesses(g => g.map((x, j) => j === i ? e.target.value : x))}
              placeholder="a related word"
              className="flex-1 min-w-[8rem] bg-transparent border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--border-strong)] disabled:opacity-60"
            />
            {answered && (
              <span className="text-xs opacity-60">
                e.g. {result.detail.answers[i]?.accepts.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>

      {!answered ? (
        <button onClick={() => onSubmit({ guesses })}
          disabled={!!busy || guesses.every(g => !g.trim())}
          className="mt-4 text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Check my answers"}
        </button>
      ) : (
        <div className="mt-4 panel-solid rounded-lg p-4 text-sm">
          Cleared <b>{result.detail.cleared}</b> of {result.detail.total}.
          {result.detail.cleared === result.detail.total && " All of them — bonus awarded."}
        </div>
      )}
    </div>
  );
}
