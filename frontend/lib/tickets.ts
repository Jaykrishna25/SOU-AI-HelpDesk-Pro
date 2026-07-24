"use client";
import { useEffect, useState } from "react";
import { sendMail } from "@/lib/email";

export interface Ticket {
  code: string; subject: string; description: string; category: string;
  priority: string; status: string; creator: string; note: string;
  stage: string; createdAt: number;
}

const KEY = "sou_tickets_v2";
const EVT = "sou_tickets_changed";

const SEED: Ticket[] = [
  { code: "TKT-2026-0042", subject: "Fee receipt not generated", description: "My fee receipt is not generating on the portal.", category: "FEES", priority: "HIGH", status: "Open", creator: "Navlani Jaykrishna", note: "", stage: "ADMIN", createdAt: Date.now() - 3600000 },
  { code: "TKT-2026-0039", subject: "Revaluation of DBMS paper", description: "Requesting revaluation for the DBMS end-sem paper.", category: "REVALUATION", priority: "MEDIUM", status: "Open", creator: "Harsh Barot", note: "", stage: "ADMIN", createdAt: Date.now() - 7200000 },
];

export function getTickets(): Ticket[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { localStorage.setItem(KEY, JSON.stringify(SEED)); return SEED; }
    const list: Ticket[] = JSON.parse(raw);
    return list.map((t) => ({ ...t, stage: t.stage || "ADMIN" }));
  } catch { return SEED; }
}

export function saveTickets(list: Ticket[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addTicket(t: Partial<Ticket>): Ticket {
  const list = getTickets();
  const code = "TKT-2026-" + String(4000 + Math.floor(Math.random() * 5000));
  const nt: Ticket = {
    code, subject: t.subject || "New request", description: t.description || "",
    category: t.category || "GENERAL", priority: t.priority || "MEDIUM",
    status: "Open", creator: t.creator || "Student", note: "", stage: "ADMIN", createdAt: Date.now(),
  };
  saveTickets([nt, ...list]);
  sendMail(`New ticket ${nt.code}`, `A new query was raised by ${nt.creator}: "${nt.subject}". It is now with the Admin desk.`, "Admin");
  return nt;
}

export function updateTicket(code: string, patch: Partial<Ticket>) {
  const next = getTickets().map((t) => t.code === code ? { ...t, ...patch } : t);
  saveTickets(next);
  const t = next.find((x) => x.code === code);
  if (t && patch.status) {
    if (patch.status === "Resolved")
      sendMail(`Ticket ${t.code} resolved`, `Your query "${t.subject}" has been resolved. ${t.note}`, t.creator);
    else if (patch.status === "Escalated")
      sendMail(`Ticket ${t.code} escalated`, `${t.note} (Query: "${t.subject}")`, t.stage);
    else if (patch.status === "Assigned")
      sendMail(`Ticket ${t.code} assigned`, `Your query "${t.subject}" was assigned to a staff member.`, t.creator);
    else if (patch.status === "Reopened")
      sendMail(`Ticket ${t.code} reopened`, `The query "${t.subject}" was reopened.`, "Admin");
  }
}

export function roleToStage(label: string): string {
  const s = label.toLowerCase();
  if (s.startsWith("admin")) return "ADMIN";
  if (s.startsWith("faculty")) return "FACULTY";
  if (s.startsWith("hoi")) return "HOI";
  if (s.startsWith("hod") || s.startsWith("head")) return "HOD";
  if (s.startsWith("owner")) return "OWNER";
  return "ADMIN";
}

export function useTickets(): Ticket[] {
  const [list, setList] = useState<Ticket[]>([]);
  useEffect(() => {
    const refresh = () => setList(getTickets());
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(EVT, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  return list;
}

export function statusColor(s: string): string {
  return s === "Resolved" || s === "Closed" ? "bg-emerald-500/20 text-emerald-300"
    : s === "Escalated" ? "bg-rose-500/20 text-rose-300"
    : s === "Reopened" ? "bg-amber-500/20 text-amber-300"
    : s === "Assigned" || s === "In Progress" ? "bg-brand/20 text-brand-light"
    : "bg-white/10 text-[var(--muted)]";
}
