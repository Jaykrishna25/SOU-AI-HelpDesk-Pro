"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  ShieldCheck, Upload, Search, AlertTriangle, ScanLine, FileCheck2, RefreshCw, X,
} from "lucide-react";
import { MetricValue, DataBadge } from "@/components/Metric";

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });
const TT = {
  contentStyle: { background: "#15121f", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#fff" },
};
const SEV: Record<string, string> = {
  CRITICAL: "border-rose-500/50 bg-rose-500/10 text-rose-300",
  WARNING: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  INFO: "border-sky-500/50 bg-sky-500/10 text-sky-300",
};
const APPROVAL: Record<string, string> = {
  DRAFT: "border-slate-500/40 text-slate-300", SUBMITTED: "border-amber-500/40 text-amber-300",
  APPROVED: "border-emerald-500/40 text-emerald-300", REJECTED: "border-rose-500/40 text-rose-300",
  RETURNED: "border-violet-500/40 text-violet-300",
};

export default function IQAC() {
  const [tab, setTab] = useState<"overview" | "evidence" | "quality" | "reports">("overview");
  const [years, setYears] = useState<any[]>([]);
  const [yearId, setYearId] = useState("");
  const [dash, setDash] = useState<any>(null);
  const [framework, setFramework] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ k: string; t: string } | null>(null);

  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filter, setFilter] = useState({ q: "", metricId: "", approval: "", verification: "" });
  const [open, setOpen] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  /* ---------- loaders ---------- */
  useEffect(() => {
    fetch("/api/iqac/years", { headers: AUTH() }).then(r => r.ok ? r.json() : { items: [] }).then(d => {
      setYears(d.items || []);
      const cur = (d.items || []).find((y: any) => y.isCurrent) || (d.items || [])[0];
      if (cur) setYearId(cur.id);
    });
  }, []);

  const loadDash = useCallback(async () => {
    if (!yearId) return;
    const r = await fetch("/api/iqac-insight/dashboard?yearId=" + yearId, { headers: AUTH() });
    setDash(r.ok ? await r.json() : null);
    const f = await fetch("/api/iqac/framework?yearId=" + yearId, { headers: AUTH() });
    if (f.ok) setFramework((await f.json()).criteria || []);
  }, [yearId]);
  useEffect(() => { loadDash(); }, [loadDash]);

  const loadList = useCallback(async () => {
    if (!yearId) return;
    const p = new URLSearchParams({ yearId, take: "25", skip: String(skip) });
    Object.entries(filter).forEach(([k, v]) => { if (v) p.set(k, v); });
    const r = await fetch("/api/iqac/evidence?" + p, { headers: AUTH() });
    if (r.ok) { const d = await r.json(); setList(d.items || []); setTotal(d.total || 0); }
  }, [yearId, skip, filter]);
  useEffect(() => { if (tab === "evidence") loadList(); }, [tab, loadList]);

  const loadIssues = useCallback(async () => {
    const r = await fetch("/api/iqac-insight/issues?resolved=false&yearId=" + yearId, { headers: AUTH() });
    if (r.ok) setIssues((await r.json()).items || []);
  }, [yearId]);
  useEffect(() => { if (tab === "quality") loadIssues(); }, [tab, loadIssues]);

  async function openRecord(id: string) {
    const r = await fetch("/api/iqac/evidence/one?id=" + id, { headers: AUTH() });
    if (r.ok) setOpen((await r.json()).record);
    else setMsg({ k: "err", t: (await r.json()).error });
  }

  async function runScan() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/iqac-insight/scan", { method: "POST", headers: H(), body: JSON.stringify({ yearId }) });
    const d = await r.json(); setBusy(false);
    setMsg(r.ok ? { k: "ok", t: "Scan complete for " + d.year + " - " + d.found + " issue(s) found" } : { k: "err", t: d.error });
    loadIssues(); loadDash();
  }

  const allMetrics = framework.flatMap((c: any) =>
    c.indicators.flatMap((i: any) => i.metrics.map((m: any) => ({ ...m, path: c.code + " / " + i.code }))));

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold gradient-text flex items-center gap-2">
            <ShieldCheck size={22} /> IQAC Quality &amp; Evidence Vault
          </h1>
          <p className="text-sm opacity-60 mt-1">
            Criteria, indicators and metrics are configurable records. This system does not calculate
            or predict any accreditation outcome.
          </p>
        </div>
        <select value={yearId} onChange={e => setYearId(e.target.value)}
          className="bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
          {years.map(y => <option key={y.id} value={y.id}>{y.code}{y.isCurrent ? " (current)" : ""}</option>)}
        </select>
      </div>

      {msg && <div className={"mb-4 px-4 py-3 rounded-lg text-sm border " +
        (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>{msg.t}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[["overview", "Overview"], ["evidence", "Evidence Vault"],
          ["quality", "Data quality" + (dash?.dataQuality?.open ? " (" + dash.dataQuality.open + ")" : "")],
          ["reports", "Reports"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={"px-4 py-2 rounded-lg text-sm border " +
              (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-[var(--border)] hover:border-[var(--border-strong)]")}>{l}</button>
        ))}
      </div>

      {/* ============ OVERVIEW ============ */}
      {tab === "overview" && dash && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <MetricValue label="Metrics covered" value={dash.completion} sample={dash.totals.metrics}
              unit="%" provenance="derived" source="metrics with approved evidence" />
            <MetricValue label="Evidence records" value={dash.totals.evidenceRecords} sample={dash.totals.evidenceRecords}
              decimals={0} source={dash.year.code} />
            <MetricValue label="Missing evidence" value={dash.totals.missingEvidence} sample={dash.totals.metrics}
              decimals={0} source="metrics with no record" />
            <MetricValue label="Pending verification" value={dash.totals.pendingVerification}
              sample={dash.totals.evidenceRecords} decimals={0} />
            <MetricValue label="Pending approval" value={dash.totals.pendingApproval}
              sample={dash.totals.evidenceRecords} decimals={0} />
            <MetricValue label="Expiring soon" value={dash.totals.expiringSoon} sample={dash.totals.evidenceRecords}
              decimals={0} source={"within " + dash.expiryWindowDays + " days"} />
          </div>

          <div className="panel-solid rounded-xl p-5 mb-5">
            <div className="font-medium mb-4">Completion by criterion</div>
            <div className="space-y-3">
              {dash.byCriterion.map((c: any) => (
                <div key={c.code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{c.code}. {c.title}</span>
                    <span className="opacity-70">{c.approved} / {c.metrics} approved</span>
                  </div>
                  <div className="h-2 bg-[var(--panel)] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/80" style={{ width: c.completion + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel-solid rounded-xl p-5">
              <div className="font-medium mb-4">Evidence across years</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={dash.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="year" stroke="rgba(255,255,255,.5)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,.5)" fontSize={11} />
                    <Tooltip {...TT} /><Legend wrapperStyle={{ color: "#fff", fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" name="Recorded" stroke="#9B1C26" strokeWidth={2} />
                    <Line type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-solid rounded-xl p-5">
              <div className="font-medium mb-4">By department</div>
              {dash.byDepartment.length === 0
                ? <div className="text-sm opacity-55">No verified data available yet.</div>
                : <div className="space-y-2">
                    {dash.byDepartment.map((d: any) => (
                      <div key={d.name} className="flex justify-between text-sm bg-[var(--panel)] rounded px-3 py-2">
                        <span>{d.name}</span>
                        <span className="opacity-70">{d.approved}/{d.total} approved - {d.completion}%</span>
                      </div>
                    ))}
                  </div>}
              {dash.totals.demoRecords > 0 && (
                <div className="mt-4 text-[11px] opacity-60 flex items-center gap-2">
                  <DataBadge kind="demo" /> {dash.totals.demoRecords} record(s) are seeded demo data.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============ EVIDENCE ============ */}
      {tab === "evidence" && (
        <>
          <div className="panel-solid rounded-xl p-4 mb-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search size={14} className="absolute left-3 top-3 opacity-50" />
              <input value={filter.q} onChange={e => { setSkip(0); setFilter({ ...filter, q: e.target.value }); }}
                placeholder="Search title, code, narrative or source reference"
                className="w-full bg-black/30 border border-[var(--border)] rounded pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={filter.metricId} onChange={e => { setSkip(0); setFilter({ ...filter, metricId: e.target.value }); }}
              className="bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
              <option value="">All metrics</option>
              {allMetrics.map((m: any) => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}
            </select>
            <select value={filter.approval} onChange={e => { setSkip(0); setFilter({ ...filter, approval: e.target.value }); }}
              className="bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
              <option value="">Any approval status</option>
              {["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "RETURNED"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          <NewEvidence metrics={allMetrics} yearId={yearId} onDone={(m) => { setMsg(m); loadList(); loadDash(); }} />

          <div className="space-y-2 mt-4">
            {list.length === 0 && <div className="opacity-55 text-sm">No evidence records match these filters.</div>}
            {list.map(e => (
              <button key={e.id} onClick={() => openRecord(e.id)}
                className="panel-solid rounded-xl p-4 w-full text-left flex justify-between items-start gap-3 flex-wrap hover:border-violet-500/40 border border-transparent">
                <div>
                  <div className="text-sm font-medium">{e.title} <span className="opacity-45 font-mono text-xs">{e.code}</span></div>
                  <div className="text-xs opacity-55 mt-0.5">
                    {e.metric?.code} {e.metric?.title} - {e.academicYear?.code} - {e.ownerName}
                  </div>
                  <div className="text-[11px] opacity-40 mt-0.5">
                    {e._count.documents} document(s), v{e._count.versions} - {new Date(e.evidenceDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={"text-[10px] px-2 py-0.5 rounded-full border " + (APPROVAL[e.approvalStatus] || "")}>{e.approvalStatus}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-strong)] opacity-70">{e.verificationStatus}</span>
                </div>
              </button>
            ))}
          </div>

          {total > 25 && (
            <div className="flex justify-between items-center mt-4 text-sm">
              <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 25))}
                className="px-3 py-1.5 rounded border border-[var(--border)] disabled:opacity-30">Previous</button>
              <span className="opacity-55">{skip + 1}-{Math.min(skip + 25, total)} of {total}</span>
              <button disabled={skip + 25 >= total} onClick={() => setSkip(skip + 25)}
                className="px-3 py-1.5 rounded border border-[var(--border)] disabled:opacity-30">Next</button>
            </div>
          )}
        </>
      )}

      {/* ============ DATA QUALITY ============ */}
      {tab === "quality" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button onClick={runScan} disabled={busy}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm flex items-center gap-2">
              <ScanLine size={15} /> {busy ? "Scanning..." : "Run data-quality scan"}
            </button>
            <button onClick={loadIssues} className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <span className="text-xs opacity-55">
              Checks missing evidence, unverified metrics, duplicates, dates outside the year,
              unsourced figures and expiring documents.
            </span>
          </div>

          <div className="space-y-2">
            {issues.length === 0 && <div className="opacity-55 text-sm">No open issues. Run a scan to check.</div>}
            {issues.map(i => (
              <div key={i.id} className={"rounded-xl p-4 border " + (SEV[i.severity] || "")}>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <div className="text-sm">{i.message}</div>
                    <div className="text-[11px] opacity-70 mt-1">
                      {i.kind} - {i.entity}{i.metric ? " - " + i.metric.code : ""}{i.academicYear ? " - " + i.academicYear.code : ""}
                      {i.detail ? " - " + i.detail : ""}
                    </div>
                  </div>
                  <button onClick={async () => {
                    await fetch("/api/iqac-insight/resolve", { method: "POST", headers: H(), body: JSON.stringify({ id: i.id }) });
                    loadIssues(); loadDash();
                  }} className="text-[11px] underline opacity-70 hover:opacity-100">Mark resolved</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "reports" && <ReportsTab yearId={yearId} setMsg={setMsg} />}

      {open && <RecordDrawer record={open} onClose={() => setOpen(null)}
        onChanged={() => { openRecord(open.id); loadList(); loadDash(); }}
        setMsg={setMsg} />}
    </main>
  );
}

/* ---------------- new evidence ---------------- */
function NewEvidence({ metrics, yearId, onDone }:
  { metrics: any[]; yearId: string; onDone: (m: any) => void }) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ metricId: "", title: "", evidenceType: "FILE", urlValue: "",
    narrative: "", evidenceDate: new Date().toISOString().slice(0, 10), sourceSystem: "",
    sourceReference: "", visibility: "INTERNAL", departmentName: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const r = await fetch("/api/iqac/evidence", { method: "POST", headers: H(),
      body: JSON.stringify({ ...f, academicYearId: yearId, expiresAt: f.expiresAt || null }) });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return onDone({ k: "err", t: d.error });
    onDone({ k: "ok", t: "Created " + d.record.code + ". Open it to attach documents." });
    setShow(false);
    setF({ ...f, title: "", narrative: "", urlValue: "", sourceReference: "" });
  }

  if (!show) return (
    <button onClick={() => setShow(true)}
      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">Add evidence record</button>
  );

  return (
    <div className="panel-solid rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="font-medium">New evidence record</div>
        <button onClick={() => setShow(false)}><X size={16} className="opacity-60" /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs opacity-70 md:col-span-2">Metric
          <select value={f.metricId} onChange={e => setF({ ...f, metricId: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
            <option value="">Select a metric</option>
            {metrics.map(m => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}
          </select>
        </label>
        <label className="text-xs opacity-70 md:col-span-2">Title
          <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
            placeholder="What this evidence shows"
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70">Evidence type
          <select value={f.evidenceType} onChange={e => setF({ ...f, evidenceType: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
            {["FILE", "URL", "STRUCTURED", "NARRATIVE"].map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-xs opacity-70">Visibility
          <select value={f.visibility} onChange={e => setF({ ...f, visibility: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
            {["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"].map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-xs opacity-70">Evidence date
          <input type="date" value={f.evidenceDate} onChange={e => setF({ ...f, evidenceDate: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70">Expires on (optional)
          <input type="date" value={f.expiresAt} onChange={e => setF({ ...f, expiresAt: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70">Source system
          <input value={f.sourceSystem} onChange={e => setF({ ...f, sourceSystem: e.target.value })}
            placeholder="e.g. Examination cell register"
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70">Source reference
          <input value={f.sourceReference} onChange={e => setF({ ...f, sourceReference: e.target.value })}
            placeholder="e.g. Register page 42 / File ref 2026-114"
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
        {f.evidenceType === "URL" && (
          <label className="text-xs opacity-70 md:col-span-2">URL
            <input value={f.urlValue} onChange={e => setF({ ...f, urlValue: e.target.value })}
              placeholder="https://..."
              className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
          </label>
        )}
        <label className="text-xs opacity-70 md:col-span-2">Narrative / notes
          <textarea rows={3} value={f.narrative} onChange={e => setF({ ...f, narrative: e.target.value })}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
        </label>
      </div>
      <button onClick={save} disabled={busy || !f.metricId || !f.title}
        className="mt-4 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm">
        {busy ? "Saving..." : "Create record"}
      </button>
    </div>
  );
}

/* ---------------- record drawer ---------------- */
function RecordDrawer({ record, onClose, onChanged, setMsg }:
  { record: any; onClose: () => void; onChanged: () => void; setMsg: (m: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState("");

  async function openDoc(d: any) {
    const r = await fetch("/api/iqac/evidence/file?docId=" + d.id, { headers: AUTH() });
    if (!r.ok) {
      let e = "Could not open the document";
      try { e = (await r.json()).error || e; } catch {}
      setMsg({ k: "err", t: e });
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("recordId", record.id);
    fd.append("file", file);
    const r = await fetch("/api/iqac/evidence/upload", { method: "POST", headers: AUTH(), body: fd });
    const d = await r.json(); setBusy(false);
    setMsg(r.ok ? { k: "ok", t: "Uploaded " + d.document.fileName } : { k: "err", t: d.error });
    if (r.ok) onChanged();
  }

  async function act(path: string, body: any, label: string) {
    setBusy(true);
    const r = await fetch("/api/iqac/" + path, { method: "POST", headers: H(), body: JSON.stringify({ id: record.id, ...body }) });
    const d = await r.json(); setBusy(false);
    setMsg(r.ok ? { k: "ok", t: label } : { k: "err", t: d.error });
    if (r.ok) { setComments(""); onChanged(); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full overflow-y-auto panel-solid p-6">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <div className="text-lg font-medium">{record.title}</div>
            <div className="text-xs opacity-55 font-mono">{record.code}</div>
          </div>
          <button onClick={onClose}><X size={18} className="opacity-60" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-5">
          {[["Metric", record.metric?.code + " " + record.metric?.title],
            ["Criterion", record.metric?.keyIndicator?.criterion?.code + ". " + record.metric?.keyIndicator?.criterion?.title],
            ["Academic year", record.academicYear?.code],
            ["Owner", record.ownerName],
            ["Evidence date", new Date(record.evidenceDate).toLocaleDateString()],
            ["Visibility", record.visibility],
            ["Source", (record.sourceSystem || "-") + (record.sourceReference ? " / " + record.sourceReference : "")],
            ["Expires", record.expiresAt ? new Date(record.expiresAt).toLocaleDateString() : "-"]].map(([k, v]) => (
            <div key={String(k)} className="bg-[var(--panel)] rounded px-3 py-2">
              <div className="opacity-50">{k}</div><div className="mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {record.narrative && <div className="text-sm opacity-80 mb-5 whitespace-pre-wrap">{record.narrative}</div>}
        {record.urlValue && <a href={record.urlValue} target="_blank" rel="noreferrer"
          className="text-sm underline opacity-80 block mb-5">{record.urlValue}</a>}

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider opacity-55 mb-2">Documents</div>
          {record.documents.length === 0 && <div className="text-sm opacity-50 mb-2">None attached.</div>}
          {record.documents.map((d: any) => (
            <div key={d.id} className="flex justify-between items-center text-sm bg-[var(--panel)] rounded px-3 py-2 mb-1.5">
              <button onClick={() => openDoc(d)} className="underline text-left">
                {d.fileName} <span className="opacity-50 text-xs">v{d.versionNo}{d.isCurrent ? " (current)" : ""}</span>
              </button>
              <span className="opacity-45 text-xs">{Math.round(d.sizeBytes / 1024)} KB</span>
            </div>
          ))}
          <label className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm cursor-pointer hover:border-[var(--border-strong)]">
            <Upload size={14} /> {busy ? "Working..." : "Upload document"}
            <input type="file" className="hidden" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
          </label>
          <div className="text-[11px] opacity-45 mt-1">PDF, JPG, PNG, WEBP, DOC(X), XLS(X), CSV, TXT - max 10 MB</div>
        </div>

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider opacity-55 mb-2">History</div>
          <div className="space-y-1.5 text-xs">
            {record.versions.map((v: any) => (
              <div key={v.id} className="bg-[var(--panel)] rounded px-3 py-2">
                v{v.versionNo} - {v.changeNote} - {v.changedBy} - {new Date(v.createdAt).toLocaleString()}
              </div>
            ))}
            {record.verifications.map((v: any) => (
              <div key={v.id} className="bg-[var(--panel)] rounded px-3 py-2">
                Verification: {v.result} by {v.verifiedBy} - {new Date(v.verifiedAt).toLocaleString()}
                {v.comments ? " - " + v.comments : ""}
              </div>
            ))}
            {record.approvals.map((a: any) => (
              <div key={a.id} className="bg-[var(--panel)] rounded px-3 py-2">
                Approval: {a.decision} by {a.decidedBy} - {new Date(a.decidedAt).toLocaleString()}
                {a.comments ? " - " + a.comments : ""}
              </div>
            ))}
          </div>
        </div>

        <input value={comments} onChange={e => setComments(e.target.value)} placeholder="Comments for the decision below"
          className="w-full bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm mb-3" />
        <div className="flex gap-2 flex-wrap">
          <button disabled={busy} onClick={() => act("verify", { result: "VERIFIED", comments, checklist: { documentsPresent: true, sourceStated: !!record.sourceSystem, dateInYear: true } }, "Marked verified")}
            className="px-3 py-2 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500 flex items-center gap-1">
            <FileCheck2 size={13} /> Verify
          </button>
          <button disabled={busy} onClick={() => act("verify", { result: "REJECTED", comments }, "Verification rejected")}
            className="px-3 py-2 rounded text-xs bg-rose-600/80 hover:bg-rose-500">Reject verification</button>
          <button disabled={busy} onClick={() => act("approve", { decision: "APPROVED", comments }, "Approved")}
            className="px-3 py-2 rounded text-xs bg-violet-600/80 hover:bg-violet-500">Approve</button>
          <button disabled={busy} onClick={() => act("approve", { decision: "RETURNED", comments }, "Returned for correction")}
            className="px-3 py-2 rounded text-xs border border-[var(--border-strong)]">Return</button>
        </div>
        <div className="text-[11px] opacity-45 mt-3 flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Approval requires prior verification. Approved records lock against edits and re-upload.
        </div>
      </div>
    </div>
  );
}



/* ---------------- reports ---------------- */
function ReportsTab({ yearId, setMsg }: { yearId: string; setMsg: (m: any) => void }) {
  const [kind, setKind] = useState("SSR");
  const [draft, setDraft] = useState<any>(null);
  const [saved, setSaved] = useState<any[]>([]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const loadSaved = useCallback(async () => {
    const r = await fetch("/api/iqac-report/saved", { headers: AUTH() });
    if (r.ok) setSaved((await r.json()).items || []);
  }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  async function generate() {
    setBusy(true);
    const r = await fetch("/api/iqac-report/draft?yearId=" + yearId + "&kind=" + kind, { headers: AUTH() });
    const d = await r.json(); setBusy(false);
    if (!r.ok) return setMsg({ k: "err", t: d.error });
    setDraft(d.draft);
  }

  async function snapshot() {
    setBusy(true);
    const r = await fetch("/api/iqac-report/save", { method: "POST", headers: H(), body: JSON.stringify({ yearId, kind }) });
    const d = await r.json(); setBusy(false);
    setMsg(r.ok ? { k: "ok", t: "Saved snapshot " + d.code + " - " + d.coverage.evidenced + "/" + d.coverage.totalMetrics + " metrics evidenced" }
                : { k: "err", t: d.error });
    loadSaved();
  }

  async function act(id: string, path: string, label: string) {
    const r = await fetch("/api/iqac-report/" + path, { method: "POST", headers: H(), body: JSON.stringify({ id }) });
    const d = await r.json();
    if (!r.ok) return setMsg({ k: "err", t: d.error });
    if (path === "export") { downloadCsv(d.payload, d.meta.code); setMsg({ k: "ok", t: "Exported " + d.meta.code }); }
    else setMsg({ k: "ok", t: label });
    loadSaved();
  }

  function downloadCsv(p: any, codeStr: string) {
    const rows: string[][] = [[p.title], [p.institution], ["Academic year", p.academicYear],
      ["Basis", p.basis], [],
      ["Criterion", "Indicator", "Metric", "Evidenced", "Statement", "Evidence codes", "Source system"]];
    p.criteria.forEach((c: any) => c.indicators.forEach((i: any) => i.metrics.forEach((m: any) => {
      rows.push([c.code, i.code, m.code, m.evidenced ? "Yes" : "No",
        m.statement || m.note || "",
        (m.sources || []).map((s: any) => s.code).join(" | "),
        Array.from(new Set((m.sources || []).map((s: any) => s.sourceSystem).filter(Boolean))).join(" | ")]);
    })));
    const blob = new Blob([rows.map(r => r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\n")],
      { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = codeStr + ".csv"; a.click();
  }

  return (
    <div>
      <style>{"@media print{.no-print{display:none!important}body{background:#fff!important;color:#000!important}.rep *{color:#000!important}}"}</style>

      <div className="panel-solid rounded-xl p-4 mb-5 flex gap-3 flex-wrap items-end no-print">
        <label className="text-xs opacity-70">Report type
          <select value={kind} onChange={e => setKind(e.target.value)}
            className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
            <option value="SSR">SSR data annexure (draft)</option>
            <option value="DVV">DVV evidence index</option>
          </select>
        </label>
        <button onClick={generate} disabled={busy || !yearId}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm">
          {busy ? "Compiling..." : "Generate draft"}
        </button>
        {draft && <>
          <button onClick={snapshot} disabled={busy}
            className="px-4 py-2 rounded-lg border border-[var(--border-strong)] text-sm">Save as snapshot</button>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg border border-[var(--border-strong)] text-sm">Print</button>
        </>}
      </div>

      {draft && (
        <div className="rep">
          <div className="panel-solid rounded-xl p-5 mb-4">
            <div className="text-lg font-medium">{draft.title}</div>
            <div className="text-sm opacity-60">{draft.institution} - {draft.academicYear} ({draft.periodFrom} to {draft.periodTo})</div>
            <div className="text-[12px] opacity-70 mt-3 leading-relaxed">{draft.basis}</div>
            <div className="flex gap-3 mt-4 flex-wrap text-sm">
              <span className="px-3 py-1 rounded-full border border-emerald-500/40 text-emerald-300">
                {draft.coverage.evidenced} evidenced
              </span>
              <span className="px-3 py-1 rounded-full border border-amber-500/40 text-amber-300">
                {draft.coverage.gaps} gaps
              </span>
              <span className="px-3 py-1 rounded-full border border-[var(--border-strong)] opacity-70">
                {draft.coverage.totalMetrics} metrics total
              </span>
            </div>
          </div>

          {draft.criteria.map((c: any) => (
            <div key={c.code} className="panel-solid rounded-xl p-5 mb-3">
              <div className="font-medium mb-3">{c.code}. {c.title}</div>
              {c.indicators.map((i: any) => (
                <div key={i.code} className="mb-4">
                  <div className="text-sm opacity-75 mb-2">{i.code} {i.title}</div>
                  {i.metrics.map((m: any) => (
                    <div key={m.code} className={"rounded-lg px-3 py-2 mb-1.5 border " +
                      (m.evidenced ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5")}>
                      <div className="text-[13px]">
                        <span className="font-mono opacity-60 mr-2">{m.code}</span>
                        {m.evidenced ? m.statement : m.title + " - " + m.note}
                      </div>
                      {m.note && m.evidenced && <div className="text-[11px] text-amber-300/80 mt-1">{m.note}</div>}
                      {m.evidenced && (
                        <button onClick={() => setOpenIds({ ...openIds, [m.statementId]: !openIds[m.statementId] })}
                          className="text-[11px] underline opacity-55 hover:opacity-100 mt-1 no-print">
                          {openIds[m.statementId] ? "Hide" : "Show"} {m.sources.length} source record(s)
                        </button>
                      )}
                      {m.evidenced && openIds[m.statementId] && (
                        <div className="mt-2 space-y-1">
                          {m.sources.map((sc: any) => (
                            <div key={sc.id} className="text-[11px] bg-[var(--panel)] rounded px-2 py-1.5">
                              <span className="font-mono opacity-70">{sc.code}</span> - {sc.title} - {sc.evidenceDate}
                              {" - "}{sc.documents} doc(s){sc.verifiedAt ? " - verified " + sc.verifiedAt : ""}
                              {sc.sourceSystem ? " - " + sc.sourceSystem : ""}
                              {sc.sourceReference ? " / " + sc.sourceReference : ""}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 no-print">
        <div className="text-xs uppercase tracking-wider opacity-55 mb-2">Saved snapshots</div>
        {saved.length === 0 && <div className="text-sm opacity-50">None yet.</div>}
        {saved.map(s => (
          <div key={s.id} className="panel-solid rounded-xl p-4 mb-2 flex justify-between items-center gap-3 flex-wrap">
            <div>
              <div className="text-sm font-medium">{s.title} <span className="opacity-45 font-mono text-xs">{s.code}</span></div>
              <div className="text-xs opacity-55 mt-0.5">
                {s.kind} - {new Date(s.periodFrom).toLocaleDateString()} to {new Date(s.periodTo).toLocaleDateString()}
                {" - drafted by "}{s.generatedBy}
                {s.approvedAt ? " - approved by " + s.approvedBy : " - awaiting IQAC approval"}
              </div>
            </div>
            <div className="flex gap-2">
              {!s.approvedAt && (
                <button onClick={() => act(s.id, "approve", "Approved for export")}
                  className="px-3 py-1.5 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500">Approve</button>
              )}
              <button onClick={() => act(s.id, "export", "")}
                className="px-3 py-1.5 rounded text-xs border border-[var(--border-strong)]">Export CSV</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

