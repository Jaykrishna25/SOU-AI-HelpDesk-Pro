"use client";
import { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import TicketActionModal, { TicketAction } from "@/components/TicketActionModal";
import { useTickets, updateTicket, statusColor, roleToStage } from "@/lib/tickets";

const NAV = ["Dashboard", "Tickets", "Students", "Faculty", "Admins", "Meetings", "Events", "Reports"];
interface Member { name: string; id: string; info: string; }

function EditableSection({ title, data, onChange, cols }: {
  title: string; data: Member[]; onChange: (next: Member[]) => void; cols: [string, string, string];
}) {
  const [editIdx, setEditIdx] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Member>({ name: "", id: "", info: "" });
  const startEdit = (i: number, m: Member) => { setAdding(false); setEditIdx(i); setDraft(m); };
  const saveEdit = () => { onChange(data.map((m, i) => i === editIdx ? draft : m)); setEditIdx(-1); };
  const startAdd = () => { setEditIdx(-1); setAdding(true); setDraft({ name: "", id: "", info: "" }); };
  const saveAdd = () => { if (draft.name.trim()) onChange([...data, draft]); setAdding(false); };
  const remove = (i: number) => { if (window.confirm("Remove this record?")) onChange(data.filter((_, j) => j !== i)); };
  const Editor = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="glass px-4 py-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={cols[0]} className="glass px-3 py-2 bg-transparent outline-none text-sm" />
        <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder={cols[1]} className="glass px-3 py-2 bg-transparent outline-none text-sm" />
        <input value={draft.info} onChange={(e) => setDraft({ ...draft, info: e.target.value })} placeholder={cols[2]} className="glass px-3 py-2 bg-transparent outline-none text-sm" />
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
          editIdx === i ? <Editor key={i} onSave={saveEdit} onCancel={() => setEditIdx(-1)} /> : (
            <div key={i} className="flex items-center justify-between glass px-4 py-3">
              <span className="flex-1">{m.name}</span>
              <span className="text-[var(--muted)] flex-1">{m.id}</span>
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
  const [myStage, setMyStage] = useState("HOD");
  const all = useTickets();
  useEffect(() => {
    try { const u = JSON.parse(sessionStorage.getItem("sou_user") || "{}"); setMyStage(u.role === "HOI" ? "HOI" : "HOD"); } catch {}
  }, []);
  const tickets = all.filter((t) => t.stage === myStage);
  const [modal, setModal] = useState<{ open: boolean; mode: "escalate" | "resolve"; code: string }>({ open: false, mode: "escalate", code: "" });
  const onConfirm = (a: TicketAction) => {
    if (a.mode === "escalate")
      updateTicket(modal.code, { status: "Escalated", stage: roleToStage(a.recipient), note: `Escalated to ${a.recipient}` });
    else
      updateTicket(modal.code, { status: "Resolved", note: `Resolved. Solution sent to ${a.recipient}: "${a.solution}"` });
    setModal({ open: false, mode: "escalate", code: "" });
  };

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
  const [meetings, setMeetings] = useState<Member[]>([
    { name: "Faculty Review Meeting", id: "28 Jul 2026", info: "Department" },
    { name: "Curriculum Board", id: "02 Aug 2026", info: "Academic" },
  ]);
  const [events, setEvents] = useState<Member[]>([
    { name: "AI & Cloud Summit 2026", id: "10 Sep 2026", info: "Conference" },
    { name: "Web Dev Workshop", id: "18 Aug 2026", info: "Workshop" },
  ]);

  return (
    <DashboardShell role="HOD / Head" name="Deepika Chauhan Mam" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Total Students", value: String(students.length), icon: Users },
        { label: "My Tickets", value: String(tickets.length), icon: UserPlus },
        { label: "Faculty", value: String(faculty.length), icon: Building2 },
        { label: "Events", value: String(events.length), icon: UserMinus },
      ]}>

      <TicketActionModal open={modal.open} mode={modal.mode} ticketCode={modal.code}
        escalateOptions={["HOI (Hemal Patel Mam)", "Owner (Shital Aggrawal Sir)"]}
        resolveOptions={["Student (ticket creator)", "Admin", "Faculty"]}
        onClose={() => setModal({ open: false, mode: "escalate", code: "" })} onConfirm={onConfirm} />

      {tab === "Dashboard" && <AnalyticsCharts />}

      {tab === "Tickets" && (
        <Panel title={`Tickets Escalated to Me (${tickets.length})`}>
          <div className="space-y-2 text-sm">
            {tickets.map((t) => (
              <div key={t.code} className="glass px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-brand-light">{t.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                </div>
                <div className="text-[var(--muted)]">{t.subject}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">By {t.creator} - {t.category}</div>
                {t.note && <div className="text-xs text-brand-light mt-1">{t.note}</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setModal({ open: true, mode: "resolve", code: t.code })} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Resolve</button>
                  <button onClick={() => setModal({ open: true, mode: "escalate", code: t.code })} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Escalate</button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-[var(--muted)]">No tickets escalated to you yet.</p>}
          </div>
        </Panel>
      )}

      {tab === "Students" && <EditableSection title="Student Management" data={students} onChange={setStudents} cols={["Name", "Enrollment No.", "Semester"]} />}
      {tab === "Faculty" && <EditableSection title="Faculty Management" data={faculty} onChange={setFaculty} cols={["Name", "Faculty ID", "Designation"]} />}
      {tab === "Admins" && <EditableSection title="Admin Management" data={admins} onChange={setAdmins} cols={["Name", "Admin ID", "Scope"]} />}
      {tab === "Meetings" && <EditableSection title="Meeting Management" data={meetings} onChange={setMeetings} cols={["Meeting title", "Date", "Type"]} />}
      {tab === "Events" && <EditableSection title="Event Management" data={events} onChange={setEvents} cols={["Event name", "Date", "Type"]} />}

      {tab === "Reports" && (
        <Panel title="Generate Reports">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {["Student Report", "Faculty Report", "Attendance Report", "Admissions Report", "Result Analysis", "Ticket Summary"].map((r) => (
              <button key={r} onClick={() => alert(r + " generated and ready to download.")} className="glass py-3 hover:bg-brand/20 transition">{r}</button>
            ))}
          </div>
        </Panel>
      )}

    </DashboardShell>
  );
}
