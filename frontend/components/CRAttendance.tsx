"use client";
import { useState } from "react";
import Panel from "./Panel";
import { CRAssignment, submitAttendance, useSubmissions } from "@/lib/attendance";

const CLASS_ROSTER = [
  { enrollmentNo: "SOU2023CSE69", name: "Navlani Jaykrishna" },
  { enrollmentNo: "SOU2023CSE02", name: "Harsh Barot" },
  { enrollmentNo: "SOU2023CSE65", name: "Zala Rudraraj" },
  { enrollmentNo: "SOU2023CSE05", name: "Ashok Sharma" },
  { enrollmentNo: "SOU2023CSE10", name: "Priya Nair" },
  { enrollmentNo: "SOU2023CSE12", name: "Sneha Patel" },
];

export default function CRAttendance({ assignments, me }: { assignments: CRAssignment[]; me: { enrollmentNo: string; name: string } }) {
  const subs = useSubmissions();
  const [subject, setSubject] = useState(assignments[0]?.subjectCode || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  const [msg, setMsg] = useState("");

  const chosen = assignments.find((a) => a.subjectCode === subject) || assignments[0];
  const mine = subs.filter((s) => s.markedByEnrollment === me.enrollmentNo);

  const submit = () => {
    if (!chosen) return;
    const entries = CLASS_ROSTER.map((s) => ({
      enrollmentNo: s.enrollmentNo, studentName: s.name,
      status: (marks[s.enrollmentNo] || "PRESENT") as "PRESENT" | "ABSENT",
    }));
    submitAttendance({
      subjectCode: chosen.subjectCode, subjectName: chosen.subjectName, date,
      markedByEnrollment: me.enrollmentNo, markedByName: me.name, entries,
    });
    setMarks({});
    setMsg("Attendance submitted. It will sync to SOU MIS once the subject faculty approves it.");
    setTimeout(() => setMsg(""), 5000);
  };

  return (
    <>
      <Panel title="Mark Attendance (Class Representative)">
        <p className="text-xs text-[var(--muted)] mb-3">
          You are the CR for {assignments.map((a) => a.subjectName).join(", ")}. Attendance you mark is
          sent to the subject faculty for approval, then posted to SOU MIS.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <select value={subject} onChange={(e) => setSubject(e.target.value)}
            className="glass px-3 py-2 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
            {assignments.map((a) => <option key={a.subjectCode} value={a.subjectCode} style={{ color: "#111" }}>{a.subjectName}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="glass px-3 py-2 bg-transparent outline-none text-sm" />
        </div>
        <div className="space-y-2 text-sm">
          {CLASS_ROSTER.map((s) => {
            const v = marks[s.enrollmentNo] || "PRESENT";
            return (
              <div key={s.enrollmentNo} className="flex items-center justify-between glass px-4 py-3">
                <span>{s.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => setMarks((m) => ({ ...m, [s.enrollmentNo]: "PRESENT" }))}
                    className={`text-xs px-3 py-1 rounded-full ${v === "PRESENT" ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-300"}`}>Present</button>
                  <button onClick={() => setMarks((m) => ({ ...m, [s.enrollmentNo]: "ABSENT" }))}
                    className={`text-xs px-3 py-1 rounded-full ${v === "ABSENT" ? "bg-rose-500 text-white" : "bg-rose-500/20 text-rose-300"}`}>Absent</button>
                </div>
              </div>
            );
          })}
        </div>
        {msg && <p className="text-emerald-400 text-xs mt-3">{msg}</p>}
        <button onClick={submit} className="mt-4 px-4 py-2 rounded-full bg-brand text-white text-sm hover:bg-brand-light">Submit for Faculty Approval</button>
      </Panel>

      <div className="mt-6">
        <Panel title="My Submissions">
          <div className="space-y-2 text-sm">
            {mine.map((s) => (
              <div key={s.id} className="glass px-4 py-3">
                <div className="flex justify-between items-center">
                  <span>{s.subjectName} - {s.date}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-300" : s.status === "REJECTED" ? "bg-rose-500/20 text-rose-300" : "bg-brand/20 text-brand-light"}`}>{s.status}</span>
                </div>
                {s.status === "APPROVED" && <div className="text-xs text-brand-light mt-1">SOU MIS: {s.syncState}</div>}
              </div>
            ))}
            {mine.length === 0 && <p className="text-[var(--muted)]">No submissions yet.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
