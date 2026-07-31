import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
// Raw client (not the tenant-scoped one) — auth resolves users before a tenant
// exists, and this avoids an auth ⇄ tenant import cycle.
import { baseDb as db } from "./db-base";

// Shared local/demo tenant email (kept in sync with src/lib/tenant.ts).
const DEMO_EMAIL = "demo@local.host";

/**
 * NextAuth.js configuration.
 *
 * Providers:
 *  - Credentials (email + bcrypt password)
 *  - Google OAuth — enabled automatically when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *    are set in .env (see .env.example). Without them, only credentials login shows.
 *
 * The app works in "demo mode" (no auth required) if no users exist in the DB.
 * The first user to sign in (either provider) becomes the admin on Pro.
 */

/** Whether Google OAuth is configured (used to conditionally show the button). */
export const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await db.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
      });

      if (!user || !user.passwordHash) return null;

      const valid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
      } as any;
    },
  }),
];

if (googleAuthEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    // On Google sign-in, upsert a matching row in our User table so tiers,
    // billing and usage tracking work the same as for credentials users.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const existing = await db.user.findUnique({ where: { email } });
        if (!existing) {
          const count = await db.user.count();
          await db.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              passwordHash: "", // OAuth account — no password
              role: count === 0 ? "admin" : "user",
              subscriptionTier: count === 0 ? "pro" : "free",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Credentials sign-in provides our fields directly.
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      // OAuth (or refresh): resolve our DB user by email for id/role/tier.
      if ((account || !token.role) && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: (token.email as string).toLowerCase() },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          (token as any).tier = dbUser.subscriptionTier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tier = (token as any).tier;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "marketmind-ai-dev-secret-change-in-prod",
};

/**
 * Check if auth is enabled (any users exist in DB).
 * If no users exist, the app runs in demo mode without auth.
 */
export async function isAuthEnabled(): Promise<boolean> {
  try {
    // Exclude the demo tenant — it must not flip the app into "auth required".
    const count = await db.user.count({ where: { NOT: { email: DEMO_EMAIL } } });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current user's subscription tier.
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      analyses: 10,
      campaigns: 5,
      emailsPerMonth: 50,
      aiCallsPerMonth: 100,
      marketingSkills: 5,
      ragSearches: 20,
    },
    features: ["Website Analysis", "Cold Email (no send)", "SEO Reports", "Copywriting", "Content Studio"],
  },
  starter: {
    name: "Starter",
    price: 19,
    limits: {
      analyses: 50,
      campaigns: 25,
      emailsPerMonth: 500,
      aiCallsPerMonth: 500,
      marketingSkills: 25,
      ragSearches: 100,
    },
    features: ["Everything in Free", "Real email sending", "Social Studio", "Lead Scoring", "Campaign Analytics"],
  },
  pro: {
    name: "Pro",
    price: 49,
    limits: {
      analyses: 200,
      campaigns: 100,
      emailsPerMonth: 5000,
      aiCallsPerMonth: 2000,
      marketingSkills: 100,
      ragSearches: 500,
    },
    features: ["Everything in Starter", "Content Repurposing", "LangGraph + RAG", "Scheduled emails", "Priority support"],
  },
  agency: {
    name: "Agency",
    price: 149,
    limits: {
      analyses: -1, // unlimited
      campaigns: -1,
      emailsPerMonth: 50000,
      aiCallsPerMonth: -1,
      marketingSkills: -1,
      ragSearches: -1,
    },
    features: ["Everything in Pro", "Unlimited everything", "White-label", "Multi-brand profiles", "API access"],
  },
} as const;

export type TierKey = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Check if a feature is available for a tier.
 */
export function hasFeature(tier: string, feature: string): boolean {
  const t = SUBSCRIPTION_TIERS[tier as TierKey] || SUBSCRIPTION_TIERS.free;
  return t.features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Check if usage is within limits for a tier.
 */
export function checkLimit(tier: string, metric: string, used: number): { allowed: boolean; limit: number; remaining: number } {
  const t = SUBSCRIPTION_TIERS[tier as TierKey] || SUBSCRIPTION_TIERS.free;
  const limit = (t.limits as any)[metric] ?? 0;
  if (limit === -1) return { allowed: true, limit: -1, remaining: -1 };
  return { allowed: used < limit, limit, remaining: Math.max(0, limit - used) };
}
