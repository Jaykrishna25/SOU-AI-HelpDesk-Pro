"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, LogOut, Bell } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Chatbot from "./Chatbot";

export interface Stat { label: string; value: string; icon: React.ElementType; accent?: string; }

export default function DashboardShell({
  role, name, nav, stats, children, activeNav, onNavSelect,
}: {
  role: string; name: string;
  nav: string[];
  stats: Stat[];
  children?: React.ReactNode;
  activeNav?: string;
  onNavSelect?: (item: string) => void;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [displayRole, setDisplayRole] = useState(role);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem("sou_user") : null;
      if (raw) {
        const u = JSON.parse(raw);
        if (u.fullName) setDisplayName(u.fullName);
        if (u.role) setDisplayRole(String(u.role).replace("_", " "));
      }
    } catch {}
  }, []);

  const logout = () => {
    try { sessionStorage.removeItem("sou_token"); sessionStorage.removeItem("sou_user"); } catch {}
  };
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

      <div className="lg:ml-64 p-4 md:p-8 relative z-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="glass px-6 py-4 flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{displayRole} Portal</p>
            <h1 className="text-xl font-bold">Welcome, {displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="glass p-2 rounded-full relative"><Bell size={18} /><span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" /></button>
            <ThemeToggle />
          </div>
        </motion.header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }} className="glass p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent || "bg-brand/20"}`}>
                <s.icon className="text-brand-light" size={20} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-[var(--muted)]">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
