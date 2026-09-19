"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import {
  GraduationCap, AlertTriangle, CheckCircle2, Wrench, Send, Loader2, Users, Clock,
  Upload, FileText, Info,
} from "lucide-react";

/* Study plan.

   Every figure comes from server-side arithmetic over the student's recorded
   results. The adviser below is told it may never calculate and may never
   predict a grade - and the answers show which tools produced them. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

const TT = {
  contentStyle: { background: "#15121f", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff" },
  itemStyle: { color: "#fff" }, labelStyle: { color: "#fff" },
};

const TOOL_LABEL: Record<string, string> = {
  analyse_my_results: "Result arithmetic",
  analyse_cohort_performance: "Cohort arithmetic",
  search_academic_policy: "Policy search (RAG)",
  search_opportunities: "Live listings feed",
};

type Turn = { role: "user" | "ai"; text: string; tools?: string[] };

export default function StudyPanel() {
  const [status, setStatus] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [raw, setRaw] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [cohort, setCohort] = useState<any[] | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [upload, setUpload] = useState<{
    name: string; added: number; ignored: string[];
    skipped: number; recorded: number; notes: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/study/status", { headers: AUTH() })
      .then(r => r.ok ? r.json() : null).then(setStatus).catch(() => setStatus(null));
  }, []);

  const load = useCallback(async (t: number) => {
    setErr(""); setBusy("Reading your examination record...");
    try {
      const r = await fetch("/api/study/me?threshold=" + t, { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not load your results");
      if (!d.plan) { setReason(d.reason || "none"); setPlan(null); setBusy(""); return; }
      setPlan(d.plan); setReason("");

      setBusy("Explaining the plan...");
      const s = await fetch("/api/study/summary", {
        method: "POST", headers: H(), body: JSON.stringify({ threshold: t }),
      });
      const sd = await s.json();
      setSummary(sd.summary || ""); setRaw(sd.raw || "");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(""); }
  }, []);

  useEffect(() => { load(threshold); }, [load, threshold]);

  /* Uploading a transcript SUPPLEMENTS the portal's record; it never replaces
     it. Subjects the portal already issued come back in `ignored` and are left
     exactly as recorded. Nothing is stored - the file is parsed for this one
     calculation and discarded with the request. */
  async function onTranscript(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setBusy("Reading your transcript...");
    try {
      const text = await f.text();
      const r = await fetch("/api/study/upload", {
        method: "POST", headers: H(),
        body: JSON.stringify({ file: text, threshold }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not read that transcript");
      setPlan(d.plan); setReason("");
      setSummary(d.summary || ""); setRaw(d.raw || "");
      setUpload({
        name: f.name, added: d.added, ignored: d.ignored || [],
        skipped: d.skipped, recorded: d.recorded, notes: d.notes || [],
      });
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy("");
      e.target.value = "";
    }
  }

  function clearUpload() {
    setUpload(null);
    load(threshold);
  }

  async function loadCohort() {
    setErr(""); setBusy("Aggregating cohort performance...");
    try {
      const r = await fetch("/api/study/cohort?threshold=" + threshold, { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Not permitted");
      setCohort(d.subjects || []);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setQ("");
    setTurns(t => [...t, { role: "user", text }]);
    setBusy("thinking");
    try {
      const r = await fetch("/api/study/ask", {
        method: "POST", headers: H(),
        body: JSON.stringify({
          question: text, threshold,
          history: turns.slice(-6).map(t => ({ role: t.role, text: t.text })),
        }),
      });
      const d = await r.json();
      setTurns(t => [...t, { role: "ai", text: d.answer || d.error || "No answer returned.", tools: d.toolsUsed || [] }]);
    } catch (e: any) {
      setTurns(t => [...t, { role: "ai", text: "The adviser could not be reached: " + String(e?.message || e) }]);
    } finally { setBusy(""); }
  }

  const canCohort = !!status?.canViewCohort;
  const suggestions = canCohort
    ? ["Which subjects does the cohort struggle with most?", "What should I revise first?",
       "What does the policy say about supplementary exams?", "Which subjects am I strongest in?"]
    : ["What should I revise first?", "Which subjects am I strongest in?",
       "Find internships that match what I studied",
       "What does the policy say about supplementary exams?"];

  /* ---------- no results ---------- */
  if (!plan && reason) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <GraduationCap size={20} className="opacity-70" /> Study plan
        </h1>
        <div className="panel-solid rounded-xl p-6 mt-5 text-sm opacity-70">
          {reason === "no-student-record"
            ? "This account is not linked to a student record, so there are no examination results to analyse."
            : "No examination results are recorded against your enrolment yet. Once results are published, your study plan appears here automatically."}
        </div>

        {/* A transfer student, or anyone whose earlier semesters predate this
            system, has nothing here and nothing coming. An upload is the only
            way they get a plan at all. */}
        <div className="panel-solid rounded-xl p-6 mt-4">
          <div className="text-sm font-medium flex items-center gap-2">
            <Upload size={15} className="opacity-60" /> Have a transcript on paper?
          </div>
          <p className="text-sm opacity-60 mt-2 max-w-xl">
            If you transferred in, or your earlier semesters predate this portal, upload a
            CSV of your results and the plan will be built from that instead. Nothing is
            saved — it is read once and discarded.
          </p>
          <label className="inline-block mt-3">
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain"
              onChange={onTranscript} className="hidden" />
            <span className="text-sm px-4 py-2 rounded-lg bg-brand text-white cursor-pointer inline-flex items-center gap-2">
              <Upload size={14} /> Upload a transcript
            </span>
          </label>
          {err && <div className="mt-3 px-3 py-2 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex items-center gap-2 text-sm opacity-60">
        <Loader2 size={15} className="animate-spin" /> {busy || "Loading your study plan..."}
      </div>
    );
  }

  const chart = [...plan.items].map((i: any) => ({ name: i.subjectName, score: i.score, severity: i.severity }));

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GraduationCap size={20} className="opacity-70" /> Study plan
          </h1>
          <p className="opacity-55 text-sm mt-1">
            {upload
              ? <>Your record plus {upload.added} subject(s) from <b>{upload.name}</b> &middot; generated {plan.generatedAt}</>
              : <>Built from your recorded examination results &middot; generated {plan.generatedAt}</>}
          </p>
        </div>
        <div className="flex gap-2">
          {!upload && (
            <label>
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain"
                onChange={onTranscript} className="hidden" />
              <span className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5 cursor-pointer">
                <Upload size={13} /> Add a transcript
              </span>
            </label>
          )}
          {canCohort && !cohort && (
            <button onClick={loadCohort}
              className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5">
              <Users size={13} /> Cohort view
            </button>
          )}
        </div>
      </div>

      {err && <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      {/* ---------- uploaded transcript ---------- */}
      {upload && (
        <div className="mt-5 rounded-xl p-4 border border-sky-500/35 bg-sky-500/[0.06]">
          <div className="flex items-start gap-3">
            <FileText size={16} className="mt-0.5 opacity-60 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium">
                {upload.added} subject(s) added from {upload.name}
              </div>
              <div className="opacity-65 mt-1">
                Your {upload.recorded} recorded result(s) are unchanged. An uploaded
                transcript supplements the portal&rsquo;s record and never overwrites it.
              </div>

              {!!upload.ignored.length && (
                <div className="mt-2 flex items-start gap-1.5 opacity-70">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Already in your record, so the portal&rsquo;s marks were kept:{" "}
                    <b>{upload.ignored.join(", ")}</b>
                  </span>
                </div>
              )}
              {upload.skipped > 0 && (
                <div className="opacity-55 text-xs mt-1.5">
                  {upload.skipped} row(s) could not be read and were skipped, not guessed at.
                </div>
              )}
              <div className="opacity-45 text-xs mt-1.5">
                Nothing from this file has been saved.
              </div>
            </div>
            <button onClick={clearUpload}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 shrink-0">
              Remove
            </button>
          </div>
        </div>
      )}

      {/* structured input - changes the plan, not just the display */}
      <div className="panel-solid rounded-xl p-4 mt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium">Flag a subject below</div>
            <div className="text-xs opacity-50 mt-0.5">
              Raise it if you are aiming higher than a pass. Under 45 is treated as at risk of failing.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min={35} max={90} step={5} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-44 accent-violet-400" />
            <span className="text-sm font-semibold w-12 text-right">{threshold}</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-4">
        {[
          { l: "Subjects", v: String(plan.subjectCount), c: "" },
          { l: "Average", v: `${plan.averageScore}/100`, c: plan.averageScore >= 70 ? "text-emerald-300" : plan.averageScore >= 55 ? "text-amber-300" : "text-rose-300" },
          { l: "Weak areas", v: String(plan.weakCount), c: plan.weakCount ? "text-amber-300" : "text-emerald-300" },
          { l: "At risk", v: String(plan.criticalCount), c: plan.criticalCount ? "text-rose-300" : "text-emerald-300" },
        ].map(k => (
          <div key={k.l} className="panel-solid rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider opacity-55">{k.l}</div>
            <div className={"text-xl font-semibold mt-1 " + k.c}>{k.v}</div>
          </div>
        ))}
      </div>

      {summary && (
        <div className="mt-6">
          <h2 className="text-lg font-medium">What this means</h2>
          <p className="opacity-80 leading-relaxed mt-2">{summary}</p>
          <p className="text-[11px] opacity-40 mt-2">
            Written by the adviser from the exact figures above. It was not allowed to calculate anything,
            and it does not predict grades.
          </p>
        </div>
      )}

      {plan.criticalCount > 0 ? (
        <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10 flex gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span><b>{plan.criticalCount} subject(s) at risk of failing.</b> Scoring under 45 out of 100 — first in the plan below.</span>
        </div>
      ) : plan.weakCount > 0 ? (
        <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span><b>{plan.weakCount} weak subject(s)</b> below {threshold}/100, but none at failing level.</span>
        </div>
      ) : (
        <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-emerald-500/40 bg-emerald-500/10 flex gap-2">
          <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
          <span>Nothing falls below {threshold}/100. No revision is flagged at this threshold.</span>
        </div>
      )}

      {!!chart.length && (
        <div className="panel-solid rounded-xl p-4 mt-5">
          <div className="text-sm opacity-70 mb-3">Weak subjects, worst first</div>
          <div style={{ width: "100%", height: Math.max(220, 42 * chart.length) }}>
            <ResponsiveContainer>
              <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,.4)" fontSize={11} />
                <YAxis type="category" dataKey="name" width={150} stroke="rgba(255,255,255,.4)" fontSize={11} />
                <Tooltip {...TT} formatter={(v: any) => [v + "/100", "Score"]} />
                <ReferenceLine x={threshold} stroke="#8A94A6" strokeDasharray="4 4" />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chart.map((d: any, i: number) => (
                    <Cell key={i} fill={d.severity === "critical" ? "#fb7185" : "#fbbf24"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] opacity-40 mt-2">Dashed line is your threshold. Red is at risk of failing.</p>
        </div>
      )}

      <h2 className="text-lg font-medium mt-8 mb-3">Prioritised plan</h2>
      <div className="space-y-2">
        {plan.items.map((i: any) => (
          <div key={i.subjectCode + i.priority}
            className={"panel-solid rounded-xl p-4 border-l-2 " +
              (i.severity === "critical" ? "border-l-rose-400" : "border-l-amber-400")}>
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] w-5 h-5 rounded border border-white/20 inline-flex items-center justify-center opacity-70">
                    {i.priority}
                  </span>
                  {i.subjectName}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">{i.subjectCode}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">sem {i.semester}</span>
                </div>
                <div className="text-sm opacity-60 mt-1.5">{i.reason}</div>
              </div>
              <div className="text-right">
                <div className={"font-semibold " + (i.severity === "critical" ? "text-rose-300" : "text-amber-300")}>
                  {i.score}/100
                </div>
                <div className="text-xs opacity-50 mt-0.5 flex items-center gap-1 justify-end">
                  <Clock size={11} /> {i.hoursPerWeek} hrs/week
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!!plan.strongest?.length && (
        <>
          <h2 className="text-lg font-medium mt-8 mb-3">Strongest subjects</h2>
          <div className="flex flex-wrap gap-2">
            {plan.strongest.map((s: any) => (
              <span key={s.subjectName}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                {s.subjectName} · {s.score}/100
              </span>
            ))}
          </div>
        </>
      )}

      {cohort && (
        <>
          <h2 className="text-lg font-medium mt-8 mb-3">Cohort performance</h2>
          <div className="space-y-2">
            {cohort.slice(0, 8).map((s: any) => (
              <div key={s.subjectCode} className="panel-solid rounded-xl p-3 flex justify-between items-center gap-3 flex-wrap">
                <div className="text-sm">
                  {s.subjectName} <span className="opacity-40 text-xs">({s.subjectCode})</span>
                </div>
                <div className="text-xs opacity-60">
                  avg {s.average}/100 · {s.students} student(s) · {s.belowThreshold} below {threshold}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] opacity-40 mt-2">
            Aggregate figures only. No individual student is identified in this view.
          </p>
        </>
      )}

      {raw && (
        <div className="mt-5">
          <button onClick={() => setShowRaw(v => !v)} className="text-xs opacity-60 hover:opacity-90 underline">
            {showRaw ? "Hide" : "Show"} the exact tool output the adviser was given
          </button>
          {showRaw && (
            <pre className="mt-2 text-[11px] leading-relaxed opacity-70 whitespace-pre-wrap panel-solid rounded-xl p-4 overflow-x-auto">
              {raw}
            </pre>
          )}
        </div>
      )}

      {/* ---------- chat ---------- */}
      <div className="mt-10 border-t border-white/10 pt-7">
        <h2 className="text-lg font-medium">Ask about your results</h2>
        <p className="text-sm opacity-55 mt-1">
          The adviser calls tools to get its figures and shows which ones it used. It cannot calculate,
          and it will not predict a grade.
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
              <div className={"inline-block max-w-[85%] text-left px-4 py-3 rounded-xl text-sm " +
                (t.role === "user" ? "bg-white/10" : "panel-solid")}>
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
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") ask(q); }}
            placeholder="Ask a follow-up question"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 outline-none focus:border-white/35 text-sm" />
          <button onClick={() => ask(q)} disabled={!!busy || !q.trim()}
            className="px-4 rounded-xl border border-white/15 hover:border-white/30 disabled:opacity-40">
            <Send size={16} />
          </button>
        </div>
      </div>

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        Guidance only, built from your recorded examination results. It does not predict results and is
        not a substitute for advice from your faculty.
      </p>
    </div>
  );
}
