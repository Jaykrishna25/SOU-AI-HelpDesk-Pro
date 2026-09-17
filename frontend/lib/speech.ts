/* ============================================================
   Speech input/output and language detection for the assistant.

   Supported: English, Hindi, Gujarati.
   The language is detected from what the user types or says -
   there is no selector. Detection is by script, which is
   unambiguous for these three.

   Entirely browser-side (Web Speech API). No audio leaves the
   device and nothing is stored.
   ============================================================ */

export type LangCode = "en-IN" | "hi-IN" | "gu-IN";

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en-IN", label: "English",  native: "English" },
  { code: "hi-IN", label: "Hindi",    native: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "gu-IN", label: "Gujarati", native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
];

const DEVANAGARI = /[\u0900-\u097F]/;
const GUJARATI = /[\u0A80-\u0AFF]/;

/**
 * Detects the language of typed or transcribed text by script.
 * Unambiguous for these three: Gujarati and Devanagari occupy distinct
 * Unicode blocks, and anything else is treated as English.
 */
export function detectLanguage(text: string, fallback: LangCode = "en-IN"): LangCode {
  const t = (text || "").trim();
  if (!t) return fallback;
  if (GUJARATI.test(t)) return "gu-IN";
  if (DEVANAGARI.test(t)) return "hi-IN";
  return "en-IN";
}

/* ---------------- capability detection ---------------- */

function recognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function supportsSpeechInput(): boolean {
  return recognitionCtor() !== null;
}

export function supportsSpeechOutput(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function voicesFor(lang: LangCode): SpeechSynthesisVoice[] {
  if (!supportsSpeechOutput()) return [];
  const all = window.speechSynthesis.getVoices() || [];
  const base = lang.split("-")[0];
  return all.filter(v => v.lang === lang || v.lang.replace("_", "-").startsWith(base));
}

export function canSpeak(lang: LangCode): boolean {
  return voicesFor(lang).length > 0;
}

/* ---------------- speech input ---------------- */

export interface Recognizer { start: () => void; stop: () => void; }

export function createRecognizer(opts: {
  lang: LangCode;
  interim?: boolean;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}): Recognizer | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const r = new Ctor();
  r.lang = opts.lang;
  r.continuous = false;
  r.interimResults = opts.interim !== false;
  r.maxAlternatives = 1;

  r.onresult = (e: any) => {
    let text = "";
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    opts.onResult(text.trim(), isFinal);
  };

  r.onerror = (e: any) => {
    const map: Record<string, string> = {
      "not-allowed": "Microphone permission was denied. Allow it in your browser settings to use voice.",
      "service-not-allowed": "Speech recognition is blocked on this page.",
      "no-speech": "I did not hear anything. Try again.",
      "audio-capture": "No microphone was found.",
      network: "Speech recognition needs a network connection.",
      aborted: "",
    };
    const msg = map[e.error] ?? ("Speech input failed: " + e.error);
    if (msg) opts.onError(msg);
  };

  r.onend = () => opts.onEnd?.();

  return { start: () => { try { r.start(); } catch {} }, stop: () => { try { r.stop(); } catch {} } };
}

/* ---------------- speech output ---------------- */

export interface SpeakResult { spoken: boolean; usedLang: LangCode | null; reason?: string; }

/** Speaks text, falling back to English if no voice exists for the language. */
export function speak(text: string, lang: LangCode): SpeakResult {
  if (!supportsSpeechOutput()) return { spoken: false, usedLang: null, reason: "This browser cannot speak." };
  if (!text.trim()) return { spoken: false, usedLang: null, reason: "" };

  window.speechSynthesis.cancel();

  const order: LangCode[] = lang === "en-IN" ? ["en-IN"] : [lang, "en-IN"];
  for (const candidate of order) {
    const voices = voicesFor(candidate);
    if (voices.length === 0) continue;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voices[0];
    u.lang = candidate;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return {
      spoken: true,
      usedLang: candidate,
      reason: candidate === lang ? undefined
        : "No " + lang + " voice is installed on this device; used " + candidate + " instead.",
    };
  }
  return { spoken: false, usedLang: null, reason: "No speech voice is installed for this language." };
}

export function stopSpeaking(): void {
  if (supportsSpeechOutput()) window.speechSynthesis.cancel();
}
