"use client";
import { useEffect, useState } from "react";
import { getStepUp, onStepUpChange } from "@/lib/stepup-client";

/* Dashboard money tiles.

   These two tiles used to show hard-coded figures. They now show the real ones
   - but only while the viewer holds a valid elevation, which they get by
   re-entering their password on the Fee Analysis screen. Until then the tile
   says it is locked rather than showing a number or pretending there is none.

   "Locked" and "Not measured" are different statements and the tile must not
   confuse them: one means you may not see this, the other means nobody has
   measured it. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

const inr = (n: number) => {
  if (!Number.isFinite(n)) return "Not measured";
  if (n >= 1e7) return "INR " + (n / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr";
  if (n >= 1e5) return "INR " + (n / 1e5).toFixed(2).replace(/\.00$/, "") + " L";
  return "INR " + n.toLocaleString("en-IN");
};

export interface InstitutionalMoney {
  collected: string;
  outstanding: string;
  locked: boolean;
}

export function useInstitutionalMoney(): InstitutionalMoney {
  const [state, setState] = useState<InstitutionalMoney>({
    collected: "Locked", outstanding: "Locked", locked: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const su = getStepUp();
      if (!su) {
        if (!cancelled) setState({ collected: "Locked", outstanding: "Locked", locked: true });
        return;
      }
      try {
        const r = await fetch("/api/finance/institutional", {
          headers: { Authorization: "Bearer " + tok(), "x-step-up": su },
        });
        if (!r.ok) {
          if (!cancelled) setState({ collected: "Locked", outstanding: "Locked", locked: true });
          return;
        }
        const d = await r.json();
        const a = d?.analysis;
        if (!cancelled && a) {
          setState({
            collected: inr(a.totalCollected),
            outstanding: inr(a.totalOutstanding),
            locked: false,
          });
        }
      } catch {
        if (!cancelled) setState({ collected: "Unavailable", outstanding: "Unavailable", locked: true });
      }
    }

    load();
    const off = onStepUpChange(load);
    return () => { cancelled = true; off(); };
  }, []);

  return state;
}
