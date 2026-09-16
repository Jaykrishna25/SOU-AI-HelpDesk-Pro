import { describe, it, expect } from "vitest";
import { can, canSeeVisibility, canReadSensitive, rolesWith, normaliseRole } from "@/lib/policy";

const asRole = (role: string) =>
  ({ userId: "u1", role, loginId: "X1", fullName: "Test" } as any);

describe("capability matrix", () => {
  it("separates verification from approval", () => {
    expect(can(asRole("ADMIN"), "evidence.verify")).toBe(true);
    expect(can(asRole("ADMIN"), "evidence.approve")).toBe(false);
    expect(can(asRole("OWNER"), "evidence.approve")).toBe(true);
  });

  it("keeps students out of privileged actions", () => {
    for (const cap of ["evidence.approve", "booking.approve", "role.assign", "audit.view"] as const) {
      expect(can(asRole("STUDENT"), cap)).toBe(false);
    }
  });

  it("restricts grievance identity to the Owner", () => {
    expect(can(asRole("HOD"), "grievance.handle")).toBe(true);
    expect(can(asRole("HOD"), "grievance.viewIdentity")).toBe(false);
    expect(can(asRole("OWNER"), "grievance.viewIdentity")).toBe(true);
  });

  it("denies everything to an absent session", () => {
    expect(can(null, "booking.create")).toBe(false);
    expect(canSeeVisibility(null, "internal")).toBe(false);
  });

  it("treats an unknown role as a student, not as an admin", () => {
    expect(normaliseRole("ROOT")).toBe("STUDENT");
    expect(can(asRole("ROOT"), "evidence.approve")).toBe(false);
  });
});

describe("evidence visibility", () => {
  it("lets anyone see public but not confidential", () => {
    expect(canSeeVisibility(asRole("STUDENT"), "public")).toBe(true);
    expect(canSeeVisibility(asRole("STUDENT"), "confidential")).toBe(false);
    expect(canSeeVisibility(asRole("FACULTY"), "restricted")).toBe(false);
    expect(canSeeVisibility(asRole("OWNER"), "restricted")).toBe(true);
  });
});

describe("sensitive domains", () => {
  it("keeps counselling and ICC to the Owner", () => {
    expect(canReadSensitive(asRole("ADMIN"), "counselling")).toBe(false);
    expect(canReadSensitive(asRole("HOD"), "icc")).toBe(false);
    expect(canReadSensitive(asRole("OWNER"), "icc")).toBe(true);
  });
});

describe("rolesWith", () => {
  it("returns the same set the modules rely on", () => {
    // order is irrelevant for a permission set - compare contents
    expect([...rolesWith("evidence.approve")].sort()).toEqual(["HOI", "OWNER", "SUPER_ADMIN"].sort());
    expect([...rolesWith("booking.approve")].sort()).toEqual(["ADMIN", "OWNER", "SUPER_ADMIN"].sort());
    expect(rolesWith("evidence.approve")).not.toContain("ADMIN");
    expect(rolesWith("evidence.approve")).not.toContain("FACULTY");
  });
});

