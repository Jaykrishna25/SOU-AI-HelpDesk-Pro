"use client";
import { useEffect, useState } from "react";
import {
  BookOpen, Loader2, AlertTriangle, Lightbulb, ListChecks, ChevronDown, Info,
} from "lucide-react";
import { DEPTHS, type Depth } from "@/lib/tutor-core";

/* AI tutor.

   The one feature here that generates rather than reports. That is fine for
   explaining a concept - a model explaining normalisation does what a textbook
   does - and not fine for anything specific to this university. The boundary
   runs on the server before the model is called, and the disclaimer below is
   written where a student actually reads it rather than buried in a footer.

   Opens on the weak subjects from the student's own study plan, so the first
   screen already knows what they are struggling with. An empty search box
   would make it a generic chatbot that happens to live in a portal. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

interface WeakSubject {
  subject: string; score: number; severity: string; topics: string[];
}
interface Question { q: string; answer: string; why: string }

export default function TutorPanel() {
  const [weak, setWeak] = useState<WeakSubject[]>([]);
  const [all, setAll] = useState<{ subject: string; score: number }[]>([]);
  const [configured, setConfigured] = useState(true);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("normal");

  const [answer, setAnswer] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [refusal, setRefusal] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/tutor/subjects", { headers: AUTH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setWeak(d.weak || []);
        setAll(d.all || []);
        setConfigured(d.configured !== false);
        if (d.weak?.length) setSubject(d.weak[0].subject);
        else if (d.all?.length) setSubject(d.all[0].subject);
      })
      .catch(() => { /* the tutor still works with a typed subject */ });
  }, []);

  async function run(kind: "explain" | "practice", t?: string) {
    const theTopic = (t ?? topic).trim();
    if (!theTopic || busy) return;
    setTopic(theTopic);
    setErr(""); setRefusal(""); setBusy(kind);
    if (kind === "explain") { setAnswer(""); setQuestions([]); }
    else { setQuestions([]); setShown({}); }

    try {
      const r = await fetch("/api/tutor/" + kind, {
        method: "POST", headers: H(),
        body: JSON.stringify({ subject, topic: theTopic, depth }),
      });
      const d = await r.json();

      if (d.refused) { setRefusal(d.message); return; }
      if (!r.ok) throw new Error(d?.error || "Could not reach the tutor");

      if (kind === "explain") setAnswer(d.answer);
      else setQuestions(d.questions || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(""); }
  }

  const active = weak.find(w => w.subject === subject);
  const chips = active?.topics || [];

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BookOpen size={20} className="opacity-70" /> Tutor
        </h1>
        <p className="opacity-55 text-sm mt-1 max-w-2xl">
          Your study plan says what to revise. This helps you actually learn it — a
          concept explained at the depth you need, then questions to check whether it
          stuck.
        </p>
      </div>

      {/* The limit, stated where it will be read rather than in a footer. */}
      <div className="rounded-xl p-4 border border-amber-400/35 bg-amber-400/[0.06] text-sm">
        <div className="flex items-center gap-2 font-medium text-amber-300">
          <Info size={15} /> What this tutor does not know
        </div>
        <p className="opacity-70 mt-2">
          It explains <b>concepts</b> — normalisation, deadlock, gradient descent. It has
          never seen your syllabus, your exam paper, your timetable or your marks, and it
          will say so rather than guess. Anything about what is <i>in</i> an exam belongs
          with your class group or your department.
        </p>
      </div>

      {!configured && (
        <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">
          The tutor is not configured on this deployment.
        </div>
      )}

      {/* ---------- subject ---------- */}
      <div className="panel-solid rounded-xl p-5">
        <div className="text-sm font-medium">Subject</div>
        {weak.length > 0 ? (
          <>
            <p className="text-xs opacity-55 mt-1">
              From your study plan — these are the ones below your threshold.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {weak.map(w => (
                <button key={w.subject} onClick={() => setSubject(w.subject)}
                  className={"text-xs px-3 py-1.5 rounded-lg border transition " +
                    (subject === w.subject
                      ? "border-brand/60 bg-brand/15 text-white"
                      : "border-white/15 hover:border-white/30 opacity-75")}>
                  {w.subject}
                  <span className={"ml-2 " + (w.severity === "critical" ? "text-rose-300" : "text-amber-300")}>
                    {w.score}/100
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs opacity-55 mt-1">
            {all.length
              ? "Nothing is below your threshold — pick any subject, or type a topic."
              : "No results recorded yet. Type a subject and topic below."}
          </p>
        )}

        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject, e.g. Database Management Systems"
          className="w-full mt-3 bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
        />
      </div>

      {/* ---------- topic and depth ---------- */}
      <div className="panel-solid rounded-xl p-5">
        <div className="text-sm font-medium">What do you want to understand?</div>

        {!!chips.length && (
          <div className="flex flex-wrap gap-2 mt-3">
            {chips.map(t => (
              <button key={t} onClick={() => run("explain", t)} disabled={!!busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40">
                {t}
              </button>
            ))}
          </div>
        )}

        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") run("explain"); }}
          placeholder="A topic, or a question about it"
          className="w-full mt-3 bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {DEPTHS.map(d => (
            <button key={d.id} onClick={() => setDepth(d.id)} title={d.blurb}
              className={"text-xs px-3 py-1.5 rounded-lg border transition " +
                (depth === d.id
                  ? "border-brand/60 bg-brand/15 text-white"
                  : "border-white/15 hover:border-white/30 opacity-75")}>
              {d.label}
            </button>
          ))}
          <span className="text-xs opacity-45 self-center ml-1">
            {DEPTHS.find(d => d.id === depth)?.blurb}
          </span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => run("explain")} disabled={!!busy || !topic.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-brand text-white disabled:opacity-40 flex items-center gap-2">
            {busy === "explain" ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
            Explain it
          </button>
          <button onClick={() => run("practice")} disabled={!!busy || !topic.trim()}
            className="text-sm px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 flex items-center gap-2">
            {busy === "practice" ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
            Give me practice questions
          </button>
        </div>
      </div>

      {/* ---------- the refusal ---------- */}
      {refusal && (
        <div className="rounded-xl p-4 border border-amber-400/50 bg-amber-400/[0.07]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-300">
            <AlertTriangle size={12} /> Outside what this tutor knows
          </div>
          <p className="text-sm mt-2 leading-relaxed">{refusal}</p>
        </div>
      )}

      {err && (
        <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10 flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {/* ---------- explanation ---------- */}
      {answer && (
        <div className="panel-solid rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs opacity-55">
            <Lightbulb size={13} />
            {subject} · {topic} · {DEPTHS.find(d => d.id === depth)?.label}
          </div>
          <div className="text-sm mt-3 leading-relaxed whitespace-pre-wrap">{answer}</div>
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2 items-center">
            <span className="text-xs opacity-45">Still unclear?</span>
            {DEPTHS.filter(d => d.id !== depth).map(d => (
              <button key={d.id}
                onClick={() => { setDepth(d.id); setTimeout(() => run("explain"), 0); }}
                disabled={!!busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40">
                {d.label}
              </button>
            ))}
            <button onClick={() => run("practice")} disabled={!!busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 disabled:opacity-40 ml-auto">
              Test me on this
            </button>
          </div>
        </div>
      )}

      {/* ---------- practice ---------- */}
      {!!questions.length && (
        <div className="panel-solid rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListChecks size={15} className="opacity-70" /> Practice · {topic}
          </div>
          <p className="text-xs opacity-50 mt-1">
            Written by the tutor to help you practise. <b>Not past papers</b>, and not a
            prediction of what will be asked. Try each one before opening the answer.
          </p>

          <div className="mt-4 space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="border border-white/10 rounded-lg p-4">
                <div className="text-sm">
                  <span className="opacity-45 mr-2">{i + 1}.</span>{q.q}
                </div>
                <button
                  onClick={() => setShown(s => ({ ...s, [i]: !s[i] }))}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5">
                  <ChevronDown size={12} className={shown[i] ? "rotate-180 transition" : "transition"} />
                  {shown[i] ? "Hide the answer" : "Show the answer"}
                </button>
                {shown[i] && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{q.answer}</div>
                    {q.why && (
                      <div className="text-xs opacity-45 mt-2">Tests: {q.why}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs opacity-40">
        Explanations are generated and can be wrong. Nothing here is saved — a tutoring
        session is a conversation, not a record. Check anything that matters against your
        textbook or your lecturer.
      </p>
    </div>
  );
}
