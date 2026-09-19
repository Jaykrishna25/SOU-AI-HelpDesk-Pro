"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { Fingerprint, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";

const tok = () => { try { return sessionStorage.getItem("sou_token") || localStorage.getItem("sou_token") || ""; } catch { return ""; } };
const H = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + tok() });

export default function Passkeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: string; t: string } | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    platformAuthenticatorIsAvailable().then(setPlatform).catch(() => setPlatform(false));
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/webauthn", { headers: H() });
    if (r.ok) setKeys((await r.json()).passkeys || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function register() {
    setBusy(true); setMsg(null);
    try {
      const o = await fetch("/api/webauthn/register/options", { method: "POST", headers: H(), body: "{}" });
      const od = await o.json();
      if (!o.ok) throw new Error(od.error || "Could not start registration");

      // The browser prompts for fingerprint, face or device PIN here.
      const response = await startRegistration({ optionsJSON: od.options });

      const v = await fetch("/api/webauthn/register/verify", {
        method: "POST", headers: H(),
        body: JSON.stringify({ response, label: label.trim() || defaultLabel() }),
      });
      const vd = await v.json();
      if (!v.ok) throw new Error(vd.error || "Could not register this device");
      setMsg({ k: "ok", t: "This device is registered. You can now sign in with it." });
      setLabel("");
      load();
    } catch (e: any) {
      const m = String(e?.message || e);
      setMsg({
        k: "err",
        t: m.includes("NotAllowed") || m.includes("cancel")
          ? "Registration was cancelled or timed out. Try again and complete the prompt."
          : m,
      });
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    await fetch("/api/webauthn?id=" + id, { method: "DELETE", headers: H() });
    load();
  }

  function defaultLabel() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "Windows Hello on this PC";
    if (/Android/i.test(ua)) return "Android fingerprint";
    if (/iPhone|iPad|Mac/i.test(ua)) return "Touch ID or Face ID";
    return "This device";
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold gradient-text flex items-center gap-2">
          <Fingerprint size={22} /> Face and fingerprint sign-in
        </h1>
        <p className="text-sm opacity-65 mt-2 leading-relaxed">
          Register this device to sign in with your fingerprint, face or device PIN instead of
          typing a password. Your fingerprint and face never leave the device - the portal only
          stores a public key. Your password continues to work as before.
        </p>

        {msg && (
          <div className={"mt-5 px-4 py-3 rounded-lg text-sm border " +
            (msg.k === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10")}>
            {msg.t}
          </div>
        )}

        {supported === false && (
          <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            This browser does not support passkeys. Use Chrome, Edge or Safari on a device with a
            fingerprint reader, face unlock or a device PIN. You can still sign in with your password.
          </div>
        )}

        {supported && !platform && (
          <div className="mt-5 px-4 py-3 rounded-lg text-sm border border-amber-500/40 bg-amber-500/10 flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            No built-in biometric sensor was detected on this device. You can still register a
            security key, or use a phone as an authenticator.
          </div>
        )}

        {supported && (
          <div className="panel-solid rounded-xl p-5 mt-5">
            <label className="text-xs opacity-70 block">Name this device (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder={defaultLabel()}
                className="w-full mt-1 bg-black/30 border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </label>
            <button onClick={register} disabled={busy}
              className="mt-4 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm flex items-center gap-2">
              <Fingerprint size={16} /> {busy ? "Waiting for your device..." : "Register this device"}
            </button>
          </div>
        )}

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider opacity-55 mb-2">Registered devices</div>
          {keys.length === 0 && <div className="text-sm opacity-50">None yet.</div>}
          {keys.map((k) => (
            <div key={k.id} className="panel-solid rounded-xl p-4 mb-2 flex justify-between items-center gap-3 flex-wrap">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" /> {k.label}
                </div>
                <div className="text-xs opacity-55 mt-0.5">
                  Added {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? " - last used " + new Date(k.lastUsedAt).toLocaleDateString() : " - never used"}
                  {k.backedUp ? " - synced across your devices" : " - this device only"}
                </div>
              </div>
              <button onClick={() => remove(k.id)}
                className="px-3 py-1.5 rounded text-xs border border-[var(--border)] hover:border-rose-500/50 flex items-center gap-1">
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[11px] opacity-45 leading-relaxed">
          A passkey is tied to this website and this device. Registering on a phone does not register
          your laptop. If you lose the device, remove it here and sign in with your password.
        </div>

        <Link href="/login" className="inline-block mt-6 text-sm underline opacity-70 hover:opacity-100">
          Back
        </Link>
      </div>
    </main>
  );
}
