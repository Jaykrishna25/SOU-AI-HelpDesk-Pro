import { describe, it, expect } from "vitest";
import {
  skillsFor, careerKeywords, keywordSources, EMPLOYABLE_THRESHOLD,
} from "@/lib/careers-math";
import { renderOpportunities } from "@/lib/careers";

/* The claim this feature makes is that search keywords come from the student's
   own strongest subjects rather than from a box they type into. These tests
   pin that claim: if someone later wires the search to a free-text field, or
   lets a weak subject drive it, the suite fails. */

describe("subject to skill mapping", () => {
  it("maps subjects a CSE transcript actually contains", () => {
    expect(skillsFor("Database Management Systems")).toContain("sql");
    expect(skillsFor("Computer Networks")).toContain("networking");
    expect(skillsFor("Operating Systems")).toContain("linux");
    expect(skillsFor("Machine Learning")).toContain("machine learning");
  });

  it("matches on a substring, because subject names vary", () => {
    // "DBMS", "Database Management Systems" and "Advanced Databases" are the
    // same subject wearing three names.
    expect(skillsFor("DBMS")).toEqual(skillsFor("Database Management Systems"));
    expect(skillsFor("Advanced Database Systems")).toContain("database");
  });

  it("returns nothing for a subject it cannot map", () => {
    expect(skillsFor("Environmental Studies")).toEqual([]);
    expect(skillsFor("")).toEqual([]);
  });
});

describe("keywords come from the strongest subjects", () => {
  const rows = [
    { subject: "Database Management Systems", score: 91 },
    { subject: "Computer Networks", score: 84 },
    { subject: "Operating Systems", score: 42 },   // weak - must not drive it
    { subject: "Machine Learning", score: 78 },
  ];

  it("orders by score, best first", () => {
    const kw = careerKeywords(rows, 4);
    expect(kw[0]).toBe("sql");           // from the 91
  });

  it("excludes weak subjects entirely", () => {
    const kw = careerKeywords(rows, 10);
    // Operating Systems scored 42. Nobody is more employable in the subject
    // they struggled with - that one belongs to the study plan.
    expect(kw).not.toContain("linux");
    expect(kw).not.toContain("systems programming");
  });

  it("respects the limit", () => {
    expect(careerKeywords(rows, 2).length).toBe(2);
  });

  it("never returns an empty list", () => {
    // "We found nothing" would read to a student as a statement about them.
    expect(careerKeywords([], 4)).toEqual(["computer science"]);
    expect(careerKeywords([{ subject: "Yoga", score: 95 }], 4)).toEqual(["computer science"]);
  });

  it("treats a score exactly on the threshold as employable", () => {
    const kw = careerKeywords([{ subject: "DBMS", score: EMPLOYABLE_THRESHOLD }], 4);
    expect(kw).toContain("sql");
  });

  it("ignores unusable scores rather than ranking them", () => {
    const kw = careerKeywords([
      { subject: "DBMS", score: NaN as any },
      { subject: "Computer Networks", score: 88 },
    ], 4);
    expect(kw).toContain("networking");
    expect(kw).not.toContain("sql");
  });

  it("reports which subjects produced the keywords", () => {
    const from = keywordSources(rows, 4);
    expect(from).toContain("Database Management Systems");
    expect(from).not.toContain("Operating Systems");
  });
});

describe("rendered output the model is given", () => {
  it("names the keywords and the subjects they came from", () => {
    const out = renderOpportunities({
      listings: [{
        title: "Backend Intern", company: "Acme", location: "Remote",
        url: "https://example.com/1", matchedOn: "sql",
      }],
      keywords: ["sql", "networking"],
      fromSubjects: ["Database Management Systems"],
      errors: [],
    });
    expect(out).toContain("sql");
    expect(out).toContain("Database Management Systems");
    expect(out).toContain("Backend Intern");
  });

  it("says a feed failure is a feed failure", () => {
    const out = renderOpportunities({
      listings: [], keywords: ["sql"], fromSubjects: [],
      errors: ["sql: timeout"],
    });
    expect(out).toMatch(/not a statement about this student/i);
    expect(out).toContain("timeout");
  });

  it("never describes listings as university placements", () => {
    const out = renderOpportunities({
      listings: [{
        title: "Intern", company: "Acme", location: "Remote",
        url: "https://example.com/1", matchedOn: "sql",
      }],
      keywords: ["sql"], fromSubjects: [], errors: [],
    });
    expect(out).toMatch(/not university placements/i);
    expect(out).toMatch(/not endorsements/i);
  });
});
