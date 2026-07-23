"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl">
      <div className="glass px-5 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <GraduationCap className="text-brand-light" />
          <span className="gradient-text">SOU AI HelpDesk Pro</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-[var(--muted)]">
          <a href="#features" className="hover:text-[var(--text)]">Features</a>
          <a href="#agents" className="hover:text-[var(--text)]">AI Agents</a>
          <a href="#portals" className="hover:text-[var(--text)]">Portals</a>
          <a href="#analytics" className="hover:text-[var(--text)]">Analytics</a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="px-4 py-2 rounded-full bg-brand text-white text-sm font-semibold glow hover:bg-brand-light transition">
            Launch
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
