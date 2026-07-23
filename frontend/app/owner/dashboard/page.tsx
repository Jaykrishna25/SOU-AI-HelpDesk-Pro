"use client";
import { TrendingUp, Wallet, Users, Brain } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

export default function OwnerDashboard() {
  const forecasts = [["Admissions (Next Yr)", "+18%", "AI forecast"], ["Revenue (Q4)", "₹4.2 Cr", "projected"], ["Ticket Volume", "-12%", "trending down"], ["Faculty Workload", "Balanced", "optimal"]];
  return (
    <DashboardShell role="Owner" name="Dr. Aditya Silver"
      nav={["Dashboard", "Revenue", "University", "Workforce", "Forecasting", "Governance"]}
      stats={[
        { label: "Total Revenue", value: "₹18.6 Cr", icon: Wallet },
        { label: "Fees Collected", value: "92%", icon: TrendingUp },
        { label: "Total Students", value: "3,240", icon: Users },
        { label: "AI Accuracy", value: "92%", icon: Brain },
      ]}>
      <div className="mb-6"><AnalyticsCharts /></div>
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
    </DashboardShell>
  );
}
