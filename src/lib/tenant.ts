import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { baseDb } from "./db-base";

/**
 * Multi-tenancy tenant resolver. Every content query is scoped to the tenant
 * returned here (enforced by the Prisma extension in src/lib/db.ts).
 */

// Shared local/demo tenant — lets the app work without login (fresh installs),
// while still scoping data. Excluded from the "real users" count so it never
// trips the app's auth-enabled gate.
export const DEMO_EMAIL = "demo@local.host";

let demoIdCache: string | null = null;
let legacyClaimed = false;

const TENANT_TABLES = [
  "analysis", "campaign", "recipient", "socialCampaign", "socialPost", "emailVariant",
  "seoReport", "copyAsset", "contentProject", "brandProfile", "repurposeProject",
  "smtpConfig", "aiSeoReport", "competitorProfile", "croReport", "schemaReport", "scheduledJob",
];

/**
 * One-time migration: pre-multi-tenancy rows (userId = null) came from the old
 * single workspace, so they belong to the ORIGINAL owner — the first real admin,
 * or the demo user if none exists yet. Assign them so nothing is stranded.
 */
async function ensureLegacyClaimed(): Promise<void> {
  if (legacyClaimed) return;
  legacyClaimed = true;
  let owner = await baseDb.user.findFirst({
    where: { NOT: { email: DEMO_EMAIL }, role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) owner = await baseDb.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!owner) {
    legacyClaimed = false; // no owner yet (fresh install) — claim once one appears
    return;
  }
  const ownerId = owner.id;
  // Parallel — 17 sequential round-trips to a remote pooler is ~14s; parallel is ~1s.
  await Promise.all(
    TENANT_TABLES.map(async (t) => {
      try {
        await (baseDb as any)[t].updateMany({ where: { userId: null }, data: { userId: ownerId } });
      } catch {
        /* ignore */
      }
    })
  );
}

async function getDemoUserId(): Promise<string> {
  if (demoIdCache) return demoIdCache;
  let user = await baseDb.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await baseDb.user.create({
      data: { email: DEMO_EMAIL, name: "Local", passwordHash: "", role: "admin", subscriptionTier: "pro" },
    });
  }
  demoIdCache = user.id;
  return user.id;
}

/** True once at least one REAL (non-demo) account exists → auth is enforced.
 * Cached once true (a real account doesn't disappear) so we don't hit the DB
 * on every query — critical for latency to a remote Postgres pooler. */
let realUsersCached = false;
export async function hasRealUsers(): Promise<boolean> {
  if (realUsersCached) return true;
  const n = await baseDb.user.count({ where: { NOT: { email: DEMO_EMAIL } } });
  if (n > 0) realUsersCached = true;
  return n > 0;
}

/**
 * Resolve the current tenant's userId:
 *  - signed-in user (NextAuth session), else
 *  - the shared demo user when no real accounts exist (local/demo mode), else
 *  - null when auth IS enabled but the request is unauthenticated.
 * Memoised per request.
 */
export const resolveTenantId = cache(async (): Promise<string | null> => {
  await ensureLegacyClaimed();
  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as any)?.id as string | undefined;
    if (id) return id;
  } catch {
    /* no or invalid session */
  }
  try {
    if (!(await hasRealUsers())) return await getDemoUserId();
  } catch {
    /* db not ready */
  }
  return null;
});
