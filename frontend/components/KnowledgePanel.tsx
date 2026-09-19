"use client";
import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

/* Re-ingest the knowledge base.

   OakMitra answers from embedded chunks in the database, not from
   lib/kb-content.ts directly. So editing that file changes nothing until the
   documents are embedded again - a deploy alone does not do it.

   Before this panel existed the only way to trigger that was to POST to
   /api/ai/ingest with an owner token pasted onto a command line. That is a bad
   arrangement: it is easy to forget, it makes the knowledge base feel
   untouchable to the staff who actually know the content, and every time
   someone copies a token out of the browser it is one screenshot away from
   being public. The button uses the session already in the browser.

   Restricted to criteria.configure - HOI, Owner, Super Admin - because
   re-ingestion rewrites what the assistant tells every student. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

export default function KnowledgePanel() {
  const [status, setStatus] = useState<{ chunks?: number; configured?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadStatus() {
    try {
      const r = await fetch("/api/ai/status");
      if (r.ok) setStatus(await r.json());
    } catch { /* leave null; the panel still renders */ }
  }

  useEffect(() => { loadStatus(); }, []);

  async function reingest() {
    setBusy(true); setMsg(""); setErr("");
    try {
      const r = await fetch("/api/ai/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Ingestion failed");
      setMsg(`Embedded ${d.upserted} chunk(s) from ${d.total} document(s).`);
      await loadStatus();
    } catch (e: any) {
      setErr(String(e?.message || e).slice(0, 200));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-solid rounded-xl p-5">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="opacity-70" />
        <h3 className="font-medium">Knowledge base</h3>
        <span className="ml-auto text-xs opacity-55">
          {status?.chunks != null ? `${status.chunks} active chunk(s)` : "—"}
        </span>
      </div>

      <p className="text-sm opacity-60 mt-2">
        OakMitra answers from embedded copies of the university documents, not from the
        source file. After the documents change, re-embed them here — deploying alone
        does not update what the assistant says.
      </p>

      {status && status.configured === false && (
        <div className="mt-3 px-3 py-2 rounded-lg text-xs border border-amber-500/40 bg-amber-500/10">
          No embedding key is configured on this deployment, so ingestion will not run.
        </div>
      )}

      <button onClick={reingest} disabled={busy}
        className="mt-4 text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40 flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {busy ? "Embedding…" : "Re-embed the documents"}
      </button>

      {msg && (
        <div className="mt-3 px-3 py-2 rounded-lg text-sm border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-2">
          <CheckCircle2 size={14} /> {msg}
        </div>
      )}
      {err && (
        <div className="mt-3 px-3 py-2 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10 flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </div>
      )}
    </div>
  );
}
