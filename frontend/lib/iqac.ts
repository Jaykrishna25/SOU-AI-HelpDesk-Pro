import { NextRequest, NextResponse } from "next/server";
import { put, del, get } from "@vercel/blob";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLiveSession, type Session } from "@/lib/server-auth";
import { can, canSeeVisibility, type Visibility } from "@/lib/policy";
import { audit } from "@/lib/audit";

/* ---------------- upload policy ---------------- */
const MAX_BYTES = 10 * 1024 * 1024;           // 10 MB
const ALLOWED = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword", "application/vnd.ms-excel", "text/csv", "text/plain",
]);
const EXT_OK = /\.(pdf|jpe?g|png|webp|docx?|xlsx?|csv|txt)$/i;

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/iqac\/?/, "").split("/").filter(Boolean);
}
const code = (p: string) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const asDate = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

/** Visibility levels this session is allowed to read. */
function visibleLevels(s: Session): Visibility[] {
  const all: Visibility[] = ["public", "internal", "confidential", "restricted"];
  return all.filter(v => canSeeVisibility(s, v));
}
const DB_VIS: Record<Visibility, string> = {
  public: "PUBLIC", internal: "INTERNAL", confidential: "CONFIDENTIAL", restricted: "RESTRICTED",
};

/** Snapshot written to EvidenceVersion on every change. */
function snapshot(r: any) {
  return JSON.stringify({
    title: r.title, evidenceType: r.evidenceType, urlValue: r.urlValue,
    structuredJson: r.structuredJson, narrative: r.narrative,
    evidenceDate: r.evidenceDate, sourceSystem: r.sourceSystem,
    sourceReference: r.sourceReference, visibility: r.visibility,
    departmentId: r.departmentId, departmentName: r.departmentName,
    metricId: r.metricId, academicYearId: r.academicYearId,
  });
}

async function writeVersion(recordId: string, record: any, by: string, note?: string) {
  const last = await prisma.evidenceVersion.findFirst({
    where: { evidenceRecordId: recordId }, orderBy: { versionNo: "desc" }, select: { versionNo: true },
  });
  await prisma.evidenceVersion.create({
    data: {
      evidenceRecordId: recordId, versionNo: (last?.versionNo || 0) + 1,
      snapshotJson: snapshot(record), changedBy: by, changeNote: note || null,
    },
  });
}

/* ============================== GET ============================== */
export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);
  const q = new URL(req.url).searchParams;

  if (p[0] === "years") {
    const items = await prisma.academicYear.findMany({ orderBy: { code: "desc" } });
    return json({ items });
  }

  if (p[0] === "framework") {
    const yearId = q.get("yearId") || undefined;
    const criteria = await prisma.qualityCriterion.findMany({
      where: { active: true }, orderBy: { sortOrder: "asc" },
      include: {
        indicators: {
          where: { active: true }, orderBy: { sortOrder: "asc" },
          include: {
            metrics: {
              where: { active: true }, orderBy: { sortOrder: "asc" },
              include: {
                _count: { select: { evidence: yearId ? { where: { academicYearId: yearId } } : true } },
                targets: yearId ? { where: { academicYearId: yearId } } : false,
              },
            },
          },
        },
      },
    });
    return json({ criteria });
  }

  if (p[0] === "evidence" && !p[1]) {
    const take = Math.min(100, Math.max(1, Number(q.get("take") || 25)));
    const skip = Math.max(0, Number(q.get("skip") || 0));
    const where: any = { visibility: { in: visibleLevels(s).map(v => DB_VIS[v]) } };
    if (q.get("metricId")) where.metricId = q.get("metricId");
    if (q.get("yearId")) where.academicYearId = q.get("yearId");
    if (q.get("departmentId")) where.departmentId = q.get("departmentId");
    if (q.get("approval")) where.approvalStatus = q.get("approval");
    if (q.get("verification")) where.verificationStatus = q.get("verification");
    if (q.get("owner")) where.ownerUserId = q.get("owner");
    const search = q.get("q");
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { narrative: { contains: search, mode: "insensitive" } },
        { sourceReference: { contains: search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.evidenceRecord.findMany({
        where, orderBy: { updatedAt: "desc" }, take, skip,
        include: {
          metric: { select: { code: true, title: true } },
          academicYear: { select: { code: true } },
          _count: { select: { documents: true, versions: true } },
        },
      }),
      prisma.evidenceRecord.count({ where }),
    ]);
    return json({ items, total, take, skip });
  }

  if (p[0] === "evidence" && p[1] === "file") {
    const docId = q.get("docId") || "";
    const doc = await prisma.evidenceDocument.findUnique({
      where: { id: docId },
      include: { evidenceRecord: { select: { id: true, code: true, visibility: true } } },
    });
    if (!doc) return json({ error: "Document not found" }, 404);

    const level = doc.evidenceRecord.visibility.toLowerCase() as Visibility;
    if (!canSeeVisibility(s, level)) {
      await audit({ action: "VIEW_CONFIDENTIAL", entity: "EvidenceDocument", entityId: doc.id,
        session: s, req, summary: "DENIED download of " + doc.fileName + " (" + level + ")" });
      return json({ error: "Not permitted to view this document" }, 403);
    }
    if (level === "confidential" || level === "restricted") {
      await audit({ action: "VIEW_CONFIDENTIAL", entity: "EvidenceDocument", entityId: doc.id,
        session: s, req, summary: s.loginId + " downloaded " + doc.fileName + " from " + doc.evidenceRecord.code });
    }

    const result = await get(doc.blobPathname, { access: "private" });
    if (result === null) return json({ error: "File missing from storage" }, 404);

    return new NextResponse(result.stream, {
      headers: {
        "Cache-Control": "private, no-cache, no-store",
        "Content-Type": result.blob.contentType || doc.mimeType,
        "Content-Disposition": 'inline; filename="' + doc.fileName.replace(/"/g, "") + '"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (p[0] === "evidence" && p[1] === "one") {
    const rec = await prisma.evidenceRecord.findUnique({
      where: { id: q.get("id") || "" },
      include: {
        metric: { include: { keyIndicator: { include: { criterion: true } } } },
        academicYear: true,
        documents: { orderBy: { uploadedAt: "desc" } },
        versions: { orderBy: { versionNo: "desc" } },
        verifications: { orderBy: { verifiedAt: "desc" } },
        approvals: { orderBy: { decidedAt: "desc" } },
      },
    });
    if (!rec) return json({ error: "Not found" }, 404);
    const level = rec.visibility.toLowerCase() as Visibility;
    if (!canSeeVisibility(s, level)) return json({ error: "Not permitted to view this record" }, 403);
    if (level === "confidential" || level === "restricted") {
      await audit({ action: "VIEW_CONFIDENTIAL", entity: "EvidenceRecord", entityId: rec.id,
        session: s, req, summary: s.loginId + " viewed " + rec.code });
    }
    return json({ record: rec });
  }

  return json({ error: "Not found" }, 404);
}

/* ============================== POST ============================== */
export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const p = seg(req);

  /* ---- file upload (multipart) ---- */
  if (p[0] === "evidence" && p[1] === "upload") {
    if (!can(s, "evidence.upload")) return json({ error: "Not permitted to upload evidence" }, 403);
    const form = await req.formData().catch(() => null);
    if (!form) return json({ error: "Expected multipart form data" }, 400);
    const recordId = String(form.get("recordId") || "");
    const file = form.get("file") as File | null;
    if (!recordId || !file) return json({ error: "recordId and file are required" }, 400);

    const rec = await prisma.evidenceRecord.findUnique({ where: { id: recordId } });
    if (!rec) return json({ error: "Evidence record not found" }, 404);
    if (rec.approvalStatus === "APPROVED" && !can(s, "evidence.approve")) {
      return json({ error: "This record is approved and locked. Ask the IQAC to reopen it." }, 409);
    }
    if (file.size > MAX_BYTES) return json({ error: "File exceeds 10 MB" }, 413);
    if (!ALLOWED.has(file.type) || !EXT_OK.test(file.name)) {
      return json({ error: "File type not allowed. Accepted: PDF, JPG, PNG, WEBP, DOC(X), XLS(X), CSV, TXT" }, 415);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const checksum = crypto.createHash("sha256").update(buf).digest("hex");

    const dup = await prisma.evidenceDocument.findFirst({
      where: { evidenceRecordId: recordId, checksum }, select: { id: true, fileName: true },
    });
    if (dup) return json({ error: "This exact file is already attached as " + dup.fileName, duplicate: true }, 409);

    const last = await prisma.evidenceDocument.findFirst({
      where: { evidenceRecordId: recordId }, orderBy: { versionNo: "desc" }, select: { versionNo: true },
    });
    const versionNo = (last?.versionNo || 0) + 1;
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const pathname = "evidence/" + rec.code + "/v" + versionNo + "-" + safeName;

    let blob;
    try {
      blob = await put(pathname, buf, { access: "private", contentType: file.type, addRandomSuffix: true });
    } catch (e: any) {
      return json({ error: "Upload failed: " + (e?.message || "storage error") }, 502);
    }

    await prisma.evidenceDocument.updateMany({ where: { evidenceRecordId: recordId }, data: { isCurrent: false } });
    const doc = await prisma.evidenceDocument.create({
      data: {
        evidenceRecordId: recordId, fileName: file.name, mimeType: file.type, sizeBytes: file.size,
        blobUrl: blob.url, blobPathname: blob.pathname, checksum, versionNo, isCurrent: true,
        uploadedBy: s.fullName + " (" + s.role + ")",
      },
    });
    await prisma.evidenceRecord.update({
      where: { id: recordId },
      data: { verificationStatus: "UNVERIFIED", approvalStatus: rec.approvalStatus === "APPROVED" ? "RETURNED" : rec.approvalStatus },
    });
    await audit({ action: "CREATE", entity: "EvidenceDocument", entityId: doc.id, session: s, req,
      summary: "Uploaded " + file.name + " v" + versionNo + " to " + rec.code,
      detail: { checksum, sizeBytes: file.size, mimeType: file.type } });
    return json({ document: doc });
  }

  /* ---- create an evidence record ---- */
  if (p[0] === "evidence") {
    if (!can(s, "evidence.upload")) return json({ error: "Not permitted to add evidence" }, 403);
    const b = await req.json().catch(() => ({}));
    const evidenceDate = asDate(b.evidenceDate);
    if (!b.metricId || !b.academicYearId) return json({ error: "Metric and academic year are required" }, 400);
    if (!b.title || String(b.title).trim().length < 3) return json({ error: "A descriptive title is required" }, 400);
    if (!evidenceDate) return json({ error: "A valid evidence date is required" }, 400);
    if (evidenceDate.getTime() > Date.now() + 864e5) return json({ error: "Evidence date cannot be in the future" }, 400);

    const year = await prisma.academicYear.findUnique({ where: { id: String(b.academicYearId) } });
    if (!year) return json({ error: "Academic year not found" }, 404);
    if (year.locked) return json({ error: "Academic year " + year.code + " is locked for submission" }, 409);

    const type = String(b.evidenceType || "FILE").toUpperCase();
    if (type === "URL" && !/^https?:\/\//i.test(String(b.urlValue || ""))) {
      return json({ error: "A valid http(s) URL is required for URL evidence" }, 400);
    }

    const rec = await prisma.evidenceRecord.create({
      data: {
        code: code("EV"),
        metricId: String(b.metricId),
        academicYearId: String(b.academicYearId),
        departmentId: b.departmentId || null,
        departmentName: b.departmentName || null,
        ownerUserId: s.userId,
        ownerName: s.fullName,
        title: String(b.title).slice(0, 240),
        evidenceType: type as any,
        urlValue: b.urlValue ? String(b.urlValue).slice(0, 1000) : null,
        structuredJson: b.structuredJson ? JSON.stringify(b.structuredJson).slice(0, 20000) : null,
        narrative: b.narrative ? String(b.narrative).slice(0, 8000) : null,
        evidenceDate,
        sourceSystem: b.sourceSystem ? String(b.sourceSystem).slice(0, 120) : null,
        sourceReference: b.sourceReference ? String(b.sourceReference).slice(0, 240) : null,
        visibility: (String(b.visibility || "INTERNAL").toUpperCase()) as any,
        expiresAt: asDate(b.expiresAt),
      },
    });
    await writeVersion(rec.id, rec, s.fullName, "Created");
    await audit({ action: "CREATE", entity: "EvidenceRecord", entityId: rec.id, session: s, req,
      summary: "Created evidence " + rec.code + " - " + rec.title });
    return json({ record: rec });
  }

  /* ---- verification ---- */
  if (p[0] === "verify") {
    if (!can(s, "evidence.verify")) return json({ error: "Not permitted to verify evidence" }, 403);
    const b = await req.json().catch(() => ({}));
    const rec = await prisma.evidenceRecord.findUnique({ where: { id: String(b.id || "") } });
    if (!rec) return json({ error: "Evidence record not found" }, 404);
    const result = String(b.result || "VERIFIED").toUpperCase();
    if (!["VERIFIED", "REJECTED", "IN_REVIEW"].includes(result)) return json({ error: "Unknown verification result" }, 400);

    await prisma.evidenceVerification.create({
      data: {
        evidenceRecordId: rec.id, checklistJson: JSON.stringify(b.checklist || {}),
        result: result as any, comments: b.comments ? String(b.comments).slice(0, 2000) : null,
        verifiedBy: s.fullName, verifiedByRole: s.role,
      },
    });
    await prisma.evidenceRecord.update({
      where: { id: rec.id },
      data: { verificationStatus: result as any, lastVerifiedAt: result === "VERIFIED" ? new Date() : null },
    });
    await audit({ action: "VERIFY", entity: "EvidenceRecord", entityId: rec.id, session: s, req,
      summary: rec.code + " marked " + result, detail: { checklist: b.checklist } });
    return json({ ok: true });
  }

  /* ---- approval ---- */
  if (p[0] === "approve") {
    if (!can(s, "evidence.approve")) return json({ error: "Only the IQAC may approve evidence" }, 403);
    const b = await req.json().catch(() => ({}));
    const rec = await prisma.evidenceRecord.findUnique({ where: { id: String(b.id || "") } });
    if (!rec) return json({ error: "Evidence record not found" }, 404);
    const decision = String(b.decision || "").toUpperCase();
    if (!["APPROVED", "REJECTED", "RETURNED"].includes(decision)) return json({ error: "Unknown decision" }, 400);
    if (decision === "APPROVED" && rec.verificationStatus !== "VERIFIED") {
      return json({ error: "Evidence must be verified before it can be approved" }, 409);
    }
    await prisma.evidenceApproval.create({
      data: {
        evidenceRecordId: rec.id, decision: decision as any,
        comments: b.comments ? String(b.comments).slice(0, 2000) : null,
        decidedBy: s.fullName, decidedByRole: s.role,
      },
    });
    await prisma.evidenceRecord.update({ where: { id: rec.id }, data: { approvalStatus: decision as any } });
    await audit({ action: decision === "APPROVED" ? "APPROVE" : "REJECT", entity: "EvidenceRecord",
      entityId: rec.id, session: s, req, summary: rec.code + " " + decision + " by " + s.fullName });
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

/* ============================== PATCH ============================== */
export async function PATCH(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  const b = await req.json().catch(() => ({}));
  const rec = await prisma.evidenceRecord.findUnique({ where: { id: String(b.id || "") } });
  if (!rec) return json({ error: "Evidence record not found" }, 404);

  const mine = rec.ownerUserId === s.userId;
  if (!mine && !can(s, "evidence.verify")) return json({ error: "Not your evidence record" }, 403);
  if (rec.approvalStatus === "APPROVED" && !can(s, "evidence.approve")) {
    return json({ error: "Approved evidence is locked. Ask the IQAC to return it for editing." }, 409);
  }

  const data: any = {};
  if (b.title) data.title = String(b.title).slice(0, 240);
  if (b.narrative !== undefined) data.narrative = b.narrative ? String(b.narrative).slice(0, 8000) : null;
  if (b.urlValue !== undefined) data.urlValue = b.urlValue ? String(b.urlValue).slice(0, 1000) : null;
  if (b.sourceSystem !== undefined) data.sourceSystem = b.sourceSystem || null;
  if (b.sourceReference !== undefined) data.sourceReference = b.sourceReference || null;
  if (b.visibility) data.visibility = String(b.visibility).toUpperCase();
  if (b.evidenceDate) { const d = asDate(b.evidenceDate); if (d) data.evidenceDate = d; }
  if (b.expiresAt !== undefined) data.expiresAt = asDate(b.expiresAt);
  if (b.approvalStatus === "SUBMITTED") data.approvalStatus = "SUBMITTED";

  const updated = await prisma.evidenceRecord.update({ where: { id: rec.id }, data });
  await writeVersion(rec.id, updated, s.fullName, b.changeNote || "Updated");
  await audit({ action: "UPDATE", entity: "EvidenceRecord", entityId: rec.id, session: s, req,
    summary: "Updated " + rec.code, detail: { changed: Object.keys(data) } });
  return json({ record: updated });
}

/* ============================== DELETE ============================== */
export async function DELETE(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "evidence.approve")) return json({ error: "Only the IQAC may delete evidence" }, 403);
  const id = new URL(req.url).searchParams.get("id") || "";
  const rec = await prisma.evidenceRecord.findUnique({ where: { id }, include: { documents: true } });
  if (!rec) return json({ error: "Not found" }, 404);

  for (const d of rec.documents) { try { await del(d.blobPathname); } catch {} }
  await prisma.evidenceRecord.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "EvidenceRecord", entityId: id, session: s, req,
    summary: "Deleted evidence " + rec.code + " and " + rec.documents.length + " document(s)" });
  return json({ ok: true });
}

