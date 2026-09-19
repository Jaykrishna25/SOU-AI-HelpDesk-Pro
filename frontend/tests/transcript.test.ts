import { describe, it, expect } from "vitest";
import { parseTranscript, mergeTranscript } from "@/lib/transcript";
import { computeStudyPlan } from "@/lib/study-math";
import type { ResultRow } from "@/lib/study-math";

const row = (over: Partial<ResultRow>): ResultRow => ({
  subjectCode: "CS301", subjectName: "Databases", semester: 5,
  internalMarks: 20, externalMarks: 50, grade: "B", ...over,
});

describe("parsing", () => {
  it("reads a well-formed CSV", () => {
    const t = parseTranscript(
      "Code,Subject,Semester,Internal,External,Grade\n" +
      "CS301,Database Systems,5,18,52,B\n" +
      "CS302,Computer Networks,5,15,30,D\n",
    );
    expect(t.rows.length).toBe(2);
    expect(t.rows[0].subjectName).toBe("Database Systems");
    expect(t.rows[0].internalMarks).toBe(18);
    expect(t.skipped).toBe(0);
  });

  it("detects the delimiter per file and respects quoted fields", () => {
    /* The fee parser once split on every candidate delimiter at once and read
       "1,50,000" as 1 — a student was told they owed one rupee. This parser
       does not repeat that. */
    const t = parseTranscript(
      'Code;Subject;Total\n' +
      'CS301;"Databases, Advanced";71\n',
    );
    expect(t.rows.length).toBe(1);
    expect(t.rows[0].subjectName).toBe("Databases, Advanced");
    expect(t.rows[0].externalMarks).toBe(71);
  });

  it("matches column names loosely, because real transcripts vary", () => {
    const a = parseTranscript("Course Title,Marks\nOperating Systems,44\n");
    const b = parseTranscript("Paper,Score\nOperating Systems,44\n");
    expect(a.rows[0].subjectName).toBe("Operating Systems");
    expect(b.rows[0].subjectName).toBe("Operating Systems");
  });

  it("uses grades when a transcript has no marks at all", () => {
    const t = parseTranscript("Subject,Grade\nDiscrete Mathematics,A\n");
    expect(t.rows.length).toBe(1);
    expect(t.rows[0].grade).toBe("A");
    expect(t.rows[0].externalMarks).toBeGreaterThan(0);
  });

  it("counts unreadable rows rather than guessing at them", () => {
    const t = parseTranscript(
      "Subject,Total\nDatabases,71\n,\nNetworks,\n",
    );
    expect(t.rows.length).toBe(1);
    expect(t.skipped).toBe(2);
    expect(t.notes.join(" ")).toMatch(/not guessed at/i);
  });

  it("fails closed when there is no subject column", () => {
    const t = parseTranscript("Foo,Bar\n1,2\n");
    expect(t.rows).toEqual([]);
    expect(t.notes.join(" ")).toMatch(/no subject column/i);
  });

  it("handles an empty or junk file without throwing", () => {
    expect(parseTranscript("").rows).toEqual([]);
    expect(parseTranscript("nonsense").rows).toEqual([]);
    expect(parseTranscript(undefined as any).rows).toEqual([]);
  });

  it("always states that nothing was saved", () => {
    expect(parseTranscript("Subject,Total\nX,50\n").notes.join(" "))
      .toMatch(/nothing.*has been saved/i);
  });
});

describe("the portal's own record wins", () => {
  /* The integrity rule. If an uploaded text file could change a recorded
     grade, the record would not be a record. */
  const recorded = [
    row({ subjectCode: "CS301", subjectName: "Databases", semester: 5, internalMarks: 20, externalMarks: 50 }),
  ];

  it("adds subjects the portal does not have", () => {
    const uploaded = [row({ subjectCode: "CS201", subjectName: "Data Structures", semester: 3 })];
    const m = mergeTranscript(recorded, uploaded);
    expect(m.added).toBe(1);
    expect(m.rows.length).toBe(2);
    expect(m.ignored).toEqual([]);
  });

  it("refuses to overwrite a subject the portal already issued", () => {
    const uploaded = [row({
      subjectCode: "CS301", subjectName: "Databases", semester: 5,
      internalMarks: 25, externalMarks: 70, grade: "O",   // a better grade
    })];
    const m = mergeTranscript(recorded, uploaded);
    expect(m.added).toBe(0);
    expect(m.ignored).toEqual(["Databases"]);
    // The recorded marks are untouched.
    expect(m.rows.length).toBe(1);
    expect(m.rows[0].externalMarks).toBe(50);
    expect(m.rows[0].grade).toBe("B");
  });

  it("treats the same subject in a different semester as a new subject", () => {
    const uploaded = [row({ subjectCode: "CS301", subjectName: "Databases", semester: 3 })];
    expect(mergeTranscript(recorded, uploaded).added).toBe(1);
  });

  it("matches on subject name when no code is present", () => {
    const noCode = [row({ subjectCode: "", subjectName: "Databases", semester: 5 })];
    const uploaded = [row({ subjectCode: "", subjectName: "databases", semester: 5 })];
    expect(mergeTranscript(noCode, uploaded).added).toBe(0);
  });

  it("handles empty inputs on either side", () => {
    expect(mergeTranscript([], []).rows).toEqual([]);
    expect(mergeTranscript([], [row({})]).added).toBe(1);
    expect(mergeTranscript(recorded, []).rows.length).toBe(1);
  });
});

describe("an upload actually changes the plan", () => {
  it("brings a weak uploaded subject into the priorities", () => {
    const recorded = [row({ subjectCode: "CS301", subjectName: "Databases", internalMarks: 25, externalMarks: 65 })];
    const before = computeStudyPlan(recorded);
    expect(before.items.length).toBe(0);   // nothing weak

    const uploaded = parseTranscript(
      "Code,Subject,Semester,Total\nCS150,Engineering Mathematics,2,38\n",
    ).rows;
    const merged = mergeTranscript(recorded, uploaded).rows;
    const after = computeStudyPlan(merged);

    expect(after.items.length).toBe(1);
    expect(after.items[0].subjectName).toBe("Engineering Mathematics");
    expect(after.items[0].severity).toBe("critical");
  });
});
