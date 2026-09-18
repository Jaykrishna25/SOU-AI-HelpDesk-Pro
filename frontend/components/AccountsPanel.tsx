"use client";
import { useState } from "react";
import { Search, KeyRound, Unlock, Loader2, AlertTriangle, CheckCircle2, ShieldOff } from "lucide-react";

/* Admin account recovery.

   Recovery is admin-mediated because it requires verifying who the person is,
   and a reset account is protected only by a date of birth until the new
   password is chosen. The warning copy on this screen is part of the control,
   not decoration. */

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });
const AUTH = () => ({ Authorization: "Bearer " + tok() });

export default function AccountsPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<any>(null);
  const [confirming, setConfirming] = useState<string>("");

  async function search() {
    setErr(""); setDone(null); setHint(""); setBusy("search");
    try {
      const r = await fetch("/api/admin/users?q=" + encodeURIComponent(q), { headers: AUTH() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Search failed");
      setItems(d.items || []); setHint(d.hint || "");
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  async function act(path: string, loginId: string) {
    setErr(""); setDone(null); setBusy(loginId);
    try {
      const r = await fetch("/api/admin/" + path, {
        method: "POST", headers: H(), body: JSON.stringify({ loginId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "That action was refused");
      setDone(d); setConfirming("");
      await search();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusy(""); }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <KeyRound size={20} className="opacity-70" /> Account recovery
      </h1>
      <p className="opacity-55 text-sm mt-1 max-w-2xl">
        Clear a forgotten password or a login lockout. A cleared account signs in with its
        date of birth and must choose a new password immediately.
      </p>

      <div className="mt-4 px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <span>
          Verify who you are speaking to before resetting anything. Between the reset and the
          new password, that account is protected only by a date of birth. Every reset is
          written to the audit trail with your name against it.
        </span>
      </div>

      <div className="flex gap-2 mt-6">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder="Search by name or login ID (at least two characters)"
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/15 outline-none focus:border-white/35 text-sm"
        />
        <button onClick={search} disabled={!!busy || q.trim().length < 2}
          className="px-4 rounded-xl border border-white/15 hover:border-white/30 disabled:opacity-40">
          {busy === "search" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>

      {err && <div className="mt-4 px-4 py-3 rounded-lg text-sm border border-rose-500/40 bg-rose-500/10">{err}</div>}
      {hint && <p className="text-sm opacity-50 mt-4">{hint}</p>}

      {done && (
        <div className="mt-4 px-4 py-3 rounded-lg text-sm border border-emerald-500/40 bg-emerald-500/10">
          <div className="flex items-center gap-2 font-medium"><CheckCircle2 size={15} /> Done for {done.loginId}</div>
          {done.instruction && <p className="mt-1.5 opacity-80">{done.instruction}</p>}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {items.map(u => (
          <div key={u.id} className="panel-solid rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  {u.fullName}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">{u.loginId}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 opacity-70">{u.role}</span>
                  {!u.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-500/40 text-rose-300">inactive</span>}
                  {u.locked && <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-300">locked</span>}
                </div>
                <div className="text-xs opacity-50 mt-1.5">
                  {u.hasPassword ? "Password set" : "No password - signs in with date of birth"}
                  {u.failedLogins ? " - " + u.failedLogins + " failed attempt(s)" : ""}
                  {u.lastLoginAt ? " - last seen " + new Date(u.lastLoginAt).toLocaleDateString("en-IN") : " - never signed in"}
                </div>
              </div>

              <div className="flex gap-2">
                {u.locked && u.canReset && (
                  <button onClick={() => act("unlock", u.loginId)} disabled={!!busy}
                    className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5 disabled:opacity-40">
                    <Unlock size={13} /> Unlock
                  </button>
                )}

                {!u.canReset ? (
                  <span className="text-[11px] opacity-40 flex items-center gap-1 px-2">
                    <ShieldOff size={12} /> outranks you
                  </span>
                ) : confirming === u.loginId ? (
                  <>
                    <button onClick={() => act("reset-password", u.loginId)} disabled={!!busy}
                      className="text-xs px-3 py-2 rounded-lg border border-rose-500/50 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40">
                      {busy === u.loginId ? "Resetting..." : "Confirm reset"}
                    </button>
                    <button onClick={() => setConfirming("")} disabled={!!busy}
                      className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirming(u.loginId)} disabled={!!busy || !u.hasPassword}
                    title={u.hasPassword ? "" : "This account has no password to clear"}
                    className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:border-white/30 flex items-center gap-1.5 disabled:opacity-30">
                    <KeyRound size={13} /> Reset password
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs opacity-40 mt-8 border-t border-white/10 pt-5">
        You can only act on accounts below your own level, so an administrator cannot reset a
        principal or owner and then sign in as them. Denied attempts are audited too.
      </p>
    </div>
  );
}
