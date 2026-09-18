/* ============================================================
   Fee statement analysis.

   Every number in this module is computed by plain arithmetic.
   The language model never calculates a figure - it is given the
   output of these functions and asked only to explain it. That
   separation is deliberate: a wrong number in a fee statement is
   worse than no answer at all.

   Amounts are INR throughout. Percentages are percentages, never
   fractions, and are labelled as such in the strings the agent
   receives so it cannot misread 0.35 as 35%.
   ============================================================ */

/** A fee row, whether it came from the database or an uploaded file. */
export interface FeeRow {
  semester: number;
  totalFees: number;
  paidFees: number;
  status: string;
  dueDate: Date | null;
}

export interface FeeLine extends FeeRow {
  outstanding: number;
  paidPercent: number;
  overdue: boolean;
  daysOverdue: number | null;
  settled: boolean;
}

export interface FeeAnalysis {
  source: "portal-record" | "uploaded-statement";
  lines: FeeLine[];
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  paidPercent: number;
  overdueCount: number;
  overdueAmount: number;
  nextDue: { semester: number; amount: number; dueDate: Date } | null;
  flags: string[];
  generatedAt: string;
}

const DAY_MS = 86_400_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Guards against NaN reaching a total and poisoning every figure downstream. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[, ₹]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- core arithmetic ---------------- */

export function analyseFeeRows(
  rows: FeeRow[],
  source: FeeAnalysis["source"],
  now = new Date(),
): FeeAnalysis {
  const lines: FeeLine[] = rows.map(r => {
    const total = num(r.totalFees);
    const paid = num(r.paidFees);
    const outstanding = round2(Math.max(0, total - paid));
    const settled = outstanding <= 0.5;               // tolerate rounding in paise
    const due = r.dueDate ? new Date(r.dueDate) : null;
    const past = !!due && due.getTime() < now.getTime();
    return {
      ...r,
      totalFees: total,
      paidFees: paid,
      outstanding,
      paidPercent: total > 0 ? round2((paid / total) * 100) : 0,
      overdue: past && !settled,
      daysOverdue: past && !settled && due ? Math.floor((now.getTime() - due.getTime()) / DAY_MS) : null,
      settled,
    };
  });

  const totalBilled = round2(lines.reduce((a, l) => a + l.totalFees, 0));
  const totalPaid = round2(lines.reduce((a, l) => a + l.paidFees, 0));
  const totalOutstanding = round2(lines.reduce((a, l) => a + l.outstanding, 0));
  const overdue = lines.filter(l => l.overdue);

  const upcoming = lines
    .filter(l => !l.settled && l.dueDate && new Date(l.dueDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

  const flags: string[] = [];
  for (const l of overdue) {
    flags.push(
      `Semester ${l.semester}: INR ${l.outstanding.toLocaleString("en-IN")} is unpaid and the due date passed ` +
      `${l.daysOverdue} day(s) ago. Late payment rules are set by policy - ask about the late fee policy for details.`,
    );
  }
  if (!overdue.length && totalOutstanding > 0) {
    flags.push(`INR ${totalOutstanding.toLocaleString("en-IN")} is outstanding but nothing is past its due date yet.`);
  }

  return {
    source,
    lines,
    totalBilled,
    totalPaid,
    totalOutstanding,
    paidPercent: totalBilled > 0 ? round2((totalPaid / totalBilled) * 100) : 0,
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((a, l) => a + l.outstanding, 0)),
    nextDue: upcoming
      ? { semester: upcoming.semester, amount: upcoming.outstanding, dueDate: new Date(upcoming.dueDate!) }
      : null,
    flags,
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}

export interface InstitutionalAnalysis {
  studentsWithFees: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRatePercent: number;
  overdueStudents: number;
  overdueAmount: number;
  bySemester: { semester: number; billed: number; collected: number; outstanding: number; collectionRatePercent: number }[];
  byDepartment: { department: string; billed: number; collected: number; outstanding: number; collectionRatePercent: number }[];
  generatedAt: string;
}

/* ---------------- uploaded statements ---------------- */

/**
 * Picks the column separator once, from the header row.
 *
 * Splitting on every candidate separator at once looks tolerant but is wrong:
 * an Indian statement writes amounts as "1,50,000", so a comma-aware split of a
 * semicolon-separated file tears that figure into three columns and reads it as
 * 1. Choosing one delimiter for the whole file avoids that entirely.
 */
function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",", bestCount = -1;
  for (const d of candidates) {
    const n = headerLine.split(d).length - 1;
    if (n > bestCount) { bestCount = n; best = d; }
  }
  return best;
}

/** Splits one row, treating text inside double quotes as a single field. */
function splitRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }   // escaped quote
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(c => c.trim());
}

/**
 * Parses a pasted or uploaded fee statement.
 *
 * Column names vary between the formats a university actually issues, so
 * headers are matched loosely rather than demanded exactly. A row that cannot
 * be understood is skipped and counted, never guessed at - the count is shown
 * to the user so a partial parse is visible instead of silent.
 */
export function parseStatement(text: string): { rows: FeeRow[]; skipped: number } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], skipped: 0 };

  const delim = detectDelimiter(lines[0]);
  const split = (l: string) => splitRow(l, delim);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

  const header = split(lines[0]).map(norm);
  const find = (...cands: string[]) =>
    header.findIndex(h => cands.some(c => h.includes(c)));

  const iSem = find("semester", "sem", "term");
  const iTotal = find("totalfees", "total", "billed", "amountdue", "fees");
  const iPaid = find("paidfees", "paid", "amountpaid", "received");
  const iStatus = find("status", "state");
  const iDue = find("duedate", "due", "deadline");

  // Without a semester and a total there is nothing meaningful to analyse.
  if (iSem < 0 || iTotal < 0) return { rows: [], skipped: Math.max(0, lines.length - 1) };

  const rows: FeeRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const c = split(line);
    const semester = parseInt(String(c[iSem] ?? "").replace(/[^0-9]/g, ""), 10);
    const total = num(c[iTotal]);
    if (!Number.isFinite(semester) || semester <= 0 || total <= 0) { skipped++; continue; }

    const rawDue = iDue >= 0 ? c[iDue] : "";
    const due = rawDue ? new Date(rawDue) : null;

    rows.push({
      semester,
      totalFees: total,
      paidFees: iPaid >= 0 ? num(c[iPaid]) : 0,
      status: (iStatus >= 0 ? c[iStatus] : "") || "UNKNOWN",
      dueDate: due && !isNaN(due.getTime()) ? due : null,
    });
  }

  return { rows: rows.sort((a, b) => a.semester - b.semester), skipped };
}

/* ---------------- text rendering for the agent ---------------- */

/** What the model actually receives. Sources are labelled in the text itself. */
export function renderStudentAnalysis(a: FeeAnalysis): string {
  const label = a.source === "portal-record"
    ? "PORTAL FEE RECORD (from the university database)"
    : "UPLOADED STATEMENT (from the file the user provided)";

  const out = [
    `${label} - generated ${a.generatedAt}`,
    `Total billed: INR ${a.totalBilled.toLocaleString("en-IN")}`,
    `Total paid: INR ${a.totalPaid.toLocaleString("en-IN")} (${a.paidPercent}% of billed)`,
    `Total outstanding: INR ${a.totalOutstanding.toLocaleString("en-IN")}`,
    "",
    "PER SEMESTER:",
  ];

  for (const l of a.lines) {
    const due = l.dueDate ? new Date(l.dueDate).toISOString().slice(0, 10) : "no due date recorded";
    out.push(
      `- Semester ${l.semester}: billed INR ${l.totalFees.toLocaleString("en-IN")}, ` +
      `paid INR ${l.paidFees.toLocaleString("en-IN")} (${l.paidPercent}%), ` +
      `outstanding INR ${l.outstanding.toLocaleString("en-IN")}, due ${due}` +
      (l.overdue ? `, OVERDUE by ${l.daysOverdue} day(s)` : l.settled ? ", settled" : ""),
    );
  }

  out.push("");
  if (a.flags.length) {
    out.push("FLAGS:");
    a.flags.forEach(f => out.push("! " + f));
  } else {
    out.push("No outstanding balance. Nothing is overdue.");
  }

  if (a.nextDue) {
    out.push("");
    out.push(
      `NEXT PAYMENT DUE: semester ${a.nextDue.semester}, ` +
      `INR ${a.nextDue.amount.toLocaleString("en-IN")} by ${a.nextDue.dueDate.toISOString().slice(0, 10)}.`,
    );
  }

  return out.join("\n");
}

export function renderInstitutionalAnalysis(a: InstitutionalAnalysis, scope: string): string {
  const out = [
    `INSTITUTIONAL FEE POSITION (${scope}) - generated ${a.generatedAt}`,
    `Students with fee records: ${a.studentsWithFees}`,
    `Total billed: INR ${a.totalBilled.toLocaleString("en-IN")}`,
    `Total collected: INR ${a.totalCollected.toLocaleString("en-IN")}`,
    `Total outstanding: INR ${a.totalOutstanding.toLocaleString("en-IN")}`,
    `Collection rate: ${a.collectionRatePercent}% of billed amount`,
    `Students with an overdue balance: ${a.overdueStudents} (INR ${a.overdueAmount.toLocaleString("en-IN")} overdue in total)`,
    "",
    "BY SEMESTER:",
  ];
  for (const s of a.bySemester) {
    out.push(
      `- Semester ${s.semester}: billed INR ${s.billed.toLocaleString("en-IN")}, ` +
      `collected INR ${s.collected.toLocaleString("en-IN")} (${s.collectionRatePercent}%), ` +
      `outstanding INR ${s.outstanding.toLocaleString("en-IN")}`,
    );
  }
  out.push("");
  out.push("BY DEPARTMENT:");
  for (const d of a.byDepartment) {
    out.push(
      `- ${d.department}: billed INR ${d.billed.toLocaleString("en-IN")}, ` +
      `collected INR ${d.collected.toLocaleString("en-IN")} (${d.collectionRatePercent}%), ` +
      `outstanding INR ${d.outstanding.toLocaleString("en-IN")}`,
    );
  }
  out.push("");
  out.push("These are aggregate figures only. No individual student is identified in this view.");
  return out.join("\n");
}
