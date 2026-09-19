"use client";
import { Trophy, Crown, Medal, TrendingUp } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import { spring, springSoft, fade, stagger } from "@/lib/motion";

/* The weekly board.

   A podium for the top three and a list for everyone else. The podium is a
   generic convention - a real one is three physical blocks of different
   heights - not a borrowing from any particular product, and the rest of this
   is built from the portal's own tokens.

   The design choice worth defending: YOUR row is highlighted wherever it
   lands, and the board says how far ahead the person above you is. A
   leaderboard that only celebrates the winner tells everyone else they are
   losing. One that shows a reachable gap tells them what to do next. */

interface Props {
  board: any;
  onFilter: (g?: string) => void;
  games?: { id: string; name: string }[];
}

const PODIUM = [
  { place: 2, h: "h-20", ring: "ring-slate-300/50", bg: "from-slate-400/25", Icon: Medal, tint: "text-slate-200" },
  { place: 1, h: "h-28", ring: "ring-amber-300/60", bg: "from-amber-400/30", Icon: Crown, tint: "text-amber-200" },
  { place: 3, h: "h-14", ring: "ring-orange-400/50", bg: "from-orange-500/25", Icon: Medal, tint: "text-orange-200" },
];

function initials(name: string): string {
  return String(name || "?")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default function FunLeaderboard({ board, onFilter, games = [] }: Props) {
  const reduced = useReducedMotion();
  const rows: any[] = board?.board || [];
  const top = PODIUM.map(p => ({ ...p, row: rows[p.place - 1] })).filter(p => p.row);
  const rest = rows.slice(3);
  const you = rows.find(r => r.isYou);
  const above = you && you.rank > 1 ? rows[you.rank - 2] : null;

  const filters = [{ id: "", name: "All games" }, ...games.slice(0, 5)];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Trophy size={17} className="opacity-70" /> This week
        </h2>
        <span className="text-xs opacity-45">{board.week} · {board.players} player(s)</span>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {filters.map(f => (
          <button key={f.id || "all"} onClick={() => onFilter(f.id || undefined)}
            className={"text-xs px-3 py-1.5 rounded-full border transition " +
              (board.game === (f.id || "all")
                ? "border-[var(--border-strong)] bg-[var(--panel)]"
                : "border-[var(--border)] hover:border-[var(--border-strong)] opacity-70")}>
            {f.name}
          </button>
        ))}
      </div>

      {!rows.length ? (
        <div className="panel-solid rounded-2xl p-8 mt-4 text-center">
          <Trophy size={24} className="mx-auto opacity-30" />
          <p className="text-sm opacity-55 mt-3">Nobody has scored this week yet. Be first.</p>
        </div>
      ) : (
        <>
          {/* ---------- podium ---------- */}
          {/* The blocks grow up from the floor, second and third before first,
              so the winner's block is the last thing to finish rising. That is
              what a podium reveal does, and it costs one delay value. */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 mt-6 px-2">
            {top.map(({ place, h, ring, bg, Icon, tint, row }) => {
              const order = place === 1 ? 2 : place === 2 ? 0 : 1;
              return (
                <div key={place} className="flex-1 max-w-[9rem] flex flex-col items-center">
                  <motion.div
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 10 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                    transition={reduced ? fade : { ...spring, delay: 0.35 + order * 0.12 }}
                    className={"relative w-14 h-14 rounded-full ring-2 " + ring +
                      " bg-gradient-to-br " + bg + " to-transparent flex items-center justify-center"}>
                    <span className="text-sm font-semibold">{initials(row.name)}</span>
                    {place === 1 && (
                      <motion.span
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, rotate: -18 }}
                        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
                        transition={reduced ? fade : { ...spring, delay: 0.72 }}
                        className="absolute -top-4">
                        <Crown size={15} className="text-amber-300" />
                      </motion.span>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ ...fade, delay: 0.4 + order * 0.12 }}
                    className="text-xs font-medium mt-2 text-center truncate w-full px-1">
                    {row.isYou ? "You" : row.name}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ ...fade, delay: 0.45 + order * 0.12 }}
                    className={"text-[11px] tabular " + tint}>
                    {row.total.toLocaleString()}
                  </motion.div>

                  <motion.div
                    initial={reduced ? { opacity: 0 } : { scaleY: 0, opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { scaleY: 1, opacity: 1 }}
                    transition={reduced ? fade : { ...springSoft, delay: order * 0.12 }}
                    style={{ originY: 1 }}
                    className={"w-full mt-2 rounded-t-xl bg-gradient-to-t " + bg +
                      " to-transparent border-t border-x border-[var(--border)] flex items-start justify-center pt-2 " + h}>
                    <span className="text-xl font-semibold opacity-80">{place}</span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* ---------- the gap that matters ---------- */}
          {you && above && (
            <div className="panel-solid rounded-xl px-4 py-3 mt-4 text-sm flex items-center gap-2 flex-wrap">
              <TrendingUp size={14} className="text-emerald-400 shrink-0" />
              <span>
                You are <b>#{you.rank}</b>.{" "}
                <b>{(above.total - you.total).toLocaleString()}</b> points behind{" "}
                {above.isYou ? "yourself" : above.name}.
              </span>
            </div>
          )}

          {/* ---------- everyone else ---------- */}
          {!!rest.length && (
            <LayoutGroup>
            <motion.div variants={stagger(0.03, 0.5)} initial="hidden" animate="show"
              className="space-y-1.5 mt-4">
              <AnimatePresence initial={false}>
              {rest.map((r: any) => (
                <motion.div key={r.userId}
                  layout={!reduced}
                  variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={reduced ? fade : spring}
                  className={"rounded-xl px-4 py-2.5 flex items-center gap-3 border transition-colors " +
                    (r.isYou
                      ? "border-brand/50 bg-brand/10"
                      : "border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-raised)]")}>
                  <span className="text-xs opacity-40 w-6 shrink-0">#{r.rank}</span>
                  <span className="w-8 h-8 rounded-full bg-[var(--panel)] flex items-center justify-center text-[11px] shrink-0">
                    {initials(r.name)}
                  </span>
                  <span className="flex-1 text-sm truncate">
                    {r.isYou ? "You" : r.name}
                    <span className="text-[11px] opacity-40 ml-2">{r.plays} play{r.plays === 1 ? "" : "s"}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{r.total.toLocaleString()}</span>
                </motion.div>
              ))}
              </AnimatePresence>
            </motion.div>
            </LayoutGroup>
          )}

          {you && you.rank > 3 && !rest.some((r: any) => r.isYou) && (
            <p className="text-xs opacity-45 mt-3">
              You are #{you.rank} with {you.total.toLocaleString()} points.
            </p>
          )}
        </>
      )}
    </div>
  );
}
