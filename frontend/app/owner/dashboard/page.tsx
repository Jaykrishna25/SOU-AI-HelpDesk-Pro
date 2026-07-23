"use client";
import { useState } from "react";
import { TrendingUp, Wallet, Users, Brain } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const NAV = ["Dashboard", "Revenue", "University", "Workforce", "Forecasting", "Governance"];
interface Gov { id: number; text: string; kind: "review" | "approve"; status: string; }

export default function OwnerDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [gov, setGov] = useState<Gov[]>([
    { id: 1, text: "Escalated: Fee refund dispute (TKT-2026-0042)", kind: "review", status: "Pending" },
    { id: 2, text: "Approve: New lab budget (Rs 12L)", kind: "approve", status: "Pending" },
    { id: 3, text: "Escalated: Faculty grievance", kind: "review", status: "Pending" },
  ]);
  const act = (id: number, status: string) => setGov((g) => g.map((x) => x.id === id ? { ...x, status } : x));
  const forecasts = [["Admissions (Next Yr)", "+18%", "AI forecast"], ["Revenue (Q4)", "Rs 4.2 Cr", "projected"], ["Ticket Volume", "-12%", "trending down"], ["Faculty Workload", "Balanced", "optimal"]];

  return (
    <DashboardShell role="Owner" name="Shital Aggrawal Sir" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Total Revenue", value: "Rs 18.6 Cr", icon: Wallet },
        { label: "Fees Collected", value: "92%", icon: TrendingUp },
        { label: "Total Students", value: "3,240", icon: Users },
        { label: "AI Accuracy", value: "92%", icon: Brain },
      ]}>

      {(tab === "Dashboard" || tab === "Revenue" || tab === "University") && <AnalyticsCharts />}

      {(tab === "Dashboard" || tab === "Forecasting") && (
        <div className="mt-6">
          <Panel title="Strategic AI Forecasting">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {forecasts.map((f, i) => (
                <div key={i} className="glass p-4">
                  <div className="text-lg font-bold gradient-text">{f[1]}</div>
                  <div>{f[0]}</div>
                  <div className="text-xs text-[var(--muted)]">{f[2]}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "Workforce" && (
        <Panel title="Workforce Performance">
          <div className="space-y-2 text-sm">
            <div className="glass px-4 py-3 flex justify-between"><span>Faculty avg rating</span><span className="text-brand-light">4.5 / 5</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Admin ticket resolution</span><span className="text-brand-light">91%</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Avg response time</span><span className="text-brand-light">6.2 hrs</span></div>
          </div>
        </Panel>
      )}

      {tab === "Governance" && (
        <Panel title="Governance & Escalations">
          <div className="space-y-2 text-sm">
            {gov.map((g) => (
              <div key={g.id} className="glass px-4 py-3 flex justify-between items-center">
                <span>{g.text}</span>
                {g.status === "Pending" ? (
                  <button onClick={() => act(g.id, g.kind === "approve" ? "Approved" : "Reviewed")}
                    className={`text-xs px-3 py-1 rounded-full text-white ${g.kind === "approve" ? "bg-emerald-500/80" : "bg-brand"}`}>
                    {g.kind === "approve" ? "Approve" : "Review"}
                  </button>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">{g.status}</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

    </DashboardShell>
  );
}
