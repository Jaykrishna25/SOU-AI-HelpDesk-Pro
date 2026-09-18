"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Panel from "@/components/Panel";

/* Real examination results.

   This replaced a hard-coded table of three invented subjects with an SGPA and
   CGPA of 8.4. Those figures sat next to a Study Plan computed from the actual
   records, so the two screens disagreed with each other.

   Where no result exists, this says so. It does not substitute a
   plausible-looking number. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const AUTH = () => ({ Authorization: "Bearer " + tok() });

export function useMyResults() {
  const [state, setState] = useState<{ loading: boolean; plan: any; reason: string }>({
    loading: true, plan: null, reason: "",
  });

  useEffect(() => {
    fetch("/api/study/me", { headers: AUTH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setState({ loading: false, plan: d?.plan ?? null, reason: d?.reason || "" }))
      .catch(() => setState({ loading: false, plan: null, reason: "unavailable" }));
  }, []);

  return state;
}

/** Average across recorded subjects, or a plain statement when nothing exists. */
export function averageLabel(plan: any): string {
  if (!plan || !plan.subjectCount) return "Not recorded";
  return `${plan.averageScore}/100`;
}

export default function ResultsPanel() {
  const { loading, plan, reason } = useMyResults();

  if (loading) {
    return (
      <Panel title="Results">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 size={15} className="animate-spin" /> Loading your examination record...
        </div>
      </Panel>
    );
  }

  if (!plan || !plan.subjectCount) {
    return (
      <Panel title="Results">
        <p className="text-sm text-[var(--muted)]">
          {reason === "no-student-record"
            ? "This account is not linked to a student record, so no results are held against it."
            : "No examination results are recorded against your enrolment yet. They appear here once published."}
        </p>
      </Panel>
    );
  }

  /* Worst first - the same ordering the Study Plan uses, so the two screens
     tell the same story rather than two different ones. */
  const rows = [...(plan.items || [])];
  const strong = plan.strongest || [];

  return (
    <Panel title={`Results - ${plan.subjectCount} subject(s) on record`}>
      <div className="flex gap-6 text-sm mb-4 flex-wrap">
        <span>Average: <b className="text-brand-light">{plan.averageScore}/100</b></span>
        <span>Weak areas: <b className="text-brand-light">{plan.weakCount}</b></span>
        <span>At risk: <b className={plan.criticalCount ? "text-rose-400" : "text-brand-light"}>{plan.criticalCount}</b></span>
      </div>

      {!!rows.length && (
        <>
          <div className="text-xs text-[var(--muted)] mb-2">Subjects below the threshold</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-left">
                <th className="py-2">Subject</th><th>Code</th><th>Sem</th><th>Score</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.subjectCode + r.priority} className="border-t border-[var(--border)]">
                  <td className="py-2">{r.subjectName}</td>
                  <td className="text-[var(--muted)]">{r.subjectCode}</td>
                  <td className="text-[var(--muted)]">{r.semester}</td>
                  <td className={r.severity === "critical" ? "text-rose-400" : "text-amber-400"}>{r.score}</td>
                  <td className="text-brand-light">{r.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!rows.length && (
        <p className="text-sm text-[var(--muted)]">
          Nothing falls below the threshold. See Study Plan for the full breakdown.
        </p>
      )}

      {!!strong.length && (
        <div className="mt-4">
          <div className="text-xs text-[var(--muted)] mb-2">Strongest subjects</div>
          <div className="flex flex-wrap gap-2">
            {strong.map((s: any) => (
              <span key={s.subjectName} className="text-xs glass px-3 py-1.5">
                {s.subjectName} · {s.score}/100
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--muted)] mt-4">
        Computed from the examination records held in this portal. SGPA and CGPA are not shown
        because the credit weights needed to calculate them are not recorded in the schema.
      </p>
    </Panel>
  );
}
