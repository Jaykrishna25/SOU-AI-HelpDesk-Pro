"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";

const APPROVERS = ["FACULTY", "HOD", "HOI", "ADMIN", "SUPER_ADMIN", "OWNER"];
const tok = () => { try { return sessionStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

export default function QRAttendance() {
  const [role, setRole] = useState("STUDENT");
  const [tab, setTab] = useState<"start" | "mine" | "queue">("start");
  const [scan, setScan] = useState<{ k: string; t: string } | null>(null);
  const [live, setLive] = useState<any>(null);
  const [png, setPng] = useState("");
  const [mine, setMine] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [cls, setCls] = useState("");
  const [expected, setExpected] = useState(60);
  const [mins, setMins] = useState(10);
  const [err, setErr] = useState("");
  const lastCode = useRef("");

  useEffect(() => {
    try {
      const p = JSON.parse(atob(tok().split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setRole(String(p.role || p.roleCode || "STUDENT").toUpperCase());
    } catch {}
  }, []);
  const canApprove = APPROVERS.includes(role);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("s"), c = q.get("c");
    if (!s || !c) return;
    if (!tok()) { setScan({ k: "err", t: "Please sign in first, then scan again." }); return; }
    fetch("/api/qr/scan", { method: "POST", headers: H(), body: JSON.stringify({ sessionId: s, code: c }) })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) setScan({ k: "err", t: d.error || "Could not mark attendance" });
        else if (d.already) setScan({ k: "ok", t: "Already marked present for " + d.subject });
        else setScan({ k: "ok", t: "Present - " + d.subject + " " + (d.className || "") });
      })
      .catch(() => setScan({ k: "err", t: "Network error" }));
  }, []);

  const loadLists = useCallback(async () => {
    const m = await fetch("/api/qr/sessions?scope=mine", { headers: H() });
    if (m.ok) setMine((await m.json()).items || []);
    if (canApprove) {
      const q = await fetch("/api/qr/sessions?scope=pending", { headers: H() });
      if (q.ok) setQueue((await q.json()).items || []);
    }
  }, [canApprove]);
  useEffect(() => { if (tok()) loadLists(); }, [loadLists]);

  useEffect(() => {
    if (!live?.session?.id) return;
    const tick = async () => {
      const r = await fetch("/api/qr/live?id=" + live.session.id, { headers: H() });
      if (!r.ok) return;
      const d = await r.json();
      setLive(d);
      if (d.code && d.code !== lastCode.current) {
        lastCode.current = d.code;
        const url = window.location.origin + "/attendance/qr?s=" + d.session.id + "&c=" + d.code;
        setPng(await QRCode.toDataURL(url, { width: 520, margin: 1,
          color: { dark: "#0b0b12", light: "#ffffff" } }));
      }
    };
    const iv = setInterval(tick, 3000);
    return () => clearInterval(iv);
  }, [live?.session?.id]);

  async function start() {
    setErr("");
    if (!subject.trim()) return setErr("Subject is required");
    const r = await fetch("/api/qr/sessions", { method: "POST", headers: H(),
      body: JSON.stringify({ subjectName: subject, className: cls, expectedCount: expected, minutes: mins }) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Could not start session");
    const l = await fetch("/api/qr/live?id=" + d.id, { headers: H() });
    setLive(await l.json());
    lastCode.current = "";
  }

  async function act(id: string, action: string) {
    await fetch("/api/qr/sessions", { method: "PATCH", headers: H(), body: JSON.stringify({ id, action }) });
    if (live?.session?.id === id && action === "close") setLive(null);
    loadLists();
  }

  if (scan) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className={"panel-solid rounded-2xl p-8 max-w-md text-center border " +
          (scan.k === "ok" ? "border-emerald-500/50" : "border-rose-500/50")}>
          <div className={"text-5xl mb-4 " + (scan.k === "ok" ? "text-emerald-400" : "text-rose-400")}>
            {scan.k === "ok" ? "OK" : "!"}
          </div>
          <div className="text-lg">{scan.t}</div>
          <a href="/attendance/qr" className="inline-block mt-6 text-sm underline opacity-70 hover:opacity-100">
            Back to attendance
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold gradient-text">QR Attendance</h1>
      <p className="text-sm opacity-60 mb-6">Rotating code - CR displays, students scan, faculty approves</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {([["start", "Start session"], ["mine", "My sessions"]] as any[])
          .concat(canApprove ? [["queue", "Approvals (" + queue.length + ")"]] : [])
          .map(([k, l]: any) => (
            <button key={k} onClick={() => setTab(k)}
              className={"px-4 py-2 rounded-lg text-sm border transition-colors " +
                (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-white/10 hover:border-white/25")}>
              {l}
            </button>
          ))}
      </div>

      {tab === "start" && !live && (
        <div className="panel-solid rounded-xl p-5 max-w-2xl">
          {err && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs opacity-70">Subject
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Data Structures"
                className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-xs opacity-70">Class / Division
              <input value={cls} onChange={e => setCls(e.target.value)} placeholder="CSE 7A"
                className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-xs opacity-70">Expected strength
              <input type="number" value={expected} onChange={e => setExpected(+e.target.value)}
                className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-xs opacity-70">Open for (minutes)
              <input type="number" min={2} max={60} value={mins} onChange={e => setMins(+e.target.value)}
                className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={start} className="mt-5 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm">
            Start attendance session
          </button>
        </div>
      )}

      {live && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel-solid rounded-xl p-6 text-center">
            <div className="text-sm opacity-70 mb-1">{live.session.subjectName} - {live.session.className}</div>
            {png
              ? <img src={png} alt="Attendance QR" className="mx-auto rounded-lg w-full max-w-[420px]" />
              : <div className="opacity-50 py-20">Generating code...</div>}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-widest opacity-50">Manual code</div>
              <div className="text-4xl font-mono tracking-[0.3em] mt-1">{live.code || "CLOSED"}</div>
              <div className="text-xs opacity-45 mt-1">Rotates every {live.rotateMs / 1000} seconds</div>
            </div>
            <button onClick={() => act(live.session.id, "close")}
              className="mt-5 px-5 py-2 rounded-lg border border-white/15 hover:border-white/35 text-sm">
              Close session
            </button>
          </div>

          <div className="panel-solid rounded-xl p-5">
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-medium">Marked present</span>
              <span className="text-2xl font-semibold">
                {live.scans.length}
                <span className="text-sm opacity-50"> / {live.session.expectedCount || "?"}</span>
              </span>
            </div>
            <div className="space-y-1.5 max-h-[420px] overflow-auto">
              {live.scans.length === 0 && <div className="opacity-50 text-sm">Waiting for the first scan...</div>}
              {live.scans.map((s: any) => (
                <div key={s.id} className="flex justify-between text-sm bg-white/5 rounded px-3 py-2">
                  <span>{s.name} <span className="opacity-45">{s.enrollment}</span></span>
                  <span className="opacity-45 text-xs">{new Date(s.at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "mine" && !live && (
        <div className="space-y-2">
          {mine.length === 0 && <div className="opacity-55 text-sm">No sessions yet.</div>}
          {mine.map(s => (
            <div key={s.id} className="panel-solid rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="font-medium text-sm">{s.subjectName} - {s.className}</div>
                <div className="text-xs opacity-55 mt-0.5">
                  {new Date(s.createdAt).toLocaleString()} - {s.scans.length} present
                </div>
                <div className="text-xs opacity-45 mt-0.5">{s.syncState}</div>
              </div>
              <span className={"text-[10px] px-2 py-0.5 rounded-full border " +
                (s.approved ? "border-emerald-500/40 text-emerald-300"
                  : s.closed ? "border-amber-500/40 text-amber-300" : "border-sky-500/40 text-sky-300")}>
                {s.approved ? "APPROVED" : s.closed ? "AWAITING FACULTY" : "LIVE"}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "queue" && canApprove && !live && (
        <div className="space-y-2">
          {queue.length === 0 && <div className="opacity-55 text-sm">Nothing awaiting approval.</div>}
          {queue.map(s => (
            <div key={s.id} className="panel-solid rounded-xl p-4">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-sm">{s.subjectName} - {s.className}</div>
                  <div className="text-xs opacity-55 mt-0.5">
                    {new Date(s.createdAt).toLocaleString()} - {s.scans.length} of {s.expectedCount || "?"} present
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(s.id, "approve")}
                    className="px-3 py-1.5 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500">Approve and sync</button>
                  <button onClick={() => act(s.id, "reject")}
                    className="px-3 py-1.5 rounded text-xs bg-rose-600/80 hover:bg-rose-500">Reject</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.scans.map((x: any) => (
                  <span key={x.id} className="text-[11px] px-2 py-0.5 rounded bg-white/10">
                    {x.studentName} {x.enrollment}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
