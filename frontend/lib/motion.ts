/* ============================================================
   The motion vocabulary.

   One set of springs and variants, imported everywhere, so the
   portal moves like one thing. The reason interfaces feel cheap
   is almost never too little animation — it is twelve different
   durations and easings invented separately, so nothing shares
   a rhythm.

   Three rules this file encodes:

   1. SPRINGS, NOT DURATIONS, for anything that moves in space.
      A spring has momentum; a 300ms ease-out does not, and the
      difference is most of what "expensive" means in motion.

   2. FAST IN, SLOW OUT. Things arrive quickly (the user is
      waiting) and leave unhurriedly (the user has moved on).

   3. NOTHING LOOPS. An animation that repeats forever is a
      distraction in an application. Motion here marks a change
      of state and then stops.

   Everything respects prefers-reduced-motion: the hook below
   collapses each variant to a plain opacity fade, which is the
   accessible thing and also what a user who asked for less
   motion actually wants.
   ============================================================ */

import type { Transition, Variants } from "framer-motion";

/* ---------------- springs ---------------- */

/** Default. Settles quickly with a trace of overshoot. */
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/** For larger surfaces — panels, sheets. Slower, no visible bounce. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 30,
  mass: 1,
};

/** For the sliding nav indicator, which must feel attached to the cursor. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 40,
  mass: 0.7,
};

/** Opacity and colour only. A spring on opacity looks like a flicker. */
export const fade: Transition = { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] };

/* ---------------- variants ---------------- */

/** A container that reveals its children one after another. */
export const stagger = (step = 0.045, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** The standard child: rises a little as it fades in. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8, transition: fade },
};

/** For cards in a grid: a touch of scale reads as "arriving". */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.98, transition: fade },
};

/** Switching tabs. Slides a few pixels in the reading direction. */
export const tabSwap: Variants = {
  hidden: { opacity: 0, x: 10 },
  show: { opacity: 1, x: 0, transition: { ...springSoft, opacity: fade } },
  exit: { opacity: 0, x: -8, transition: fade },
};

/** A dialog or dropdown. */
export const overlayIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.98, y: -4, transition: fade },
};

/* ---------------- reduced motion ---------------- */

/**
 * Strip movement from a variant set, keeping the fade.
 *
 * Used with framer's `useReducedMotion`. A user who has asked their operating
 * system for less motion has usually done so because movement makes them
 * unwell, so this is not a nicety.
 */
export function still(v: Variants): Variants {
  const flat = (state: any) =>
    typeof state === "object" && state !== null
      ? { opacity: state.opacity ?? 1, transition: fade }
      : state;
  return {
    hidden: flat(v.hidden),
    show: flat(v.show),
    exit: flat(v.exit),
  };
}

/** Pick the right variants for the user's preference. */
export function motionSafe(v: Variants, reduced: boolean | null): Variants {
  return reduced ? still(v) : v;
}
