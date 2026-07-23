"use client";
import { useState } from "react";
import { DoorOpen, Ticket, Megaphone, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import TicketActionModal, { TicketAction } from "@/components/TicketActionModal";

const NAV = ["Dashboard", "Classrooms", "Resources", "Tickets", "Announcements", "Timetables"];
interface Tkt { code: string; subject: string; priority: string; status: string; note: string; }

export default function AdminDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [tickets, setTickets] = useState<Tkt[]>([
    { code: "TKT-2026-0042", subject: "Fee receipt issue", priority: "HIGH", status: "Open", note: "" },
    { code: "TKT-2026-0039", subject: "Revaluation query", priority: "MEDIUM", status: "Assigned", note: "" },
    { code: "TKT-2026-0051", subject: "Hostel room change", priority: "LOW", status: "Open", note: "" },
  ]);
  const [modal, setModal] = useState<{ open: boolean; mode: "escalate" | "resolve"; code: string }>({ open: false, mode: "escalate", code: "" });

  const assign = (code: string) => setTickets((ts) => ts.map((t) => t.code === code ? { ...t, status: "Assigned", note: "" } : t));
  const openModal = (mode: "escalate" | "resolve", code: string) => setModal({ open: true, mode, code });
  const onConfirm = (a: TicketAction) => {
    setTickets((ts) => ts.map((t) => t.code === modal.code ? {
      ...t,
      status: a.mode === "escalate" ? "Escalated" : "Resolved",
      note: a.mode === "escalate" ? `Escalated to ${a.recipient}` : `Resolved. Solution sent to ${a.recipient}: "${a.solution}"`,
    } : t));
    setModal({ open: false, mode: "escalate", code: "" });
  };

  const rooms = [["A-301", "Occupied", "DSA - Akshay Sir"], ["A-302", "Occupied", "DBMS - Sagar Sir"], ["Lab-2", "Free", "-"], ["Seminar Hall", "Free", "-"]];
  const resources = [["Computer Lab 1", "Available"], ["Computer Lab 2", "In Use"], ["Seminar Hall A", "Available"], ["Auditorium", "Booked"]];
  const statusColor = (s: string) =>
    s === "Resolved" ? "bg-emerald-500/20 text-emerald-300" : s === "Escalated" ? "bg-rose-500/20 text-rose-300"
    : s === "Assigned" ? "bg-brand/20 text-brand-light" : "bg-white/10 text-[var(--muted)]";

  const TicketList = (
    <Panel title="Ticket Queue">
      <div className="space-y-2 text-sm">
        {tickets.map((t) => (
          <div key={t.code} className="glass px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="font-mono text-brand-light">{t.code}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/20">{t.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
              </div>
            </div>
            <div className="text-[var(--muted)]">{t.subject}</div>
            {t.note && <div className="text-xs text-brand-light mt-1">{t.note}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => assign(t.code)} className="text-xs px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-light">Assign</button>
              <button onClick={() => openModal("resolve", t.code)} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Resolve</button>
              <button onClick={() => openModal("escalate", t.code)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Escalate</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  return (
    <DashboardShell role="Admin" name="Umangini Mam" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Occupied Rooms", value: "12", icon: DoorOpen },
        { label: "Open Tickets", value: String(tickets.filter((t) => t.status === "Open").length), icon: Ticket },
        { label: "Free Labs", value: "3", icon: Building2 },
        { label: "Notices Today", value: "2", icon: Megaphone },
      ]}>

      <TicketActionModal open={modal.open} mode={modal.mode} ticketCode={modal.code}
        escalateOptions={["Faculty (Akshay Sir)", "HOD (Deepika Chauhan Mam)", "HOI (Hemal Patel Mam)", "Owner (Shital Aggrawal Sir)"]}
        resolveOptions={["Student (ticket creator)", "HOD", "Owner"]}
        onClose={() => setModal({ open: false, mode: "escalate", code: "" })} onConfirm={onConfirm} />

      {(tab === "Dashboard" || tab === "Classrooms") && (
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
      )}

      {(tab === "Dashboard" || tab === "Tickets") && <div className="mt-6">{TicketList}</div>}

      {tab === "Resources" && (
        <Panel title="Resource Allocation">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {resources.map((r, i) => (
              <div key={i} className="glass px-4 py-3 flex justify-between">
                <span>{r[0]}</span>
                <span className={r[1] === "Available" ? "text-emerald-400" : "text-rose-400"}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Announcements" && (
        <Panel title="Create Announcement">
          <div className="space-y-3">
            <input placeholder="Announcement title" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
            <textarea placeholder="Message to students / faculty..." className="w-full glass px-4 py-3 bg-transparent outline-none text-sm h-24" />
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-full bg-brand text-white text-sm">Post to Students</button>
              <button className="px-4 py-2 rounded-full glass text-sm">Post to Faculty</button>
              <button className="px-4 py-2 rounded-full bg-rose-500/80 text-white text-sm">Emergency Alert</button>
            </div>
          </div>
        </Panel>
      )}

      {tab === "Timetables" && (
        <Panel title="Timetable Monitoring">
          <p className="text-sm text-[var(--muted)]">Faculty and student timetables across departments. Running lectures: 12 | Free slots: 8.</p>
        </Panel>
      )}

    </DashboardShell>
  );
}
