"use client";
import { useEffect, useState, useCallback } from "react";

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [kind, setKind] = useState("NAAC_AQAR");
  const [from, setFrom] = useState(yearAgo);
  const [to, setTo] = useState(today);
  const [rep, setRep] = useState<any>(null);
  const [saved, setSaved] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: string; t: string } | null>(null);

  const loadSaved = useCallback(async () => {
    const r = await fetch("/api/reports/saved", { headers: H() });
    if (r.ok) setSaved((await r.json()).items || []);
  }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  async function generate() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/reports/generate?kind=" + kind + "&from=" + from + "&to=" + to, { headers: H() });
    setBusy(false);
    if (!r.ok) { setMsg({ k: "err", t: (await r.json()).error }); return; }
    setRep(await r.json());
  }

  async function snapshot() {
    const r = await fetch("/api/reports", { method: "POST", headers: H(), body: JSON.stringify({ payload: rep }) });
    const d = await r.json();
    setMsg(r.ok ? { k: "ok", t: "Saved as " + d.code } : { k: "err", t: d.error });
    loadSaved();
  }

  async function openSaved(id: string) {
    const r = await fetch("/api/reports/one?id=" + id, { headers: H() });
    if (r.ok) setRep((await r.json()).report);
  }

  function csv() {
    const lines: string[][] = [[rep.title], [rep.institution], ["Period", rep.periodFrom, rep.periodTo], []];
    for (const s of rep.sections) {
      lines.push([s.criterion]); lines.push([s.title]);
      Object.entries(s.summary || {}).forEach(([k, v]) => lines.push([k, String(v)]));
      if (s.table?.columns?.length) {
        lines.push([]); lines.push(s.table.columns);
        s.table.rows.forEach((r: any[]) => lines.push(r.map(String)));
      }
      lines.push([]);
    }
    const blob = new Blob([lines.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n")],
      { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = rep.kind + "-" + rep.periodTo + ".csv";
    a.click();
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <style>{"@media print{body{background:#fff!important;color:#000!important}.no-print{display:none!important}.rep-card{border:1px solid #999!important;background:#fff!important;color:#000!important;break-inside:avoid}.rep-card *{color:#000!important}}"}</style>

      <div className="no-print">
        <h1 className="text-2xl md:text-3xl font-semibold gradient-text">Accreditation Reports</h1>
        <p className="text-sm opacity-60 mb-6">NAAC AQAR and AICTE data annexures, generated from live system data</p>

        {msg && <div className={"mb-4 px-4 py-3 rounded-lg text-sm border " +
          (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>{msg.t}</div>}

        <div className="panel-solid rounded-xl p-5 mb-6">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs opacity-70">Report
              <select value={kind} onChange={e => setKind(e.target.value)}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
                <option value="NAAC_AQAR">NAAC AQAR annexure</option>
                <option value="AICTE_EOA">AICTE EOA annexure</option>
              </select>
            </label>
            <label className="text-xs opacity-70">From
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-xs opacity-70">To
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end">
              <button onClick={generate} disabled={busy}
                className="w-full px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm">
                {busy ? "Compiling..." : "Generate"}
              </button>
            </div>
          </div>

          {rep && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={snapshot} className="px-3 py-1.5 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500">Save snapshot</button>
              <button onClick={csv} className="px-3 py-1.5 rounded text-xs border border-[var(--border-strong)]">Download CSV</button>
              <button onClick={() => window.print()} className="px-3 py-1.5 rounded text-xs border border-[var(--border-strong)]">Print / PDF</button>
            </div>
          )}
        </div>

        {saved.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider opacity-55 mb-2">Saved snapshots</div>
            <div className="space-y-1.5">
              {saved.map(s => (
                <button key={s.id} onClick={() => openSaved(s.id)}
                  className="w-full text-left panel-solid rounded-lg px-4 py-2.5 flex justify-between items-center text-sm">
                  <span>{s.title} <span className="opacity-45 font-mono text-xs">{s.code}</span></span>
                  <span className="opacity-50 text-xs">
                    {new Date(s.periodFrom).toLocaleDateString()} to {new Date(s.periodTo).toLocaleDateString()} - {s.generatedBy}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {rep && (
        <div>
          <div className="rep-card panel-solid rounded-xl p-6 mb-5">
            <div className="text-xs uppercase tracking-[0.3em] opacity-55">{rep.institution}</div>
            <div className="text-2xl font-semibold mt-1">{rep.title}</div>
            <div className="text-sm opacity-60 mt-1">
              Reporting period {rep.periodFrom} to {rep.periodTo} - compiled {new Date(rep.generatedAt).toLocaleString()}
            </div>
          </div>

          {rep.sections.map((s: any) => (
            <div key={s.key} className="rep-card panel-solid rounded-xl p-5 mb-5">
              <div className="text-[11px] uppercase tracking-wider opacity-55">{s.criterion}</div>
              <div className="text-lg font-medium mt-0.5 mb-4">{s.title}</div>

              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mb-4">
                {Object.entries(s.summary || {}).map(([k, v]) => (
                  <div key={k} className="bg-[var(--panel)] rounded px-3 py-2">
                    <div className="text-[11px] opacity-55">{k}</div>
                    <div className="text-sm font-medium mt-0.5">{String(v)}</div>
                  </div>
                ))}
              </div>

              {s.table?.columns?.length > 0 && s.table.rows.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="opacity-55 text-left">
                        {s.table.columns.map((c: string) => <th key={c} className="py-2 pr-4 font-normal">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r: any[], i: number) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          {r.map((v, j) => <td key={j} className="py-2 pr-4">{String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
