import { careerKeywords, keywordSources, type ScoredSubject } from "@/lib/careers-math";

/* ============================================================
   Live opportunity search.

   Remotive's public feed: free, no API key, no account. That
   matters for a university portal - a feature that depends on a
   paid key stops working the month nobody renews it.

   Everything here is read-only and nothing is stored. The
   listings are fetched, shown, and forgotten.
   ============================================================ */

const ENDPOINT = "https://remotive.com/api/remote-jobs";
const TIMEOUT_MS = 12_000;

export interface Listing {
  title: string;
  company: string;
  location: string;
  url: string;
  /** Which keyword surfaced this listing, so the student can see why. */
  matchedOn: string;
}

export interface CareerSearch {
  listings: Listing[];
  keywords: string[];
  /** The subjects those keywords came from. */
  fromSubjects: string[];
  errors: string[];
}

async function fetchFor(keyword: string, limit: number): Promise<any[]> {
  const url = `${ENDPOINT}?search=${encodeURIComponent(keyword)}&limit=${limit}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "sou-ai-helpdesk/1.0" },
      // The feed changes slowly; an hour of caching spares it needless load.
      next: { revalidate: 3600 },
    } as any);
    if (!r.ok) throw new Error("feed returned " + r.status);
    const payload = await r.json();
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search live listings using keywords taken from the student's own record.
 *
 * Never throws: a job feed being unreachable is a network problem, and it must
 * not read to a student as a statement about their prospects.
 */
export async function searchOpportunities(
  rows: ScoredSubject[],
  maxResults = 8,
): Promise<CareerSearch> {
  const keywords = careerKeywords(rows);
  const fromSubjects = keywordSources(rows);
  const listings: Listing[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const kw of keywords) {
    if (listings.length >= maxResults) break;
    let jobs: any[] = [];
    try {
      jobs = await fetchFor(kw, maxResults);
    } catch (e: any) {
      errors.push(`${kw}: ${String(e?.message || e).slice(0, 80)}`);
      continue;
    }
    for (const j of jobs) {
      if (listings.length >= maxResults) break;
      const url = String(j?.url || "");
      if (!url || seen.has(url)) continue;
      seen.add(url);
      listings.push({
        title: String(j?.title || "Untitled role"),
        company: String(j?.company_name || "unknown company"),
        location: String(j?.candidate_required_location || "location not stated"),
        url,
        matchedOn: kw,
      });
    }
  }

  return { listings, keywords, fromSubjects, errors };
}

/** The exact text the model is given. It rewords this; it never adds to it. */
export function renderOpportunities(s: CareerSearch): string {
  const lines = [
    "LIVE OPPORTUNITY LISTINGS",
    "Search keywords were taken from the student's own strongest subjects: "
      + s.keywords.join(", "),
  ];
  if (s.fromSubjects.length) {
    lines.push("Those keywords came from: " + s.fromSubjects.join(", "));
  }
  lines.push("");

  if (!s.listings.length) {
    lines.push("No live listings came back for these keywords.");
    if (s.errors.length) {
      lines.push("The listings feed could not be reached: " + s.errors.join("; "));
    }
    lines.push(
      "This is a problem with the external feed, not a statement about this "
      + "student's prospects. Say so plainly.",
    );
    return lines.join("\n");
  }

  for (const l of s.listings) {
    lines.push(`- ${l.title} at ${l.company} (${l.location}) [matched on: ${l.matchedOn}] ${l.url}`);
  }
  lines.push("");
  lines.push(
    "These are live third-party listings from a public feed. They are not "
    + "university placements and not endorsements. Do not promise any outcome.",
  );
  return lines.join("\n");
}
