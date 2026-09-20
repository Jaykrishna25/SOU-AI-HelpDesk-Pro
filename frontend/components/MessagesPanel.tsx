"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare, Send, Plus, ArrowLeft, Loader2, Check, CircleDot, Info,
} from "lucide-react";
import { messageProblem, startProblem, MAX_BODY } from "@/lib/messages-core";

/* ============================================================
   Direct conversation between a student and a lecturer.

   One component, both portals. A student sees a "New message"
   button; faculty do not, because staff-initiated messaging to
   a student is a different feature with different consent
   questions attached. The server decides and says so in
   `canStart` - the UI never infers it from a role.

   The disclosure line at the bottom is not decoration. This is
   the one place in the portal where two named people have a
   private-feeling exchange that IS stored, and a student should
   know that before they type rather than after.
   ============================================================ */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const auth = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

interface Thread {
  id: string; subject: string; closed: boolean; lastMessageAt: string;
  lastSnippet: string; withName: string; withRole: string; unread: boolean;
}
interface Msg {
  id: string; senderId: string; senderName: string; senderRole: string;
  body: string; sentAt: string;
}
interface Faculty { id: string; fullName: string; role: string; course: string | null }

export default function MessagesPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [canStart, setCanStart] = useState(false);
  const [me, setMe] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/messages/threads", { headers: auth() });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not load messages."); return; }
      setThreads(d.conversations || []); setCanStart(!!d.canStart); setMe(d.me || ""); setErr("");
    } catch { setErr("Could not reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (composing) return <Compose onDone={(id) => { setComposing(false); load(); if (id) setOpenId(id); }} onCancel={() => setComposing(false)} />;
  if (openId) return <ThreadView id={openId} me={me} onBack={() => { setOpenId(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <MessageSquare size={16} className="text-brand-light" />
        <h3 className="text-sm font-semibold">Direct messages</h3>
        {canStart && (
          <button onClick={() => setComposing(true)}
            className="ml-auto px-3 py-1.5 rounded-full bg-brand text-white text-xs font-medium flex items-center gap-1.5 hover:bg-brand-light transition">
            <Plus size={13} /> New message
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--muted)]">
        {canStart
          ? "For a question that does not need a desk - a doubt about a submission, asking to meet. Anything needing a record, a deadline or an escalation should still be a ticket."
          : "Conversations students have started with you. Replying reopens a closed thread."}
      </p>

      {loading && <p className="text-sm text-[var(--muted)] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
      {err && <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      {!loading && !threads.length && (
        <div className="panel-solid rounded-xl p-8 text-center">
          <MessageSquare className="mx-auto text-[var(--muted)] mb-2" size={26} />
          <p className="text-sm text-[var(--muted)]">No conversations yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {threads.map(t => (
          <button key={t.id} onClick={() => setOpenId(t.id)}
            className="w-full panel-solid rounded-xl p-3 text-left hover:border-[var(--border-strong)] transition">
            <div className="flex items-center gap-2">
              {t.unread
                ? <CircleDot size={12} className="text-brand-light shrink-0" />
                : <Check size={12} className="text-[var(--muted)] shrink-0" />}
              <span className={"text-sm truncate " + (t.unread ? "font-semibold" : "")}>{t.subject}</span>
              {t.closed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)] shrink-0">
                  closed
                </span>
              )}
              <span className="ml-auto text-[10px] text-[var(--muted)] shrink-0">
                {new Date(t.lastMessageAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1 truncate">
              {t.withName} · {t.lastSnippet}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Compose({ onDone, onCancel }: { onDone: (id?: string) => void; onCancel: () => void }) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/messages/faculty", { headers: auth() });
      const d = await r.json();
      if (r.ok) setFaculty(d.faculty || []);
      else setErr(d.error || "Could not load the staff list.");
    })();
  }, []);

  const problem = startProblem(subject, body, facultyId);

  async function send() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/messages/start", {
        method: "POST", headers: auth(),
        body: JSON.stringify({ facultyId, subject, body }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not send."); return; }
      onDone(d.conversation?.id);
    } catch { setErr("Could not reach the server."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1">
        <ArrowLeft size={12} /> Back
      </button>
      <h3 className="text-sm font-semibold">New message</h3>

      <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
        className="w-full glass px-3 py-2 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }}>
        <option value="" style={{ color: "#111" }}>Choose a lecturer...</option>
        {faculty.map(f => (
          <option key={f.id} value={f.id} style={{ color: "#111" }}>
            {f.fullName}{f.course ? " - " + f.course : ""}
          </option>
        ))}
      </select>

      <input value={subject} onChange={e => setSubject(e.target.value)}
        placeholder="Subject (e.g. Lab 4 submission)"
        className="w-full glass px-3 py-2 bg-transparent outline-none text-sm" />

      <textarea value={body} onChange={e => setBody(e.target.value)}
        placeholder="Write your message"
        className="w-full glass px-3 py-2 bg-transparent outline-none text-sm h-32" />

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={send} disabled={busy || !!problem} title={problem || undefined}
          className="px-4 py-2 rounded-full bg-brand text-white text-sm font-medium flex items-center gap-2 disabled:opacity-40 hover:bg-brand-light transition">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
        </button>
        <span className="text-[11px] text-[var(--muted)]">{body.length}/{MAX_BODY}</span>
      </div>

      {problem && <p className="text-[11px] text-[var(--muted)]">{problem}</p>}
      {err && <p className="text-[11px] text-rose-300">{err}</p>}

      <Disclosure />
    </div>
  );
}

function ThreadView({ id, me, onBack }: { id: string; me: string; onBack: () => void }) {
  const [subject, setSubject] = useState("");
  const [closed, setClosed] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/messages/thread?id=" + encodeURIComponent(id), { headers: auth() });
    const d = await r.json();
    if (!r.ok) { setErr(d.error || "Not found."); return; }
    setSubject(d.conversation.subject); setClosed(d.conversation.closed); setMsgs(d.messages || []);
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function reply() {
    const problem = messageProblem(body);
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/messages/reply", {
      method: "POST", headers: auth(), body: JSON.stringify({ id, body }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Could not send."); return; }
    setBody(""); load();
  }

  async function toggleClosed() {
    await fetch("/api/messages/close", {
      method: "POST", headers: auth(), body: JSON.stringify({ id, closed: !closed }),
    });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onBack} className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1">
          <ArrowLeft size={12} /> All messages
        </button>
        <button onClick={toggleClosed}
          className="ml-auto text-xs px-3 py-1 rounded-full border border-[var(--border)] hover:border-brand transition">
          {closed ? "Reopen" : "Mark as done"}
        </button>
      </div>

      <h3 className="text-sm font-semibold">{subject}</h3>
      {closed && (
        <p className="text-[11px] text-[var(--muted)]">
          Marked as done. Writing below reopens it.
        </p>
      )}

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {msgs.map(m => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} className={mine ? "text-right" : ""}>
              <div className={"inline-block max-w-[85%] text-left px-3 py-2 rounded-2xl text-sm " +
                (mine ? "bg-brand text-white" : "panel-solid")}>
                {!mine && (
                  <div className="text-[10px] opacity-70 mb-0.5">{m.senderName}</div>
                )}
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={"text-[10px] mt-1 " + (mine ? "text-white/60" : "text-[var(--muted)]")}>
                  {new Date(m.sentAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 panel-solid rounded-2xl p-2">
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write a reply"
          className="flex-1 bg-transparent outline-none text-sm px-2 py-1 resize-none h-16" />
        <button onClick={reply} disabled={busy || !body.trim()}
          className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40 self-end">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      {err && <p className="text-[11px] text-rose-300">{err}</p>}

      <Disclosure />
    </div>
  );
}

/* Said before they type, not buried in a policy page. This is the one part of
   the portal where two named people have what feels like a private exchange
   and it IS stored - so the interface says so plainly. */
function Disclosure() {
  return (
    <p className="text-[11px] text-[var(--muted)] flex items-start gap-1.5">
      <Info size={11} className="mt-0.5 shrink-0" />
      These messages are stored and are between you and the person named. They are not
      anonymous. Anything that needs to be formally recorded, escalated or investigated
      should go through a ticket or a grievance instead.
    </p>
  );
}
