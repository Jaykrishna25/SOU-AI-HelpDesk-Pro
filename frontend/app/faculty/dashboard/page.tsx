"use client";
import { Users, ClipboardCheck, Wallet, BookOpen } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";

export default function FacultyDashboard() {
  const students = [["Jay Krishna", "88%", "A"], ["Ananya Desai", "94%", "A+"], ["Rohan Verma", "76%", "B+"]];
  return (
    <DashboardShell role="Faculty" name="Prof. Karan Mehta"
      nav={["Dashboard", "Timetable", "Attendance", "Students", "Content", "Exam Duties", "Salary", "Tickets"]}
      stats={[
        { label: "Subjects", value: "2", icon: BookOpen },
        { label: "Students", value: "120", icon: Users },
        { label: "Avg Attendance", value: "86%", icon: ClipboardCheck },
        { label: "Net Salary", value: "₹1.03L", icon: Wallet },
      ]}>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Mark Attendance — DSA (A-302)">
          <div className="space-y-2 text-sm">
            {students.map((s, i) => (
              <div key={i} className="flex items-center justify-between glass px-4 py-3">
                <span>{s[0]}</span>
                <span className="text-[var(--muted)]">{s[1]}</span>
                <div className="flex gap-2">
                  <button className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">Present</button>
                  <button className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300">Absent</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Exam Invigilation Duty" delay={0.1}>
          <div className="glass px-4 py-3 text-sm flex justify-between"><span>ML End Sem · Exam Hall 1</span><span className="text-[var(--muted)]">20 Nov 2026</span></div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
