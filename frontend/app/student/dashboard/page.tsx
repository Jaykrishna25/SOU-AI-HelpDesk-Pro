"use client";
import { useState } from "react";
import { CalendarDays, GraduationCap, Wallet, ClipboardCheck } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";

const NAV = ["Dashboard", "Timetable", "Attendance", "Fees", "Results", "Exams", "Notes", "AI Assistant"];

export default function StudentDashboard() {
  const [tab, setTab] = useState("Dashboard");

  const timetable = [
    ["09:00", "Data Structures", "Akshay Sir", "A-301"],
    ["10:00", "DBMS", "Sagar Sir", "A-302"],
    ["11:00", "Operating Systems Lab", "Akshay Sir", "Lab-2"],
  ];
  const attendance = [["Data Structures", "88%"], ["DBMS", "92%"], ["Operating Systems", "79%"], ["Machine Learning", "95%"]];
  const results = [["Data Structures", 28, 66, "A"], ["DBMS", 26, 71, "A"], ["Operating Systems", 24, 58, "B+"]];
  const notes = [["DSA - Trees.pdf", "PDF"], ["DBMS Normalization.ppt", "PPT"], ["OS Scheduling.mp4", "VIDEO"], ["Assignment 3.pdf", "ASSIGNMENT"]];

  return (
    <DashboardShell role="Student" name="Navlani Jaykrishna" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "CGPA", value: "8.4", icon: GraduationCap },
        { label: "Attendance", value: "88%", icon: ClipboardCheck },
        { label: "Pending Fees", value: "Rs 30k", icon: Wallet },
        { label: "Semester", value: "5", icon: CalendarDays },
      ]}>

      {(tab === "Dashboard" || tab === "Timetable") && (
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
      )}

      {(tab === "Dashboard" || tab === "Attendance") && (
        <div className="mt-6">
          <Panel title="Attendance by Subject">
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
        </div>
      )}

      {(tab === "Dashboard" || tab === "Fees") && (
        <div className="mt-6">
          <Panel title="Fees">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="glass p-4"><div className="text-lg font-bold">Rs 1.2L</div><div className="text-[var(--muted)]">Total</div></div>
              <div className="glass p-4"><div className="text-lg font-bold text-emerald-400">Rs 90k</div><div className="text-[var(--muted)]">Paid</div></div>
              <div className="glass p-4"><div className="text-lg font-bold text-rose-400">Rs 30k</div><div className="text-[var(--muted)]">Pending</div></div>
            </div>
            <button className="mt-4 px-4 py-2 rounded-full bg-brand text-white text-sm">Download Receipt</button>
          </Panel>
        </div>
      )}

      {tab === "Results" && (
        <Panel title="Results - Semester 5">
          <table className="w-full text-sm">
            <thead><tr className="text-[var(--muted)] text-left"><th className="py-2">Subject</th><th>Internal</th><th>External</th><th>Grade</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-[var(--border)]"><td className="py-2">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td className="text-brand-light">{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-6 text-sm"><span>SGPA: <b className="text-brand-light">8.4</b></span><span>CGPA: <b className="text-brand-light">8.4</b></span></div>
        </Panel>
      )}

      {tab === "Exams" && (
        <Panel title="Exam Timetable">
          <div className="glass px-4 py-3 text-sm flex justify-between">
            <span>Machine Learning - End Sem</span><span className="text-[var(--muted)]">20 Nov 2026</span><span className="text-brand-light">Seat H1-042</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-3">Venue: Exam Hall 1 | Duration: 180 min</p>
        </Panel>
      )}

      {tab === "Notes" && (
        <Panel title="Notes & Study Material">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {notes.map((n, i) => (
              <div key={i} className="glass px-4 py-3 flex items-center justify-between">
                <span>{n[0]}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-brand/20 text-brand-light">{n[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "AI Assistant" && (
        <Panel title="AI Assistant">
          <p className="text-sm text-[var(--muted)]">Click the floating robot button at the bottom-right to chat with the multi-agent AI assistant. Ask about exams, fees, attendance and more - it answers instantly or raises a ticket for you.</p>
        </Panel>
      )}

    </DashboardShell>
  );
}
