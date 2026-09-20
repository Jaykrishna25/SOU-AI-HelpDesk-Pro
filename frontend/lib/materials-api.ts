import { NextRequest, NextResponse } from "next/server";
import { put, del, get } from "@vercel/blob";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getLiveSession } from "@/lib/server-auth";
import { can } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { uploadProblem, blobPath, MAX_BYTES } from "@/lib/materials-core";

/* ============================================================
   Course material endpoints.

   Faculty publish, students read. The blob is private and is
   streamed back through this route rather than linked directly,
   for the reason set out on the Prisma model: a public blob URL
   outlives the student, the term and the portal's own access
   rules.

   Withdrawal is a flag, not a delete. A lecturer who pulls a
   file usually means "stop showing this", not "erase the record
   that I ever asked the class to read it". Actual deletion,
   including from blob storage, is a separate explicit action
   and only the uploader or an administrator may do it.
   ============================================================ */

function json(d: any, s = 200) { return NextResponse.json(d, { status: s }); }
function seg(req: NextRequest) {
  return new URL(req.url).pathname.replace(/^\/api\/materials\/?/, "").split("/").filter(Boolean);
}

export async function GET(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "material.view")) return json({ error: "Not permitted" }, 403);

  const p = seg(req);
  const q = new URL(req.url).searchParams;

  /* ---- stream one file ---- */
  if (p[0] === "file") {
    const id = q.get("id") || "";
    const m = await prisma.courseMaterial.findUnique({ where: { id } });
    if (!m) return json({ error: "Not found" }, 404);

    /* A withdrawn file stays readable to the person who uploaded it and to
       staff who can publish, so a lecturer can check what they pulled. It is
       not served to students. */
    if (!m.visible && !(m.uploadedById === s.userId || can(s, "material.share"))) {
      return json({ error: "This material has been withdrawn." }, 404);
    }

    const result = await get(m.blobPathname, { access: "private" });
    if (result === null) return json({ error: "File missing from storage" }, 404);

    return new NextResponse(result.stream, {
      headers: {
        "Cache-Control": "private, no-cache, no-store",
        "Content-Type": result.blob.contentType || m.mimeType,
        "Content-Disposition": 'inline; filename="' + m.fileName.replace(/"/g, "") + '"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  /* ---- list ---- */
  const mine = q.get("mine") === "1";
  const where: any = mine ? { uploadedById: s.userId } : { visible: true };
  if (q.get("subject")) where.subject = q.get("subject");

  const materials = await prisma.courseMaterial.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    take: 200,
    select: {
      id: true, title: true, description: true, subject: true, semester: true,
      fileName: true, mimeType: true, sizeBytes: true, uploadedBy: true,
      uploadedById: true, uploadedAt: true, visible: true,
    },
  });

  return json({
    materials,
    canShare: can(s, "material.share"),
    /* So the panel can show "yours" without a second request. */
    me: s.userId,
  });
}

export async function POST(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);
  if (!can(s, "material.share")) {
    return json({ error: "Only faculty and above can share course material." }, 403);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: "Expected a file upload." }, 400);

  const file = form.get("file") as File | null;
  const title = String(form.get("title") || "");
  const subject = String(form.get("subject") || "");
  const description = String(form.get("description") || "").slice(0, 600);
  const semesterRaw = String(form.get("semester") || "");

  if (!file) return json({ error: "Choose a file." }, 400);

  /* Checked before anything is read or hashed. Without this the failure
     surfaces as a generic "Upload failed: No token found", which reads like
     a bug in the portal rather than a deployment that has not been given a
     blob store. A lecturer cannot act on the first message; they can act on
     this one by forwarding it to whoever manages the deployment. */
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json({
      error: "File storage is not configured on this deployment, so nothing was saved. "
           + "BLOB_READ_WRITE_TOKEN is missing - the same store IQAC evidence uses. "
           + "Ask whoever manages the deployment to add it.",
      notConfigured: true,
    }, 503);
  }

  /* The same rule object the form uses, so the message a lecturer sees when
     the client catches it and when the server catches it are identical. */
  const problem = uploadProblem({
    title, subject, semester: semesterRaw,
    fileName: file.name, mimeType: file.type, sizeBytes: file.size,
  });
  if (problem) return json({ error: problem }, 415);
  if (file.size > MAX_BYTES) return json({ error: "Files must be 25 MB or smaller." }, 413);

  const buf = Buffer.from(await file.arrayBuffer());
  const checksum = crypto.createHash("sha256").update(buf).digest("hex");

  /* The same file uploaded twice to the same subject is almost always a
     double-click, not two pieces of material. */
  const dup = await prisma.courseMaterial.findFirst({
    where: { checksum, subject: subject.trim(), visible: true },
    select: { id: true, title: true },
  });
  if (dup) return json({ error: 'That exact file is already shared as "' + dup.title + '".', duplicate: true }, 409);

  let blob;
  try {
    blob = await put(blobPath(subject, file.name), buf, {
      access: "private", contentType: file.type, addRandomSuffix: true,
    });
  } catch (e: any) {
    return json({ error: "Upload failed: " + (e?.message || "storage error") }, 502);
  }

  const material = await prisma.courseMaterial.create({
    data: {
      title: title.trim(), description: description.trim() || null, subject: subject.trim(),
      semester: semesterRaw ? Number(semesterRaw) : null,
      fileName: file.name, mimeType: file.type, sizeBytes: file.size,
      blobUrl: blob.url, blobPathname: blob.pathname, checksum,
      uploadedById: s.userId, uploadedBy: s.fullName + " (" + s.role + ")",
    },
  });

  await audit({
    action: "CREATE", entity: "CourseMaterial", entityId: material.id, session: s, req,
    summary: s.fullName + " shared " + file.name + " with " + subject.trim(),
    detail: { checksum, sizeBytes: file.size, mimeType: file.type },
  });

  return json({ material });
}

export async function PATCH(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const b = await req.json().catch(() => ({} as any));
  const m = await prisma.courseMaterial.findUnique({ where: { id: String(b?.id || "") } });
  if (!m) return json({ error: "Not found" }, 404);

  /* Your own material, or an administrator's. A lecturer cannot withdraw a
     colleague's file - that is a conversation, not a button. */
  const isOwner = m.uploadedById === s.userId;
  if (!isOwner && !can(s, "user.manage")) return json({ error: "Not permitted" }, 403);

  const updated = await prisma.courseMaterial.update({
    where: { id: m.id }, data: { visible: Boolean(b?.visible) },
  });
  await audit({
    action: "UPDATE", entity: "CourseMaterial", entityId: m.id, session: s, req,
    summary: s.fullName + (updated.visible ? " restored " : " withdrew ") + m.fileName,
  });
  return json({ material: updated });
}

export async function DELETE(req: NextRequest) {
  const s = await getLiveSession(req);
  if (!s) return json({ error: "Unauthenticated" }, 401);

  const id = new URL(req.url).searchParams.get("id") || "";
  const m = await prisma.courseMaterial.findUnique({ where: { id } });
  if (!m) return json({ error: "Not found" }, 404);

  const isOwner = m.uploadedById === s.userId;
  if (!isOwner && !can(s, "user.manage")) return json({ error: "Not permitted" }, 403);

  /* Blob first. If the row went first and this failed, the file would be
     orphaned in storage with nothing left pointing at it to clean up. */
  try { await del(m.blobPathname); } catch { /* already gone is fine */ }
  await prisma.courseMaterial.delete({ where: { id: m.id } });

  await audit({
    action: "DELETE", entity: "CourseMaterial", entityId: m.id, session: s, req,
    summary: s.fullName + " deleted " + m.fileName + " from " + m.subject,
  });
  return json({ deleted: true });
}
