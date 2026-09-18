"use client";
import { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, Wrench, Send, Building2, Loader2, Info,
} from "lucide-react";
import { DataBadge } from "@/components/Metric";

/* ============================================================
   Fee Statement Simplifier.

   Built around the statement, not around a chat box: the analysis
   appears as soon as a statement is read, before any question is
   asked. The chat below is for follow-ups.

   Every figure on this screen comes from server-side arithmetic.
   The assistant's answers show which tools produced them, so an
   answer can be checked against its own working.
   ============================================================ */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

const TT = {
  contentStyle: { background: "#15121f", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#fff" },
};

const inr = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "-" : "INR " + Number(n).toLocaleString("en-IN");

const TOOL_LABEL: Record<string, string> = {
  analyse_fee_statement: "Fee arithmetic",
  analyse_institutional_fees: "Institutional arithmetic",
  search_fee_policy: "Policy search (RAG)",
};

type Turn = { role: "user" | "ai"; text: string; tools?: string[] };

export default function Finance() {
  const [status, setStatus] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [rawTool, setRawTool] = useState("");
  const [uploaded, setUploaded] = useState<any[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [inst, setInst] = useState<any>(null);
  const [instScope, setInstScope] = useState("");

  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- capability probe ---------- */
  useEffect(() => {
    fetch("/api/finance/status", { headers: AUTH() })
      .then(r => r.ok ? r.json() : null)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  /* ---------- load the portal's own record ---------- */
  async function loadMine() {
    setErr(""); setBusy("Reading your portal fee record...");
    try {
      const r = await fetch("/api/finance/me", { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not load your fee record");
      if (!d.analysis) {
        setErr("This account has no student fee record in the portal. Upload a statement instead.");
        setBusy(""); return;
      }
      setAnalysis(d.analysis); setUploaded(null); setSkipped(0); setTurns([]);

      setBusy("Explaining the figures...");
      const s = await fetch("/api/finance/summary", { method: "POST", headers: H(), body: JSON.stringify({}) });
      const sd = await s.json();
      setSummary(sd.summary || ""); setRawTool(sd.raw || "");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(""); }
  }

  /* ---------- upload and parse a statement ---------- */
  async function onFile(f: File | null) {
    if (!f) return;
    setErr(""); setBusy("Reading " + f.name + "...");
    try {
      const text = await f.text();
      const r = await fetch("/api/finance/parse", {
        method: "POST", headers: H(), body: JSON.stringify({ text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "That statement could not be read");
      setAnalysis(d.analysis);
      setUploaded(d.rows);
      setSkipped(d.skipped || 0);
      setSummary(d.summary || "");
      setRawTool("");
      setTurns([]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(""); if (fileRef.current) fileRef.current.value = ""; }
  }

  /* ---------- institutional view ---------- */
  async function loadInstitutional() {
    setErr(""); setBusy("Aggregating institutional fee position...");
    try {
      const r = await fetch("/api/finance/institutional", { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Not permitted");
      setInst(d.analysis); setInstScope(d.scope || "");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(""); }
  }

  /* ---------- ask the agent ---------- */
  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setQ("");
    setTurns(t => [...t, { role: "user", text }]);
    setBusy("thinking");
    try {
      const r = await fetch("/api/finance/ask", {
        method: "POST", headers: H(),
        body: JSON.stringify({
          question: text,
          uploaded,
          history: turns.slice(-6).map(t => ({ role: t.role, text: t.text })),
        }),
      });
      const d = await r.json();
      setTurns(t => [...t, {
        role: "ai",
        text: d.answer || d.error || "No answer was returned.",
        tools: d.toolsUsed || [],
      }]);
    } catch (e: any) {
      setTurns(t => [...t, { role: "ai", text: "The assistant could not be reached: " + String(e?.message || e) }]);
    } finally { setBusy(""); }
  }

  const canInst = !!status?.canViewInstitutional;
  const suggestions = canInst
    ? ["What is our overall fee collection rate?", "Which department has the most outstanding fees?",
       "What does the late fee policy say?", "How many students are overdue?"]
    : ["How much do I still owe?", "Am I overdue on anything?",
       "What is the late fee policy?", "When is my next payment due?"];

  /* ---------- empty state ---------- */
  if (!analysis && !inst) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Fee Statement Simplifier</h1>
        <p className="opacity-60 mt-2 max-w-2xl">
          Upload a fee statement, or open your portal record. The analysis runs immediately -
          you do not have to know what to ask.
        </p>

        {err && (
          <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="panel-solid rounded-xl p-6 text-left hover:border-white/25 transition disabled:opacity-50"
          >
            <Upload size={18} className="opacity-70" />
            <div className="font-medium mt-3">Upload a statement</div>
            <div className="text-sm opacity-55 mt-1">
              CSV or text, with a semester column and an amount column. Nothing is saved to your fee record.
            </div>
          </button>

          <button
            onClick={loadMine}
            disabled={!!busy || !status?.canViewOwn}
            className="panel-solid rounded-xl p-6 text-left hover:border-white/25 transition disabled:opacity-50"
          >
            <FileText size={18} className="opacity-70" />
            <div className="font-medium mt-3">Use my portal record</div>
            <div className="text-sm opacity-55 mt-1">
              Reads the fees already recorded against your enrolment.
            </div>
          </button>
        </div>

        {canInst && (
          <button
            onClick={loadInstitutional}
            disabled={!!busy}
            className="panel-solid rounded-xl p-6 text-left w-full mt-4 hover:border-white/25 transition disabled:opacity-50"
          >
            <Building2 size={18} className="opacity-70" />
            <div className="font-medium mt-3">Institutional fee position</div>
            <div className="text-sm opacity-55 mt-1">
              Aggregate collection across departments and semesters. No individual student is identified.
            </div>
          </button>
        )}

        <input
          ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain"
          className="hidden" onChange={e => onFile(e.target.files?.[0] || null)}
        />

        {busy && (
          <div className="mt-6 flex items-center gap-2 text-sm opacity-70">
            <Loader2 size={15} className="animate-spin" /> {busy}
          </div>
        )}

        <p className="text-xs opacity-40 mt-10 border-t border-white/10 pt-5">
          Informational only. This is not personalised financial advice.
        </p>
      </div>
    );
  }

  /* ---------- results ---------- */
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fee Statement Simplifier</h1>
          {analysis && (
            <p className="opacity-55 text-sm mt-1">
              Source: {analysis.source === "uploaded-statement" ? "the statement you uploaded" : "your portal fee record"}
              {" - analysed "}{analysis.generatedAt}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30">
            Upload another
          </button>
          {canInst && !inst && (
            <button onClick={loadInstitutional}
              className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30">
              Institutional view
            </button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain"
        className="hidden" onChange={e => onFile(e.target.files?.[0] || null)} />

      {err && <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}
      {busy && busy !== "thinking" && (
        <div className="mt-5 flex items-center gap-2 text-sm opacity-70">
          <Loader2 size={15} className="animate-spin" /> {busy}
        </div>
      )}

      {skipped > 0 && (
        <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span>{skipped} row(s) in that file could not be understood and were skipped, so the totals below cover
            only the rows that were read.</span>
        </div>
      )}

      {/* ---------- personal analysis ---------- */}
      {analysis && (
        <>
          <div className="grid sm:grid-cols-4 gap-3 mt-7">
            {[
              { l: "Billed", v: inr(analysis.totalBilled), c: "" },
              { l: "Paid", v: inr(analysis.totalPaid), c: "text-emerald-300" },
              { l: "Outstanding", v: inr(analysis.totalOutstanding), c: analysis.totalOutstanding > 0 ? "text-amber-300" : "text-emerald-300" },
              { l: "Overdue", v: analysis.overdueCount ? inr(analysis.overdueAmount) : "None", c: analysis.overdueCount ? "text-rose-300" : "text-emerald-300" },
            ].map(k => (
              <div key={k.l} className="panel-solid rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider opacity-55">{k.l}</div>
                <div className={"text-xl font-semibold mt-1 " + k.c}>{k.v}</div>
              </div>
            ))}
          </div>

          {summary && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-medium">What this means</h2>
                <DataBadge kind="derived" />
              </div>
              <p className="opacity-80 leading-relaxed">{summary}</p>
              <p className="text-[11px] opacity-40 mt-2">
                Written by the assistant from the exact figures above. It was not allowed to calculate anything.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {analysis.flags?.length ? analysis.flags.map((f: string, i: number) => (
              <div key={i} className="px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{f}</span>
              </div>
            )) : (
              <div className="px-4 py-3 rounded-lg text-sm border border-emerald-500/40 bg-emerald-500/10 flex gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>Nothing is outstanding and nothing is overdue.</span>
              </div>
            )}
          </div>

          <h2 className="text-lg font-medium mt-8 mb-3">By semester</h2>
          <div className="space-y-2">
            {analysis.lines?.map((l: any) => {
              const tone = l.overdue ? "border-l-rose-400" : l.settled ? "border-l-emerald-400" : "border-l-amber-400";
              return (
                <div key={l.semester} className={"panel-solid rounded-xl p-4 border-l-2 " + tone}>
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">Semester {l.semester}</div>
                      <div className="text-sm opacity-60 mt-1">
                        Billed {inr(l.totalFees)} - paid {inr(l.paidFees)} ({l.paidPercent}%)
                        {l.dueDate ? " - due " + String(l.dueDate).slice(0, 10) : " - no due date recorded"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={"font-semibold " + (l.settled ? "text-emerald-300" : l.overdue ? "text-rose-300" : "text-amber-300")}>
                        {l.settled ? "Settled" : inr(l.outstanding)}
                      </div>
                      {l.overdue && <div className="text-xs text-rose-300/80 mt-0.5">{l.daysOverdue} day(s) overdue</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rawTool && (
            <div className="mt-5">
              <button onClick={() => setShowRaw(v => !v)} className="text-xs opacity-60 hover:opacity-90 underline">
                {showRaw ? "Hide" : "Show"} the exact tool output the assistant was given
              </button>
              {showRaw && (
                <pre className="mt-2 text-[11px] leading-relaxed opacity-70 whitespace-pre-wrap panel-solid rounded-xl p-4 overflow-x-auto">
                  {rawTool}
                </pre>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------- institutional analysis ---------- */}
      {inst && (
        <>
          <div className="flex items-center gap-2 mt-10 mb-3">
            <h2 className="text-lg font-medium">Institutional position</h2>
            <span className="text-xs opacity-50">({instScope})</span>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { l: "Billed", v: inr(inst.totalBilled) },
              { l: "Collected", v: inr(inst.totalCollected) },
              { l: "Collection rate", v: inst.collectionRatePercent + "%" },
              { l: "Students overdue", v: String(inst.overdueStudents) },
            ].map(k => (
              <div key={k.l} className="panel-solid rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider opacity-55">{k.l}</div>
                <div className="text-xl font-semibold mt-1">{k.v}</div>
              </div>
            ))}
          </div>

          {!!inst.byDepartment?.length && (
            <div className="panel-solid rounded-xl p-4 mt-4">
              <div className="text-sm opacity-70 mb-3">Collection rate by department</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={inst.byDepartment} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                    <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,.4)" fontSize={11} />
                    <YAxis type="category" dataKey="department" width={110} stroke="rgba(255,255,255,.4)" fontSize={11} />
                    <Tooltip {...TT} formatter={(v: any) => [v + "%", "Collected"]} />
                    <Bar dataKey="collectionRatePercent" radius={[0, 4, 4, 0]}>
                      {inst.byDepartment.map((d: any, i: number) => (
                        <Cell key={i} fill={d.collectionRatePercent >= 80 ? "#34d399" : d.collectionRatePercent >= 50 ? "#fbbf24" : "#fb7185"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] opacity-40 mt-2">
                Aggregate figures computed from fee records. No individual student is identified in this view.
              </p>
            </div>
          )}
        </>
      )}

      {/* ---------- chat ---------- */}
      <div className="mt-10 border-t border-white/10 pt-7">
        <h2 className="text-lg font-medium">Ask about this</h2>
        <p className="text-sm opacity-55 mt-1">
          The assistant calls tools to get its figures and shows you which ones it used. It is not permitted
          to calculate anything itself.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {suggestions.map(s => (
            <button key={s} onClick={() => ask(s)} disabled={!!busy}
              className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3 mt-6">
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-right" : ""}>
              <div className={
                "inline-block max-w-[85%] text-left px-4 py-3 rounded-xl text-sm " +
                (t.role === "user" ? "bg-white/10" : "panel-solid")
              }>
                <div className="whitespace-pre-wrap leading-relaxed">{t.text}</div>
                {!!t.tools?.length && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/10">
                    <span className="text-[10px] opacity-45 flex items-center gap-1"><Wrench size={10} /> tools used:</span>
                    {t.tools.map(x => (
                      <span key={x} className="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/40 text-sky-300 bg-sky-500/10">
                        {TOOL_LABEL[x] || x}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy === "thinking" && (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <Loader2 size={14} className="animate-spin" /> Calling tools...
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") ask(q); }}
            placeholder="Ask a follow-up question"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 outline-none focus:border-white/35 text-sm"
          />
          <button onClick={() => ask(q)} disabled={!!busy || !q.trim()}
            className="px-4 rounded-xl border border-white/15 hover:border-white/30 disabled:opacity-40">
            <Send size={16} />
          </button>
        </div>
      </div>

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        Informational only and not personalised financial advice. Figures come from your portal fee record or the
        statement you uploaded, and policy answers are quoted from university documents held in the portal.
      </p>
    </div>
  );
}
