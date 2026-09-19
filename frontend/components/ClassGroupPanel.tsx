"use client";
import { useState, useRef } from "react";
import {
  MessagesSquare, Upload, Send, Loader2, ShieldCheck, X, AlertTriangle, Megaphone,
} from "lucide-react";

/* Class group.

   The file never leaves this tab except as the body of a request that is
   answered and discarded. Nothing is written to the database - there is no
   table for it - and the panel says so where a student can read it, because a
   privacy promise nobody sees is not a promise.

   The chat is held in a ref rather than state on purpose: it should not be
   serialised into React's tree, survive a re-render longer than it must, or
   end up anywhere a later change might persist by accident. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

interface Source { date: string; time: string; sender: string; text: string }
interface Turn { question: string; answer: string; sources: Source[] }

const EXAMPLES = [
  "When is the next internal test and which room?",
  "What is the submission deadline for the practical file?",
  "Has any lecture been cancelled this week?",
  "Is there a holiday coming up?",
];

export default function ClassGroupPanel() {
  const chat = useRef<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setBusy("parsing"); setTurns([]);
    try {
      const text = await f.text();
      chat.current = text;
      const r = await fetch("/api/classchat/parse", {
        method: "POST", headers: H(), body: JSON.stringify({ chat: text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not read that export");
      setSummary(d);
    } catch (e: any) {
      chat.current = "";
      setSummary(null);
      setErr(String(e?.message || e));
    } finally {
      setBusy("");
      e.target.value = "";
    }
  }

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy || !chat.current) return;
    setErr(""); setBusy("asking"); setQuestion("");
    try {
      const r = await fetch("/api/classchat/ask", {
        method: "POST", headers: H(),
        body: JSON.stringify({ chat: chat.current, question: text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not answer that");
      setTurns(t => [{ question: text, answer: d.answer, sources: d.sources || [] }, ...t]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy("");
    }
  }

  function forget() {
    chat.current = "";
    setSummary(null);
    setTurns([]);
    setErr("");
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MessagesSquare size={20} className="opacity-70" /> Class group
        </h1>
        <p className="opacity-55 text-sm mt-1 max-w-2xl">
          Exam dates, deadlines and room changes are announced in the class WhatsApp group
          and usually nowhere else. Upload an export and ask it a question instead of
          scrolling back three weeks.
        </p>
      </div>

      {/* ---------- the privacy statement, where it can be read ---------- */}
      <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/[0.06]">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <ShieldCheck size={15} /> What happens to this file
        </div>
        <ul className="text-sm opacity-70 mt-2 space-y-1 list-disc pl-5">
          <li><b>Nothing is saved.</b> There is no database table for chat messages. The file
            stays in this browser tab and is gone when you close it.</li>
          <li><b>Phone numbers are removed</b> before anything else happens — as sender names,
            which become &ldquo;Member 1&rdquo;, and inside messages.</li>
          <li><b>Attachments are not read.</b> Export with <b>Without media</b>.</li>
        </ul>
        <p className="text-xs opacity-50 mt-2">
          An export contains everyone&rsquo;s messages, not just yours. Upload your own class
          group only, and only if you are comfortable doing so.
        </p>
      </div>

      {/* ---------- upload ---------- */}
      {!summary ? (
        <div className="panel-solid rounded-xl p-8 text-center">
          <Upload size={24} className="mx-auto opacity-40" />
          <p className="text-sm opacity-60 mt-3">
            In WhatsApp: open the group &rarr; menu &rarr; More &rarr; Export chat &rarr;
            <b> Without media</b>. Upload the .txt file it produces.
          </p>
          <label className="inline-block mt-4">
            <input type="file" accept=".txt,text/plain" onChange={onFile} className="hidden" />
            <span className="text-sm px-4 py-2 rounded-lg bg-brand text-white cursor-pointer inline-flex items-center gap-2">
              {busy === "parsing" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {busy === "parsing" ? "Reading…" : "Choose the exported .txt"}
            </span>
          </label>
        </div>
      ) : (
        <div className="panel-solid rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-medium">
                {summary.messages} messages over {summary.days} day(s)
              </div>
              <div className="text-xs opacity-55 mt-1">
                {summary.senders?.length} participant(s)
              </div>
              <ul className="text-xs opacity-60 mt-3 space-y-1">
                {(summary.notes || []).map((n: string) => <li key={n}>· {n}</li>)}
              </ul>
            </div>
            <button onClick={forget}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] flex items-center gap-1.5">
              <X size={12} /> Forget it
            </button>
          </div>

          {!!summary.announcements?.length && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="text-xs uppercase tracking-wide opacity-50 flex items-center gap-1.5">
                <Megaphone size={11} /> Recent announcements
              </div>
              <div className="mt-2 space-y-1.5">
                {summary.announcements.slice(-4).map((a: Source, i: number) => (
                  <div key={i} className="text-sm opacity-75">
                    <span className="opacity-50 text-xs">{a.date} · {a.sender}</span>
                    <div>{a.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- ask ---------- */}
      {summary && (
        <div className="panel-solid rounded-xl p-5">
          <h3 className="font-medium">Ask the group</h3>
          <p className="text-xs opacity-55 mt-1">
            The matching messages are found here in the portal, then read back to you. Every
            answer shows the messages it came from.
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map(q => (
              <button key={q} onClick={() => ask(q)} disabled={!!busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") ask(question); }}
              placeholder="Ask about an exam, a deadline, a room…"
              className="flex-1 bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
            />
            <button onClick={() => ask(question)} disabled={!!busy || !question.trim()}
              className="px-3 py-2 rounded-lg bg-brand text-white disabled:opacity-40">
              {busy === "asking" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10 flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {/* ---------- answers ---------- */}
      {turns.map((t, i) => (
        <div key={i} className="panel-solid rounded-xl p-5">
          <div className="text-sm opacity-55">{t.question}</div>
          <div className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{t.answer}</div>

          {!!t.sources.length && (
            <details className="mt-3">
              <summary className="text-xs opacity-55 cursor-pointer hover:opacity-80">
                The exact messages this came from ({t.sources.length})
              </summary>
              <div className="mt-2 space-y-2">
                {t.sources.map((s, j) => (
                  <div key={j} className="text-xs border-l-2 border-[var(--border)] pl-3 py-0.5">
                    <span className="opacity-45">{s.date} {s.time} · {s.sender}</span>
                    <div className="opacity-80 mt-0.5 whitespace-pre-wrap">{s.text}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}

      <p className="text-xs opacity-40">
        A class group is often right and sometimes wrong. These are your own uploaded
        messages, not official university records — check anything that matters with
        the department.
      </p>
    </div>
  );
}
