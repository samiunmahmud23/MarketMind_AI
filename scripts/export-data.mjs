// Export ALL data from the current database to db/backup.json.
// Run this BEFORE switching to Supabase/Postgres — it's your backup + the
// source for scripts/import-data.mjs.
//   node scripts/export-data.mjs
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

try {
  const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

// Parents before children (User first so FK-owned rows import cleanly later).
const MODELS = [
  "user",
  "analysis", "campaign", "socialCampaign", "seoReport", "copyAsset", "contentProject",
  "brandProfile", "repurposeProject", "smtpConfig", "aiSeoReport", "competitorProfile",
  "croReport", "schemaReport", "scheduledJob",
  "recipient", "emailVariant", "socialPost",
];

const db = new PrismaClient();
try {
  const out = {};
  const summary = [];
  for (const m of MODELS) {
    out[m] = await db[m].findMany();
    summary.push(`${m}:${out[m].length}`);
  }
  fs.mkdirSync(new URL("../db/", import.meta.url), { recursive: true });
  fs.writeFileSync(new URL("../db/backup.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("\n✓ Exported to db/backup.json");
  console.log("  " + summary.join("  ") + "\n");
} finally {
  await db.$disconnect();
}
