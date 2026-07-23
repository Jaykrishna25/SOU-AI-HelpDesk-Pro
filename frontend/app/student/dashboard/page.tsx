"use client";
import { CalendarDays, GraduationCap, Wallet, ClipboardCheck } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";

export default function StudentDashboard() {
  const timetable = [
    ["09:00", "Machine Learning", "Dr. Priya Nair", "A-301"],
    ["10:00", "Data Structures", "Prof. Karan Mehta", "A-302"],
    ["11:00", "DBMS Lab", "Dr. Priya Nair", "Lab-2"],
  ];
  const attendance = [["DSA", "88%"], ["DBMS", "92%"], ["OS", "79%"], ["ML", "95%"]];
  return (
    <DashboardShell role="Student" name="Jay Krishna"
      nav={["Dashboard", "Timetable", "Attendance", "Fees", "Results", "Exams", "Notes", "AI Assistant"]}
      stats={[
        { label: "CGPA", value: "8.4", icon: GraduationCap },
        { label: "Attendance", value: "88%", icon: ClipboardCheck },
        { label: "Pending Fees", value: "₹0", icon: Wallet },
        { label: "Semester", value: "7", icon: CalendarDays },
      ]}>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Today's Timetable">
          <div className="space-y-2 text-sm">
            {timetable.map((r, i) => (
              <div key={i} className="flex items-center justify-between glass px-4 py-3">
                <span className="font-mono text-brand-light">{r[0]}</span>
                <span className="flex-1 px-3">{r[1]}</span>
                <span className="text-[var(--muted)]">{r[2]}</span>
                <span className="ml-3 text-xs glass px-2 py-1">{r[3]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Attendance by Subject" delay={0.1}>
          <div className="space-y-3">
            {attendance.map(([s, p]) => (
              <div key={s}>
                <div className="flex justify-between text-sm mb-1"><span>{s}</span><span className="text-brand-light">{p}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand to-brand-cyan" style={{ width: p }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Fees" delay={0.15}>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="glass p-4"><div className="text-lg font-bold">₹1.2L</div><div className="text-[var(--muted)]">Total</div></div>
            <div className="glass p-4"><div className="text-lg font-bold text-emerald-400">₹1.2L</div><div className="text-[var(--muted)]">Paid</div></div>
            <div className="glass p-4"><div className="text-lg font-bold">₹0</div><div className="text-[var(--muted)]">Pending</div></div>
          </div>
        </Panel>
        <Panel title="Exam Timetable" delay={0.2}>
          <div className="glass px-4 py-3 text-sm flex justify-between">
            <span>ML — End Sem</span><span className="text-[var(--muted)]">20 Nov 2026</span><span className="text-brand-light">Seat H1-042</span>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
