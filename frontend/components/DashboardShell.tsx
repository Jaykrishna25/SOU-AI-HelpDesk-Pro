"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, LogOut, Bell, CheckCheck } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Chatbot from "./Chatbot";
import { useTickets, Ticket } from "@/lib/tickets";

export interface Stat { label: string; value: string; icon: React.ElementType; accent?: string; }
interface Notif { key: string; title: string; body: string; ts: number; }

function stageForRole(role: string): string {
  if (role === "HOI") return "HOI";
  if (role === "HOD") return "HOD";
  if (role === "FACULTY") return "FACULTY";
  if (role === "OWNER" || role === "SUPER_ADMIN") return "OWNER";
  return "ADMIN";
}

function buildNotifs(tickets: Ticket[], role: string, name: string): Notif[] {
  let relevant: Ticket[];
  if (role === "STUDENT") {
    const first = name.split(" ")[0].toLowerCase();
    relevant = tickets.filter((t) => t.creator.toLowerCase().includes(first) || name.toLowerCase().includes(t.creator.split(" ")[0].toLowerCase()));
  } else {
    relevant = tickets.filter((t) => t.stage === stageForRole(role));
  }
  return relevant.map((t) => {
    let body = t.subject;
    if (t.status === "Resolved") body = t.note || "Your query has been resolved.";
    else if (t.status === "Escalated") body = t.note || "This ticket was escalated.";
    else if (t.status === "Assigned") body = "Ticket assigned to a staff member.";
    else if (t.status === "Reopened") body = "Ticket reopened.";
    else if (role !== "STUDENT") body = "New ticket: " + t.subject;
    return { key: `${t.code}|${t.status}|${t.note}`, title: `${t.code} - ${t.status}`, body, ts: t.createdAt };
  }).sort((a, b) => b.ts - a.ts).slice(0, 15);
}

export default function DashboardShell({
  role, name, nav, stats, children, activeNav, onNavSelect,
}: {
  role: string; name: string; nav: string[]; stats: Stat[];
  children?: React.ReactNode; activeNav?: string; onNavSelect?: (item: string) => void;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [displayRole, setDisplayRole] = useState(role);
  const [roleCode, setRoleCode] = useState("STUDENT");
  const [notifOpen, setNotifOpen] = useState(false);
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const tickets = useTickets();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sou_user");
      if (raw) { const u = JSON.parse(raw); if (u.fullName) setDisplayName(u.fullName); if (u.role) { setDisplayRole(String(u.role).replace("_", " ")); setRoleCode(u.role); } }
      setReadKeys(JSON.parse(localStorage.getItem("sou_notif_read") || "[]"));
    } catch {}
  }, []);

  const notifs = useMemo(() => buildNotifs(tickets, roleCode, displayName), [tickets, roleCode, displayName]);
  const persistRead = (keys: string[]) => { setReadKeys(keys); try { localStorage.setItem("sou_notif_read", JSON.stringify(keys)); } catch {} };
  const unread = notifs.filter((n) => !readKeys.includes(n.key)).length;

  const logout = () => { try { sessionStorage.removeItem("sou_token"); sessionStorage.removeItem("sou_user"); } catch {} };
  const current = activeNav ?? nav[0];

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <Chatbot />
      <aside className="fixed top-0 left-0 h-full w-60 glass m-3 p-5 hidden lg:flex flex-col z-40" style={{ borderRadius: 24 }}>
        <div className="flex items-center gap-2 font-bold mb-8">
          <GraduationCap className="text-brand-light" /><span className="gradient-text text-sm">SOU HelpDesk</span>
        </div>
        <nav className="space-y-1 flex-1">
          {nav.map((n, i) => (
            <motion.button key={n} onClick={() => onNavSelect && onNavSelect(n)} type="button"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`w-full text-left block px-4 py-2.5 rounded-xl text-sm transition ${n === current ? "bg-brand text-white" : "text-[var(--muted)] hover:bg-brand/10"}`}>{n}</motion.button>
          ))}
        </nav>
        <Link href="/login" onClick={logout} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-rose-400 mt-4"><LogOut size={16} /> Sign out</Link>
      </aside>

      <div className="lg:ml-64 p-3 sm:p-4 md:p-8 relative z-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="glass px-4 sm:px-6 py-4 flex items-center justify-between mb-4 relative z-[70]" style={{ isolation: "isolate" }}>
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide truncate">{displayRole} Portal</p>
            <h1 className="text-lg sm:text-xl font-bold truncate">Welcome, {displayName}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative z-[80]">
              <button type="button" onClick={() => setNotifOpen((o) => !o)} className="glass p-2 rounded-full relative">
                <Bell size={18} />
                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] flex items-center justify-center bg-rose-500 text-white rounded-full">{unread}</span>}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 p-3 rounded-2xl border border-[var(--border)] shadow-2xl z-[90]" style={{ width: "min(20rem, 88vw)", background: "var(--bg)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <b className="text-sm">Notifications</b>
                      <button onClick={() => persistRead(notifs.map((n) => n.key))} className="text-xs text-brand-light flex items-center gap-1"><CheckCheck size={12} /> Mark all read</button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {notifs.map((n) => {
                        const isRead = readKeys.includes(n.key);
                        return (
                          <div key={n.key} onClick={() => { if (!isRead) persistRead([...readKeys, n.key]); }}
                            className={`p-3 rounded-xl cursor-pointer text-sm border border-[var(--border)] ${isRead ? "opacity-60" : "bg-brand/10"}`}>
                            <div className="font-medium flex items-center gap-2">{!isRead && <span className="w-2 h-2 bg-brand-light rounded-full" />}{n.title}</div>
                            <div className="text-xs text-[var(--muted)] mt-0.5">{n.body}</div>
                          </div>
                        );
                      })}
                      {notifs.length === 0 && <p className="text-xs text-[var(--muted)] px-1 py-2">No notifications yet.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ThemeToggle />
          </div>
        </motion.header>

        <div className="lg:hidden mb-6 -mx-1 overflow-x-auto">
          <div className="flex gap-2 px-1 pb-1 w-max">
            {nav.map((n) => (
              <button key={n} onClick={() => onNavSelect && onNavSelect(n)} type="button"
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition ${n === current ? "bg-brand text-white" : "glass text-[var(--muted)]"}`}>{n}</button>
            ))}
            <Link href="/login" onClick={logout} className="whitespace-nowrap px-4 py-2 rounded-full text-sm glass text-rose-400 flex items-center gap-1"><LogOut size={14} /> Sign out</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }} className="glass p-4 sm:p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent || "bg-brand/20"}`}>
                <s.icon className="text-brand-light" size={20} />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-[var(--muted)]">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
