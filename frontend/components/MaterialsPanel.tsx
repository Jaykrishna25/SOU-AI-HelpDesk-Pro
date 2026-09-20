"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, FileText, Download, EyeOff, Eye, Trash2, Loader2, AlertTriangle, FolderOpen,
} from "lucide-react";
import { uploadProblem, humanSize, bySubject, MAX_BYTES } from "@/lib/materials-core";

/* ============================================================
   Course material, shared by faculty with their students.

   One component for both sides. The server decides what each
   role may do and says so in `canShare`; the UI reads that
   rather than checking the role itself, so there is one place
   the rule lives and the panel cannot drift from the endpoint.

   Files are streamed through /api/materials/file rather than
   linked at their storage URL - see lib/materials-api.ts for
   why. That means a download carries the session, which is the
   point, and also that it cannot be right-click-copied into a
   link that works for anybody.
   ============================================================ */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

interface Material {
  id: string; title: string; description: string | null; subject: string;
  semester: number | null; fileName: string; mimeType: string; sizeBytes: number;
  uploadedBy: string; uploadedById: string; uploadedAt: string; visible: boolean;
}

export default function MaterialsPanel({ mode = "view" }: { mode?: "view" | "manage" }) {
  const [items, setItems] = useState<Material[]>([]);
  const [canShare, setCanShare] = useState(false);
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({ title: "", subject: "", semester: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/materials/list" + (mode === "manage" ? "?mine=1" : ""),
        { headers: { Authorization: "Bearer " + tok() } });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not load material."); return; }
      setItems(d.materials || []);
      setCanShare(!!d.canShare);
      setMe(d.me || "");
      setErr("");
    } catch {
      setErr("Could not reach the server.");
    } finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  /* Validated with the same function the server uses, so a lecturer is not
     told one thing by the form and another by the response. */
  const problem = file
    ? uploadProblem({ ...form, fileName: file.name, mimeType: file.type, sizeBytes: file.size })
    : null;

  async function upload() {
    if (!file) return;
    setBusy(true); setNote("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title);
    fd.append("subject", form.subject);
    fd.append("semester", form.semester);
    fd.append("description", form.description);
    try {
      const r = await fetch("/api/materials/upload", {
        method: "POST", headers: { Authorization: "Bearer " + tok() }, body: fd,
      });
      const d = await r.json();
      if (!r.ok) { setNote(d.error || "Upload failed."); return; }
      setForm({ title: "", subject: form.subject, semester: form.semester, description: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setNote("Shared. Students in " + form.subject + " can see it now.");
      load();
    } catch {
      setNote("Could not reach the server.");
    } finally { setBusy(false); }
  }

  async function setVisible(m: Material, visible: boolean) {
    await fetch("/api/materials/one", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() },
      body: JSON.stringify({ id: m.id, visible }),
    });
    load();
  }

  async function remove(m: Material) {
    /* Deliberately not a confirm() dialog: those are blocked in some embedded
       contexts and the action is already limited to your own files. The
       withdraw button beside it is the reversible option. */
    await fetch("/api/materials/one?id=" + encodeURIComponent(m.id), {
      method: "DELETE", headers: { Authorization: "Bearer " + tok() },
    });
    load();
  }

  const groups = bySubject(items);

  return (
    <div className="space-y-5">
      {canShare && mode === "manage" && (
        <div className="panel-solid rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload size={15} className="text-brand-light" />
            <h3 className="text-sm font-semibold">Share material with your students</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Title (e.g. Unit 3 - Normalisation)"
              className="glass px-3 py-2 bg-transparent outline-none text-sm" />
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject (e.g. DBMS)"
              className="glass px-3 py-2 bg-transparent outline-none text-sm" />
            <input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
              placeholder="Semester (optional)" inputMode="numeric"
              className="glass px-3 py-2 bg-transparent outline-none text-sm" />
            <input ref={fileRef} type="file"
              onChange={e => { setFile(e.target.files?.[0] || null); setNote(""); }}
              className="glass px-3 py-2 bg-transparent outline-none text-sm file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-brand file:text-white file:text-xs" />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="A line about what this is and when they need it (optional)"
            className="w-full mt-2 glass px-3 py-2 bg-transparent outline-none text-sm h-16" />

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button onClick={upload} disabled={busy || !file || !!problem}
              title={problem || undefined}
              className="px-4 py-2 rounded-full bg-brand text-white text-sm font-medium flex items-center gap-2 disabled:opacity-40 hover:bg-brand-light transition">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {busy ? "Uploading..." : "Share"}
            </button>
            <span className="text-[11px] text-[var(--muted)]">
              PDF, Word, Excel, PowerPoint, images or text. Up to {humanSize(MAX_BYTES)}.
            </span>
          </div>

          {problem && file && (
            <p className="text-[11px] text-amber-300 mt-2 flex items-start gap-1">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {problem}
            </p>
          )}
          {note && <p className="text-[11px] text-[var(--muted)] mt-2">{note}</p>}
        </div>
      )}

      {loading && (
        <p className="text-sm text-[var(--muted)] flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading material...
        </p>
      )}
      {err && <div className="px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

      {!loading && !groups.length && (
        <div className="panel-solid rounded-xl p-8 text-center">
          <FolderOpen className="mx-auto text-[var(--muted)] mb-2" size={26} />
          <p className="text-sm text-[var(--muted)]">
            {mode === "manage" ? "You have not shared anything yet." : "No course material has been shared yet."}
          </p>
        </div>
      )}

      {groups.map(g => (
        <div key={g.subject}>
          <h3 className="text-sm font-semibold mb-2">{g.subject}</h3>
          <div className="space-y-2">
            {g.items.map(m => (
              <div key={m.id}
                className={"panel-solid rounded-xl p-3 flex items-start gap-3 " + (m.visible ? "" : "opacity-60")}>
                <FileText size={16} className="text-brand-light mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {m.title}
                    {!m.visible && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400/50 text-amber-200">
                        withdrawn
                      </span>
                    )}
                  </div>
                  {m.description && <p className="text-xs text-[var(--muted)] mt-0.5">{m.description}</p>}
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    {m.fileName} · {humanSize(m.sizeBytes)} · {m.uploadedBy}
                    {m.semester ? " · Sem " + m.semester : ""} ·{" "}
                    {new Date(m.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a href={"/api/materials/file?id=" + encodeURIComponent(m.id)}
                    target="_blank" rel="noreferrer noopener" title="Open"
                    className="p-2 rounded-lg border border-[var(--border)] hover:border-brand transition">
                    <Download size={13} />
                  </a>
                  {(canShare && m.uploadedById === me) && (
                    <>
                      <button onClick={() => setVisible(m, !m.visible)}
                        title={m.visible ? "Withdraw from students" : "Show to students again"}
                        className="p-2 rounded-lg border border-[var(--border)] hover:border-brand transition">
                        {m.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => remove(m)} title="Delete permanently"
                        className="p-2 rounded-lg border border-[var(--border)] hover:border-rose-400 hover:text-rose-300 transition">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {mode === "manage" && (
        <p className="text-[11px] text-[var(--muted)]">
          Withdrawing hides material from students but keeps the record, so what a class was
          asked to read stays answerable. Delete removes the file from storage for good.
        </p>
      )}
    </div>
  );
}
