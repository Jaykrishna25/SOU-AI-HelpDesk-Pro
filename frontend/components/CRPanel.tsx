"use client";
import { useState } from "react";
import Panel from "./Panel";
import { useCRs, assignCR, removeCR, useSubmissions, approveSubmission, rejectSubmission } from "@/lib/attendance";

const SUBJECTS = [
  { code: "CS301", name: "Data Structures" },
  { code: "CS302", name: "Database Management Systems" },
  { code: "CS303", name: "Operating Systems" },
  { code: "CS401", name: "Machine Learning" },
];
const STUDENTS = [
  { enrollmentNo: "SOU2023CSE69", name: "Navlani Jaykrishna" },
  { enrollmentNo: "SOU2023CSE02", name: "Harsh Barot" },
  { enrollmentNo: "SOU2023CSE65", name: "Zala Rudraraj" },
  { enrollmentNo: "SOU2023CSE05", name: "Ashok Sharma" },
];

export default function CRPanel({ actor }: { actor: string }) {
  const crs = useCRs();
  const subs = useSubmissions();
  const [subject, setSubject] = useState(SUBJECTS[0].code);
  const [student, setStudent] = useState(STUDENTS[0].enrollmentNo);
  const [busy, setBusy] = useState("");

  const assign = () => {
    const s = SUBJECTS.find((x) => x.code === subject)!;
    const st = STUDENTS.find((x) => x.enrollmentNo === student)!;
    assignCR({ subjectCode: s.code, subjectName: s.name, enrollmentNo: st.enrollmentNo, studentName: st.name, assignedBy: actor });
  };

  const approve = async (id: string) => {
    setBusy(id);
    await approveSubmission(id, actor);
    setBusy("");
  };

  const pending = subs.filter((s) => s.status === "PENDING");
  const done = subs.filter((s) => s.status !== "PENDING");

  return (
    <>
      <Panel title="Class Representative (CR) Assignment">
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          <select value={subject} onChange={(e) => setSubject(e.target.value)}
            className="glass px-3 py-2 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
            {SUBJECTS.map((s) => <option key={s.code} value={s.code} style={{ color: "#111" }}>{s.name}</option>)}
          </select>
          <select value={student} onChange={(e) => setStudent(e.target.value)}
            className="glass px-3 py-2 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
            {STUDENTS.map((s) => <option key={s.enrollmentNo} value={s.enrollmentNo} style={{ color: "#111" }}>{s.name}</option>)}
          </select>
          <button onClick={assign} className="px-4 py-2 rounded-full bg-brand text-white text-sm hover:bg-brand-light">Make CR</button>
        </div>
        <div className="space-y-2 text-sm">
          {crs.map((c) => (
            <div key={c.subjectCode} className="glass px-4 py-3 flex items-center justify-between">
              <span className="flex-1">{c.subjectName}</span>
              <span className="flex-1">{c.studentName}</span>
              <span className="text-[var(--muted)] font-mono flex-1 hidden sm:block">{c.enrollmentNo}</span>
              <button onClick={() => removeCR(c.subjectCode)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Remove</button>
            </div>
          ))}
          {crs.length === 0 && <p className="text-[var(--muted)]">No CR assigned yet.</p>}
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title={`Attendance Awaiting Approval (${pending.length})`}>
          <div className="space-y-2 text-sm">
            {pending.map((s) => (
              <div key={s.id} className="glass px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{s.subjectName}</span>
                  <span className="text-xs text-[var(--muted)]">{s.date}</span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Marked by CR {s.markedByName} - {s.entries.filter((e) => e.status === "PRESENT").length} present / {s.entries.length} total
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.entries.map((e) => (
                    <span key={e.enrollmentNo} className={`text-[10px] px-2 py-0.5 rounded-full ${e.status === "PRESENT" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                      {e.studentName.split(" ")[0]} {e.status === "PRESENT" ? "P" : "A"}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button disabled={busy === s.id} onClick={() => approve(s.id)}
                    className="text-xs px-3 py-1 rounded-full bg-emerald-500/80 text-white">
                    {busy === s.id ? "Syncing..." : "Approve & Sync to SOU MIS"}
                  </button>
                  <button onClick={() => rejectSubmission(s.id, actor)} className="text-xs px-3 py-1 rounded-full bg-rose-500/80 text-white">Reject</button>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="text-[var(--muted)]">Nothing pending. CR submissions appear here.</p>}
          </div>
        </Panel>
      </div>

      {done.length > 0 && (
        <div className="mt-6">
          <Panel title="Processed Attendance">
            <div className="space-y-2 text-sm">
              {done.map((s) => (
                <div key={s.id} className="glass px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span>{s.subjectName} - {s.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">By {s.approvedBy}</div>
                  {s.status === "APPROVED" && <div className="text-xs text-brand-light mt-1">SOU MIS: {s.syncState}</div>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
