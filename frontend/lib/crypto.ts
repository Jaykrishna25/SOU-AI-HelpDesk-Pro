import crypto from "crypto";

/* ============================================================
   Field-level encryption for identity attached to sensitive
   records. AES-256-GCM: confidential and tamper-evident.

   Format: enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>

   If no key is configured we store nothing rather than falling
   back to plaintext. A missing key must never downgrade privacy.
   ============================================================ */

const PREFIX = "enc:v1:";

function key(): Buffer | null {
  const raw = process.env.GRIEVANCE_KEY || "";
  if (!raw) return null;
  const b = Buffer.from(raw, "base64");
  return b.length === 32 ? b : null;
}

export function encryptionAvailable(): boolean {
  return key() !== null;
}

export function encryptField(plain: string): string | null {
  const k = key();
  if (!k || !plain) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return PREFIX + iv.toString("base64") + ":" + c.getAuthTag().toString("base64") + ":" + ct.toString("base64");
}

/** Returns null when the value cannot be read - never throws into a handler. */
export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;      // legacy plaintext row
  const k = key();
  if (!k) return null;
  try {
    const parts = stored.split(":");
    const d = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(parts[2], "base64"));
    d.setAuthTag(Buffer.from(parts[3], "base64"));
    return Buffer.concat([d.update(Buffer.from(parts[4], "base64")), d.final()]).toString("utf8");
  } catch {
    return null;   // wrong key or tampered ciphertext
  }
}

export function isEncrypted(v: string | null | undefined): boolean {
  return !!v && v.startsWith(PREFIX);
}
