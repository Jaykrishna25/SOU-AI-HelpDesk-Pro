"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Res = { id: string; code: string; name: string; type: string; capacity: number;
  location: string | null; ecoScore: number; openHour: number; closeHour: number };
type Bk = { id: string; code: string; status: string; purpose: string; attendees: number;
  startsAt: string; endsAt: string; userName: string; userRole: string; note: string | null;
  energyKwh: number; co2Kg: number; resource?: { name: string; code: string; type: string; location: string | null } };

const TYPES = [
  ["ALL", "All"], ["CLASSROOM", "Classrooms"], ["LAB", "Labs"], ["LIBRARY_SEAT", "Library"],
  ["SPORTS", "Sports"], ["PARKING", "Parking"], ["AUDITORIUM", "Halls"], ["EQUIPMENT", "Equipment"],
];
const STAFF = ["ADMIN", "FACULTY", "HOD", "HOI", "OWNER", "SUPER_ADMIN"];

function findToken() {
  if (typeof window === "undefined") return "";
  try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; }
}
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + findToken() });
const hh = (s: string) => new Date(s).toISOString().slice(11, 16);
const dd = (s: string) => new Date(s).toISOString().slice(0, 10);

function chip(status: string) {
  const m: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    REJECTED: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    CANCELLED: "bg-slate-500/15 text-slate-300 border-slate-500/40",
    COMPLETED: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  };
  return "text-[10px] px-2 py-0.5 rounded-full border " + (m[status] || m.CANCELLED);
}

export default function BookingsPage() {
  const [tab, setTab] = useState<"browse" | "mine" | "queue">("browse");
  const [type, setType] = useState("ALL");
  const [resources, setResources] = useState<Res[]>([]);
  const [mine, setMine] = useState<Bk[]>([]);
  const [queue, setQueue] = useState<Bk[]>([]);
  const [impact, setImpact] = useState<any>(null);
  const [sel, setSel] = useState<Res | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sH, setSH] = useState(10);
  const [eH, setEH] = useState(11);
  const [purpose, setPurpose] = useState("");
  const [att, setAtt] = useState(1);
  const [slots, setSlots] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("STUDENT");

  useEffect(() => {
    try {
      const t = findToken().split(".")[1];
      const p = JSON.parse(atob(t.replace(/-/g, "+").replace(/_/g, "/")));
      setRole(String(p.role || p.roleCode || "STUDENT").toUpperCase());
    } catch {}
  }, []);
  const isStaff = ["ADMIN", "SUPER_ADMIN", "OWNER"].includes(role);

  const load = useCallback(async () => {
    const r = await fetch("/api/gr/resources?type=" + type, { headers: H() });
    if (r.ok) setResources((await r.json()).items || []);
    const m = await fetch("/api/gr/bookings?scope=mine", { headers: H() });
    if (m.ok) setMine((await m.json()).items || []);
    const i = await fetch("/api/gr/impact", { headers: H() });
    if (i.ok) setImpact(await i.json());
    if (isStaff) {
      const q = await fetch("/api/gr/bookings?scope=all&status=PENDING", { headers: H() });
      if (q.ok) setQueue((await q.json()).items || []);
    }
  }, [type, isStaff]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sel) return setSlots([]);
    fetch("/api/gr/availability?resourceId=" + sel.id + "&date=" + date, { headers: H() })
      .then(r => r.ok ? r.json() : { items: [] }).then(d => setSlots(d.items || []));
  }, [sel, date]);

  async function book() {
    if (!sel) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/gr/bookings", {
      method: "POST", headers: H(),
      body: JSON.stringify({ resourceId: sel.id, date, startHour: sH, endHour: eH, purpose, attendees: att }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ k: "err", t: d.error || "Could not book" });
    setMsg({ k: "ok", t: "Booked " + d.booking.code + " - " + d.booking.status });
    setSel(null); setPurpose(""); load();
  }

  async function decide(id: string, action: string) {
    await fetch("/api/gr/bookings", { method: "PATCH", headers: H(), body: JSON.stringify({ id, action }) });
    load();
  }

  const hours = Array.from({ length: 15 }, (_, i) => i + 7);

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold gradient-text">GreenReserve</h1>
          <p className="text-sm opacity-60">Campus resource booking - Silver Oak University</p>
        </div>
        <Link href="/" className="text-sm opacity-70 hover:opacity-100 underline">Back to portal</Link>
      </div>

      {impact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            ["Energy saved", impact.energyKwhSaved + " kWh"],
            ["CO2 avoided", impact.co2KgSaved + " kg"],
            ["Seat-hours saved", impact.seatHoursSaved],
            ["Trees equivalent", impact.treesEquivalent],
          ].map(([k, v]) => (
            <div key={String(k)} className="panel-solid rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider opacity-55">{k}</div>
              <div className="text-xl font-semibold mt-1">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {([["browse", "Browse"], ["mine", "My bookings"]] as const).concat(
          isStaff ? ([["queue", "Approvals (" + queue.length + ")"]] as any) : []
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={"px-4 py-2 rounded-lg text-sm border transition-colors " +
              (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-white/10 hover:border-white/25")}>
            {l}
          </button>
        ))}
      </div>

      {msg && (
        <div className={"mb-4 px-4 py-3 rounded-lg text-sm border " +
          (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>
          {msg.t}
        </div>
      )}

      {tab === "browse" && (
        <>
          <div className="flex gap-2 mb-5 flex-wrap">
            {TYPES.map(([v, l]) => (
              <button key={v} onClick={() => { setType(v); setSel(null); }}
                className={"px-3 py-1.5 rounded-full text-xs border transition-colors " +
                  (type === v ? "bg-white/15 border-white/40" : "border-white/10 hover:border-white/25")}>
                {l}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resources.map(r => (
              <button key={r.id} onClick={() => { setSel(r); setAtt(Math.min(1, r.capacity)); }}
                className={"panel-solid rounded-xl p-4 text-left transition-all hover:scale-[1.02] border " +
                  (sel?.id === r.id ? "border-violet-500/70" : "border-transparent")}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-55 mt-0.5">{r.code} - {r.location}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider opacity-50">Eco</div>
                    <div className={"text-sm font-semibold " +
                      (r.ecoScore >= 80 ? "text-emerald-400" : r.ecoScore >= 60 ? "text-amber-400" : "text-rose-400")}>
                      {r.ecoScore}
                    </div>
                  </div>
                </div>
                <div className="text-xs opacity-60 mt-3">
                  Capacity {r.capacity} - Open {r.openHour}:00 to {r.closeHour}:00
                </div>
              </button>
            ))}
          </div>

          {sel && (
            <div className="panel-solid rounded-xl p-5 mt-5">
              <div className="font-medium mb-4">Book {sel.name}</div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-xs opacity-70">Date
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
                </label>
                <label className="text-xs opacity-70">From
                  <select value={sH} onChange={e => setSH(+e.target.value)}
                    className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm">
                    {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </label>
                <label className="text-xs opacity-70">To
                  <select value={eH} onChange={e => setEH(+e.target.value)}
                    className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm">
                    {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </label>
                <label className="text-xs opacity-70">Attendees
                  <input type="number" min={1} max={sel.capacity} value={att} onChange={e => setAtt(+e.target.value)}
                    className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="text-xs opacity-70 block mt-3">Purpose
                <input value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder="Project review meeting, extra lecture, practice session..."
                  className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
              </label>

              <div className="mt-4 text-xs">
                <div className="opacity-55 mb-1">Already booked on {date}</div>
                {slots.length === 0
                  ? <div className="opacity-45">Nothing booked - fully available</div>
                  : <div className="flex flex-wrap gap-2">
                      {slots.map((s: any) => (
                        <span key={s.id} className="px-2 py-1 rounded bg-white/10">
                          {hh(s.startsAt)}-{hh(s.endsAt)} {s.userName}
                        </span>
                      ))}
                    </div>}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={book} disabled={busy}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm">
                  {busy ? "Booking..." : "Confirm booking"}
                </button>
                <button onClick={() => setSel(null)}
                  className="px-5 py-2 rounded-lg border border-white/15 hover:border-white/35 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <div className="space-y-2">
          {mine.length === 0 && <div className="opacity-55 text-sm">No bookings yet.</div>}
          {mine.map(b => (
            <div key={b.id} className="panel-solid rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="font-medium text-sm">{b.resource?.name} <span className="opacity-45">{b.code}</span></div>
                <div className="text-xs opacity-60 mt-0.5">
                  {dd(b.startsAt)} - {hh(b.startsAt)} to {hh(b.endsAt)} - {b.attendees} attendee(s)
                </div>
                <div className="text-xs opacity-45 mt-0.5">{b.purpose}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={chip(b.status)}>{b.status}</span>
                {["PENDING", "APPROVED"].includes(b.status) && (
                  <button onClick={() => decide(b.id, "cancel")}
                    className="text-xs underline opacity-60 hover:opacity-100">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "queue" && isStaff && (
        <div className="space-y-2">
          {queue.length === 0 && <div className="opacity-55 text-sm">Nothing awaiting approval.</div>}
          {queue.map(b => (
            <div key={b.id} className="panel-solid rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="font-medium text-sm">{b.resource?.name} <span className="opacity-45">{b.code}</span></div>
                <div className="text-xs opacity-60 mt-0.5">
                  {b.userName} ({b.userRole}) - {dd(b.startsAt)} {hh(b.startsAt)} to {hh(b.endsAt)}
                </div>
                <div className="text-xs opacity-45 mt-0.5">{b.purpose}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(b.id, "approve")}
                  className="px-3 py-1.5 rounded text-xs bg-emerald-600/80 hover:bg-emerald-500">Approve</button>
                <button onClick={() => decide(b.id, "reject")}
                  className="px-3 py-1.5 rounded text-xs bg-rose-600/80 hover:bg-rose-500">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}


