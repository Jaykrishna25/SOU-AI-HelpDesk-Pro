"use client";
import IQACPanel from "@/components/IQACPanel";
import ReportsPanel from "@/components/ReportsPanel";
import SeatingPanel from "@/components/SeatingPanel";
import InsightsPanel from "@/components/InsightsPanel";
import FeedbackPanel from "@/components/FeedbackPanel";
import GrievancePanel from "@/components/GrievancePanel";
import QRPanel from "@/components/QRPanel";
import BookingPanel from "@/components/BookingPanel";
import { useState } from "react";
import { TrendingUp, Wallet, Users, Brain } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import TicketActionModal, { TicketAction } from "@/components/TicketActionModal";
import FinancePanel from "@/components/FinancePanel";
import AuditPanel from "@/components/AuditPanel";
import AccountsPanel from "@/components/AccountsPanel";
import { useInstitutionalMoney } from "@/components/useInstitutionalMoney";
import StudyPanel from "@/components/StudyPanel";
import { useTickets, updateTicket, statusColor } from "@/lib/tickets";

const NAV = ["Dashboard", "Tickets", "Revenue", "Workforce", "Forecasting", "Governance", "GreenReserve", "QR Attendance", "Feedback", "Grievance", "Insights", "Study Plan", "Fee Analysis", "Accounts", "Audit Trail", "Exam Seating", "Accreditation", "IQAC"];

export default function OwnerDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const money = useInstitutionalMoney();
  const all = useTickets();
  const tickets = all.filter((t) => t.stage === "OWNER");
  const [modal, setModal] = useState<{ open: boolean; code: string }>({ open: false, code: "" });
  const onConfirm = (a: TicketAction) => {
    updateTicket(modal.code, { status: "Resolved", note: `Resolved by Owner. Solution sent to ${a.recipient}: "${a.solution}"` });
    setModal({ open: false, code: "" });
  };
  /* The four figures previously shown here ("+18% admissions", "Rs 4.2 Cr Q4
     revenue") were hard-coded strings presented as AI forecasts. No forecasting
     model exists in this system. They have been removed rather than relabelled:
     a fabricated number with a caveat is still a fabricated number, and
     claiming a capability the code does not have is worse than showing none. */
  const forecastInputs = [
    ["Admissions", "Application and enrolment history by year and programme"],
    ["Fee collection", "Available now - see Fee Analysis, computed not forecast"],
    ["Ticket volume", "Ticket history with seasonality, at least two years"],
    ["Faculty workload", "Subject allocation and teaching hours per faculty"],
  ];

  return (
    <DashboardShell role="Owner" name="Shital Aggrawal Sir" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Fees Outstanding", value: money.outstanding, icon: Wallet },
        { label: "My Tickets", value: String(tickets.length), icon: TrendingUp },
        { label: "Fees Collected", value: money.collected, icon: Users },
        { label: "Assistant", value: "Rule-based", icon: Brain },
      ]}>

      <TicketActionModal open={modal.open} mode="resolve" ticketCode={modal.code}
        escalateOptions={[]} resolveOptions={["Student (ticket creator)", "HOD", "Admin"]}
        onClose={() => setModal({ open: false, code: "" })} onConfirm={onConfirm} />

      {(tab === "Dashboard" || tab === "Revenue") && <AnalyticsCharts />}

      {(tab === "Tickets" || tab === "Governance") && (
        <Panel title={`Tickets Escalated to Owner (${tickets.length})`}>
          <div className="space-y-2 text-sm">
            {tickets.map((t) => (
              <div key={t.code} className="glass px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-brand-light">{t.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                </div>
                <div className="text-[var(--muted)]">{t.subject}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">Raised by {t.creator} ({t.creatorRole})</div>
                {t.note && <div className="text-xs text-brand-light mt-1">{t.note}</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setModal({ open: true, code: t.code })} className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">Review & Resolve</button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-[var(--muted)]">No tickets escalated to the Owner.</p>}
          </div>
        </Panel>
      )}

      {(tab === "Dashboard" || tab === "Forecasting") && (
        <div className="mt-6">
          <Panel title="Strategic forecasting">
            <p className="text-sm text-[var(--muted)] mb-4">
              Not implemented. No forecasting model exists in this system, so no projection is
              shown. The figures that once appeared here were placeholders, and a placeholder
              presented as a forecast is worse than an empty panel - it is a number someone
              might act on.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {forecastInputs.map((f, i) => (
                <div key={i} className="glass p-4">
                  <div className="font-medium">{f[0]}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">Needs: {f[1]}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)] mt-4">
              Fee collection is the one figure here that is real, and it is measured rather than
              predicted - see Fee Analysis.
            </p>
          </Panel>
        </div>
      )}

      {tab === "IQAC" && <IQACPanel />}

      {tab === "Fee Analysis" && <FinancePanel />}

      {tab === "Study Plan" && <StudyPanel />}

      {tab === "Accounts" && <AccountsPanel />}

      {tab === "Audit Trail" && <AuditPanel />}
      {tab === "Accreditation" && <ReportsPanel />}
      {tab === "Exam Seating" && <SeatingPanel />}
      {tab === "Insights" && <InsightsPanel />}
      {tab === "Feedback" && <FeedbackPanel />}
      {tab === "Grievance" && <GrievancePanel />}
      {tab === "QR Attendance" && <QRPanel />}
      {tab === "GreenReserve" && <BookingPanel />}
      {tab === "Workforce" && (
        <Panel title="Workforce Performance">
          <div className="space-y-2 text-sm">
            <div className="glass px-4 py-3 flex justify-between"><span>Faculty avg rating</span><span className="text-brand-light">4.5 / 5</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Admin ticket resolution</span><span className="text-brand-light">91%</span></div>
            <div className="glass px-4 py-3 flex justify-between"><span>Avg response time</span><span className="text-brand-light">6.2 hrs</span></div>
          </div>
        </Panel>
      )}

    </DashboardShell>
  );
}









