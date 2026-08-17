import Stripe from "stripe";

/**
 * Stripe integration. Enabled automatically when STRIPE_SECRET_KEY is set in
 * .env. Without it, the app falls back to the free "demo" tier flow so it keeps
 * working. See .env.example for the keys you need.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

// Cast keeps types happy when the key is absent (callers gate on stripeEnabled).
export const stripe: Stripe = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!)
  : (null as unknown as Stripe);

/**
 * Plan catalog — amounts in cents (USD). Inline `price_data` at checkout time
 * means you do NOT have to pre-create Products/Prices in the Stripe dashboard.
 * Keep these aligned with SUBSCRIPTION_TIERS in src/lib/auth.ts.
 */
export const PLANS: Record<string, { name: string; amount: number }> = {
  free: { name: "Free", amount: 0 },
  starter: { name: "Starter", amount: 1900 },
  pro: { name: "Pro", amount: 4900 },
  agency: { name: "Agency", amount: 14900 },
};
