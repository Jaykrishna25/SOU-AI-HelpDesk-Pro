import type { ResultRow } from "@/lib/study-math";

/* ============================================================
   Transcript parsing.

   Why the portal accepts an upload at all
   ---------------------------------------
   The portal already holds every result it issued, so for most
   students an upload adds nothing. The cases where it does:

     - A transfer student, whose earlier semesters were sat at
       another institution and exist only on paper.
     - A student whose older semesters predate this system.
     - Anyone wanting to check a plan against a marksheet they
       hold, before trusting what the portal says.

   So an upload SUPPLEMENTS the database rather than replacing
   it. A subject already in the record is not overwritten by an
   uploaded row - the portal's own marks are authoritative for
   anything the portal issued, and letting a text file silently
   change a recorded grade would be a straightforward integrity
   hole.

   Nothing is persisted. The rows live in the request and in the
   student's tab, like the class group parser beside this file.

   Pure functions - no database, no network - so the merge rule
   above is unit tested.
   ============================================================ */

/* ---------------- delimited files ----------------

   The delimiter is detected per file rather than per line, and
   quoted fields are respected. Both of those exist because the
   fee parser originally did neither, and read "1,50,000" in a
   semicolon-separated file as 1. A student was told they owed
   one rupee. The same mistake is not repeated here.
   -------------------------------------------------- */

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",", bestCount = -1;
  for (const d of candidates) {
    const n = headerLine.split(d).length - 1;
    if (n > bestCount) { bestCount = n; best = d; }
  }
  return best;
}

function splitRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map(c => c.trim());
}

const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/** Find a column by any of several names, then by substring. */
function pick(cols: Record<string, number>, ...names: string[]): number {
  for (const n of names) if (n in cols) return cols[n];
  for (const n of names) {
    for (const key of Object.keys(cols)) if (key.includes(n)) return cols[key];
  }
  return -1;
}

function num(v: any): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const GRADE_POINTS: Record<string, number> = {
  O: 10, "A+": 9, A: 9, "B+": 8, B: 7, C: 6, D: 5, E: 4, F: 0,
};

function gradeFromScore(total: number): string {
  for (const [cut, g] of [[90, "O"], [80, "A"], [70, "B+"], [60, "B"], [50, "C"], [45, "D"]] as const) {
    if (total >= cut) return g;
  }
  return "E";
}

export interface ParsedTranscript {
  rows: ResultRow[];
  /** Rows present but unreadable. Counted, never guessed at. */
  skipped: number;
  notes: string[];
}

/**
 * Parse a transcript from CSV, TSV or a delimited text export.
 *
 * Never throws. A file it cannot understand yields no rows and says so, which
 * is the correct outcome - inventing a subject would be worse than failing.
 */
export function parseTranscript(raw: string): ParsedTranscript {
  const lines = String(raw || "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { rows: [], skipped: 0, notes: ["The file has no data rows."] };
  }

  const delim = detectDelimiter(lines[0]);
  const header = splitRow(lines[0], delim);
  const cols: Record<string, number> = {};
  header.forEach((h, i) => { cols[norm(h)] = i; });

  const cSub = pick(cols, "subject", "subjectname", "coursetitle", "course", "title", "paper");
  const cCode = pick(cols, "code", "subjectcode", "coursecode");
  const cSem = pick(cols, "semester", "sem", "term");
  const cTotal = pick(cols, "total", "marks", "percentage", "score", "obtained");
  const cInt = pick(cols, "internal", "internalmarks", "ia");
  const cExt = pick(cols, "external", "externalmarks", "ese");
  const cGrade = pick(cols, "grade");

  if (cSub < 0) {
    return {
      rows: [], skipped: 0,
      notes: [
        "No subject column was found. A transcript needs a column named Subject "
        + "(or Course, or Paper) and a marks or grade column.",
      ],
    };
  }

  const rows: ResultRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitRow(line, delim);
    const subjectName = (cells[cSub] || "").trim();
    if (!subjectName || norm(subjectName) === "nan") { skipped++; continue; }

    let internal = cInt >= 0 ? num(cells[cInt]) : 0;
    let external = cExt >= 0 ? num(cells[cExt]) : 0;
    const grade = cGrade >= 0 ? (cells[cGrade] || "").trim().toUpperCase() : "";

    if (!internal && !external) {
      if (cTotal >= 0) {
        // Only a total: put it all in external so scoreOf still sums correctly.
        external = num(cells[cTotal]);
      } else if (grade && grade in GRADE_POINTS) {
        // A transcript with grades but no marks is still usable.
        external = GRADE_POINTS[grade] * 10;
      }
    }

    if (!internal && !external && !grade) { skipped++; continue; }

    rows.push({
      subjectCode: cCode >= 0 ? (cells[cCode] || "").trim() : "",
      subjectName,
      semester: cSem >= 0 ? Math.round(num(cells[cSem])) : 0,
      internalMarks: internal,
      externalMarks: external,
      grade: grade || gradeFromScore(internal + external),
    });
  }

  const notes: string[] = [];
  if (rows.length) notes.push(`${rows.length} subject(s) read from the file.`);
  if (skipped) notes.push(`${skipped} row(s) could not be read and were skipped, not guessed at.`);
  if (!rows.length) notes.push("No readable subjects were found in that file.");
  notes.push("Nothing from this file has been saved.");

  return { rows, skipped, notes };
}

export interface MergeResult {
  rows: ResultRow[];
  added: number;
  /** Uploaded subjects already in the portal record, which were NOT overwritten. */
  ignored: string[];
}

/**
 * Merge uploaded rows into the portal's own record.
 *
 * The portal's marks win, always. An uploaded row for a subject the portal
 * already issued is reported and discarded - if a text file could change a
 * recorded grade, the record would not be a record.
 */
export function mergeTranscript(recorded: ResultRow[], uploaded: ResultRow[]): MergeResult {
  const key = (r: ResultRow) =>
    (r.subjectCode ? norm(r.subjectCode) : norm(r.subjectName)) + "|" + r.semester;

  const have = new Set((recorded || []).map(key));
  const rows = [...(recorded || [])];
  const ignored: string[] = [];
  let added = 0;

  for (const u of uploaded || []) {
    if (have.has(key(u))) {
      ignored.push(u.subjectName);
      continue;
    }
    have.add(key(u));
    rows.push(u);
    added++;
  }

  return { rows, added, ignored };
}
