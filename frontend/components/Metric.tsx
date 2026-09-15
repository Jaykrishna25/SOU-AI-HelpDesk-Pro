"use client";
import { ShieldCheck, Clock, FlaskConical, AlertTriangle } from "lucide-react";

/* ============================================================
   Never present an absent measurement as a real one.
   A metric with no underlying records is "not measured yet",
   not "0%". A metric from a tiny sample is shown with its n.
   ============================================================ */

export type Provenance = "verified" | "pending" | "demo" | "derived";

const BADGE: Record<Provenance, { label: string; cls: string; Icon: any }> = {
  verified: { label: "Verified", cls: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", Icon: ShieldCheck },
  pending:  { label: "Pending verification", cls: "border-amber-500/40 text-amber-300 bg-amber-500/10", Icon: Clock },
  demo:     { label: "Demo data", cls: "border-sky-500/40 text-sky-300 bg-sky-500/10", Icon: FlaskConical },
  derived:  { label: "Derived", cls: "border-violet-500/40 text-violet-300 bg-violet-500/10", Icon: AlertTriangle },
};

export function DataBadge({ kind }: { kind: Provenance }) {
  const b = BADGE[kind];
  return (
    <span className={"inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border " + b.cls}>
      <b.Icon size={10} /> {b.label}
    </span>
  );
}

export function MetricValue({
  label, value, sample, unit = "", minSample = 3, provenance, source, decimals = 1,
}: {
  label: string;
  value: number | null | undefined;
  sample: number;                 // how many records the figure is built from
  unit?: string;
  minSample?: number;
  provenance?: Provenance;
  source?: string;                // one line saying where the number came from
  decimals?: number;
}) {
  const measured = sample > 0 && value !== null && value !== undefined && Number.isFinite(value);
  const thin = measured && sample < minSample;

  return (
    <div className="panel-solid rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider opacity-55">{label}</div>
        {provenance && <DataBadge kind={provenance} />}
      </div>

      {measured ? (
        <>
          <div className={"text-2xl font-semibold mt-1 " + (thin ? "opacity-60" : "")}>
            {Number(value).toFixed(decimals).replace(/\.0+$/, "")}{unit}
          </div>
          <div className="text-[11px] opacity-45 mt-1">
            {thin ? "Low sample - based on " + sample + " record" + (sample === 1 ? "" : "s") : "n = " + sample}
            {source ? " - " + source : ""}
          </div>
        </>
      ) : (
        <>
          <div className="text-sm mt-2 opacity-60 leading-snug">No verified data available yet</div>
          <div className="text-[11px] opacity-40 mt-1">
            {source ? source : "This figure appears once source records exist."}
          </div>
        </>
      )}
    </div>
  );
}

/** Banner for any screen still showing seeded content. */
export function DemoNotice({ what = "This screen" }: { what?: string }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-sky-500/40 bg-sky-500/10 flex items-center gap-2">
      <FlaskConical size={15} className="shrink-0" />
      <span>{what} shows generated demo data for evaluation. It is not institutional record.</span>
    </div>
  );
}
