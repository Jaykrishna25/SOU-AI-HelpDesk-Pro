"use client";
import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Filter, RefreshCw, Loader2, Lock } from "lucide-react";

/* Read-only view of the audit trail. There is no write path in the API it
   calls: an audit log the application can edit proves nothing. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const AUTH = () => ({ Authorization: "Bearer " + tok() });

const SENSITIVE = ["VIEW_IDENTITY", "VIEW_CONFIDENTIAL", "ROLE_CHANGE", "DELETE", "EXPORT"];

const TONE: Record<string, string> = {
  VIEW_IDENTITY: "border-rose-500/50 text-rose-300 bg-rose-500/10",
  VIEW_CONFIDENTIAL: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  ROLE_CHANGE: "border-violet-500/50 text-violet-300 bg-violet-500/10",
  DELETE: "border-rose-500/50 text-rose-300 bg-rose-500/10",
  EXPORT: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  LOGIN_FAILED: "border-amber-500/50 text-amber-300 bg-amber-500/10",
};
const tone = (a: string) => TONE[a] || "border-white/20 text-white/70 bg-white/5";

export default function AuditPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const qs = new URLSearchParams({ take: "50" });
      if (sensitiveOnly) qs.set("sensitive", "1");
      if (action) qs.set("action", action);

      const r = await fetch("/api/audit/list?" + qs.toString(), { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not load the audit log");
      setItems(d.items || []); setTotal(d.total || 0);

      const s = await fetch("/api/audit/summary", { headers: AUTH() });
      if (s.ok) setSummary(await s.json());
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(false); }
  }, [sensitiveOnly, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldAlert size={20} className="opacity-70" /> Audit trail
          </h1>
          <p className="opacity-55 text-sm mt-1">
            Append-only. Written by the system, readable only with <code>audit.view</code>,
            and not editable through any endpoint.
          </p>
        </div>
        <button onClick={load} disabled={busy}
          className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5 disabled:opacity-40">
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {err && <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      {summary && (
        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          <div className="panel-solid rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider opacity-55">Total entries</div>
            <div className="text-xl font-semibold mt-1">{summary.total.toLocaleString("en-IN")}</div>
          </div>
          <div className="panel-solid rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider opacity-55">Last 7 days</div>
            <div className="text-xl font-semibold mt-1">{summary.last7Days.toLocaleString("en-IN")}</div>
          </div>
          <div className="panel-solid rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider opacity-55">Sensitive access</div>
            <div className="text-xl font-semibold mt-1">
              {(summary.byAction || [])
                .filter((a: any) => SENSITIVE.includes(a.action))
                .reduce((n: number, a: any) => n + a.count, 0)
                .toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-6">
        <span className="text-xs opacity-50 flex items-center gap-1"><Filter size={12} /> filter:</span>
        <button
          onClick={() => { setSensitiveOnly(v => !v); setAction(""); }}
          className={"text-xs px-3 py-1.5 rounded-lg border " +
            (sensitiveOnly ? "border-rose-500/50 text-rose-300 bg-rose-500/10" : "border-white/15 hover:border-white/30")}>
          <Lock size={11} className="inline mr-1" /> Sensitive access only
        </button>
        {(summary?.byAction || []).slice(0, 8).map((a: any) => (
          <button key={a.action}
            onClick={() => { setAction(action === a.action ? "" : a.action); setSensitiveOnly(false); }}
            className={"text-xs px-2.5 py-1.5 rounded-lg border " +
              (action === a.action ? "border-white/40 bg-white/10" : "border-white/15 hover:border-white/30")}>
            {a.action} <span className="opacity-50">{a.count}</span>
          </button>
        ))}
      </div>

      <p className="text-xs opacity-45 mt-4">
        Showing {items.length} of {total.toLocaleString("en-IN")} matching entries, newest first.
      </p>

      <div className="mt-3 space-y-2">
        {busy && !items.length && (
          <div className="flex items-center gap-2 text-sm opacity-60 py-6">
            <Loader2 size={15} className="animate-spin" /> Loading the audit trail...
          </div>
        )}

        {!busy && !items.length && (
          <div className="panel-solid rounded-xl p-6 text-sm opacity-60">
            No entries match this filter.
          </div>
        )}

        {items.map(i => (
          <div key={i.id} className="panel-solid rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={"text-[10px] px-2 py-0.5 rounded-full border " + tone(i.action)}>
                    {i.action}
                  </span>
                  <span className="text-sm font-medium">{i.entity}</span>
                  {i.actorRole && <span className="text-[10px] opacity-45">{i.actorRole}</span>}
                </div>
                {i.summary && <div className="text-sm opacity-70 mt-1.5">{i.summary}</div>}
                <div className="text-[11px] opacity-40 mt-1">
                  {i.actor}{i.ip ? " - " + i.ip : ""}
                </div>
              </div>
              <div className="text-[11px] opacity-45 whitespace-nowrap">
                {new Date(i.createdAt).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        Passwords, tokens, secrets, OTPs and identity references are redacted before an
        entry is written - see <code>lib/audit.ts</code>. Entries cannot be edited or deleted
        through the API.
      </p>
    </div>
  );
}
