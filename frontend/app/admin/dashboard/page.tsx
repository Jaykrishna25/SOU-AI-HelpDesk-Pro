"use client";
import IQACPanel from "@/components/IQACPanel";
import ReportsPanel from "@/components/ReportsPanel";
import SeatingPanel from "@/components/SeatingPanel";
import InsightsPanel from "@/components/InsightsPanel";
import FeedbackPanel from "@/components/FeedbackPanel";
import GrievancePanel from "@/components/GrievancePanel";
import QRPanel from "@/components/QRPanel";
import BookingPanel from "@/components/BookingPanel";
import { useEffect, useState } from "react";
import { DoorOpen, Ticket, Megaphone, Building2 } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import TicketActionModal, { TicketAction } from "@/components/TicketActionModal";
import CRPanel from "@/components/CRPanel";
import FinancePanel from "@/components/FinancePanel";
import AccountsPanel from "@/components/AccountsPanel";
import StudyPanel from "@/components/StudyPanel";
import FunPanel from "@/components/FunPanel";
import { useTickets, updateTicket, statusColor, roleToStage } from "@/lib/tickets";

const NAV = ["Dashboard", "Tickets", "CR & Attendance", "Classrooms", "Resources", "Announcements", "GreenReserve", "QR Attendance", "Feedback", "Grievance", "Insights", "Study Plan", "Fee Analysis", "Accounts", "Exam Seating", "Accreditation", "IQAC", "Fun Zone"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [me, setMe] = useState("Ms. A. Desai");
  const all = useTickets();
  const tickets = all.filter((t) => t.stage === "ADMIN");
  const [modal, setModal] = useState<{ open: boolean; mode: "escalate" | "resolve"; code: string }>({ open: false, mode: "escalate", code: "" });

  useEffect(() => {
    try { const u = JSON.parse(sessionStorage.getItem("sou_user") || "{}"); if (u.fullName) setMe(u.fullName); } catch {}
  }, []);

  const openModal = (mode: "escalate" | "resolve", code: string) => setModal({ open: true, mode, code });
  const onConfirm = (a: TicketAction) => {
    if (a.mode === "escalate")
      updateTicket(modal.code, { status: "Escalated", stage: roleToStage(a.recipient), note: `Escalated to ${a.recipient}` });
    else
      updateTicket(modal.code, { status: "Resolved", note: `Resolved. Solution sent to ${a.recipient}: "${a.solution}"` });
    setModal({ open: false, mode: "escalate", code: "" });
  };

  const rooms = [["A-301", "Occupied", "DSA - Prof. R. Mehta"], ["A-302", "Occupied", "DBMS - Prof. S. Iyer"], ["Lab-2", "Free", "-"], ["Seminar Hall", "Free", "-"]];
  const resources = [["Computer Lab 1", "Available"], ["Computer Lab 2", "In Use"], ["Seminar Hall A", "Available"], ["Auditorium", "Booked"]];

  return (
    <DashboardShell role="Admin" name={me} nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "My Tickets", value: String(tickets.length), icon: Ticket },
        { label: "Open", value: String(tickets.filter((t) => t.status === "Open").length), icon: Ticket },
        { label: "Free Labs", value: "3", icon: Building2 },
        { label: "Occupied Rooms", value: "12", icon: DoorOpen },
      ]}>

      <TicketActionModal open={modal.open} mode={modal.mode} ticketCode={modal.code}
        escalateOptions={["Faculty (Prof. R. Mehta)", "HOD (Dr. N. Rao)", "HOI (Dr. P. Menon)", "Owner (Mr. K. Shah)"]}
        resolveOptions={["Student (ticket creator)", "HOD", "Owner"]}
        onClose={() => setModal({ open: false, mode: "escalate", code: "" })} onConfirm={onConfirm} />

      {(tab === "Dashboard" || tab === "Tickets") && (
        <Panel title={`Ticket queue (${tickets.length})`}>
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
                <div className="text-xs text-[var(--muted)] mt-0.5">Raised by {t.creator} ({t.creatorRole})</div>
                {t.note && <div className="text-xs text-brand-light mt-1">{t.note}</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateTicket(t.code, { status: "Assigned", note: "" })} className="text-xs px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-light">Assign</button>
                  <button onClick={() => openModal("resolve", t.code)} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Resolve</button>
                  <button onClick={() => openModal("escalate", t.code)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Escalate</button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-[var(--muted)]">No tickets in your queue.</p>}
          </div>
        </Panel>
      )}

      {tab === "IQAC" && <IQACPanel />}

      {tab === "Fee Analysis" && <FinancePanel />}

      {tab === "Study Plan" && <StudyPanel />}

      {tab === "Accounts" && <AccountsPanel />}
      {tab === "Accreditation" && <ReportsPanel />}
      {tab === "Exam Seating" && <SeatingPanel />}
      {tab === "Insights" && <InsightsPanel />}
      {tab === "Feedback" && <FeedbackPanel />}
      {tab === "Grievance" && <GrievancePanel />}
      {tab === "Fun Zone" && <FunPanel />}
      {tab === "QR Attendance" && <QRPanel />}
      {tab === "GreenReserve" && <BookingPanel />}
      {tab === "CR & Attendance" && <CRPanel actor={me} />}

      {tab === "Classrooms" && (
        <Panel title="Classrooms"
          hint="Sample occupancy. Live room status is not connected — GreenReserve holds the bookings this portal actually manages.">
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

      {tab === "Resources" && (
        <Panel title="Resource allocation"
          hint="Sample allocation. Not connected to an inventory system.">
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
        <Panel title="Create an announcement"
          hint="Drafting only. Delivery needs the notification service connected.">
          <div className="space-y-3">
            <input placeholder="Announcement title" className="w-full glass px-4 py-3 bg-transparent outline-none text-sm" />
            <textarea placeholder="Message to students / faculty..." className="w-full glass px-4 py-3 bg-transparent outline-none text-sm h-24" />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => alert("Not wired up in this build. Announcements are drafted here; delivery needs the notification service connected.")} className="px-4 py-2 rounded-full bg-brand text-white text-sm">Post to Students</button>
              <button onClick={() => alert("Not wired up in this build. Announcements are drafted here; delivery needs the notification service connected.")} className="px-4 py-2 rounded-full glass text-sm">Post to Faculty</button>
              <button onClick={() => alert("Not wired up in this build — and deliberately so. A campus-wide emergency broadcast should not be one unconfirmed click away.")} className="px-4 py-2 rounded-full bg-rose-500/80 text-white text-sm">Emergency Alert</button>
            </div>
          </div>
        </Panel>
      )}

    </DashboardShell>
  );
}








