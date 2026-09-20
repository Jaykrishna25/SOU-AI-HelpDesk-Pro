"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Sunrise, RefreshCw, Loader2, ExternalLink, Bot, AlertTriangle,
  Briefcase, BrainCircuit, Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { springSoft } from "@/lib/motion";

/* The morning briefing.

   This is the one feature in the portal that speaks first. Everything else
   waits to be asked; this arrives already written, because the agent ran at
   two in the morning on a schedule.

   Three streams, each shown separately so the reader can tell them apart:
   openings matched to their own subjects, AI models published recently, and
   open-source tools that have just appeared and are gaining stars.

   Two things are surfaced deliberately rather than hidden:

     - WHAT IT SEARCHED and WHY. The job keywords come from the student's own
       strongest subjects, and saying so turns "here are some jobs" into
       "here is why these jobs".
     - THAT IT REMEMBERS. "3 new since your last briefing" is the whole
       reason to read the second one. A digest that repeats itself is unread
       by Wednesday.
*/

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

function Chip({ n, label, tone }: { n: number; label: string; tone: string }) {
  if (!n) return null;
  return (
    <span className={"text-[11px] px-2 py-0.5 rounded-full border " + tone}>
      {n} {label}
    </span>
  );
}

/* One stream. Deliberately identical markup for all three: the difference
   between a job and a model is what it is, not how loudly it is drawn. */
function Section({
  icon: Icon, title, note, children,
}: { icon: any; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide opacity-45">
        <Icon size={11} /> {title}
        {note && <span className="normal-case tracking-normal opacity-70">· {note}</span>}
      </div>
      <div className="mt-1.5 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ href, main, sub, tag }: { href: string; main: string; sub: string; tag?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-2 text-sm hover:underline group">
      <ExternalLink size={12} className="mt-1 shrink-0 opacity-40 group-hover:opacity-80" />
      <span className="min-w-0">
        {main} <span className="opacity-55">— {sub}</span>
        {tag && <span className="text-[10px] opacity-35 ml-1.5">{tag}</span>}
      </span>
    </a>
  );
}

export default function BriefingCard() {
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/briefing", { headers: AUTH() });
      if (r.ok) setB((await r.json()).briefing);
    } catch { /* leave empty */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/briefing/run", { method: "POST", headers: H() });

      /* Read as text first. A route that throws server-side returns an empty
         body or an HTML error page, and calling .json() on either produced
         "Unexpected end of JSON input" — which told the reader nothing about
         what actually went wrong. The status code does. */
      const raw = await r.text();
      let d: any = null;
      try { d = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }

      if (!r.ok) {
        throw new Error(
          d?.error
          || `The agent could not run — the server returned ${r.status}. `
             + "Check the terminal running the site for the reason.",
        );
      }
      if (!d?.briefing) throw new Error("The agent ran but returned nothing.");
      setB(d.briefing);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setBusy(false); }
  }

  if (!loaded) return null;

  const when = b?.lastRunAt ? new Date(b.lastRunAt) : null;
  const degraded = typeof b?.body === "string" && b.body.includes("could not be written up");
  const releases: any[] = Array.isArray(b?.releases) ? b.releases : [];
  const models = releases.filter(r => r?.kind === "model");
  const tools = releases.filter(r => r?.kind === "tool");

  const age = (r: any) =>
    typeof r?.ageDays === "number"
      ? r.ageDays === 0 ? "today" : `${r.ageDays}d old`
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="rounded-2xl p-5 border border-brand-light/30 bg-gradient-to-br from-brand/[0.13] via-transparent to-transparent mb-6"
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shrink-0 text-white shadow-lg shadow-brand/25">
          <Sunrise size={19} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[17px] leading-tight">
              {b?.greeting || "Your morning briefing"}
            </h3>
            <Chip n={b?.newCount || 0} label="new roles"
              tone="border-emerald-500/40 text-emerald-300 bg-emerald-500/10" />
            <Chip n={models.length} label="new models"
              tone="border-sky-500/40 text-sky-300 bg-sky-500/10" />
            <Chip n={tools.length} label="new tools"
              tone="border-amber-500/40 text-amber-300 bg-amber-500/10" />
          </div>

          {b ? (
            <p className="text-sm leading-relaxed mt-2 whitespace-pre-wrap opacity-90">{b.body}</p>
          ) : (
            <p className="text-sm opacity-60 mt-2">
              The agent runs each morning and leaves a briefing here: openings matched to
              the subjects you are strongest in, AI models published in the last few weeks,
              and open-source tools that have just appeared. Run it now to see one.
            </p>
          )}

          {degraded && (
            <p className="text-xs text-amber-300 mt-2 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              The findings are real; only the write-up failed.
            </p>
          )}

          {!!b?.listings?.length && (
            <Section icon={Briefcase} title="Openings" note="matched to your subjects">
              {b.listings.map((l: any) => (
                <Row key={l.url} href={l.url} main={l.title}
                  sub={`${l.company} · ${l.location}`} tag={`via ${l.matchedOn}`} />
              ))}
            </Section>
          )}

          {!!models.length && (
            <Section icon={BrainCircuit} title="New AI models" note="trending on Hugging Face">
              {models.map((r: any) => (
                <Row key={r.url} href={r.url} main={r.title}
                  sub={`${r.by} · ${r.detail}`} tag={age(r)} />
              ))}
            </Section>
          )}

          {!!tools.length && (
            <Section icon={Package} title="New open-source tools" note="new repositories gaining stars">
              {tools.map((r: any) => (
                <Row key={r.url} href={r.url} main={r.title}
                  sub={`${r.by} · ${r.detail}`} tag={age(r)} />
              ))}
            </Section>
          )}

          {err && <p className="text-xs text-rose-300 mt-3">{err}</p>}

          {/* Why these results, and who wrote the words. An agent that shows
              its reasoning is checkable; one that doesn't is a black box. */}
          <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-[var(--border)]">
            {b?.plan?.keywords?.length > 0 && (
              <span className="text-[11px] opacity-50">
                Searched <b className="opacity-80">{b.plan.keywords.join(", ")}</b>
                {b.plan.reason ? ` — ${b.plan.reason.toLowerCase()}` : ""}
              </span>
            )}
            {b?.model && (
              <span className="text-[11px] opacity-35 flex items-center gap-1">
                <Bot size={10} /> {b.model} · temp {b.temperature}
              </span>
            )}
            {when && (
              <span className="text-[11px] opacity-35">
                {when.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            )}

            <button onClick={run} disabled={busy}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] disabled:opacity-40 flex items-center gap-1.5">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {busy ? "Running…" : b ? "Run again" : "Run it now"}
            </button>
          </div>

          <p className="text-[10.5px] opacity-30 mt-2">
            Openings come from a live public job feed and are not university placements.
            Models come from Hugging Face and tools from GitHub; download and star counts
            measure attention, not quality. Every figure here came from those feeds, not
            from the model.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
