/* Public entry point for fee analysis.

   finance-math.ts  - pure arithmetic and parsing, no database, unit tested
   finance-db.ts    - Prisma queries that feed the arithmetic

   Callers import from here so the split stays an implementation detail. */
export * from "@/lib/finance-math";
export * from "@/lib/finance-db";
