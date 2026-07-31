import { PrismaClient } from '@prisma/client'

/**
 * Raw (un-scoped) Prisma client. Used internally by the tenant resolver and by
 * auth (User lookups). Application code should import `db` from "./db" instead —
 * that one carries the multi-tenancy isolation extension.
 */
const globalForPrisma = globalThis as unknown as {
  basePrisma: PrismaClient | undefined
}

function createOrRefresh(): PrismaClient {
  const existing = globalForPrisma.basePrisma
  if (
    existing &&
    typeof (existing as any).socialCampaign === 'object' &&
    typeof (existing as any).brandProfile === 'object' &&
    typeof (existing as any).user === 'object'
  ) {
    return existing
  }
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.basePrisma = client
  return client
}

export const baseDb = createOrRefresh()
