"use client";
import { useState } from "react";
import { Users, UserPlus, UserMinus, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const NAV = ["Dashboard", "Students", "Faculty", "Admins", "Meetings", "Events", "Reports"];

export default function HodDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const members = [["Navlani Jaykrishna", "SOU2023CSE69", "Sem 5"], ["Harsh Barot", "SOU2023CSE02", "Sem 5"], ["Ashok Sharma", "SOU2023CSE05", "Sem 5"]];
  const faculty = [["Akshay Sir", "FAC001", "Asst. Professor"], ["Sagar Sir", "FAC002", "Asst. Professor"]];

  return (
    <DashboardShell role="HOD / Head" name="Deepika Chauhan Mam" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Total Students", value: "480", icon: Users },
        { label: "New Admissions", value: "62", icon: UserPlus },
        { label: "Faculty", value: "28", icon: Building2 },
        { label: "Students Left", value: "5", icon: UserMinus },
      ]}>

      {tab === "Dashboard" && <><AnalyticsCharts /><div className="mt-6"><Panel title="Department Meetings">
        <div className="space-y-2 text-sm">
          <div className="glass px-4 py-3 flex justify-between"><span>Faculty Review Meeting</span><span className="text-[var(--muted)]">28 Jul 2026</span></div>
          <div className="glass px-4 py-3 flex justify-between"><span>Curriculum Board</span><span className="text-[var(--muted)]">02 Aug 2026</span></div>
        </div>
      </Panel></div></>}

      {tab === "Students" && (
        <Panel title="Student Management">
          <button className="mb-3 px-4 py-2 rounded-full bg-brand text-white text-sm">+ Add Student</button>
          <div className="space-y-2 text-sm">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between glass px-4 py-3">
                <span>{m[0]}</span><span className="text-[var(--muted)] font-mono">{m[1]}</span><span>{m[2]}</span>
                <div className="flex gap-2"><button className="text-xs px-3 py-1 rounded-full glass">Edit</button><button className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300">Remove</button></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Faculty" && (
        <Panel title="Faculty Management">
          <button className="mb-3 px-4 py-2 rounded-full bg-brand text-white text-sm">+ Add Faculty</button>
          <div className="space-y-2 text-sm">
            {faculty.map((m, i) => (
              <div key={i} className="flex items-center justify-between glass px-4 py-3">
                <span>{m[0]}</span><span className="text-[var(--muted)] font-mono">{m[1]}</span><span>{m[2]}</span>
                <div className="flex gap-2"><button className="text-xs px-3 py-1 rounded-full glass">Edit</button><button className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300">Remove</button></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Admins" && (
        <Panel title="Admin Management">
          <button className="mb-3 px-4 py-2 rounded-full bg-brand text-white text-sm">+ Add Admin</button>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between glass px-4 py-3"><span>Umangini Mam</span><span className="text-[var(--muted)] font-mono">ADM001</span><span>Campus</span></div>
            <div className="flex items-center justify-between glass px-4 py-3"><span>Dipal Darji Sir</span><span className="text-[var(--muted)] font-mono">ADM002</span><span>Department</span></div>
          </div>
        </Panel>
      )}

      {tab === "Meetings" && (
        <Panel title="Meetings">
          <div className="space-y-2 text-sm">
            <div className="glass px-4 py-3 flex justify-between"><span>Faculty Review Meeting</span><span className="text-[var(--muted)]">28 Jul 2026</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Student Council</span><span className="text-[var(--muted)]">30 Jul 2026</span></div>
          </div>
          <button className="mt-3 px-4 py-2 rounded-full bg-brand text-white text-sm">+ Schedule Meeting</button>
        </Panel>
      )}

      {tab === "Events" && (
        <Panel title="Events">
          <div className="space-y-2 text-sm">
            <div className="glass px-4 py-3 flex justify-between"><span>AI & Cloud Summit 2026</span><span className="text-[var(--muted)]">Conference - 10 Sep</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Web Dev Workshop</span><span className="text-[var(--muted)]">Workshop - 18 Aug</span></div>
          </div>
        </Panel>
      )}

      {tab === "Reports" && (
        <Panel title="Generate Reports">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {["Student Report", "Faculty Report", "Attendance Report", "Admissions Report", "Result Analysis", "Ticket Summary"].map((r) => (
              <button key={r} className="glass py-3 hover:bg-brand/20 transition">{r}</button>
            ))}
          </div>
        </Panel>
      )}

    </DashboardShell>
  );
}
