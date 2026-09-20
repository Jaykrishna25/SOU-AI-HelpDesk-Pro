"use client";
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp, Send, Loader2, AlertTriangle, CalendarCheck, ExternalLink,
  Cpu, GraduationCap, LineChart, ArchiveX,
} from "lucide-react";

/* ============================================================
   Market & Technology Radar — the student-facing page.

   The design argument here is that the dates are part of the
   content, not metadata hidden in a tooltip. Every card says
   when a person last checked it, and an ageing card says so on
   its face. A student reading "GPT-6 Astra, released September"
   needs to know whether that was verified last week or last
   March, because the two mean different things and the sentence
   reads identically either way.

   The briefing loads without calling a model. The assistant on
   top of it is optional and is clearly the second thing on the
   page — if the model is unavailable, the useful half still
   works, which is the right way round for something whose value
   is the curation rather than the prose.
   ============================================================ */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

type Freshness = "fresh" | "ageing" | "stale";

interface Entry {
  id: string; kind: string; title: string; body: string;
  checkedOn: string; ageDays: number; freshness: Freshness;
  sourceName: string; sourceUrl: string; vendor?: string; tags: string[];
}
interface Section { kind: string; label: string; blurb: string; items: Entry[] }
interface Status { reviewedOn: string; reviewedAgeDays: number; freshness: Freshness; usableCount: number; withheldCount: number; empty: boolean }
interface Source { id: string; title: string; kind: string; checkedOn: string; freshness: Freshness; sourceName: string; sourceUrl: string }
interface Msg { role: "user" | "ai"; text: string; sources?: Source[]; unsure?: boolean }

const KIND_ICON: Record<string, any> = { model: Cpu, skill: GraduationCap, market: LineChart };

function Age({ e }: { e: { checkedOn: string; ageDays: number; freshness: Freshness } }) {
  const tone = e.freshness === "fresh"
    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
    : "border-amber-400/50 text-amber-200 bg-amber-400/10";
  const when = e.ageDays <= 0 ? "today" : e.ageDays === 1 ? "yesterday" : e.ageDays + " days ago";
  return (
    <span className={"text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap " + tone}>
      checked {when}
    </span>
  );
}

export default function TrendsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [withheld, setWithheld] = useState<{ id: string; title: string; checkedOn: string }[]>([]);
  const [starters, setStarters] = useState<{ label: string; q: string }[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [askErr, setAskErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/trends/briefing", { headers: { Authorization: "Bearer " + tok() } });
        const d = await r.json();
        if (!r.ok) { setLoadErr(d.error || "The radar could not be loaded."); return; }
        setSections(d.sections || []);
        setStatus(d.status || null);
        setWithheld(d.withheld || []);
        setStarters(d.starters || []);
      } catch {
        setLoadErr("The radar could not be reached.");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput(""); setAskErr("");
    setMsgs(m => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r = await fetch("/api/trends/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();
      if (d.refused) {
        setMsgs(m => [...m, { role: "ai", unsure: true, text: d.message }]);
      } else if (!r.ok) {
        setAskErr(d.error || "The radar could not answer that.");
      } else {
        setMsgs(m => [...m, { role: "ai", text: d.answer, sources: d.sources || [] }]);
      }
    } catch (e: any) {
      setAskErr("The radar could not be reached. " + String(e?.message || e).slice(0, 120));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-5 py-8">
      {/* ---------- header ---------- */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center">
          <TrendingUp size={20} className="text-brand-light" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Market &amp; Technology Radar</h1>
          <p className="text-xs text-[var(--muted)]">
            What is new in the market, what to learn, and which AI models have just launched
          </p>
        </div>
      </div>

      {/* ---------- the promise, stated up front ---------- */}
      <div className="mt-5 panel-solid rounded-xl p-4">
        <p className="text-sm leading-relaxed">
          Everything here was checked by a person on the date shown against the source
          shown. The assistant below answers only from these entries — it will not name a
          model, a figure or a company that is not on this page, and it does not know
          anything that happened after these dates.
        </p>
        {status && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <CalendarCheck size={12} /> Radar reviewed {status.reviewedOn}
            </span>
            <span>·</span>
            <span>{status.usableCount} current {status.usableCount === 1 ? "entry" : "entries"}</span>
            {status.withheldCount > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-300 flex items-center gap-1">
                  <ArchiveX size={12} /> {status.withheldCount} withheld as out of date
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {status?.freshness !== "fresh" && status && (
        <div className="mt-3 px-4 py-3 rounded-lg text-sm border border-amber-400/50 bg-amber-400/[0.07] flex gap-2">
          <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <span>
            This radar was last reviewed {status.reviewedAgeDays} days ago. Technology
            moves faster than that. Treat what follows as a starting point and check the
            linked sources before you repeat any of it.
          </span>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 size={14} className="animate-spin" /> Loading the radar...
        </div>
      )}
      {loadErr && (
        <div className="mt-6 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{loadErr}</div>
      )}

      {/* ---------- the briefing ---------- */}
      {sections.map(sec => {
        const Icon = KIND_ICON[sec.kind] || TrendingUp;
        if (!sec.items.length) return null;
        return (
          <section key={sec.kind} className="mt-8">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-brand-light" />
              <h2 className="font-semibold tracking-tight">{sec.label}</h2>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">{sec.blurb}</p>

            <div className="mt-4 space-y-3">
              {sec.items.map(item => (
                <article key={item.id} className="panel-solid rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium">
                      {item.title}
                      {item.vendor && (
                        <span className="text-[var(--muted)] font-normal"> — {item.vendor}</span>
                      )}
                    </h3>
                    <Age e={item} />
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{item.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener"
                        className="text-[10px] px-2 py-0.5 rounded-full border border-sky-500/40 text-sky-300 bg-sky-500/10 flex items-center gap-1 hover:bg-sky-500/20">
                        {item.sourceName} <ExternalLink size={9} />
                      </a>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">
                        {item.sourceName}
                      </span>
                    )}
                    {item.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      {/* Withheld entries are named rather than silently dropped. */}
      {withheld.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ArchiveX size={14} className="text-amber-300" /> Withheld as out of date
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            These are past the point where they can be repeated as current, so the
            assistant will not use them. They are listed so you know what is missing.
          </p>
          <ul className="mt-3 space-y-1">
            {withheld.map(w => (
              <li key={w.id} className="text-xs text-[var(--muted)]">
                {w.title} <span className="opacity-60">— last checked {w.checkedOn}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- ask ---------- */}
      <section className="mt-10">
        <h2 className="font-semibold tracking-tight">Ask the radar</h2>
        <p className="text-xs text-[var(--muted)] mt-1">
          Answers are built only from the entries above, and each one shows which it used.
        </p>

        {!msgs.length && !!starters.length && (
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            {starters.map(s => (
              <button key={s.label} onClick={() => ask(s.q)}
                className="panel-solid rounded-xl p-3 text-left hover:border-[var(--border-strong)] transition">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">{s.q}</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={
                "inline-block max-w-[88%] text-left px-4 py-3 rounded-2xl text-sm leading-relaxed " +
                (m.role === "user"
                  ? "bg-brand text-white"
                  : m.unsure
                    ? "border border-amber-400/50 bg-amber-400/[0.07] border-l-4 border-l-amber-400"
                    : "panel-solid")
              }>
                {m.unsure && (
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wide text-amber-300">
                    <AlertTriangle size={12} /> Not answered
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.text}</div>

                {!!m.sources?.length && (
                  <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-[var(--muted)]">from:</span>
                    {m.sources.slice(0, 5).map(s => (
                      <span key={s.id}
                        className={"text-[10px] px-2 py-0.5 rounded-full border " +
                          (s.freshness === "fresh"
                            ? "border-sky-500/40 text-sky-300 bg-sky-500/10"
                            : "border-amber-400/50 text-amber-200 bg-amber-400/10")}>
                        {s.title} · {s.checkedOn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Loader2 size={14} className="animate-spin" /> Reading the radar...
            </div>
          )}
          {askErr && (
            <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{askErr}</div>
          )}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-4 mt-5">
          <div className="flex gap-2 panel-solid rounded-2xl p-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") ask(input); }}
              placeholder="Ask about the market, a skill, or a recent model"
              className="flex-1 bg-transparent outline-none text-sm px-3"
            />
            <button onClick={() => ask(input)} disabled={busy || !input.trim()}
              className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-2 text-center">
            The radar reports what sources say. It does not predict your salary, your
            placement or whether a field will still be hiring when you graduate.
          </p>
        </div>
      </section>
    </div>
  );
}
