"use client";
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, startAt: number, dur: number, peak = 0.15, type: OscillatorType = "sine") {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + startAt;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playSuccess() {
  tone(523.25, 0, 0.18, 0.18);
  tone(659.25, 0.12, 0.18, 0.18);
  tone(783.99, 0.24, 0.28, 0.2);
}

export function playAction() {
  tone(440, 0, 0.12, 0.14, "triangle");
  tone(660, 0.1, 0.14, 0.14, "triangle");
}
