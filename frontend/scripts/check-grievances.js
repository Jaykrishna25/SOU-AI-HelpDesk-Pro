const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
db.grievance.findMany({
  select: { code: true, category: true, identityRef: true },
  orderBy: { createdAt: "desc" }, take: 20,
}).then(rows => {
  rows.forEach(r => console.log(r.code.padEnd(12), r.category.padEnd(16), (r.identityRef || "").slice(0, 45)));
  const enc = rows.filter(r => (r.identityRef || "").startsWith("enc:v1:")).length;
  console.log("\n" + enc + " of " + rows.length + " encrypted");
}).finally(() => db.$disconnect());
