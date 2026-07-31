import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Stripe calls this when a payment/subscription changes. This is the
 * AUTHORITATIVE place tiers get updated (never trust the browser redirect).
 *
 * Setup:
 *   - Local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 *     (the Stripe CLI prints a whsec_… — put it in STRIPE_WEBHOOK_SECRET)
 *   - Production: add the endpoint in the Stripe Dashboard → Webhooks and copy
 *     its signing secret into STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: any;
  try {
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    } else {
      // Dev fallback if no signing secret is set yet (do NOT use in production).
      event = JSON.parse(body);
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${e?.message}` },
      { status: 400 }
    );
  }

  try {
    const obj = event.data?.object || {};
    switch (event.type) {
      case "checkout.session.completed":
        await applyTier(obj.metadata?.userId, obj.customer, obj.metadata?.tier, "active", obj.subscription);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const status = obj.status === "active" || obj.status === "trialing" ? "active" : obj.status;
        await applyTier(obj.metadata?.userId, obj.customer, obj.metadata?.tier, status, obj.id);
        break;
      }
      case "customer.subscription.deleted":
        await downgrade(obj.customer);
        break;
    }
  } catch (e: any) {
    console.error("stripe webhook handler error", e);
  }

  return NextResponse.json({ received: true });
}

async function applyTier(
  userId: string | undefined,
  customerId: any,
  tier: string | undefined,
  status: string,
  subId?: any
) {
  if (!tier) return;
  const data: any = {
    subscriptionTier: tier,
    subStatus: status,
    stripeSubId: subId ? String(subId) : undefined,
    usageResetAt: new Date(),
    analysesUsed: 0,
    campaignsUsed: 0,
    emailsSent: 0,
    aiCallsUsed: 0,
  };
  if (customerId) data.stripeCustomerId = String(customerId);

  if (userId) {
    await db.user.updateMany({ where: { id: userId }, data });
  } else if (customerId) {
    await db.user.updateMany({ where: { stripeCustomerId: String(customerId) }, data });
  } else {
    const admin = await db.user.findFirst({ where: { role: "admin" } });
    if (admin) await db.user.update({ where: { id: admin.id }, data });
  }
}

async function downgrade(customerId: any) {
  if (!customerId) return;
  await db.user.updateMany({
    where: { stripeCustomerId: String(customerId) },
    data: { subscriptionTier: "free", subStatus: "canceled", stripeSubId: null },
  });
}
