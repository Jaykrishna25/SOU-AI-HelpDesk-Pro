"use client";
import { useEffect, useState } from "react";
import Panel from "./Panel";
import { listCourses, listWork, connectClassroom, disconnectClassroom, classroomConfigured, getToken, GcCourse, GcWork } from "@/lib/classroom";

export default function ClassroomPanel() {
  const [courses, setCourses] = useState<GcCourse[]>([]);
  const [work, setWork] = useState<GcWork[]>([]);
  const [live, setLive] = useState(false);
  const [openId, setOpenId] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const r = await listCourses();
    setCourses(r.courses); setLive(r.live);
  };
  useEffect(() => { load(); }, []);

  const openCourse = async (id: string) => {
    if (openId === id) { setOpenId(""); return; }
    setOpenId(id);
    const r = await listWork(id);
    setWork(r.work);
  };

  const connect = () => {
    connectClassroom(async (ok, m) => {
      setMsg(m);
      if (ok) await load();
      setTimeout(() => setMsg(""), 6000);
    });
  };

  const disconnect = () => { disconnectClassroom(); setLive(false); setMsg("Disconnected."); load(); };

  return (
    <>
      <Panel title="Google Classroom">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span className={`text-xs px-3 py-1 rounded-full ${live ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-[var(--muted)]"}`}>
            {live ? "Connected to your Google Classroom" : "Sample data - not connected"}
          </span>
          {getToken()
            ? <button onClick={disconnect} className="text-xs px-4 py-2 rounded-full glass">Disconnect</button>
            : <button onClick={connect} className="text-xs px-4 py-2 rounded-full bg-brand text-white hover:bg-brand-light">Connect Google Classroom</button>}
        </div>
        {!classroomConfigured() && (
          <p className="text-xs text-[var(--muted)] mb-3">
            Live sync needs a Google OAuth Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID). Showing sample courses until then.
          </p>
        )}
        {msg && <p className="text-xs text-brand-light mb-3">{msg}</p>}
        <div className="space-y-2 text-sm">
          {courses.map((c) => (
            <div key={c.id} className="glass px-4 py-3">
              <button onClick={() => openCourse(c.id)} className="w-full text-left">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-[var(--muted)]">{openId === c.id ? "Hide work" : "View work"}</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{c.section}{c.teacher ? " - " + c.teacher : ""}</div>
              </button>
              {openId === c.id && (
                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                  {work.filter((w) => w.courseId === c.id).map((w) => (
                    <div key={w.id} className="flex justify-between text-xs">
                      <span>{w.title}</span>
                      <span className="text-[var(--muted)]">{w.dueDate ? "Due " + w.dueDate : "No due date"}</span>
                    </div>
                  ))}
                  {work.filter((w) => w.courseId === c.id).length === 0 && <p className="text-xs text-[var(--muted)]">No coursework found.</p>}
                </div>
              )}
            </div>
          ))}
          {courses.length === 0 && <p className="text-[var(--muted)]">No courses.</p>}
        </div>
      </Panel>
      <div className="mt-4">
        <a href="https://classroom.google.com/" target="_blank" rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-full glass text-sm text-brand-light">Open Google Classroom</a>
      </div>
    </>
  );
}
