"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/* A figure that counts up when it first appears.

   Deliberately conservative about what it will animate. A stat card can hold
   "89/100", "Rs 30,000", "Check with accounts" or "Locked", and counting up
   through a string is nonsense. So it parses the value: if there is exactly
   one number in it, that number animates and the surrounding text is left
   alone; otherwise the value renders as-is, immediately.

   That check matters more than it sounds. The Owner's money tiles read
   "Locked" until a step-up password is entered, and a tile that tried to
   count up to "Locked" would be both broken and a little absurd. */

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: string | number;
  duration?: number;
  className?: string;
}) {
  const text = String(value ?? "");
  const reduced = useReducedMotion();

  // Exactly one run of digits (with optional separators) is animatable.
  const matches = text.match(/\d[\d,]*\.?\d*/g) || [];
  const target = matches.length === 1 ? Number(matches[0].replace(/,/g, "")) : NaN;
  const animatable = matches.length === 1 && Number.isFinite(target) && target > 0;

  const [n, setN] = useState(animatable && !reduced ? 0 : target);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!animatable || reduced) { setN(target); return; }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(target * EASE_OUT(p));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, animatable, reduced]);

  if (!animatable) return <span className={className}>{text}</span>;

  // Keep the original formatting: whether it had separators, and any prefix
  // or suffix such as "Rs " or "/100".
  const raw = matches[0];
  const hadSeparators = raw.includes(",");
  const decimals = raw.includes(".") ? (raw.split(".")[1]?.length ?? 0) : 0;
  const shown = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  const formatted = hadSeparators
    ? Number(shown).toLocaleString("en-IN")
    : shown;

  return <span className={className}>{text.replace(raw, formatted)}</span>;
}
