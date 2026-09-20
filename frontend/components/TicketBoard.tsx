"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Send, ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { statusColor, escalateBatch, type Ticket } from "@/lib/tickets";
import {
  buildBoard, batchProblem, actionable, skippable, batchNote, type StudentGroup,
} from "@/lib/ticket-board";

/* ============================================================
   The admin ticket board.

   Columns are subject-matter desks; inside each, one card per
   student holding everything that student has raised in that
   desk's area. The unit an admin acts on is a person, which is
   the whole change — the old screen was a flat list of rows and
   an admin escalating four tickets from one student sent that
   student four separate emails.

   The selection is deliberately scoped to a single card. There
   is no "select all" across students, because the one action
   this board performs writes ONE note and sends ONE message,
   and a message about several students would name each of them
   to the others. lib/ticket-board.ts refuses such a batch and
   so does the server; the UI simply never offers it.
   ============================================================ */

const RECIPIENTS = ["Faculty", "HOD", "HOI", "Owner"];
const stageOf: Record<string, string> = { Faculty: "FACULTY", HOD: "HOD", HOI: "HOI", Owner: "OWNER" };

function waitingDays(ms: number): number {
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

function GroupCard({ group }: { group: StudentGroup }) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<string[]>(() => actionable(group.tickets).map(t => t.code));
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  const selected = group.tickets.filter(t => picked.includes(t.code));
  const problem = batchProblem(selected, recipient);
  const willSkip = skippable(selected);
  const waited = waitingDays(group.oldestAt);

  const toggle = (code: string) =>
    setPicked(p => (p.includes(code) ? p.filter(c => c !== code) : [...p, code]));

  async function send() {
    const stage = stageOf[recipient];
    if (!stage) { setMsg({ kind: "err", text: "Choose who this should go to." }); return; }
    setBusy(true); setMsg(null);
    const note = batchNote(selected, recipient);
    const r = await escalateBatch(actionable(selected).map(t => t.code), stage, recipient, note);
    setBusy(false);
    setMsg(r.ok
      ? { kind: "ok", text: "Sent " + r.escalated.length + " to " + recipient + " as one message." }
      : { kind: "err", text: r.error || "Could not send." });
    if (r.ok) setPicked([]);
  }

  return (
    <div className="panel-solid rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-brand/5">
        {open ? <ChevronDown size={14} className="shrink-0 text-[var(--muted)]" />
              : <ChevronRight size={14} className="shrink-0 text-[var(--muted)]" />}
        <span className="text-sm font-medium truncate">{group.creator}</span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          {waited >= 3 && (
            <span title={"Oldest query waiting " + waited + " days"}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400/50 text-amber-200 bg-amber-400/10 flex items-center gap-1">
              <Clock size={9} /> {waited}d
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--panel)] text-[var(--muted)]">
            {group.openCount} open / {group.tickets.length}
          </span>
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {group.tickets.map(t => {
            const settled = t.status === "Resolved" || t.status === "Closed";
            return (
              <label key={t.code}
                className={"flex items-start gap-2 text-xs rounded-lg px-2 py-1.5 " +
                  (settled ? "opacity-50" : "hover:bg-brand/5 cursor-pointer")}>
                <input type="checkbox" checked={picked.includes(t.code)} disabled={settled}
                  onChange={() => toggle(t.code)} className="mt-0.5 accent-current" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.subject}</span>
                  <span className="text-[10px] text-[var(--muted)]">{t.code}</span>
                </span>
                <span className={"text-[10px] px-1.5 py-0.5 rounded-full shrink-0 " + statusColor(t.status)}>
                  {t.status}
                </span>
              </label>
            );
          })}

          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <select value={recipient} onChange={e => { setRecipient(e.target.value); setMsg(null); }}
              className="w-full glass px-2 py-1.5 bg-transparent outline-none text-xs"
              style={{ color: "var(--text)" }}>
              <option value="" style={{ color: "#111" }}>Escalate all selected to...</option>
              {RECIPIENTS.map(r => <option key={r} value={r} style={{ color: "#111" }}>{r}</option>)}
            </select>

            {/* Said before the click, not after: an admin who selected a whole
                card should know what the action will leave alone. */}
            {willSkip.length > 0 && (
              <p className="text-[10px] text-[var(--muted)]">
                {willSkip.length} already resolved and will be left as they are.
              </p>
            )}

            <button onClick={send} disabled={busy || !!problem}
              title={problem || undefined}
              className="w-full py-2 rounded-lg bg-brand text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-brand-light transition">
              <Send size={12} />
              {busy ? "Sending..."
                : "Send " + actionable(selected).length + " together"}
            </button>

            {problem && !msg && (
              <p className="text-[10px] text-[var(--muted)] flex items-start gap-1">
                <AlertTriangle size={10} className="mt-0.5 shrink-0" /> {problem}
              </p>
            )}
            {msg && (
              <p className={"text-[10px] flex items-start gap-1 " +
                (msg.kind === "ok" ? "text-emerald-300" : "text-rose-300")}>
                {msg.kind === "ok" ? <CheckCircle2 size={10} className="mt-0.5 shrink-0" />
                                   : <AlertTriangle size={10} className="mt-0.5 shrink-0" />}
                {msg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketBoard({ tickets }: { tickets: Ticket[] }) {
  const board = useMemo(() => buildBoard(tickets), [tickets]);
  const total = tickets.length;

  if (!total) {
    return (
      <div className="panel-solid rounded-xl p-8 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={28} />
        <p className="text-sm">Nothing in the queue.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[var(--muted)] mb-3">
        Grouped by student within each desk. Selecting a card and sending escalates that
        student&apos;s queries as one message, not one message each. A batch cannot span two
        students.
      </p>

      {/* Horizontal on a desktop, stacked on a phone - an admin on a phone
          should not be swiping sideways through seven columns. */}
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x md:snap-none flex-col md:flex-row">
        {board.map((col, i) => (
          <motion.section key={col.key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="md:w-72 md:shrink-0 snap-start">
            <div className="flex items-baseline gap-2 mb-2 px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-[10px] text-[var(--muted)]">{col.ticketCount}</span>
            </div>

            <div className="space-y-2">
              {col.groups.length === 0
                ? <p className="text-[11px] text-[var(--muted)] px-1 py-3">Nothing here.</p>
                : col.groups.map(g => <GroupCard key={col.key + g.creator} group={g} />)}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
