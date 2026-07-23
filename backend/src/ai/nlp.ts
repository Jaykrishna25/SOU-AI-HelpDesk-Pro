// Lightweight NLP utilities: tokenization, stopword removal, lemmatization,
// intent recognition (15+ intents) and entity extraction.
// In production these delegate to OpenAI + LangChain; here a deterministic
// fallback keeps the system fully demonstrable offline.

const STOPWORDS = new Set(["the","is","a","an","of","to","for","when","will","my","i","me","how","do","does","can","and","in","on","at","what"]);

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}
export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}
export function lemmatize(tokens: string[]): string[] {
  return tokens.map((t) => t.replace(/(ing|ed|s)$/i, ""));
}

export const INTENTS = [
  "ADMISSION","FEES","EXAMS","HOSTEL","LIBRARY","PLACEMENT","SCHOLARSHIP",
  "CERTIFICATES","RESULTS","ATTENDANCE","TIMETABLE","FACULTY","SUBJECT",
  "REVALUATION","ACADEMIC_OFFICE",
] as const;
export type Intent = (typeof INTENTS)[number];

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  ADMISSION: ["admission","admit","enroll","apply","seat"],
  FEES: ["fee","fees","payment","due","receipt","installment"],
  EXAMS: ["exam","examination","semester","hall","test","paper"],
  HOSTEL: ["hostel","room","accommodation","mess"],
  LIBRARY: ["library","book","borrow","return"],
  PLACEMENT: ["placement","job","company","recruit","interview"],
  SCHOLARSHIP: ["scholarship","stipend","waiver","grant"],
  CERTIFICATES: ["certificate","bonafide","transcript","degree"],
  RESULTS: ["result","marks","sgpa","cgpa","grade"],
  ATTENDANCE: ["attendance","present","absent","percentage"],
  TIMETABLE: ["timetable","schedule","lecture","class","period"],
  FACULTY: ["faculty","professor","teacher","hod"],
  SUBJECT: ["subject","course","syllabus","credit"],
  REVALUATION: ["revaluation","recheck","rechecking","reassess"],
  ACADEMIC_OFFICE: ["office","registrar","document","form"],
};

export function recognizeIntent(text: string): { intent: Intent; score: number } {
  const tokens = lemmatize(removeStopwords(tokenize(text)));
  let best: Intent = "ACADEMIC_OFFICE";
  let bestScore = 0;
  for (const intent of INTENTS) {
    const kws = INTENT_KEYWORDS[intent];
    const hits = tokens.filter((t) => kws.some((k) => k.startsWith(t) || t.startsWith(k))).length;
    const score = hits / Math.max(kws.length * 0.5, 1);
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return { intent: best, score: Math.min(1, bestScore) };
}

export interface Entities {
  studentName?: string; department?: string; semester?: number;
  subject?: string; date?: string;
}
export function extractEntities(text: string): Entities {
  const e: Entities = {};
  const sem = text.match(/sem(?:ester)?\s*(\d{1,2})/i);
  if (sem) e.semester = Number(sem[1]);
  const date = text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/);
  if (date) e.date = date[1];
  const dept = text.match(/\b(CSE|IT|ECE|MECH|CIVIL|AIML|MBA)\b/i);
  if (dept) e.department = dept[1].toUpperCase();
  return e;
}
