"use client";
import { useEffect, useState } from "react";
import { sendMail } from "@/lib/email";

export interface Ticket {
  code: string; subject: string; description: string; category: string;
  priority: string; status: string; stage: string; note: string;
  creator: string; creatorRole: string; createdAt: number;
}

const EVT = "sou_data_changed";
export const refreshData = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT)); };

function token(): string {
  try { return typeof window === "undefined" ? "" : sessionStorage.getItem("sou_token") || ""; } catch { return ""; }
}

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch("/api" + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {}),
      ...(init.headers || {}),
    },
  });
  return res.json().catch(() => ({ success: false }));
}

interface RawTicket {
  code: string; subject: string; description: string; category: string;
  priority: string; status: string; stage: string; note: string;
  creatorName: string; createdAt: string; creator?: { role: string };
}
const map = (t: RawTicket): Ticket => ({
  code: t.code, subject: t.subject, description: t.description, category: t.category,
  priority: t.priority, status: t.status, stage: t.stage, note: t.note || "",
  creator: t.creatorName, creatorRole: t.creator?.role || "STUDENT", createdAt: Date.parse(t.createdAt) || Date.now(),
});

export async function fetchTickets(): Promise<Ticket[]> {
  const d = await api("/tickets");
  return d.success && Array.isArray(d.tickets) ? d.tickets.map(map) : [];
}

export async function addTicket(t: Partial<Ticket>): Promise<Ticket | null> {
  const d = await api("/tickets", {
    method: "POST",
    body: JSON.stringify({
      subject: t.subject, description: t.description,
      category: t.category || "GENERAL", priority: t.priority || "MEDIUM",
    }),
  });
  refreshData();
  if (d.success) {
    sendMail("New ticket " + d.ticket.code, "A new query was raised: " + d.ticket.subject, "Admin");
    return map(d.ticket);
  }
  return null;
}

export async function updateTicket(code: string, patch: Partial<Ticket>) {
  const d = await api("/tickets/" + code, {
    method: "PATCH",
    body: JSON.stringify({ status: patch.status, stage: patch.stage, note: patch.note }),
  });
  refreshData();
  if (d.success && patch.status) {
    const t = d.ticket;
    if (patch.status === "Resolved") sendMail("Ticket " + t.code + " resolved", t.note || t.subject, t.creatorName);
    else if (patch.status === "Escalated") sendMail("Ticket " + t.code + " escalated", t.note || t.subject, t.stage);
  }
}

export function useTickets(): Ticket[] {
  const [list, setList] = useState<Ticket[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => { const t = await fetchTickets(); if (alive) setList(t); };
    load();
    const timer = setInterval(load, 6000);
    window.addEventListener(EVT, load);
    return () => { alive = false; clearInterval(timer); window.removeEventListener(EVT, load); };
  }, []);
  return list;
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

export function statusColor(s: string): string {
  return s === "Resolved" || s === "Closed" ? "bg-emerald-500/20 text-emerald-300"
    : s === "Escalated" ? "bg-rose-500/20 text-rose-300"
    : s === "Reopened" ? "bg-amber-500/20 text-amber-300"
    : s === "Assigned" || s === "In Progress" ? "bg-brand/20 text-brand-light"
    : "bg-white/10 text-[var(--muted)]";
}

