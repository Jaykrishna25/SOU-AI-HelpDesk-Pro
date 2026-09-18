/**
 * Account inspector / recovery tool.
 *   node scripts/account.js OWN001            show the account
 *   node scripts/account.js OWN001 --reset    clear password and unlock
 *   node scripts/account.js --list            list all login IDs
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith("--"));
const reset = args.includes("--reset");
const list = args.includes("--list");

const SELECT = {
  loginId: true, fullName: true, role: true, birthdate: true, passwordHash: true,
  mustChangePassword: true, failedLogins: true, lockedUntil: true, isActive: true,
};

async function main() {
  if (list) {
    const all = await db.user.findMany({ select: { loginId: true, fullName: true, role: true }, orderBy: { loginId: "asc" } });
    all.forEach(u => console.log(u.loginId.padEnd(16), u.role.padEnd(12), u.fullName));
    console.log("\n" + all.length + " accounts");
    return;
  }
  if (!id) { console.log("Usage: node scripts/account.js <LOGIN_ID> [--reset]  |  --list"); return; }

  if (reset) {
    await db.user.update({
      where: { loginId: id },
      data: {
        passwordHash: null, mustChangePassword: true, failedLogins: 0, lockedUntil: null,
        // Match the admin endpoint: a reset must kill every existing session,
        // otherwise an old token outlives the password it was issued against.
        tokenVersion: { increment: 1 },
      },
    });
    console.log(id + " reset. Sign in with date of birth once, then choose a password.");
    console.log("All existing sessions for this account have been revoked.");
  }

  const u = await db.user.findUnique({ where: { loginId: id }, select: SELECT });
  if (!u) return console.log("NO SUCH USER: " + id);
  console.log({
    ...u,
    birthdate: u.birthdate ? u.birthdate.toISOString().slice(0, 10) : null,
    passwordHash: u.passwordHash ? "SET" : "none",
    lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
  });
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
