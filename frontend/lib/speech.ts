/* ============================================================
   Speech input/output and language detection for the assistant.

   Entirely browser-side: the Web Speech API. No audio is uploaded
   and no biometric or voice data is stored anywhere.

   Marathi (mr-IN) is treated as a first-class language. Note that
   speech SYNTHESIS for Marathi depends on voices installed in the
   operating system and is frequently absent on Windows; we detect
   this and fall back rather than failing silently.
   ============================================================ */

export type LangCode =
  | "en-IN" | "hi-IN" | "mr-IN" | "gu-IN" | "bn-IN" | "pa-IN" | "or-IN"
  | "ta-IN" | "te-IN" | "kn-IN" | "ml-IN" | "ur-IN" | "as-IN" | "ne-NP";

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en-IN", label: "English",   native: "English" },
  { code: "mr-IN", label: "Marathi",   native: "\u092E\u0930\u093E\u0920\u0940" },
  { code: "hi-IN", label: "Hindi",     native: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "gu-IN", label: "Gujarati",  native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { code: "bn-IN", label: "Bengali",   native: "\u09AC\u09BE\u0982\u09B2\u09BE" },
  { code: "ta-IN", label: "Tamil",     native: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
  { code: "te-IN", label: "Telugu",    native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
  { code: "kn-IN", label: "Kannada",   native: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1" },
  { code: "ml-IN", label: "Malayalam", native: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02" },
  { code: "pa-IN", label: "Punjabi",   native: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40" },
  { code: "or-IN", label: "Odia",      native: "\u0B13\u0B21\u0B3C\u0B3F\u0B06" },
  { code: "as-IN", label: "Assamese",  native: "\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE" },
  { code: "ur-IN", label: "Urdu",      native: "\u0627\u0631\u062F\u0648" },
];

/** Unicode blocks that identify a script unambiguously. */
const SCRIPTS: { re: RegExp; lang: LangCode }[] = [
  { re: /[\u0980-\u09FF]/, lang: "bn-IN" },  // Bengali / Assamese
  { re: /[\u0A00-\u0A7F]/, lang: "pa-IN" },  // Gurmukhi
  { re: /[\u0A80-\u0AFF]/, lang: "gu-IN" },  // Gujarati
  { re: /[\u0B00-\u0B7F]/, lang: "or-IN" },  // Odia
  { re: /[\u0B80-\u0BFF]/, lang: "ta-IN" },  // Tamil
  { re: /[\u0C00-\u0C7F]/, lang: "te-IN" },  // Telugu
  { re: /[\u0C80-\u0CFF]/, lang: "kn-IN" },  // Kannada
  { re: /[\u0D00-\u0D7F]/, lang: "ml-IN" },  // Malayalam
  { re: /[\u0600-\u06FF\u0750-\u077F]/, lang: "ur-IN" }, // Arabic script
];

/* ---------------- language detection ---------------- */

const DEVANAGARI = /[\u0900-\u097F]/;
const GUJARATI = /[\u0A80-\u0AFF]/;

/** Words that appear in Marathi but not Hindi, and vice versa. */
const MARATHI_MARKERS = [
  "\u0906\u0939\u0947",      // aahe
  "\u0928\u093E\u0939\u0940", // naahi
  "\u092E\u0932\u093E",      // mala
  "\u0924\u0941\u092E\u094D\u0939\u0940", // tumhi
  "\u0915\u093E\u092F",      // kaay
  "\u0915\u0938\u0947",      // kase
  "\u0915\u0930\u093E",      // kara
  "\u092A\u093E\u0939\u093F\u091C\u0947", // pahije
  "\u0906\u0939\u0947\u0924", // aahet
  "\u092E\u093E\u091D\u094D\u092F\u093E", // majhya
];
const HINDI_MARKERS = [
  "\u0939\u0948",            // hai
  "\u0939\u0948\u0902",      // hain
  "\u0928\u0939\u0940\u0902", // nahin
  "\u092E\u0941\u091D\u0947", // mujhe
  "\u0906\u092A",            // aap
  "\u0915\u094D\u092F\u093E", // kya
  "\u0915\u0948\u0938\u0947", // kaise
  "\u091A\u093E\u0939\u093F\u090F", // chahiye
  "\u0915\u0930\u0947\u0902", // karein
  "\u0925\u093E",            // tha
];

function countMarkers(text: string, markers: string[]): number {
  return markers.reduce((n, m) => (text.includes(m) ? n + 1 : n), 0);
}

/**
 * Detects the language of typed or transcribed text.
 * Marathi and Hindi share the Devanagari script, so they are separated by
 * marker words. Ties resolve to Marathi, which is the priority language here.
 */
export function detectLanguage(text: string, fallback: LangCode = "en-IN"): LangCode {
  const t = (text || "").trim();
  if (!t) return fallback;
  for (const s of SCRIPTS) if (s.re.test(t)) return s.lang;
  if (DEVANAGARI.test(t)) {
    const mr = countMarkers(t, MARATHI_MARKERS);
    const hi = countMarkers(t, HINDI_MARKERS);
    if (mr > hi) return "mr-IN";
    if (hi > mr) return "hi-IN";
    return "mr-IN";   // Devanagari with no decisive marker: prefer Marathi
  }
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

/** True when the device can actually speak this language. */
export function canSpeak(lang: LangCode): boolean {
  return voicesFor(lang).length > 0;
}

/* ---------------- speech input ---------------- */

export interface Recognizer {
  start: () => void;
  stop: () => void;
}

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

export interface SpeakResult {
  spoken: boolean;
  usedLang: LangCode | null;
  reason?: string;
}

/**
 * Speaks text in the requested language.
 * Falls back to Hindi for Marathi if no Marathi voice exists (the scripts and
 * much of the phonology overlap, so Hindi is far closer than English),
 * then to any available voice, then reports that it could not speak.
 */
export function speak(text: string, lang: LangCode): SpeakResult {
  if (!supportsSpeechOutput()) return { spoken: false, usedLang: null, reason: "This browser cannot speak." };
  if (!text.trim()) return { spoken: false, usedLang: null, reason: "Nothing to say." };

  window.speechSynthesis.cancel();

  const order: LangCode[] = lang === "mr-IN" ? ["mr-IN", "hi-IN", "en-IN"] : [lang, "en-IN"];
  for (const candidate of order) {
    const voices = voicesFor(candidate);
    if (voices.length === 0) continue;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voices[0];
    u.lang = candidate;
    u.rate = 0.95;
    u.pitch = 1;
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

