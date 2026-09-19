"use client";
import { useEffect, useState, useCallback } from "react";

const HANDLERS = ["ADMIN", "HOD", "HOI", "OWNER", "SUPER_ADMIN"];
const CATS = ["Academic", "Examination", "Fees", "Harassment", "Infrastructure", "Faculty conduct", "Hostel", "Other"];
const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

export default function Grievance() {
  const [role, setRole] = useState("STUDENT");
  const [tab, setTab] = useState<"raise" | "track" | "queue">("raise");
  const [f, setF] = useState({ category: "Academic", subject: "", body: "" });
  const [done, setDone] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [tracked, setTracked] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [idVisible, setIdVisible] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const p = JSON.parse(atob(tok().split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setRole(String(p.role || p.roleCode || "STUDENT").toUpperCase());
    } catch {}
  }, []);
  const isHandler = HANDLERS.includes(role);

  const load = useCallback(async () => {
    if (!isHandler) return;
    const r = await fetch("/api/inst/grievances", { headers: H() });
    if (r.ok) { const d = await r.json(); setItems(d.items || []); setIdVisible(!!d.identityVisible); }
  }, [isHandler]);
  useEffect(() => { load(); }, [load]);

  async function send() {
    setErr("");
    if (!f.subject.trim() || !f.body.trim()) return setErr("Subject and details are required");
    const r = await fetch("/api/inst/grievances", { method: "POST", headers: H(), body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Could not submit");
    setDone(d.code); setF({ category: "Academic", subject: "", body: "" });
  }

  async function track() {
    const r = await fetch("/api/inst/grievances?code=" + trackCode.trim().toUpperCase(), { headers: H() });
    setTracked(r.ok ? (await r.json()).item : { error: "Not found" });
  }

  async function respond(id: string, status: string) {
    await fetch("/api/inst/grievances", { method: "PATCH", headers: H(),
      body: JSON.stringify({ id, status, response: reply[id] || undefined }) });
    setReply({ ...reply, [id]: "" }); load();
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold gradient-text">Grievance Channel</h1>
      <p className="text-sm opacity-60 mb-6">Your identity is hidden from staff handling this case</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {([["raise", "Raise a grievance"], ["track", "Track by code"]] as any[])
          .concat(isHandler ? [["queue", "Case queue (" + items.length + ")"]] : [])
          .map(([k, l]: any) => (
            <button key={k} onClick={() => setTab(k)}
              className={"px-4 py-2 rounded-lg text-sm border " +
                (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-[var(--border)] hover:border-[var(--border-strong)]")}>{l}</button>
          ))}
      </div>

      {tab === "raise" && (done
        ? <div className="panel-solid rounded-xl p-6 max-w-xl">
            <div className="text-sm opacity-70">Submitted. Save this code - it is the only way to track your case.</div>
            <div className="text-3xl font-mono tracking-widest mt-3">{done}</div>
            <button onClick={() => setDone("")} className="mt-5 text-sm underline opacity-70">Raise another</button>
          </div>
        : <div className="panel-solid rounded-xl p-5 max-w-2xl">
            {err && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}
            <label className="text-xs opacity-70 block mb-3">Category
              <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm">
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs opacity-70 block mb-3">Subject
              <input value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-xs opacity-70 block">Details
              <textarea rows={6} value={f.body} onChange={e => setF({ ...f, body: e.target.value })}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </label>
            <button onClick={send} className="mt-4 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">Submit anonymously</button>
          </div>)}

      {tab === "track" && (
        <div className="panel-solid rounded-xl p-5 max-w-2xl">
          <div className="flex gap-2">
            <input value={trackCode} onChange={e => setTrackCode(e.target.value)} placeholder="GR-XXXXXX"
              className="flex-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm font-mono" />
            <button onClick={track} className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">Track</button>
          </div>
          {tracked && (tracked.error
            ? <div className="mt-4 text-sm text-rose-300">No grievance with that code.</div>
            : <div className="mt-4">
                <div className="font-medium">{tracked.subject}</div>
                <div className="text-xs opacity-55 mt-0.5">{tracked.category} - {tracked.status}</div>
                <div className="text-sm mt-3 opacity-80">{tracked.body}</div>
                {tracked.response && (
                  <div className="mt-4 border-l-2 border-emerald-500/50 pl-3">
                    <div className="text-[10px] uppercase tracking-wider opacity-50">Response from {tracked.respondedBy}</div>
                    <div className="text-sm mt-1">{tracked.response}</div>
                  </div>
                )}
              </div>)}
        </div>
      )}

      {tab === "queue" && isHandler && (
        <div className="space-y-3">
          <div className="text-xs opacity-55">
            {idVisible ? "You can see identities (Owner privilege)" : "Identities are hidden at your role level"}
          </div>
          {items.length === 0 && <div className="opacity-55 text-sm">No grievances.</div>}
          {items.map(g => (
            <div key={g.id} className="panel-solid rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-sm">{g.subject} <span className="opacity-45 font-mono">{g.code}</span></div>
                  <div className="text-xs opacity-55 mt-0.5">
                    {g.category} - {new Date(g.createdAt).toLocaleString()}
                    {g.identityRef ? " - " + g.identityRef : " - anonymous"}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-strong)]">{g.status}</span>
              </div>
              <div className="text-sm opacity-80 mt-3">{g.body}</div>
              {g.response && <div className="mt-3 text-sm border-l-2 border-emerald-500/50 pl-3">{g.response}</div>}
              <div className="flex gap-2 mt-3 flex-wrap">
                <input value={reply[g.id] || ""} onChange={e => setReply({ ...reply, [g.id]: e.target.value })}
                  placeholder="Write a response..."
                  className="flex-1 min-w-[220px] bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
                <button onClick={() => respond(g.id, "UNDER_REVIEW")} className="px-3 py-1.5 rounded text-xs bg-amber-600/80">Reviewing</button>
                <button onClick={() => respond(g.id, "RESOLVED")} className="px-3 py-1.5 rounded text-xs bg-emerald-600/80">Resolve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
