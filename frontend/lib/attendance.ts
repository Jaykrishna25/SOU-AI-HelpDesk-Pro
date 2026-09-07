"use client";
import { useEffect, useState } from "react";
import { refreshData } from "@/lib/tickets";

export interface CRAssignment {
  subjectCode: string; subjectName: string;
  enrollmentNo: string; studentName: string;
  assignedBy: string; at: number;
}
export interface AttendanceEntry {
  enrollmentNo: string; studentName: string; status: "PRESENT" | "ABSENT";
}
export interface AttendanceSubmission {
  id: string; subjectCode: string; subjectName: string; date: string;
  markedByEnrollment: string; markedByName: string;
  entries: AttendanceEntry[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  syncState: string; approvedBy: string; at: number;
}

const EVT = "sou_data_changed";

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

export async function assignCR(a: { subjectCode: string; subjectName: string; enrollmentNo: string; studentName: string; assignedBy: string }) {
  await api("/cr", { method: "POST", body: JSON.stringify(a) });
  refreshData();
}
export async function removeCR(subjectCode: string) {
  await api("/cr/" + encodeURIComponent(subjectCode), { method: "DELETE" });
  refreshData();
}

export function useCRs(): CRAssignment[] {
  const [list, setList] = useState<CRAssignment[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const d = await api("/cr");
      if (alive && d.success) {
        setList((d.crs || []).map((c: Record<string, string>) => ({
          subjectCode: c.subjectCode, subjectName: c.subjectName,
          enrollmentNo: c.enrollmentNo, studentName: c.studentName,
          assignedBy: c.assignedBy, at: Date.parse(c.createdAt) || Date.now(),
        })));
      }
    };
    load();
    const timer = setInterval(load, 8000);
    window.addEventListener(EVT, load);
    return () => { alive = false; clearInterval(timer); window.removeEventListener(EVT, load); };
  }, []);
  return list;
}

export async function submitAttendance(s: {
  subjectCode: string; subjectName: string; date: string;
  markedByEnrollment: string; markedByName: string; entries: AttendanceEntry[];
}) {
  await api("/attendance", {
    method: "POST",
    body: JSON.stringify({ subjectCode: s.subjectCode, subjectName: s.subjectName, date: s.date, entries: s.entries }),
  });
  refreshData();
}

export async function approveSubmission(id: string, _by: string) {
  await api("/attendance/" + id, { method: "PATCH", body: JSON.stringify({ action: "approve" }) });
  refreshData();
}
export async function rejectSubmission(id: string, _by: string) {
  await api("/attendance/" + id, { method: "PATCH", body: JSON.stringify({ action: "reject" }) });
  refreshData();
}

export function useSubmissions(): AttendanceSubmission[] {
  const [list, setList] = useState<AttendanceSubmission[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const d = await api("/attendance");
      if (alive && d.success) {
        setList((d.submissions || []).map((s: Record<string, unknown>) => ({
          id: String(s.id), subjectCode: String(s.subjectCode), subjectName: String(s.subjectName),
          date: String(s.date), markedByEnrollment: String(s.markedByEnrollment),
          markedByName: String(s.markedByName),
          entries: (s.entries as AttendanceEntry[]) || [],
          status: s.status as "PENDING" | "APPROVED" | "REJECTED",
          syncState: String(s.syncState || ""), approvedBy: String(s.approvedBy || ""),
          at: Date.parse(String(s.createdAt)) || Date.now(),
        })));
      }
    };
    load();
    const timer = setInterval(load, 8000);
    window.addEventListener(EVT, load);
    return () => { alive = false; clearInterval(timer); window.removeEventListener(EVT, load); };
  }, []);
  return list;
}
