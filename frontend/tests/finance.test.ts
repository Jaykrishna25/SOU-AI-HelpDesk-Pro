import { describe, it, expect } from "vitest";
import { analyseFeeRows, parseStatement, renderStudentAnalysis } from "@/lib/finance-math";

/* These tests exercise the arithmetic the fee assistant depends on.
   They import finance-math directly, with no database and no model, because
   the whole point of the split is that the numbers can be checked in
   isolation. If these pass, the agent cannot report a wrong total - it is
   never allowed to compute one itself. */

const PAST = new Date("2026-01-10");
const FUTURE = new Date("2026-12-31");
const NOW = new Date("2026-06-15");

describe("analyseFeeRows", () => {
  it("computes outstanding, totals and percentage paid", () => {
    const a = analyseFeeRows([
      { semester: 1, totalFees: 100000, paidFees: 100000, status: "PAID", dueDate: PAST },
      { semester: 2, totalFees: 100000, paidFees: 25000, status: "PENDING", dueDate: FUTURE },
    ], "portal-record", NOW);

    expect(a.totalBilled).toBe(200000);
    expect(a.totalPaid).toBe(125000);
    expect(a.totalOutstanding).toBe(75000);
    expect(a.paidPercent).toBe(62.5);
    expect(a.lines[0].settled).toBe(true);
    expect(a.lines[1].outstanding).toBe(75000);
    expect(a.lines[1].paidPercent).toBe(25);
  });

  it("flags an unpaid row whose due date has passed, with the day count", () => {
    const a = analyseFeeRows([
      { semester: 1, totalFees: 50000, paidFees: 10000, status: "PENDING", dueDate: PAST },
    ], "portal-record", NOW);

    expect(a.overdueCount).toBe(1);
    expect(a.overdueAmount).toBe(40000);
    expect(a.lines[0].overdue).toBe(true);
    expect(a.lines[0].daysOverdue).toBe(156);
    expect(a.flags[0]).toContain("Semester 1");
  });

  it("does not call a fully paid row overdue even when the date has passed", () => {
    const a = analyseFeeRows([
      { semester: 1, totalFees: 50000, paidFees: 50000, status: "PAID", dueDate: PAST },
    ], "portal-record", NOW);

    expect(a.overdueCount).toBe(0);
    expect(a.lines[0].overdue).toBe(false);
    expect(a.flags).toHaveLength(0);
  });

  it("never reports a negative balance when a student has overpaid", () => {
    const a = analyseFeeRows([
      { semester: 1, totalFees: 50000, paidFees: 60000, status: "PAID", dueDate: PAST },
    ], "portal-record", NOW);

    expect(a.lines[0].outstanding).toBe(0);
    expect(a.totalOutstanding).toBe(0);
  });

  it("treats unreadable amounts as zero rather than letting NaN reach a total", () => {
    const a = analyseFeeRows([
      { semester: 1, totalFees: "not a number" as any, paidFees: 1000, status: "X", dueDate: null },
      { semester: 2, totalFees: 40000, paidFees: 10000, status: "X", dueDate: null },
    ], "portal-record", NOW);

    expect(Number.isFinite(a.totalBilled)).toBe(true);
    expect(a.totalBilled).toBe(40000);
  });

  it("identifies the next payment due", () => {
    const a = analyseFeeRows([
      { semester: 3, totalFees: 90000, paidFees: 0, status: "PENDING", dueDate: new Date("2026-11-01") },
      { semester: 2, totalFees: 80000, paidFees: 0, status: "PENDING", dueDate: new Date("2026-08-01") },
    ], "portal-record", NOW);

    expect(a.nextDue?.semester).toBe(2);
    expect(a.nextDue?.amount).toBe(80000);
  });
});

describe("parseStatement", () => {
  it("reads a well-formed statement", () => {
    const { rows, skipped } = parseStatement(
      "Semester,Total Fees,Paid Fees,Status,Due Date\n" +
      "1,100000,100000,PAID,2025-08-01\n" +
      "2,100000,40000,PENDING,2026-01-15\n",
    );
    expect(rows).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(rows[1].totalFees).toBe(100000);
    expect(rows[1].paidFees).toBe(40000);
  });

  it("matches column names loosely and strips currency formatting", () => {
    const { rows } = parseStatement(
      "Term;Amount Due;Amount Paid\n" +
      "Sem 1;\"1,50,000\";\"50,000\"\n",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].semester).toBe(1);
    expect(rows[0].totalFees).toBe(150000);
    expect(rows[0].paidFees).toBe(50000);
  });

  it("counts unreadable rows instead of guessing at them", () => {
    const { rows, skipped } = parseStatement(
      "Semester,Total\n" +
      "1,100000\n" +
      "rubbish line\n" +
      ",\n",
    );
    expect(rows).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("returns nothing when the required columns are absent", () => {
    const { rows } = parseStatement("Name,Address\nAsha,Ahmedabad\n");
    expect(rows).toHaveLength(0);
  });
});

describe("renderStudentAnalysis", () => {
  it("labels the source so the model cannot confuse uploaded data with portal data", () => {
    const rows = [{ semester: 1, totalFees: 100000, paidFees: 40000, status: "PENDING", dueDate: PAST }];

    expect(renderStudentAnalysis(analyseFeeRows(rows, "uploaded-statement", NOW)))
      .toContain("UPLOADED STATEMENT");
    expect(renderStudentAnalysis(analyseFeeRows(rows, "portal-record", NOW)))
      .toContain("PORTAL FEE RECORD");
  });
});
