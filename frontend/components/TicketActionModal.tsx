"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface TicketAction { mode: "escalate" | "resolve"; recipient: string; solution: string; }

export default function TicketActionModal({
  open, mode, ticketCode, escalateOptions, resolveOptions, onClose, onConfirm,
}: {
  open: boolean;
  mode: "escalate" | "resolve";
  ticketCode: string;
  escalateOptions: string[];
  resolveOptions: string[];
  onClose: () => void;
  onConfirm: (a: TicketAction) => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [solution, setSolution] = useState("");
  const [err, setErr] = useState("");
  const opts = mode === "escalate" ? escalateOptions : resolveOptions;

  const confirm = () => {
    if (mode === "resolve" && !solution.trim()) { setErr("Please write the solution first."); return; }
    if (!recipient) { setErr("Please choose a recipient."); return; }
    onConfirm({ mode, recipient, solution: solution.trim() });
    setSolution(""); setRecipient(""); setErr("");
  };
  const close = () => { setSolution(""); setRecipient(""); setErr(""); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={close}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-2xl border border-[var(--border)] shadow-2xl" style={{ background: "var(--bg)" }}>
            <div className="flex items-center justify-between mb-4">
              <b>{mode === "escalate" ? "Escalate" : "Resolve"} - {ticketCode}</b>
              <button onClick={close}><X size={18} /></button>
            </div>
            {mode === "resolve" && (
              <div className="mb-4">
                <label className="text-xs text-[var(--muted)]">Solution / Response</label>
                <textarea value={solution} onChange={(e) => setSolution(e.target.value)}
                  placeholder="Write the resolution details for this query..."
                  className="w-full mt-1 glass px-3 py-2 bg-transparent outline-none text-sm h-24" />
              </div>
            )}
            <div className="mb-4">
              <label className="text-xs text-[var(--muted)]">{mode === "escalate" ? "Escalate to" : "Send solution to"}</label>
              <select value={recipient} onChange={(e) => setRecipient(e.target.value)}
                className="w-full mt-1 glass px-3 py-2 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
                <option value="" style={{ color: "#111" }}>Select...</option>
                {opts.map((o) => <option key={o} value={o} style={{ color: "#111" }}>{o}</option>)}
              </select>
            </div>
            {err && <p className="text-rose-400 text-xs mb-3">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={close} className="px-4 py-2 rounded-full glass text-sm">Cancel</button>
              <button onClick={confirm} className="px-4 py-2 rounded-full bg-brand text-white text-sm">Confirm</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
