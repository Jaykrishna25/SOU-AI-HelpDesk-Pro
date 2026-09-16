import { describe, it, expect } from "vitest";
import { parse, ValidationError, EvidenceCreateInput, GrievanceInput, SignupInput, BookingInput } from "@/lib/validate";

const ok = (schema: any, v: any) => () => parse(schema, v);

describe("evidence validation", () => {
  const base = {
    metricId: "cl0000000000000001", academicYearId: "cl0000000000000002",
    title: "Academic calendar 2026-27", evidenceDate: "2026-06-01",
  };
  it("accepts a well-formed record", () => expect(ok(EvidenceCreateInput, base)).not.toThrow());
  it("rejects a future evidence date", () =>
    expect(ok(EvidenceCreateInput, { ...base, evidenceDate: "2099-01-01" })).toThrow(ValidationError));
  it("rejects a two-character title", () =>
    expect(ok(EvidenceCreateInput, { ...base, title: "ab" })).toThrow(ValidationError));
  it("rejects URL evidence with no URL", () =>
    expect(ok(EvidenceCreateInput, { ...base, evidenceType: "URL" })).toThrow(ValidationError));
  it("rejects an unknown visibility level", () =>
    expect(ok(EvidenceCreateInput, { ...base, visibility: "SECRET" })).toThrow(ValidationError));
});

describe("signup validation", () => {
  it("never accepts a role from the client", () => {
    const out: any = parse(SignupInput, {
      fullName: "Test Student", email: "t@example.com",
      birthdate: "2004-01-01", role: "OWNER",
    });
    expect(out.role).toBeUndefined();
  });
  it("rejects a malformed email", () =>
    expect(ok(SignupInput, { fullName: "X Y", email: "nope", birthdate: "2004-01-01" })).toThrow(ValidationError));
});

describe("grievance validation", () => {
  it("requires a substantive body", () =>
    expect(ok(GrievanceInput, { category: "Fees", subject: "Issue", body: "short" })).toThrow(ValidationError));
});

describe("booking validation", () => {
  const base = { resourceId: "cl0000000000000003", date: "2026-10-01", startHour: 10, endHour: 11, purpose: "Review meeting" };
  it("accepts a valid slot", () => expect(ok(BookingInput, base)).not.toThrow());
  it("rejects an end time before the start", () =>
    expect(ok(BookingInput, { ...base, endHour: 9 })).toThrow(ValidationError));
  it("rejects a 25th hour", () =>
    expect(ok(BookingInput, { ...base, endHour: 25 })).toThrow(ValidationError));
});
