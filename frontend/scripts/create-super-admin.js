/**
 * Create the platform operator account (SUPER_ADMIN).
 *
 *   node scripts/create-super-admin.js SUPER001 "Full Name" 1995-04-17 [email]
 *
 * The account is created with NO password, exactly like every other account in
 * this system. It signs in once with its date of birth and then chooses its own
 * password. This script never sets, generates or prints a password - nobody,
 * including whoever runs this, ever learns it.
 *
 * SUPER_ADMIN outranks OWNER, so it is the only role that can recover an owner
 * account through the interface. Create one, and exactly one, and treat its
 * credentials as you would the database password.
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const [loginId, fullName, birthdate, email] = process.argv.slice(2);

function usage(msg) {
  if (msg) console.error("\n" + msg);
  console.error(`
Usage:
  node scripts/create-super-admin.js <LOGIN_ID> "<Full Name>" <YYYY-MM-DD> [email]

Example:
  node scripts/create-super-admin.js SUPER001 "Platform Operator" 1995-04-17
`);
  process.exit(1);
}

async function main() {
  if (!loginId || !fullName || !birthdate) usage("All of login ID, full name and date of birth are required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) usage("Date of birth must be YYYY-MM-DD, e.g. 1995-04-17");

  const dob = new Date(birthdate + "T00:00:00Z");
  if (isNaN(dob.getTime())) usage("That date is not valid.");

  const existing = await db.user.findUnique({
    where: { loginId },
    select: { loginId: true, role: true, fullName: true },
  });
  if (existing) {
    console.error("\nRefusing to overwrite an existing account:");
    console.error("  " + existing.loginId + "  " + existing.role + "  " + existing.fullName);
    console.error("\nPick a different login ID, or use scripts/account.js to inspect or reset that account.\n");
    process.exit(1);
  }

  const already = await db.user.count({ where: { role: "SUPER_ADMIN" } });
  if (already > 0) {
    console.warn("\nWARNING: " + already + " SUPER_ADMIN account(s) already exist.");
    console.warn("More than one operator account widens the blast radius. Continuing anyway.\n");
  }

  const user = await db.user.create({
    data: {
      loginId,
      fullName,
      role: "SUPER_ADMIN",
      birthdate: dob,
      email: email || null,
      passwordHash: null,          // first sign-in uses the date of birth
      mustChangePassword: true,    // and a password must be chosen straight after
      isActive: true,
    },
    select: { id: true, loginId: true, fullName: true, role: true },
  });

  console.log("\nCreated:");
  console.log("  Login ID : " + user.loginId);
  console.log("  Name     : " + user.fullName);
  console.log("  Role     : " + user.role);
  console.log("\nNext steps:");
  console.log("  1. Sign in with this login ID, leaving the password field blank.");
  console.log("  2. Enter " + birthdate + " as the date of birth.");
  console.log("  3. Choose a password immediately - the account is protected only");
  console.log("     by that date of birth until you do.");
  console.log("\nThis account can reset any other account, including owners.");
  console.log("It cannot read anyone's password. Nothing can - they are one-way hashes.\n");
}

main()
  .catch(e => { console.error("Failed:", e.message); process.exit(1); })
  .finally(() => db.$disconnect());
