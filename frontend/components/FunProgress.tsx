"use client";
import { Flame, Trophy, Lock, Sparkles, AlertTriangle } from "lucide-react";

/* The progression strip: level, streak, badges.

   One idea runs through the presentation, and it is worth defending: a
   leaderboard rewards being the best, and a leaderboard is exactly what makes
   a student who is not the best stop playing. So the streak sits FIRST and
   largest, badges show progress toward the ones not yet earned, and the level
   curve is one everyone advances along.

   Showing up is the behaviour worth reinforcing. Winning already rewards
   itself. */

interface Props { progress: any }

export default function FunProgress({ progress }: Props) {
  if (!progress) return null;
  const { level, streak, badges, solved, gamesTried } = progress;
  const earned = badges.filter((b: any) => b.earned);
  const next = badges
    .filter((b: any) => !b.earned && typeof b.progress === "number")
    .sort((a: any, b: any) => b.progress - a.progress)
    .slice(0, 3);

  return (
    <div className="grid md:grid-cols-3 gap-3 mt-5">

      {/* ---------- streak, first and largest ---------- */}
      <div className={"rounded-xl p-4 border " +
        (streak.current > 0
          ? "border-orange-400/40 bg-gradient-to-br from-orange-500/[0.14] to-transparent"
          : "panel-solid")}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-55">
          <Flame size={13} className={streak.current > 0 ? "text-orange-400" : ""} />
          Streak
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-semibold">{streak.current}</span>
          <span className="text-sm opacity-55">day{streak.current === 1 ? "" : "s"}</span>
        </div>

        {streak.atRisk ? (
          <div className="flex items-start gap-1.5 text-xs text-amber-300 mt-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>Play today to keep it. One more missed day and it resets.</span>
          </div>
        ) : streak.playedToday ? (
          <p className="text-xs opacity-55 mt-2">
            Counted for today. Come back tomorrow.
          </p>
        ) : (
          <p className="text-xs opacity-55 mt-2">
            Play any puzzle to start one. Miss a day and you get one day's grace.
          </p>
        )}

        {streak.best > streak.current && (
          <p className="text-[11px] opacity-40 mt-2">Your best run: {streak.best} days</p>
        )}
      </div>

      {/* ---------- level ---------- */}
      <div className="panel-solid rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-55">
          <Sparkles size={13} /> Level {level.level.n}
        </div>
        <div className="text-2xl font-semibold mt-2">{level.level.title}</div>

        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-violet-400 to-sky-400 transition-all duration-700"
            style={{ width: level.percent + "%" }} />
        </div>

        <p className="text-[11px] opacity-45 mt-2">
          {level.next
            ? <>{level.points.toLocaleString()} points · {(level.next.at - level.points).toLocaleString()} to {level.next.title}</>
            : <>{level.points.toLocaleString()} points · top level</>}
        </p>
      </div>

      {/* ---------- what you have done ---------- */}
      <div className="panel-solid rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-55">
          <Trophy size={13} /> Badges
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-semibold">{earned.length}</span>
          <span className="text-sm opacity-55">of {badges.length}</span>
        </div>
        <p className="text-[11px] opacity-45 mt-2">
          {solved} puzzle{solved === 1 ? "" : "s"} solved · {gamesTried} game{gamesTried === 1 ? "" : "s"} tried
        </p>
      </div>

      {/* ---------- the badge shelf ---------- */}
      <div className="md:col-span-3 panel-solid rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {badges.map((b: any) => (
            <span key={b.id} title={b.note ? `${b.how} — ${b.note}` : b.how}
              className={"text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 " +
                (b.earned
                  ? "border-amber-400/45 bg-amber-400/10 text-amber-200"
                  : "border-white/10 opacity-45")}>
              {b.earned ? <Trophy size={11} /> : <Lock size={11} />}
              {b.name}
              {!b.earned && typeof b.progress === "number" && b.progress > 0 && (
                <span className="opacity-60">{b.progress}%</span>
              )}
            </span>
          ))}
        </div>

        {!!next.length && (
          <p className="text-[11px] opacity-45 mt-3">
            Closest: {next.map((b: any) => `${b.name} (${b.progress}%)`).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
