/* ============================================================
   Subject -> employable skill keywords.

   Pure functions, no database and no network, so the mapping can
   be tested on its own.

   The rule that matters: search keywords come from the student's
   STRONGEST subjects, not from a box they type into.

   That is deliberate, and it is the opposite of what a job board
   does. A student typing "software engineer" gets what everyone
   else gets. A student whose record shows they did well in
   databases and networks gets listings matched to that, and the
   portal can show them WHY each listing appeared - which is the
   difference between a recommendation and a search result.

   Weak subjects are excluded on purpose: those are the study
   plan's job. Nobody is more employable in the thing they
   struggled with.
   ============================================================ */

/** Below this score a subject is not used to match work. */
export const EMPLOYABLE_THRESHOLD = 60;

export const SKILL_MAP: Record<string, string[]> = {
  "data structure": ["algorithms", "problem solving"],
  "algorithm": ["algorithms", "problem solving"],
  "database": ["sql", "database"],
  "dbms": ["sql", "database"],
  "operating system": ["systems programming", "linux"],
  "computer network": ["networking"],
  "network": ["networking"],
  "discrete": ["algorithms"],
  "software engineering": ["software engineer", "agile"],
  "theory of computation": ["computer science"],
  "web technolog": ["web developer", "javascript"],
  "web develop": ["web developer", "javascript"],
  "machine learning": ["machine learning", "data science"],
  "artificial intelligence": ["artificial intelligence", "machine learning"],
  "data science": ["data science", "python"],
  "compiler": ["systems programming"],
  "cloud": ["cloud", "devops"],
  "information security": ["security", "cybersecurity"],
  "cyber": ["security", "cybersecurity"],
  "mobile application": ["mobile developer", "android"],
  "android": ["mobile developer", "android"],
  "python": ["python"],
  "java": ["java"],
  "object oriented": ["java", "software engineer"],
  "design": ["ui designer", "product design"],
  "management": ["project manager", "business analyst"],
  "accounting": ["accountant", "finance"],
  "statistic": ["data analyst", "data science"],
  "mathematics": ["data analyst"],
};

/** Skill keywords for one subject name. Empty when nothing matches. */
export function skillsFor(subject: string): string[] {
  const s = String(subject || "").toLowerCase();
  for (const [key, skills] of Object.entries(SKILL_MAP)) {
    if (s.includes(key)) return skills;
  }
  return [];
}

export interface ScoredSubject {
  subject: string;
  score: number;
}

/**
 * Keywords drawn from the student's strongest subjects, best first.
 *
 * Returns at most `limit` keywords and never an empty list - a student whose
 * subjects match nothing in the map still gets a usable general search rather
 * than an error, because "we found nothing" reads as a statement about them.
 */
export function careerKeywords(rows: ScoredSubject[], limit = 4): string[] {
  const ordered = [...(rows || [])]
    .filter(r => Number.isFinite(r.score) && r.score >= EMPLOYABLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const out: string[] = [];
  for (const r of ordered) {
    for (const skill of skillsFor(r.subject)) {
      if (!out.includes(skill)) out.push(skill);
      if (out.length >= limit) return out;
    }
  }
  return out.length ? out : ["computer science"];
}

/** Which subjects produced the keywords, so the UI can explain itself. */
export function keywordSources(rows: ScoredSubject[], limit = 4): string[] {
  const ordered = [...(rows || [])]
    .filter(r => Number.isFinite(r.score) && r.score >= EMPLOYABLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const seen: string[] = [];
  const keywords: string[] = [];
  for (const r of ordered) {
    const skills = skillsFor(r.subject);
    if (!skills.length) continue;
    const isNew = skills.some(s => !keywords.includes(s));
    if (isNew) {
      seen.push(r.subject);
      for (const s of skills) if (!keywords.includes(s)) keywords.push(s);
    }
    if (keywords.length >= limit) break;
  }
  return seen;
}
