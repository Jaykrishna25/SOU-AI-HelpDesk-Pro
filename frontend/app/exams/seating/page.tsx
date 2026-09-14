"use client";
import { useEffect, useState, useCallback } from "react";

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

const SAMPLE = `Navlani Jaykrishna Satishkumar, SOU2023CSE69, CSE
Patel Aarav Kiran, SOU2023CSE12, CSE
Shah Riya Mehul, SOU2023IT05, IT
Desai Krish Nilesh, SOU2023IT18, IT
Joshi Ananya Rajesh, SOU2023ECE07, ECE
Mehta Dhruv Sanjay, SOU2023ECE22, ECE`;

const PALETTE = ["#8b5cf6", "#10b981", "#f59e0b", "#38bdf8", "#f43f5e", "#a3e635", "#e879f9", "#fb923c"];

export default function Seating() {
  const [tab, setTab] = useState<"new" | "plans">("new");
  const [examName, setExamName] = useState("Mid Semester Examination");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [rooms, setRooms] = useState([{ room: "A-301", rows: 6, cols: 6 }]);
  const [raw, setRaw] = useState(SAMPLE);
  const [msg, setMsg] = useState<{ k: string; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [view, setView] = useState<any>(null);

  const students = raw.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split(",").map(x => x.trim());
    return { name: p[0] || "", enrollment: p[1] || "", course: p[2] || "GENERAL" };
  });
  const capacity = rooms.reduce((a, r) => a + (r.rows || 0) * (r.cols || 0), 0);

  const load = useCallback(async () => {
    const r = await fetch("/api/exam/plans", { headers: H() });
    if (r.ok) setPlans((await r.json()).items || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/exam/plans", { method: "POST", headers: H(),
      body: JSON.stringify({ examName, examDate, rooms, students }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ k: "err", t: d.error });
    setMsg({ k: "ok", t: d.code + " - " + d.seated + " seated, " + d.violations + " adjacency conflicts, " + d.unseated + " unseated" });
    load(); open(d.id);
  }

  async function open(id: string) {
    const r = await fetch("/api/exam/plan?id=" + id, { headers: H() });
    if (r.ok) { setView(await r.json()); setTab("plans"); }
  }

  async function remove(id: string) {
    await fetch("/api/exam/plan?id=" + id, { method: "DELETE", headers: H() });
    setView(null); load();
  }

  function csv() {
    const rows = [["Seat", "Room", "Row", "Col", "Name", "Enrollment", "Course"]]
      .concat(view.plan.seats.map((s: any) => [s.seatNo, s.room, s.rowNo, s.colNo, s.studentName, s.enrollment, s.course]));
    const blob = new Blob([rows.map(r => r.map(String).map(v => '"' + v.replace(/"/g, '""') + '"').join(",")).join("\n")],
      { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = view.plan.code + "-seating.csv";
    a.click();
  }

  const courses = view ? Array.from(new Set(view.plan.seats.map((s: any) => s.course))) as string[] : [];
  const colour = (c: string) => PALETTE[courses.indexOf(c) % PALETTE.length];

  return (
    <main className="min-h-screen p-5 md:p-8">
      <style>{"@media print{body{background:#fff!important;color:#000!important}.no-print{display:none!important}.seat-cell{border:1px solid #000!important;color:#000!important;background:#fff!important}}"}</style>

      <h1 className="text-2xl md:text-3xl font-semibold gradient-text no-print">Exam Seating</h1>
      <p className="text-sm opacity-60 mb-6 no-print">Auto-allocation with no same-course neighbours</p>

      {msg && <div className={"mb-4 px-4 py-3 rounded-lg text-sm border no-print " +
        (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>{msg.t}</div>}

      <div className="flex gap-2 mb-5 flex-wrap no-print">
        {[["new", "Generate"], ["plans", "Saved plans (" + plans.length + ")"]].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k as any); setView(null); }}
            className={"px-4 py-2 rounded-lg text-sm border " +
              (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-white/10 hover:border-white/25")}>{l}</button>
        ))}
      </div>

      {tab === "new" && (
        <div className="grid gap-5 lg:grid-cols-2 no-print">
          <div className="panel-solid rounded-xl p-5">
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <label className="text-xs opacity-70">Exam
                <input value={examName} onChange={e => setExamName(e.target.value)}
                  className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              </label>
              <label className="text-xs opacity-70">Date
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="text-xs uppercase tracking-wider opacity-55 mb-2">Halls</div>
            {rooms.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={r.room} placeholder="Room"
                  onChange={e => setRooms(rooms.map((x, j) => j === i ? { ...x, room: e.target.value } : x))}
                  className="flex-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
                <input type="number" min={1} value={r.rows} title="Rows"
                  onChange={e => setRooms(rooms.map((x, j) => j === i ? { ...x, rows: +e.target.value } : x))}
                  className="w-20 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
                <input type="number" min={1} value={r.cols} title="Columns"
                  onChange={e => setRooms(rooms.map((x, j) => j === i ? { ...x, cols: +e.target.value } : x))}
                  className="w-20 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
                <button onClick={() => setRooms(rooms.filter((_, j) => j !== i))}
                  className="px-3 rounded border border-white/15 text-sm">x</button>
              </div>
            ))}
            <button onClick={() => setRooms([...rooms, { room: "", rows: 6, cols: 6 }])}
              className="text-xs underline opacity-70 hover:opacity-100">Add hall</button>

            <div className="mt-5 text-sm flex justify-between">
              <span className="opacity-60">Students: {students.length}</span>
              <span className={capacity < students.length ? "text-rose-400" : "text-emerald-400"}>
                Seats: {capacity}
              </span>
            </div>

            <button onClick={generate} disabled={busy || capacity < students.length}
              className="mt-4 w-full px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm">
              {busy ? "Allocating..." : "Generate seating plan"}
            </button>
          </div>

          <div className="panel-solid rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider opacity-55 mb-2">
              Student list - one per line: Name, Enrollment, Course
            </div>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={16}
              className="w-full bg-black/30 border border-white/15 rounded px-3 py-2 text-xs font-mono" />
            <div className="text-[11px] opacity-45 mt-2">
              Paste straight from a spreadsheet column. Course is what the allocator keeps apart.
            </div>
          </div>
        </div>
      )}

      {tab === "plans" && !view && (
        <div className="space-y-2 no-print">
          {plans.length === 0 && <div className="opacity-55 text-sm">No saved plans.</div>}
          {plans.map(p => (
            <div key={p.id} className="panel-solid rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="font-medium text-sm">{p.examName} <span className="opacity-45 font-mono">{p.code}</span></div>
                <div className="text-xs opacity-55 mt-0.5">
                  {new Date(p.examDate).toLocaleDateString()} - {p._count?.seats ?? p.totalSeats} seats - {p.createdBy}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => open(p.id)} className="px-3 py-1.5 rounded text-xs bg-violet-600/80 hover:bg-violet-500">View</button>
                <button onClick={() => remove(p.id)} className="px-3 py-1.5 rounded text-xs border border-white/15">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view && (
        <div>
          <div className="flex justify-between items-center flex-wrap gap-3 mb-4 no-print">
            <button onClick={() => setView(null)} className="text-xs underline opacity-70">Back to plans</button>
            <div className="flex gap-2">
              <button onClick={csv} className="px-3 py-1.5 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500">Download CSV</button>
              <button onClick={() => window.print()} className="px-3 py-1.5 rounded text-xs border border-white/20">Print</button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-lg font-semibold">{view.plan.examName}</div>
            <div className="text-xs opacity-60">
              {new Date(view.plan.examDate).toLocaleDateString()} - {view.plan.code} - {view.plan.seats.length} students
            </div>
          </div>

          <div className="flex gap-3 flex-wrap mb-5 text-xs">
            {courses.map(c => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: colour(c) }} />{c}
              </span>
            ))}
          </div>

          {view.rooms.map((r: any) => {
            const inRoom = view.plan.seats.filter((s: any) => s.room === r.room);
            if (!inRoom.length) return null;
            return (
              <div key={r.room} className="mb-8">
                <div className="font-medium mb-2">Hall {r.room} <span className="opacity-50 text-sm">({inRoom.length} seated)</span></div>
                <div className="overflow-auto">
                  <div className="inline-grid gap-1"
                    style={{ gridTemplateColumns: "repeat(" + r.cols + ", minmax(120px, 1fr))" }}>
                    {Array.from({ length: r.rows * r.cols }).map((_, i) => {
                      const row = Math.floor(i / r.cols) + 1, col = (i % r.cols) + 1;
                      const s = inRoom.find((x: any) => x.rowNo === row && x.colNo === col);
                      return (
                        <div key={i} className="seat-cell rounded p-2 text-[11px] leading-tight border"
                          style={{
                            borderColor: s ? colour(s.course) + "99" : "rgba(255,255,255,0.08)",
                            background: s ? colour(s.course) + "1f" : "transparent",
                            minHeight: 58,
                          }}>
                          <div className="opacity-50 font-mono text-[9px]">R{row}C{col}</div>
                          {s && (
                            <>
                              <div className="font-medium truncate">{s.studentName}</div>
                              <div className="opacity-60 font-mono text-[9px]">{s.enrollment}</div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
