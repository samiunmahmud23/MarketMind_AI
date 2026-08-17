/**
 * One-shot helper: set the CORRECT Supabase database URLs on the linked Vercel
 * project (Production), derived straight from your local .env — no manual
 * copying, editing, or URL-encoding.
 *
 * It reads DIRECT_URL from .env (that value already has your password embedded
 * and correctly encoded), then sets:
 *   DIRECT_URL   = <that value>            (session pooler, :5432)  ← for Prisma
 *   DATABASE_URL = <that value @ :6543 + ?pgbouncer=true>  (transaction pooler) ← serverless
 *
 * Your password never leaves your machine except into your own Vercel project.
 *
 * RUN IT (from the project folder, in your VS Code terminal):
 *   node scripts/fix-vercel-db.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadEnv() {
  let txt;
  try {
    txt = readFileSync(".env", "utf8");
  } catch {
    console.error("\n❌ Could not find .env. Run this from your project folder:\n   node scripts/fix-vercel-db.mjs\n");
    process.exit(1);
  }
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const base = env.DIRECT_URL || env.DATABASE_URL || "";

let u;
try {
  u = new URL(base);
  if (!/^postgres/i.test(u.protocol)) throw new Error("not a postgres URL");
} catch {
  console.error("\n❌ Your .env DIRECT_URL doesn't look like a valid postgres URL, so I can't build the Vercel values. Stopping so nothing breaks.\n");
  process.exit(1);
}

// Normalize to the two forms we need.
const directUrl = base.replace(":6543", ":5432").replace(/\?pgbouncer=true$/, "");
const databaseUrl = directUrl.replace(/:5432\/postgres$/, ":6543/postgres?pgbouncer=true");

const ref = (u.username || "").split(".")[1] || "?";
console.log(`\nUsing your Supabase project:  host=${u.hostname}  ref=${ref}`);
console.log("Setting on Vercel (Production):");
console.log(`  DIRECT_URL   →  …:5432/postgres`);
console.log(`  DATABASE_URL →  …:6543/postgres?pgbouncer=true\n`);

function setVar(name, value) {
  // Remove any existing value first (Vercel has no upsert), then add fresh.
  spawnSync("vercel", ["env", "rm", name, "production", "--yes"], { stdio: "ignore", shell: true });
  const r = spawnSync("vercel", ["env", "add", name, "production"], {
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (r.status === 0) {
    console.log(`  ✓ ${name} set`);
    return true;
  }
  console.error(`  ✗ ${name} FAILED:\n${(r.stderr || r.stdout || "").split("\n").slice(-4).join("\n")}`);
  return false;
}

const ok1 = setVar("DIRECT_URL", directUrl);
const ok2 = setVar("DATABASE_URL", databaseUrl);

if (ok1 && ok2) {
  console.log("\n✅ Both database URLs are set correctly on Vercel.");
  console.log("   Now tell Claude:  \"env fixed\"  — it will redeploy and test everything.\n");
} else {
  console.log("\n⚠️  Something didn't set. Make sure you're logged in (run `vercel whoami`) and in the project folder, then run this again.\n");
  process.exit(1);
}
