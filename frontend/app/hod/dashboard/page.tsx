"use client";
import { useState } from "react";
import { Users, UserPlus, UserMinus, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const NAV = ["Dashboard", "Students", "Faculty", "Admins", "Meetings", "Events", "Reports"];
interface Member { name: string; id: string; info: string; }

function MemberSection({ title, data, onChange, idPrefix, infoLabel }: {
  title: string; data: Member[]; onChange: (next: Member[]) => void; idPrefix: string; infoLabel: string;
}) {
  const [editIdx, setEditIdx] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Member>({ name: "", id: "", info: "" });

  const startEdit = (i: number, m: Member) => { setAdding(false); setEditIdx(i); setDraft(m); };
  const saveEdit = () => { onChange(data.map((m, i) => i === editIdx ? draft : m)); setEditIdx(-1); };
  const startAdd = () => { setEditIdx(-1); setAdding(true); setDraft({ name: "", id: idPrefix, info: infoLabel }); };
  const saveAdd = () => { if (draft.name.trim()) onChange([...data, draft]); setAdding(false); };
  const remove = (i: number) => { if (window.confirm("Remove this record?")) onChange(data.filter((_, j) => j !== i)); };

  const Editor = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="glass px-4 py-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="glass px-3 py-2 bg-transparent outline-none text-sm" />
        <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="ID" className="glass px-3 py-2 bg-transparent outline-none text-sm" />
        <input value={draft.info} onChange={(e) => setDraft({ ...draft, info: e.target.value })} placeholder="Info" className="glass px-3 py-2 bg-transparent outline-none text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Save</button>
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-full glass">Cancel</button>
      </div>
    </div>
  );

  return (
    <Panel title={title}>
      <button onClick={startAdd} className="mb-3 px-4 py-2 rounded-full bg-brand text-white text-sm hover:bg-brand-light">+ Add</button>
      <div className="space-y-2 text-sm">
        {adding && <Editor onSave={saveAdd} onCancel={() => setAdding(false)} />}
        {data.map((m, i) => (
          editIdx === i ? (
            <Editor key={m.id + i} onSave={saveEdit} onCancel={() => setEditIdx(-1)} />
          ) : (
            <div key={m.id + i} className="flex items-center justify-between glass px-4 py-3">
              <span className="flex-1">{m.name}</span>
              <span className="text-[var(--muted)] font-mono flex-1">{m.id}</span>
              <span className="flex-1">{m.info}</span>
              <div className="flex gap-2">
                <button onClick={() => startEdit(i, m)} className="text-xs px-3 py-1 rounded-full bg-brand text-white">Edit</button>
                <button onClick={() => remove(i)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Remove</button>
              </div>
            </div>
          )
        ))}
      </div>
    </Panel>
  );
}

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

      {tab === "Students" && <MemberSection title="Student Management" data={students} onChange={setStudents} idPrefix="SOU2023CSE" infoLabel="Sem 5" />}
      {tab === "Faculty" && <MemberSection title="Faculty Management" data={faculty} onChange={setFaculty} idPrefix="FAC" infoLabel="Asst. Professor" />}
      {tab === "Admins" && <MemberSection title="Admin Management" data={admins} onChange={setAdmins} idPrefix="ADM" infoLabel="Campus" />}

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
