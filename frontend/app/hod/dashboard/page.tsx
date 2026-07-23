"use client";
import { Users, UserPlus, UserMinus, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

export default function HodDashboard() {
  return (
    <DashboardShell role="HOD / Head" name="Dr. Rajesh Patel"
      nav={["Dashboard", "Students", "Faculty", "Admins", "Meetings", "Events", "Reports"]}
      stats={[
        { label: "Total Students", value: "480", icon: Users },
        { label: "New Admissions", value: "62", icon: UserPlus },
        { label: "Faculty", value: "28", icon: Building2 },
        { label: "Students Left", value: "5", icon: UserMinus },
      ]}>
      <div className="mb-6"><AnalyticsCharts /></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Department Meetings">
          <div className="space-y-2 text-sm">
            <div className="glass px-4 py-3 flex justify-between"><span>Faculty Review Meeting</span><span className="text-[var(--muted)]">28 Jul 2026</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Curriculum Board</span><span className="text-[var(--muted)]">02 Aug 2026</span></div>
          </div>
        </Panel>
        <Panel title="Quick Actions" delay={0.1}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {["Add Student", "Add Faculty", "Add Admin", "Generate Report"].map((a) => (
              <button key={a} className="glass py-3 hover:bg-brand/20 transition">{a}</button>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
