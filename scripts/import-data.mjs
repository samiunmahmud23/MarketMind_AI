// Import db/backup.json into the CURRENT database (run this AFTER pointing the
// app at Supabase/Postgres and running `prisma db push`).
//   node scripts/import-data.mjs
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

try {
  const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

// Same order as the export — parents (User, campaigns…) before children.
const MODELS = [
  "user",
  "analysis", "campaign", "socialCampaign", "seoReport", "copyAsset", "contentProject",
  "brandProfile", "repurposeProject", "smtpConfig", "aiSeoReport", "competitorProfile",
  "croReport", "schemaReport", "scheduledJob",
  "recipient", "emailVariant", "socialPost",
];

const data = JSON.parse(fs.readFileSync(new URL("../db/backup.json", import.meta.url), "utf8"));
const db = new PrismaClient();
try {
  for (const m of MODELS) {
    const rows = data[m] || [];
    if (!rows.length) continue;
    // ISO date strings in the JSON are accepted by Prisma for DateTime fields.
    const res = await db[m].createMany({ data: rows, skipDuplicates: true });
    console.log(`  ${m}: imported ${res.count} / ${rows.length}`);
  }
  console.log("\n✓ Import complete.\n");
} finally {
  await db.$disconnect();
}
