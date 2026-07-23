"use client";
import { useState } from "react";
import { TrendingUp, Wallet, Users, Brain } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import Panel from "@/components/Panel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import TicketActionModal, { TicketAction } from "@/components/TicketActionModal";
import { useTickets, updateTicket, statusColor } from "@/lib/tickets";

const NAV = ["Dashboard", "Tickets", "Revenue", "Workforce", "Forecasting", "Governance"];

export default function OwnerDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const all = useTickets();
  const tickets = all.filter((t) => t.stage === "OWNER");
  const [modal, setModal] = useState<{ open: boolean; code: string }>({ open: false, code: "" });
  const onConfirm = (a: TicketAction) => {
    updateTicket(modal.code, { status: "Resolved", note: `Resolved by Owner. Solution sent to ${a.recipient}: "${a.solution}"` });
    setModal({ open: false, code: "" });
  };
  const forecasts = [["Admissions (Next Yr)", "+18%", "AI forecast"], ["Revenue (Q4)", "Rs 4.2 Cr", "projected"], ["Ticket Volume", "-12%", "trending down"], ["Faculty Workload", "Balanced", "optimal"]];

  return (
    <DashboardShell role="Owner" name="Shital Aggrawal Sir" nav={NAV} activeNav={tab} onNavSelect={setTab}
      stats={[
        { label: "Total Revenue", value: "Rs 18.6 Cr", icon: Wallet },
        { label: "My Tickets", value: String(tickets.length), icon: TrendingUp },
        { label: "Fees Collected", value: "92%", icon: Users },
        { label: "AI Accuracy", value: "92%", icon: Brain },
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
                <div className="text-xs text-[var(--muted)] mt-0.5">By {t.creator} - {t.category}</div>
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
          <Panel title="Strategic AI Forecasting">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {forecasts.map((f, i) => (
                <div key={i} className="glass p-4">
                  <div className="text-lg font-bold gradient-text">{f[1]}</div>
                  <div>{f[0]}</div>
                  <div className="text-xs text-[var(--muted)]">{f[2]}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

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
