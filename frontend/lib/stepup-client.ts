"use client";

/* Client-side holder for the elevation token.

   Memory only, never sessionStorage or localStorage: an elevation that
   survives a reload, a new tab, or a walked-away laptop is not much of an
   elevation. Losing it on refresh is the intended behaviour.

   The server is the authority - it re-verifies the token on every request.
   The expiry tracked here only stops the UI from firing requests it knows
   will be refused. */

let token = "";
let expiresAt = 0;
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } }); }

export function setStepUp(newToken: string, minutes: number): void {
  token = newToken;
  expiresAt = Date.now() + minutes * 60_000;
  notify();
  window.setTimeout(() => { if (Date.now() >= expiresAt) clearStepUp(); }, minutes * 60_000 + 500);
}

export function getStepUp(): string {
  if (!token) return "";
  if (Date.now() >= expiresAt) { clearStepUp(); return ""; }
  return token;
}

export function clearStepUp(): void {
  token = ""; expiresAt = 0; notify();
}

export function stepUpActive(): boolean { return !!getStepUp(); }

/** Whole minutes remaining, for display. */
export function stepUpMinutesLeft(): number {
  if (!getStepUp()) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000));
}

/** Subscribe to elevation changes; returns an unsubscribe function. */
export function onStepUpChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
