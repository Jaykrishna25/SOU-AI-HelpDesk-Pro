"use client";
import { DoorOpen, Ticket, Megaphone, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";

export default function AdminDashboard() {
  const rooms = [["A-301", "Occupied", "ML · Dr. Nair"], ["A-302", "Occupied", "DSA · Prof. Mehta"], ["Lab-2", "Free", "—"], ["Seminar Hall", "Free", "—"]];
  const tickets = [["TKT-2026-0042", "Fee receipt issue", "HIGH", "Open"], ["TKT-2026-0039", "Revaluation query", "MEDIUM", "Assigned"]];
  return (
    <DashboardShell role="Admin" name="Sneha Shah"
      nav={["Dashboard", "Classrooms", "Resources", "Tickets", "Announcements", "Timetables"]}
      stats={[
        { label: "Occupied Rooms", value: "12", icon: DoorOpen },
        { label: "Open Tickets", value: "8", icon: Ticket },
        { label: "Free Labs", value: "3", icon: Building2 },
        { label: "Notices Today", value: "2", icon: Megaphone },
      ]}>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Classroom Management">
          <div className="space-y-2 text-sm">
            {rooms.map((r, i) => (
              <div key={i} className="flex items-center justify-between glass px-4 py-3">
                <span className="font-medium">{r[0]}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${r[1] === "Occupied" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>{r[1]}</span>
                <span className="text-[var(--muted)]">{r[2]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Ticket Queue" delay={0.1}>
          <div className="space-y-2 text-sm">
            {tickets.map((t, i) => (
              <div key={i} className="glass px-4 py-3">
                <div className="flex justify-between"><span className="font-mono text-brand-light">{t[0]}</span><span className="text-xs px-2 py-0.5 rounded-full bg-brand/20">{t[2]}</span></div>
                <div className="text-[var(--muted)]">{t[1]} · {t[3]}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
