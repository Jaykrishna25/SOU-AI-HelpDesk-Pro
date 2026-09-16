import { z } from "zod";
import { NextResponse } from "next/server";

/* ============================================================
   Every endpoint that accepts a body should parse it here.
   Untrusted input is never passed straight to Prisma.
   ============================================================ */

export class ValidationError extends Error {
  constructor(public issues: { path: string; message: string }[]) {
    super("Validation failed");
  }
}

/** Parse or throw. Handlers catch ValidationError and return 400. */
export function parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  throw new ValidationError(
    r.error.issues.map(i => ({ path: i.path.join("."), message: i.message }))
  );
}

/** Turn a ValidationError into a 400 with field-level detail. */
export function validationResponse(e: unknown) {
  if (e instanceof ValidationError) {
    return NextResponse.json(
      { success: false, error: e.issues.map(i => (i.path ? i.path + ": " : "") + i.message).join("; "), issues: e.issues },
      { status: 400 }
    );
  }
  return null;
}

/* ---------------- reusable primitives ---------------- */
const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const cuid = z.string().trim().min(10).max(40);

const pastOrToday = z.coerce.date().refine(
  d => d.getTime() <= Date.now() + 864e5,
  "Date cannot be in the future"
);

/* ---------------- auth ---------------- */
export const LoginInput = z.object({
  loginId: trimmed(2, 40),
  password: z.string().max(200).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD").optional(),
}).refine(v => v.password || v.birthdate, { message: "A password is required" });

export const SetPasswordInput = z.object({
  currentPassword: z.string().max(200).optional().default(""),
  newPassword: z.string().min(10, "At least 10 characters").max(200),
});

export const SignupInput = z.object({
  fullName: trimmed(2, 120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(20).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  institute: z.string().trim().max(160).optional(),
  course: z.string().trim().max(120).optional(),
  // role deliberately absent: it is never accepted from the client
});

/* ---------------- evidence ---------------- */
export const EvidenceCreateInput = z.object({
  metricId: cuid,
  academicYearId: cuid,
  title: trimmed(3, 240),
  evidenceType: z.enum(["FILE", "URL", "STRUCTURED", "NARRATIVE"]).default("FILE"),
  urlValue: z.string().trim().url().max(1000).optional().nullable(),
  structuredJson: z.unknown().optional().nullable(),
  narrative: z.string().trim().max(8000).optional().nullable(),
  evidenceDate: pastOrToday,
  sourceSystem: z.string().trim().max(120).optional().nullable(),
  sourceReference: z.string().trim().max(240).optional().nullable(),
  visibility: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).default("INTERNAL"),
  departmentId: z.string().trim().max(40).optional().nullable(),
  departmentName: z.string().trim().max(160).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
}).refine(v => v.evidenceType !== "URL" || !!v.urlValue, {
  message: "URL evidence requires a valid http(s) address", path: ["urlValue"],
});

export const VerifyInput = z.object({
  id: cuid,
  result: z.enum(["VERIFIED", "REJECTED", "IN_REVIEW"]),
  comments: z.string().trim().max(2000).optional().nullable(),
  checklist: z.record(z.string(), z.unknown()).optional().default({}),
});

export const ApproveInput = z.object({
  id: cuid,
  decision: z.enum(["APPROVED", "REJECTED", "RETURNED"]),
  comments: z.string().trim().max(2000).optional().nullable(),
});

/* ---------------- grievance ---------------- */
export const GrievanceInput = z.object({
  category: trimmed(2, 40),
  subject: trimmed(3, 120),
  body: trimmed(10, 4000),
});

/* ---------------- bookings ---------------- */
export const BookingInput = z.object({
  resourceId: cuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  startHour: z.coerce.number().int().min(0).max(23),
  endHour: z.coerce.number().int().min(1).max(24),
  purpose: trimmed(3, 300),
  attendees: z.coerce.number().int().min(1).max(5000).default(1),
}).refine(v => v.endHour > v.startHour, {
  message: "End time must be after start time", path: ["endHour"],
});

