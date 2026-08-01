"use client";
import { useEffect, useState } from "react";

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
  syncState: string;
  approvedBy: string; at: number;
}

const CR_KEY = "sou_cr_v1";
const AT_KEY = "sou_attendance_v1";
const EVT = "sou_attendance_changed";

const CR_SEED: CRAssignment[] = [
  { subjectCode: "CS301", subjectName: "Data Structures", enrollmentNo: "SOU2023CSE69", studentName: "Navlani Jaykrishna", assignedBy: "Akshay Sir", at: Date.now() - 86400000 },
];

function read<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { localStorage.setItem(key, JSON.stringify(seed)); return seed; }
    return JSON.parse(raw);
  } catch { return seed; }
}
function write<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export const getCRs = (): CRAssignment[] => read(CR_KEY, CR_SEED);

export function assignCR(a: Omit<CRAssignment, "at">) {
  const list = getCRs().filter((c) => c.subjectCode !== a.subjectCode);
  write(CR_KEY, [...list, { ...a, at: Date.now() }]);
}
export function removeCR(subjectCode: string) {
  write(CR_KEY, getCRs().filter((c) => c.subjectCode !== subjectCode));
}
export function crSubjectsFor(enrollmentNo: string): CRAssignment[] {
  return getCRs().filter((c) => c.enrollmentNo.toLowerCase() === enrollmentNo.toLowerCase());
}

export const getSubmissions = (): AttendanceSubmission[] => read<AttendanceSubmission>(AT_KEY, []);

export function submitAttendance(s: Omit<AttendanceSubmission, "id" | "status" | "syncState" | "approvedBy" | "at">) {
  const sub: AttendanceSubmission = {
    ...s, id: "ATT-" + Date.now().toString(36).toUpperCase(),
    status: "PENDING", syncState: "NOT_SYNCED", approvedBy: "", at: Date.now(),
  };
  write(AT_KEY, [sub, ...getSubmissions()]);
  return sub;
}

export function rejectSubmission(id: string, by: string) {
  write(AT_KEY, getSubmissions().map((s) => s.id === id ? { ...s, status: "REJECTED" as const, approvedBy: by } : s));
}

export async function approveSubmission(id: string, by: string) {
  const sub = getSubmissions().find((s) => s.id === id);
  if (!sub) return;
  let syncState = "SYNCED (mock - awaiting SOU MIS API access)";
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
    const token = typeof window !== "undefined" ? sessionStorage.getItem("sou_token") : null;
    const res = await fetch(base + "/integrations/soumis/attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": sub.id,
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify({
        records: sub.entries.map((e) => ({
          enrollmentNo: e.enrollmentNo, subjectCode: sub.subjectCode,
          date: sub.date, status: e.status, markedBy: sub.markedByName,
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const mode = data?.result?.mode || "mock";
      syncState = mode === "live"
        ? "SYNCED to SOU MIS (live)"
        : "SYNCED (mock - awaiting SOU MIS API access)";
    }
  } catch { syncState = "QUEUED (SOU MIS unreachable - will retry)"; }
  write(AT_KEY, getSubmissions().map((s) => s.id === id ? { ...s, status: "APPROVED" as const, approvedBy: by, syncState } : s));
}

export function useCRs(): CRAssignment[] {
  const [list, setList] = useState<CRAssignment[]>([]);
  useEffect(() => {
    const r = () => setList(getCRs());
    r(); window.addEventListener(EVT, r); window.addEventListener("storage", r);
    return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); };
  }, []);
  return list;
}
export function useSubmissions(): AttendanceSubmission[] {
  const [list, setList] = useState<AttendanceSubmission[]>([]);
  useEffect(() => {
    const r = () => setList(getSubmissions());
    r(); window.addEventListener(EVT, r); window.addEventListener("storage", r);
    return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); };
  }, []);
  return list;
}
