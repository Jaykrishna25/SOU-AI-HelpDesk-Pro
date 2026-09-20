import { describe, it, expect } from "vitest";
import {
  uploadProblem, safeName, blobPath, humanSize, bySubject, MAX_BYTES,
} from "@/lib/materials-core";

/* The allowlist is the security boundary of this feature. Material arriving
   here carries the authority of a lecturer, which is precisely what makes the
   channel worth abusing. These tests pin the two properties that matter: both
   the MIME type and the extension must be acceptable, and a subject name can
   never steer where a file is written. */

const ok = {
  title: "Unit 3 notes", subject: "DBMS", semester: "5",
  fileName: "unit3.pdf", mimeType: "application/pdf", sizeBytes: 1000,
};

describe("what may be uploaded", () => {
  it("accepts an ordinary set of notes", () => {
    expect(uploadProblem(ok)).toBeNull();
  });

  it("requires a title a student would recognise", () => {
    expect(uploadProblem({ ...ok, title: "" })).toMatch(/title/i);
    expect(uploadProblem({ ...ok, title: "a" })).toMatch(/title/i);
  });

  it("requires a subject", () => {
    expect(uploadProblem({ ...ok, subject: "   " })).toMatch(/subject/i);
  });

  it("rejects an executable however it is dressed up", () => {
    // The extension is on the list but the real type is not.
    expect(uploadProblem({ ...ok, fileName: "notes.pdf", mimeType: "application/x-msdownload" }))
      .toMatch(/not accepted/i);
    // The type claims PDF but the extension does not.
    expect(uploadProblem({ ...ok, fileName: "notes.pdf.exe", mimeType: "application/pdf" }))
      .toMatch(/not accepted/i);
    // Neither is acceptable.
    expect(uploadProblem({ ...ok, fileName: "run.sh", mimeType: "text/x-shellscript" }))
      .toMatch(/not accepted/i);
  });

  it("rejects html, which would otherwise be served from the portal's own origin", () => {
    expect(uploadProblem({ ...ok, fileName: "page.html", mimeType: "text/html" }))
      .toMatch(/not accepted/i);
  });

  it("holds the size limit", () => {
    expect(uploadProblem({ ...ok, sizeBytes: MAX_BYTES })).toBeNull();
    expect(uploadProblem({ ...ok, sizeBytes: MAX_BYTES + 1 })).toMatch(/25 MB/);
    expect(uploadProblem({ ...ok, sizeBytes: 0 })).toMatch(/empty/i);
  });

  it("validates the semester only when one is given", () => {
    expect(uploadProblem({ ...ok, semester: "" })).toBeNull();
    expect(uploadProblem({ ...ok, semester: undefined })).toBeNull();
    expect(uploadProblem({ ...ok, semester: "0" })).toMatch(/between 1 and 12/);
    expect(uploadProblem({ ...ok, semester: "13" })).toMatch(/between 1 and 12/);
    expect(uploadProblem({ ...ok, semester: "abc" })).toMatch(/between 1 and 12/);
  });
});

describe("storage paths cannot be steered", () => {
  it("strips traversal out of a filename", () => {
    expect(safeName("../../etc/passwd")).not.toContain("..");
    expect(safeName("../../etc/passwd")).not.toContain("/");
  });

  it("strips traversal out of a subject", () => {
    // The subject is typed by a lecturer, so it is untrusted input that
    // reaches a storage path. It must not be able to leave the prefix.
    const p = blobPath("../../secrets", "notes.pdf");
    expect(p.startsWith("materials/")).toBe(true);
    expect(p).not.toContain("..");
  });

  it("always lands under materials/", () => {
    expect(blobPath("", "x.pdf").startsWith("materials/")).toBe(true);
    expect(blobPath("Data Structures & Algorithms", "x.pdf"))
      .toBe("materials/data-structures-algorithms/x.pdf");
  });

  it("never produces an empty name", () => {
    expect(safeName("")).toBe("file");
    expect(safeName("...")).toBe("file");
  });
});

describe("display helpers", () => {
  it("reads sizes the way a person would say them", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 KB");
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("groups by subject, newest first inside each", () => {
    const groups = bySubject([
      { subject: "DBMS", uploadedAt: 100 },
      { subject: "OS", uploadedAt: 200 },
      { subject: "DBMS", uploadedAt: 300 },
    ]);
    expect(groups.map(g => g.subject)).toEqual(["DBMS", "OS"]);
    expect(groups[0].items.map(i => i.uploadedAt)).toEqual([300, 100]);
  });

  it("does not lose material with a blank subject", () => {
    const groups = bySubject([{ subject: "", uploadedAt: 1 }]);
    expect(groups[0].subject).toBe("General");
  });
});
