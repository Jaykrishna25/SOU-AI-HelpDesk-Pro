"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const TT = {
  contentStyle: { background: "#15121f", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, color: "#ffffff" },
  itemStyle: { color: "#ffffff" }, labelStyle: { color: "#ffffff" },
};
const SEV: Record<string, string> = {
  CRITICAL: "border-rose-500/50 bg-rose-500/10 text-rose-300",
  WARNING: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  INFO: "border-sky-500/50 bg-sky-500/10 text-sky-300",
};

export default function Insights() {
  const [tab, setTab] = useState<"alerts" | "green">("alerts");
  const [a, setA] = useState<any>(null);
  const [g, setG] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const r1 = await fetch("/api/insights/alerts", { headers: H() });
    if (r1.ok) setA(await r1.json()); else setErr((await r1.json()).error || "Could not load alerts");
    const r2 = await fetch("/api/insights/sustainability?days=" + days, { headers: H() });
    if (r2.ok) setG(await r2.json());
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const crit = a?.alerts?.filter((x: any) => x.severity === "CRITICAL").length || 0;
  const warn = a?.alerts?.filter((x: any) => x.severity === "WARNING").length || 0;

  return (
    <main className="min-h-screen p-5 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold gradient-text">Insights</h1>
      <p className="text-sm opacity-60 mb-6">Predictive alerts and sustainability reporting</p>

      {err && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      <div className="flex gap-2 mb-5 flex-wrap">
        {[["alerts", "Predictive alerts" + (crit + warn ? " (" + (crit + warn) + ")" : "")], ["green", "Sustainability"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={"px-4 py-2 rounded-lg text-sm border " +
              (tab === k ? "bg-violet-600/25 border-violet-500/60" : "border-white/10 hover:border-white/25")}>{l}</button>
        ))}
      </div>

      {tab === "alerts" && a && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[["Critical", crit], ["Warnings", warn], ["Sessions analysed", a.sessionsAnalysed],
              ["Tickets forecast", a.forecast?.nextWeek ?? "-"]].map(([k, v]) => (
              <div key={String(k)} className="panel-solid rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider opacity-55">{k}</div>
                <div className="text-2xl font-semibold mt-1">{v}</div>
              </div>
            ))}
          </div>

          {a.forecast && (
            <div className="panel-solid rounded-xl p-5 mb-6">
              <div className="font-medium mb-1">Ticket volume - 8 week trend</div>
              <div className="text-xs opacity-55 mb-4">
                Average {a.forecast.mean}/week, trend {a.forecast.trendPerWeek > 0 ? "+" : ""}{a.forecast.trendPerWeek}/week,
                next week about {a.forecast.nextWeek}
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={a.forecast.weeks.map((v: number, i: number) => ({ w: "W-" + (7 - i), tickets: v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="w" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip {...TT} />
                    <Bar dataKey="tickets" fill="#9B1C26" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {a.alerts.length === 0 && (
              <div className="opacity-55 text-sm">
                No alerts. Attendance risk needs at least 3 approved QR sessions for a class before it can calculate.
              </div>
            )}
            {a.alerts.map((x: any, i: number) => (
              <div key={i} className={"rounded-xl p-4 border " + SEV[x.severity]}>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium">{x.message}</div>
                    {x.kind === "LOW_ATTENDANCE" && (
                      <div className="text-xs opacity-70 mt-1">
                        {x.enrollment} - {x.className} - {x.attended} of {x.held} sessions
                        {x.recoverable
                          ? " - can still reach " + x.bestCase + "% with full attendance"
                          : " - cannot mathematically reach 75% this term"}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-current">{x.severity}</span>
                </div>
                {x.kind === "LOW_ATTENDANCE" && (
                  <div className="h-1.5 bg-black/40 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-current opacity-70" style={{ width: Math.min(100, x.metric) + "%" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "green" && g && (
        <>
          <div className="flex gap-2 mb-4">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={"px-3 py-1.5 rounded-full text-xs border " +
                  (days === d ? "bg-white/15 border-white/40" : "border-white/10")}>{d} days</button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[["Bookings", g.bookings], ["Energy used", g.energyKwhUsed + " kWh"],
              ["Energy saved", g.energyKwhSaved + " kWh"], ["CO2 avoided", g.co2KgSaved + " kg"],
              ["Utilisation", g.utilisationPct + "%"], ["Trees equiv.", g.treesEquivalent]].map(([k, v]) => (
              <div key={String(k)} className="panel-solid rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider opacity-55">{k}</div>
                <div className="text-lg font-semibold mt-1">{v}</div>
              </div>
            ))}
          </div>

          <div className="panel-solid rounded-xl p-5 mb-5">
            <div className="font-medium mb-4">Daily energy</div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={g.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ color: "#fff", fontSize: 12 }} />
                  <Line type="monotone" dataKey="used" name="kWh used" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saved" name="kWh saved" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel-solid rounded-xl p-5">
              <div className="font-medium mb-4">By resource type</div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={g.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="type" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: "#fff", fontSize: 12 }} />
                    <Bar dataKey="used" name="kWh used" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saved" name="kWh saved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-solid rounded-xl p-5">
              <div className="font-medium mb-4">By building</div>
              <div className="space-y-2">
                {g.byBuilding.length === 0 && <div className="opacity-50 text-sm">No approved bookings yet.</div>}
                {g.byBuilding.map((b: any) => (
                  <div key={b.building} className="flex justify-between items-center text-sm bg-white/5 rounded px-3 py-2">
                    <span>{b.building}</span>
                    <span className="opacity-70">{b.bookings} bookings - {b.used} kWh - {b.saved} kWh saved</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] opacity-45 mt-4">
                CO2 calculated at {g.gridFactor} kg per kWh (CEA India grid emission factor).
                Savings are measured against the highest-draw resource of the same type.
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
