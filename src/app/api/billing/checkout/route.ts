import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveTenantId } from "@/lib/tenant";
import { stripe, stripeEnabled, PLANS } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout  { tier: "starter" | "pro" | "agency" }
 * Creates a Stripe Checkout Session (subscription) and returns its URL.
 * The client redirects the browser to that URL. On success Stripe returns to
 * `success_url`; the authoritative tier update happens in the webhook.
 *
 * Returns 400 "not configured" if STRIPE_SECRET_KEY is unset — the caller then
 * falls back to the demo /api/billing/subscribe flow.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  const { tier } = await req.json();
  const plan = PLANS[tier as string];
  if (!plan) {
    return NextResponse.json({ error: "Choose a paid plan (starter, pro or agency)." }, { status: 400 });
  }

  if (!stripeEnabled) {
    return NextResponse.json(
      { error: "Payments are not configured. Add STRIPE_SECRET_KEY to .env.", notConfigured: true },
      { status: 400 }
    );
  }

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    // Bill the CURRENT tenant. Reuse or create their Stripe customer.
    const uid = await resolveTenantId();
    const user = uid ? await db.user.findUnique({ where: { id: uid } }) : null;
    if (!user) {
      return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
    }
    let customerId = user?.stripeCustomerId || undefined;
    if (user && !customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.amount,
            recurring: { interval: "month" },
            product_data: { name: `MarketMind AI — ${plan.name}` },
          },
        },
      ],
      success_url: `${origin}/?billing=success&tier=${tier}`,
      cancel_url: `${origin}/?billing=cancel`,
      metadata: { tier, userId: user?.id || "" },
      subscription_data: { metadata: { tier, userId: user?.id || "" } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout failed" }, { status: 500 });
  }
}
