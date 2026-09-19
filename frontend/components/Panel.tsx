"use client";
import { motion, useReducedMotion } from "framer-motion";
import { springSoft, fade } from "@/lib/motion";

/* The standard section container.

   `hint` is the addition worth explaining. Most panels in this portal showed a
   title and then a table, leaving the reader to infer what they were looking
   at and — more importantly — whether it was real. A one-line hint is where a
   panel says "these are seed figures" or "this is not connected yet", which is
   exactly the sort of thing that otherwise ends up unsaid until someone asks
   in a demo.

   Titles are sentence case throughout. The portal had both conventions and
   they were mixed within single screens. */

export default function Panel({
  title,
  hint,
  action,
  children,
  delay = 0,
}: {
  title: string;
  /** One line under the title: what this is, or what it is not. */
  hint?: string;
  /** Optional control on the right of the header. */
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      /* 30px was too far — a panel that slides that distance draws attention
         to its own arrival. 12px reads as settling into place. */
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? { ...fade, delay } : { ...springSoft, delay }}
      className="glass p-6 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-[18px] leading-tight">{title}</h3>
          {hint && (
            <p className="text-xs text-[var(--muted)] mt-1 leading-snug max-w-2xl">{hint}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}
