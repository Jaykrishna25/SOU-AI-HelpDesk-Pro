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

/** A progress ring. Pure SVG - no chart library for one circle. */
function Ring({ percent, label }: { percent: number; label: string }) {
  const R = 26, C = 2 * Math.PI * R;
  const shown = Math.max(0, Math.min(100, percent));
  return (
    <svg width="66" height="66" viewBox="0 0 66 66" className="shrink-0">
      <circle cx="33" cy="33" r={R} fill="none" stroke="currentColor"
        strokeWidth="6" className="text-white/10" />
      <circle cx="33" cy="33" r={R} fill="none" stroke="url(#ringGrad)"
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C - (C * shown) / 100}
        transform="rotate(-90 33 33)"
        style={{ transition: "stroke-dashoffset .8s ease" }} />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <text x="33" y="33" textAnchor="middle" dominantBaseline="central"
        className="fill-current text-[17px] font-semibold">{label}</text>
    </svg>
  );
}

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
      <div className={"rounded-2xl p-4 border " +
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

      {/* ---------- level, as a ring ----------
           A ring rather than a bar: it reads as a single glanceable state, and
           it leaves room for the number that matters in the middle. */}
      <div className="rounded-2xl p-4 border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] to-transparent">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-55">
          <Sparkles size={13} /> Level
        </div>

        <div className="flex items-center gap-4 mt-2">
          <Ring percent={level.percent} label={String(level.level.n)} />
          <div className="min-w-0">
            <div className="text-xl font-semibold leading-tight truncate">{level.level.title}</div>
            <p className="text-[11px] opacity-45 mt-1">
              {level.points.toLocaleString()} points
            </p>
            <p className="text-[11px] opacity-60 mt-0.5">
              {level.next
                ? <>{(level.next.at - level.points).toLocaleString()} to <b>{level.next.title}</b></>
                : <>Top level reached</>}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- what you have done ---------- */}
      <div className="rounded-2xl p-4 border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.12] to-transparent">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-55">
          <Trophy size={13} className="text-amber-300" /> Badges
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-semibold">{earned.length}</span>
          <span className="text-sm opacity-55">of {badges.length}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
          <div className="h-full bg-amber-400 transition-all duration-700"
            style={{ width: Math.round((earned.length / badges.length) * 100) + "%" }} />
        </div>
        <p className="text-[11px] opacity-45 mt-2">
          {solved} puzzle{solved === 1 ? "" : "s"} solved · {gamesTried} game{gamesTried === 1 ? "" : "s"} tried
        </p>
      </div>

      {/* ---------- the badge shelf ----------
           Unearned badges show a progress bar rather than just a lock. A lock
           says "no"; a bar at 60% says "keep going", which is the whole
           difference between a trophy cabinet and something worth chasing. */}
      <div className="md:col-span-3 panel-solid rounded-2xl p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {badges.map((b: any) => (
            <div key={b.id} title={b.note ? `${b.how} — ${b.note}` : b.how}
              className={"rounded-xl px-3 py-2.5 border transition " +
                (b.earned
                  ? "border-amber-400/40 bg-amber-400/[0.09]"
                  : "border-white/8 bg-white/[0.02]")}>
              <div className="flex items-center gap-1.5">
                {b.earned
                  ? <Trophy size={12} className="text-amber-300 shrink-0" />
                  : <Lock size={12} className="opacity-35 shrink-0" />}
                <span className={"text-xs font-medium truncate " + (b.earned ? "text-amber-100" : "opacity-60")}>
                  {b.name}
                </span>
              </div>
              <div className="text-[10px] opacity-40 mt-1 leading-snug line-clamp-2">{b.how}</div>
              {!b.earned && typeof b.progress === "number" && (
                <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden mt-2">
                  <div className="h-full bg-white/35 transition-all duration-700"
                    style={{ width: b.progress + "%" }} />
                </div>
              )}
            </div>
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
