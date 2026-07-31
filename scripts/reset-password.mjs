// Reset a user's password.
// Usage (from the project root):
//   node scripts/reset-password.mjs newsalltime37@gmail.com "YourNewPassword123"
//
// You choose the password — it's hashed with bcrypt and written straight to the DB.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Load .env so DATABASE_URL is available to a standalone script.
try {
  const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error('Usage: node scripts/reset-password.mjs <email> "<new password>"');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash },
  });
  console.log(`\n✓ Password reset for ${user.email}. Log in with your new password.\n`);
} catch (e) {
  console.error(`\n✗ Could not reset — is the email correct? (${e.message})\n`);
  process.exit(1);
} finally {
  await db.$disconnect();
}
