import { baseDb } from "./db-base";
import { resolveTenantId } from "./tenant";

/**
 * Tenant-scoped Prisma client. This is what all application code imports.
 *
 * A query extension enforces multi-tenancy centrally, so individual routes
 * don't have to remember to filter by user:
 *   - reads (findMany/findFirst/count/aggregate/groupBy/updateMany/deleteMany)
 *     get `where: { userId: <current tenant> }` injected;
 *   - writes (create/createMany) get `userId` stamped on;
 *   - findUnique is transformed into a tenant-scoped findFirst.
 *
 * The current tenant comes from resolveTenantId() (session, else demo user).
 * When no tenant resolves (auth enabled + unauthenticated), a sentinel scope is
 * used so nothing leaks.
 *
 * Note: update/delete/upsert by unique id pass through unscoped — ids are cuids
 * (not enumerable). Add explicit per-route ownership checks to harden those.
 */

const TENANT_MODELS = new Set([
  "Analysis", "Campaign", "Recipient", "SocialCampaign", "SocialPost", "EmailVariant",
  "SeoReport", "CopyAsset", "ContentProject", "BrandProfile", "RepurposeProject",
  "SmtpConfig", "AiSeoReport", "CompetitorProfile", "CroReport", "SchemaReport", "ScheduledJob",
]);

const WHERE_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany",
]);

const delegate = (model: string) => (baseDb as any)[model.charAt(0).toLowerCase() + model.slice(1)];

export const db = baseDb.$extends({
  name: "tenant-isolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_MODELS.has(model)) return query(args);

        const uid = await resolveTenantId();
        const scope = uid ?? "__no_tenant__";
        const a: any = args ? { ...args } : {};

        if (WHERE_OPS.has(operation)) {
          a.where = { ...(a.where || {}), userId: scope };
          return query(a);
        }
        if (operation === "create") {
          a.data = { ...(a.data || {}), userId: scope };
          return query(a);
        }
        if (operation === "createMany") {
          const rows = Array.isArray(a.data) ? a.data : [a.data];
          a.data = rows.map((d: any) => ({ ...d, userId: scope }));
          return query(a);
        }
        if (operation === "findUnique" || operation === "findUniqueOrThrow") {
          // Preserve include/select/etc. — only scope the where. (Dropping the
          // rest broke `_count`/relations on the campaign detail + send routes.)
          const rec = await delegate(model).findFirst({ ...a, where: { ...(a.where || {}), userId: scope } });
          if (!rec && operation === "findUniqueOrThrow") throw new Error(`No ${model} found`);
          return rec;
        }
        return query(a);
      },
    },
  },
});
