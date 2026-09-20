/* ============================================================
   Course material — the upload rules.

   Pure functions, so the rules that decide what a lecturer may
   put in front of a class are testable without a network, a
   database or a blob store.

   The file-type allowlist is the security boundary. This is a
   channel students trust: a file arriving here carries the
   authority of their lecturer, which is exactly what makes it
   an attractive way to distribute something else. So the list
   is an allowlist of things a person reads, never a denylist of
   things that execute, and both the MIME type and the extension
   have to agree before anything is stored.
   ============================================================ */

export const MAX_BYTES = 25 * 1024 * 1024;   // 25 MB - a scanned unit of notes

/** Readable documents, images and plain data. Nothing executable, ever. */
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
]);

export const ALLOWED_EXT =
  /\.(pdf|jpe?g|png|webp|gif|docx?|xlsx?|pptx?|txt|csv|md)$/i;

export interface MaterialInput {
  title?: string;
  subject?: string;
  semester?: unknown;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Why this upload must be refused, or null when it is fine.
 *
 * Both the declared MIME type and the filename extension must be on the
 * list. Either alone is trivially wrong: a browser will happily report
 * `application/pdf` for a file called `notes.pdf.exe`, and an extension
 * check alone is defeated by a renamed file. Requiring both agreement and
 * membership is what makes the allowlist mean anything.
 */
export function uploadProblem(input: MaterialInput): string | null {
  const title = String(input.title || "").trim();
  if (title.length < 3) return "Give the material a title students will recognise.";
  if (title.length > 160) return "That title is too long.";

  const subject = String(input.subject || "").trim();
  if (!subject) return "Say which subject this belongs to.";

  if (input.semester !== undefined && input.semester !== null && input.semester !== "") {
    const n = Number(input.semester);
    if (!Number.isInteger(n) || n < 1 || n > 12) return "Semester must be a number between 1 and 12.";
  }

  const name = String(input.fileName || "");
  if (!name) return "Choose a file.";
  const size = Number(input.sizeBytes || 0);
  if (size <= 0) return "That file appears to be empty.";
  if (size > MAX_BYTES) return "Files must be 25 MB or smaller.";

  if (!ALLOWED_EXT.test(name)) {
    return "That file type is not accepted. Use PDF, Word, Excel, PowerPoint, an image, or a text file.";
  }
  if (!ALLOWED_MIME.has(String(input.mimeType || ""))) {
    return "That file type is not accepted. Use PDF, Word, Excel, PowerPoint, an image, or a text file.";
  }
  return null;
}

/** A filename safe to put in a storage path. Never trusted from the client. */
export function safeName(name: string): string {
  const cleaned = String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 120);
  return cleaned || "file";
}

/** Storage path. Subject is slugged so a subject name cannot escape the prefix. */
export function blobPath(subject: string, fileName: string): string {
  const slug = String(subject || "general").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "general";
  return "materials/" + slug + "/" + safeName(fileName);
}

export function humanSize(bytes: number): string {
  const b = Number(bytes) || 0;
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

/** Group materials by subject for display, newest first inside each. */
export function bySubject<T extends { subject: string; uploadedAt: string | number | Date }>(
  items: T[],
): { subject: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const m of items) {
    const key = (m.subject || "General").trim() || "General";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries())
    .map(([subject, list]) => ({
      subject,
      items: list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
