const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const db = new PrismaClient();
const PREFIX = "enc:v1:";

function key() {
  const raw = process.env.GRIEVANCE_KEY || "";
  if (!raw) return null;
  const b = Buffer.from(raw, "base64");
  return b.length === 32 ? b : null;
}
function encryptField(plain) {
  const k = key();
  if (!k || !plain) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return PREFIX + iv.toString("base64") + ":" + c.getAuthTag().toString("base64") + ":" + ct.toString("base64");
}

async function main() {
  if (!key()) { console.log("GRIEVANCE_KEY missing or not 32 bytes. Nothing changed."); return; }
  const rows = await db.grievance.findMany({ select: { id: true, identityRef: true } });
  let done = 0, skipped = 0;
  for (const r of rows) {
    if (!r.identityRef || r.identityRef.startsWith(PREFIX)) { skipped++; continue; }
    await db.grievance.update({ where: { id: r.id }, data: { identityRef: encryptField(r.identityRef) } });
    done++;
  }
  console.log("Encrypted " + done + " row(s); " + skipped + " skipped.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
