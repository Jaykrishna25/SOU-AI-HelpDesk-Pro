"use client";
import { useState } from "react";
import { Users, UserPlus, UserMinus, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const NAV = ["Dashboard", "Students", "Faculty", "Admins", "Meetings", "Events", "Reports"];
interface Member { name: string; id: string; info: string; }

export default function HodDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [students, setStudents] = useState<Member[]>([
    { name: "Navlani Jaykrishna", id: "SOU2023CSE69", info: "Sem 5" },
    { name: "Harsh Barot", id: "SOU2023CSE02", info: "Sem 5" },
    { name: "Ashok Sharma", id: "SOU2023CSE05", info: "Sem 5" },
  ]);
  const [faculty, setFaculty] = useState<Member[]>([
    { name: "Akshay Sir", id: "FAC001", info: "Asst. Professor" },
    { name: "Sagar Sir", id: "FAC002", info: "Asst. Professor" },
  ]);
  const [admins, setAdmins] = useState<Member[]>([
    { name: "Umangini Mam", id: "ADM001", info: "Campus" },
    { name: "Dipal Darji Sir", id: "ADM002", info: "Department" },
  ]);

  const add = (setter: React.Dispatch<React.SetStateAction<Member[]>>, idPrefix: string, infoLabel: string) => {
    const name = window.prompt("Enter full name:");
    if (!name) return;
    const id = window.prompt("Enter ID:", idPrefix) || idPrefix;
    const info = window.prompt(infoLabel + ":", infoLabel) || infoLabel;
    setter((list) => [...list, { name, id, info }]);
  };
  const edit = (setter: React.Dispatch<React.SetStateAction<Member[]>>, idx: number, cur: Member) => {
    const name = window.prompt("Edit name:", cur.name);
    if (name === null) return;
    const info = window.prompt("Edit info:", cur.info) ?? cur.info;
    setter((list) => list.map((m, i) => i === idx ? { ...m, name: name || m.name, info } : m));
  };
  const remove = (setter: React.Dispatch<React.SetStateAction<Member[]>>, idx: number) => {
    if (window.confirm("Remove this record?")) setter((list) => list.filter((_, i) => i !== idx));
  };

  const MemberTable = ({ title, data, setter, idPrefix, infoLabel }: {
    title: string; data: Member[]; setter: React.Dispatch<React.SetStateAction<Member[]>>; idPrefix: string; infoLabel: string;
  }) => (
    <Panel title={title}>
      <button onClick={() => add(setter, idPrefix, infoLabel)} className="mb-3 px-4 py-2 rounded-full bg-brand text-white text-sm hover:bg-brand-light">+ Add</button>
      <div className="space-y-2 text-sm">
        {data.map((m, i) => (
          <div key={m.id + i} className="flex items-center justify-between glass px-4 py-3">
            <span className="flex-1">{m.name}</span>
            <span className="text-[var(--muted)] font-mono flex-1">{m.id}</span>
            <span className="flex-1">{m.info}</span>
            <div className="flex gap-2">
              <button onClick={() => edit(setter, i, m)} className="text-xs px-3 py-1 rounded-full bg-brand text-white">Edit</button>
              <button onClick={() => remove(setter, i)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  return (
    <DashboardShell role="HOD / Head" name="Deepika Chauhan Mam" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Total Students", value: String(students.length), icon: Users },
        { label: "New Admissions", value: "62", icon: UserPlus },
        { label: "Faculty", value: String(faculty.length), icon: Building2 },
        { label: "Students Left", value: "5", icon: UserMinus },
      ]}>

      {tab === "Dashboard" && <><AnalyticsCharts /><div className="mt-6"><Panel title="Department Meetings">
        <div className="space-y-2 text-sm">
          <div className="glass px-4 py-3 flex justify-between"><span>Faculty Review Meeting</span><span className="text-[var(--muted)]">28 Jul 2026</span></div>
          <div className="glass px-4 py-3 flex justify-between"><span>Curriculum Board</span><span className="text-[var(--muted)]">02 Aug 2026</span></div>
        </div>
      </Panel></div></>}

      {tab === "Students" && <MemberTable title="Student Management" data={students} setter={setStudents} idPrefix="SOU2023CSE" infoLabel="Sem 5" />}
      {tab === "Faculty" && <MemberTable title="Faculty Management" data={faculty} setter={setFaculty} idPrefix="FAC" infoLabel="Asst. Professor" />}
      {tab === "Admins" && <MemberTable title="Admin Management" data={admins} setter={setAdmins} idPrefix="ADM" infoLabel="Campus" />}

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
