"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

const ROLE_PATH: Record<string, string> = {
  STUDENT: "/student/dashboard", ADMIN: "/admin/dashboard", FACULTY: "/faculty/dashboard",
  HOD: "/hod/dashboard", HOI: "/hod/dashboard", OWNER: "/owner/dashboard", SUPER_ADMIN: "/owner/dashboard",
};
const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };

export default function SetPassword() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (next !== confirm) return setErr("The two passwords do not match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok() },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setErr(data.error || "Could not set the password."); return; }
      sessionStorage.setItem("sou_token", data.token);
      try { localStorage.setItem("sou_token", data.token); } catch {}
      let role = "STUDENT";
      try {
        role = JSON.parse(atob(data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role;
      } catch {}
      router.push(ROLE_PATH[role] || "/student/dashboard");
    } catch {
      setErr("Could not reach the server.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="panel-solid rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-1"><ShieldCheck size={18} />
          <h1 className="text-xl font-semibold gradient-text">Choose a password</h1></div>
        <p className="text-sm opacity-65 mb-6">
          Your date of birth is no longer accepted as a password. Set one now to secure your account.
        </p>

        <label className="text-xs opacity-70 block mb-3">Current password (leave blank if you have never set one)
          <input type="password" value={current} autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70 block mb-3">New password
          <input type="password" value={next} autoComplete="new-password" required
            onChange={(e) => setNext(e.target.value)}
            className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
        </label>
        <label className="text-xs opacity-70 block">Confirm new password
          <input type="password" value={confirm} autoComplete="new-password" required
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full mt-1 bg-black/30 border border-white/15 rounded px-3 py-2 text-sm" />
        </label>

        <ul className="text-[11px] opacity-55 mt-3 space-y-0.5">
          <li>At least 10 characters</li>
          <li>One uppercase letter, one lowercase letter and one number</li>
          <li>Must not contain your login ID, and must not be a date</li>
        </ul>

        {err && <div className="mt-4 px-3 py-2 rounded text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}

        <button disabled={busy}
          className="w-full mt-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm">
          {busy ? "Saving..." : "Set password"}
        </button>
      </form>
    </main>
  );
}
