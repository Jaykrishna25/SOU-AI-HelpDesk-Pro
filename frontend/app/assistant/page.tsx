"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Loader2, Ticket, BookOpen, Languages,
  AlertTriangle,
} from "lucide-react";
import {
  detectLanguage, supportsSpeechInput, supportsSpeechOutput, createRecognizer,
  speak, stopSpeaking, LANGUAGES, type LangCode, type Recognizer,
} from "@/lib/speech";
import { addTicket } from "@/lib/tickets";
import { gate, GATE_MESSAGE } from "@/lib/ai-guard";
import { SUGGESTIONS } from "@/lib/assistant-suggestions";

/* ============================================================
   OakMitra - the full-page assistant.

   The corner bubble stays for quick questions from anywhere in
   the portal. This page is for a real conversation: room to
   read, sources shown against every answer, and the language
   and voice controls visible rather than hidden behind icons.

   Two things are deliberate and worth defending:

   1. Every answer carries where it came from. A university
      assistant that cannot show its source is asking to be
      believed, which is not the same as being right.

   2. When retrieval is not confident, it does not improvise -
      it offers to raise a ticket with a human. A wrong fee
      deadline is worse than an honest "I don't know".
   ============================================================ */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

interface Msg {
  role: "user" | "ai";
  text: string;
  sources?: { title: string; score: number }[];
  unsure?: boolean;
}

/* In lib/ so a test can assert the assistant never suggests a question it
   would then refuse - which it briefly did. See the file's own comment. */


/* Questions about a specific person's record, and complaints, belong with a
   human rather than a retrieval model working from general policy documents.
   The rule itself lives in lib/ai-guard.ts so that this page and the corner
   bubble cannot drift apart - they did once, and "my results" was refused by
   one and answered by the other. */

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<LangCode>("en-IN");
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [err, setErr] = useState("");

  const sessionId = useRef("");
  const recog = useRef<Recognizer | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [canHear, setCanHear] = useState(false);
  const [canTalk, setCanTalk] = useState(false);

  useEffect(() => {
    setCanHear(supportsSpeechInput());
    setCanTalk(supportsSpeechOutput());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  // Read the newest answer aloud when the speaker is on.
  useEffect(() => {
    if (!speakOn) { stopSpeaking(); return; }
    const last = msgs[msgs.length - 1];
    if (last?.role === "ai") speak(last.text, lang);
  }, [msgs, speakOn, lang]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    setInput("");
    setErr("");
    setMsgs(m => [...m, { role: "user", text: q }]);
    setBusy(true);

    // Detect from the message itself: setLang is async, so reading `lang`
    // here would use the value from before the user typed.
    const qLang = detectLanguage(q, lang);
    if (qLang !== lang) setLang(qLang);

    const blocked = gate(q);
    if (blocked) {
      setMsgs(m => [...m, { role: "ai", unsure: true, text: GATE_MESSAGE[blocked] }]);
      setBusy(false);
      return;
    }

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() },
        body: JSON.stringify({ message: q, lang: qLang, sessionId: sessionId.current || undefined }),
      });
      const d = await r.json();
      if (d.sessionId) sessionId.current = d.sessionId;

      if (!d.configured) {
        setMsgs(m => [...m, { role: "ai", unsure: true, text: d.answer || "OakMitra is not configured on this deployment." }]);
      } else if (!d.answer || !d.confident) {
        setMsgs(m => [...m, {
          role: "ai", unsure: true,
          text: d.answer || "I could not find that in the university's documents. Rather than guess, " +
                "I would rather this went to a person who can check.",
        }]);
      } else {
        setMsgs(m => [...m, { role: "ai", text: d.answer, sources: d.sources || [] }]);
      }
    } catch (e: any) {
      setErr("OakMitra could not be reached. " + String(e?.message || e).slice(0, 120));
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) { recog.current?.stop(); setListening(false); return; }
    if (!canHear) return;
    recog.current = createRecognizer({
      lang,
      onResult: (text: string) => { setListening(false); ask(text); },
      onEnd: () => setListening(false),
      onError: () => { setListening(false); setErr("The microphone could not be used."); },
    } as any);
    recog.current?.start();
    setListening(true);
  }

  function raiseTicket(about: string) {
    addTicket({
      subject: about.slice(0, 60), description: about,
      category: "GENERAL", creator: "Portal user", priority: "MEDIUM",
    });
    setMsgs(m => [...m, {
      role: "ai",
      text: "Raised as a ticket. Staff will pick it up and you can follow it under My Tickets.",
    }]);
  }

  const empty = msgs.length === 0;

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto px-5 py-8">
      {/* ---------- header ---------- */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center">
          <Sparkles size={20} className="text-brand-light" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">OakMitra</h1>
          <p className="text-xs text-[var(--muted)]">
            Silver Oak University help desk · answers from university documents
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
            <Languages size={12} />
            {LANGUAGES.find(l => l.code === lang)?.native || "English"}
          </span>
          {canTalk && (
            <button onClick={() => { setSpeakOn(v => !v); if (speakOn) stopSpeaking(); }}
              title={speakOn ? "Stop reading answers aloud" : "Read answers aloud"}
              className={"p-2 rounded-lg border " +
                (speakOn ? "border-brand/50 text-brand-light bg-brand/10" : "border-[var(--border)] text-[var(--muted)]")}>
              {speakOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[var(--muted)] mt-2">
        Language is detected from what you write or say — there is nothing to select.
      </p>

      {/* ---------- conversation ---------- */}
      <div className="flex-1 mt-6 space-y-4">
        {empty && (
          <div className="py-8">
            <h2 className="text-2xl font-semibold tracking-tight">Ask me about the university</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-lg">
              Fees, examinations, attendance, hostel, library, placements, certificates. I answer
              from the university&apos;s own documents and show you which one each answer came from.
              When I don&apos;t know, I say so and offer to raise a ticket instead.
            </p>

            <div className="grid sm:grid-cols-2 gap-2 mt-6">
              {SUGGESTIONS.map(s => (
                <button key={s.label} onClick={() => ask(s.q)}
                  className="panel-solid rounded-xl p-4 text-left hover:border-white/25 transition">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{s.q}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div className={
              "inline-block max-w-[85%] text-left px-4 py-3 rounded-2xl text-sm leading-relaxed " +
              (m.role === "user"
                ? "bg-brand text-white"
                : m.unsure
                  ? "border border-amber-400/50 bg-amber-400/[0.07] border-l-4 border-l-amber-400"
                  : "panel-solid")
            }>
              {/* A refusal has to be legible as a refusal from across a room.
                  A thin coloured edge is not enough - someone watching a demo
                  sees a paragraph of text and assumes it is an answer. */}
              {m.unsure && (
                <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wide text-amber-300">
                  <AlertTriangle size={12} /> Not answered from documents
                </div>
              )}

              <div className="whitespace-pre-wrap">{m.text}</div>

              {!!m.sources?.length && (
                <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                    <BookOpen size={10} /> from:
                  </span>
                  {m.sources.slice(0, 3).map(s => (
                    <span key={s.title}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/40 text-sky-300 bg-sky-500/10">
                      {s.title}
                    </span>
                  ))}
                </div>
              )}

              {m.unsure && (
                <button onClick={() => raiseTicket(msgs[i - 1]?.text || "Question from OakMitra")}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-200 hover:bg-amber-400/10 flex items-center gap-1.5">
                  <Ticket size={12} /> Raise this as a ticket
                </button>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 size={14} className="animate-spin" /> Searching university documents...
          </div>
        )}

        {err && (
          <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>
        )}

        <div ref={endRef} />
      </div>

      {/* ---------- composer ---------- */}
      <div className="sticky bottom-4 mt-6">
        <div className="flex gap-2 panel-solid rounded-2xl p-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") ask(input); }}
            placeholder={listening ? "Listening..." : "Ask OakMitra anything about the university"}
            className="flex-1 bg-transparent outline-none text-sm px-3"
          />
          {canHear && (
            <button onClick={toggleMic} disabled={busy}
              title={listening ? "Stop listening" : "Speak your question"}
              className={"p-2.5 rounded-xl border " +
                (listening ? "border-rose-500/50 text-rose-300 bg-rose-500/10" : "border-[var(--border)] text-[var(--muted)]")}>
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <button onClick={() => ask(input)} disabled={busy || !input.trim()}
            className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40">
            <Send size={16} />
          </button>
        </div>

        <p className="text-[11px] text-[var(--muted)] mt-2 text-center">
          OakMitra answers from university documents and can be wrong about anything not in them.
          Questions about your own record are sent to staff.
        </p>
      </div>
    </div>
  );
}
