"use client";
import { useState } from "react";
import { Users, ClipboardCheck, Wallet, BookOpen } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";

const NAV = ["Dashboard", "Timetable", "Attendance", "Students", "Content", "Exam Duties", "Salary", "Tickets"];
interface Tkt { code: string; subject: string; priority: string; status: string; }

export default function FacultyDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [tickets, setTickets] = useState<Tkt[]>([
    { code: "TKT-2026-0039", subject: "Revaluation query - DBMS", priority: "MEDIUM", status: "Assigned" },
    { code: "TKT-2026-0047", subject: "Extra lab session request", priority: "LOW", status: "Assigned" },
  ]);
  const setStatus = (code: string, status: string) =>
    setTickets((ts) => ts.map((t) => t.code === code ? { ...t, status } : t));
  const statusColor = (s: string) =>
    s === "Resolved" ? "bg-emerald-500/20 text-emerald-300" : s === "Escalated" ? "bg-rose-500/20 text-rose-300" : "bg-brand/20 text-brand-light";

  const students = [["Navlani Jaykrishna", "88%", "A"], ["Harsh Barot", "94%", "A+"], ["Zala Rudraraj", "76%", "B+"], ["Ashok Sharma", "81%", "A"]];
  const schedule = [["Mon 09:00", "Data Structures", "A-301"], ["Mon 11:00", "OS Lab", "Lab-2"], ["Tue 10:00", "DBMS", "A-302"]];

  return (
    <DashboardShell role="Faculty" name="Akshay Sir" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Subjects", value: "2", icon: BookOpen },
        { label: "Students", value: "120", icon: Users },
        { label: "Avg Attendance", value: "86%", icon: ClipboardCheck },
        { label: "Net Salary", value: "Rs 1.03L", icon: Wallet },
      ]}>

      {(tab === "Dashboard" || tab === "Attendance") && (
        <Panel title="Mark Attendance - DSA (A-302)">
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
      )}

      {tab === "Timetable" && (
        <Panel title="Weekly Schedule">
          <div className="space-y-2 text-sm">
            {schedule.map((r, i) => (
              <div key={i} className="flex justify-between glass px-4 py-3">
                <span className="font-mono text-brand-light">{r[0]}</span><span>{r[1]}</span><span className="text-[var(--muted)]">{r[2]}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Students" && (
        <Panel title="Student List & Performance">
          <table className="w-full text-sm">
            <thead><tr className="text-[var(--muted)] text-left"><th className="py-2">Student</th><th>Attendance</th><th>Grade</th></tr></thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i} className="border-t border-[var(--border)]"><td className="py-2">{s[0]}</td><td>{s[1]}</td><td className="text-brand-light">{s[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "Content" && (
        <Panel title="Upload Content">
          <div className="space-y-3">
            <input placeholder="Title (e.g. Trees.pdf)" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
            <div className="flex gap-2 flex-wrap">
              {["Notes", "Assignment", "Video", "PPT"].map((t) => <button key={t} className="px-4 py-2 rounded-full glass text-sm hover:bg-brand/20">{t}</button>)}
            </div>
            <button className="px-4 py-2 rounded-full bg-brand text-white text-sm">Upload</button>
          </div>
        </Panel>
      )}

      {(tab === "Dashboard" || tab === "Exam Duties") && (
        <div className="mt-6">
          <Panel title="Exam Invigilation Duty">
            <div className="glass px-4 py-3 text-sm flex justify-between"><span>ML End Sem - Exam Hall 1</span><span className="text-[var(--muted)]">20 Nov 2026</span></div>
          </Panel>
        </div>
      )}

      {tab === "Salary" && (
        <Panel title="Salary">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
            <div className="glass p-4"><div className="text-lg font-bold">Rs 90k</div><div className="text-[var(--muted)]">Basic</div></div>
            <div className="glass p-4"><div className="text-lg font-bold text-emerald-400">Rs 25k</div><div className="text-[var(--muted)]">Allowances</div></div>
            <div className="glass p-4"><div className="text-lg font-bold text-rose-400">Rs 12k</div><div className="text-[var(--muted)]">Deductions</div></div>
            <div className="glass p-4"><div className="text-lg font-bold text-brand-light">Rs 1.03L</div><div className="text-[var(--muted)]">Net Pay</div></div>
          </div>
          <button className="mt-4 px-4 py-2 rounded-full bg-brand text-white text-sm">Download Salary Slip</button>
        </Panel>
      )}

      {(tab === "Dashboard" || tab === "Tickets") && (
        <div className="mt-6">
          <Panel title="Assigned Tickets">
            <div className="space-y-2 text-sm">
              {tickets.map((t) => (
                <div key={t.code} className="glass px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-brand-light">{t.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                  <div className="text-[var(--muted)]">{t.subject}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setStatus(t.code, "Resolved")} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Resolve</button>
                    <button onClick={() => setStatus(t.code, "Escalated")} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Escalate</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

    </DashboardShell>
  );
}
