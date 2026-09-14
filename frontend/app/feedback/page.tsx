"use client";
import { useEffect, useState, useCallback } from "react";

const CREATORS = ["FACULTY", "HOD", "HOI", "ADMIN", "SUPER_ADMIN", "OWNER"];
const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const Q = ["clarity", "engagement", "fairness", "availability", "overall"] as const;
const LABEL: Record<string, string> = {
  clarity: "Explains concepts clearly",
  engagement: "Makes the class engaging",
  fairness: "Assesses and grades fairly",
  availability: "Available for doubts outside class",
  overall: "Overall rating",
};

export default function Feedback() {
  const [role, setRole] = useState("STUDENT");
  const [tab, setTab] = useState<"open" | "manage">("open");
  const [forms, setForms] = useState<any[]>([]);
  const [managed, setManaged] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [agg, setAgg] = useState<any>(null);
  const [ans, setAns] = useState<Record<string, number>>({ clarity: 4, engagement: 4, fairness: 4, availability: 4, overall: 4 });
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<{ k: string; t: string } | null>(null);
  const [nf, setNf] = useState({ subjectName: "", facultyName: "", term: "Odd 2026-27", days: 14 });

  useEffect(() => {
    try {
      const p = JSON.parse(atob(tok().split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setRole(String(p.role || p.roleCode || "STUDENT").toUpperCase());
    } catch {}
  }, []);
  const canManage = CREATORS.includes(role);

  const load = useCallback(async () => {
    const r = await fetch("/api/inst/forms", { headers: H() });
    if (r.ok) setForms((await r.json()).items || []);
    if (canManage) {
      const m = await fetch("/api/inst/forms?scope=manage", { headers: H() });
      if (m.ok) setManaged((await m.json()).items || []);
    }
  }, [canManage]);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    const r = await fetch("/api/inst/responses", { method: "POST", headers: H(),
      body: JSON.stringify({ formId: sel.id, ...ans, comment }) });
    const d = await r.json();
    setMsg(r.ok ? { k: "ok", t: "Feedback submitted anonymously. Thank you." } : { k: "err", t: d.error });
    setSel(null); setComment(""); load();
  }

  async function create() {
    const r = await fetch("/api/inst/forms", { method: "POST", headers: H(), body: JSON.stringify(nf) });
    const d = await r.json();
    setMsg(r.ok ? { k: "ok", t: "Form created: " + d.form.code } : { k: "err", t: d.error });
    load();
  }

  async function openAgg(id: string) {
    const r = await fetch("/api/inst/aggregate?formId=" + id, { headers: H() });
    setAgg(r.ok ? await r.json() : null);
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold gradient-text">Course Feedback</h1>
      <p className="text-sm opacity-60 mb-6">Anonymous end-of-term evaluation</p>

      {msg && <div className={"mb-4 px-4 py-3 rounded-lg text-sm border " +
        (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>{msg.t}</div>}

      {canManage && (
        <div className="flex gap-2 mb-5">
          {[["open", "Give feedback"], ["manage", "Manage and results"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k as any); setAgg(null); }}
              className={"px-4 py-2 rounded-lg text-sm border " +
                (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-white/10 hover:border-white/25")}>{l}</button>
          ))}
        </div>
      )}

      {tab === "open" && !sel && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forms.length === 0 && <div className="opacity-55 text-sm">No open feedback forms.</div>}
          {forms.map(f => (
            <button key={f.id} disabled={f.submitted} onClick={() => setSel(f)}
              className={"panel-solid rounded-xl p-4 text-left " + (f.submitted ? "opacity-45" : "hover:scale-[1.02] transition-transform")}>
              <div className="font-medium">{f.subjectName}</div>
              <div className="text-xs opacity-55 mt-0.5">{f.facultyName} - {f.term}</div>
              <div className="text-xs opacity-45 mt-2">
                {f.submitted ? "Already submitted" : "Closes " + new Date(f.closesAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="panel-solid rounded-xl p-5 max-w-2xl">
          <div className="font-medium">{sel.subjectName}</div>
          <div className="text-xs opacity-55 mb-5">{sel.facultyName}</div>
          {Q.map(q => (
            <div key={q} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="opacity-80">{LABEL[q]}</span>
                <span className="font-semibold">{ans[q]}</span>
              </div>
              <input type="range" min={1} max={5} value={ans[q]} className="w-full accent-violet-500"
                onChange={e => setAns({ ...ans, [q]: +e.target.value })} />
            </div>
          ))}
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder="Anything else? (optional, anonymous)"
            className="w-full bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-4">
            <button onClick={submit} className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">Submit anonymously</button>
            <button onClick={() => setSel(null)} className="px-5 py-2 rounded-lg border border-white/15 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {tab === "manage" && canManage && !agg && (
        <>
          <div className="panel-solid rounded-xl p-5 mb-5 max-w-3xl">
            <div className="font-medium mb-3">Create a feedback form</div>
            <div className="grid gap-3 md:grid-cols-4">
              <input placeholder="Subject" value={nf.subjectName} onChange={e => setNf({ ...nf, subjectName: e.target.value })}
                className="bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              <input placeholder="Faculty name" value={nf.facultyName} onChange={e => setNf({ ...nf, facultyName: e.target.value })}
                className="bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              <input placeholder="Term" value={nf.term} onChange={e => setNf({ ...nf, term: e.target.value })}
                className="bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              <input type="number" placeholder="Open days" value={nf.days} onChange={e => setNf({ ...nf, days: +e.target.value })}
                className="bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={create} className="mt-4 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">Create</button>
          </div>
          <div className="space-y-2">
            {managed.map(f => (
              <button key={f.id} onClick={() => openAgg(f.id)}
                className="panel-solid rounded-xl p-4 w-full text-left flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{f.subjectName}</div>
                  <div className="text-xs opacity-55">{f.facultyName} - {f.term} - {f.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">{f._count?.responses ?? 0}</div>
                  <div className="text-[10px] uppercase opacity-50">responses</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {agg && (
        <div className="panel-solid rounded-xl p-5 max-w-3xl">
          <button onClick={() => setAgg(null)} className="text-xs underline opacity-60 mb-3">Back</button>
          <div className="font-medium">{agg.form.subjectName} - {agg.form.facultyName}</div>
          <div className="text-xs opacity-55 mb-4">{agg.count} anonymous responses</div>
          {Q.map(q => (
            <div key={q} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="opacity-80">{LABEL[q]}</span>
                <span className="font-semibold">{agg.scores[q]} / 5</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: (agg.scores[q] / 5 * 100) + "%" }} />
              </div>
            </div>
          ))}
          {agg.comments.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wider opacity-50 mb-2">Comments</div>
              <div className="space-y-2">
                {agg.comments.map((c: string, i: number) => (
                  <div key={i} className="text-sm bg-white/5 rounded px-3 py-2">{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
