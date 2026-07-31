import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveTenantId } from "@/lib/tenant";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/billing/subscribe
 * Subscribe to a tier. In production this would create a Stripe checkout session.
 * In demo/sandbox mode, it directly updates the user's tier (no payment required).
 *
 * Body: { tier: "free" | "starter" | "pro" | "agency" }
 *
 * When you have real Stripe keys:
 *   1. Add STRIPE_SECRET_KEY to .env
 *   2. Replace this route's logic with Stripe checkout session creation
 *   3. Add a webhook handler at /api/stripe/webhook to confirm payment
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  try {
    const { tier } = await req.json();
    const validTiers = ["free", "starter", "pro", "agency"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Demo/fallback path (used when Stripe isn't configured): update the CURRENT
    // tenant's tier directly, no payment.
    const uid = await resolveTenantId();
    const user = uid ? await db.user.findUnique({ where: { id: uid } }) : null;
    if (!user) {
      return NextResponse.json({ error: "Sign in to change your plan." }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier,
        subStatus: "active",
        usageResetAt: new Date(),
        analysesUsed: 0,
        campaignsUsed: 0,
        emailsSent: 0,
        aiCallsUsed: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Subscribed to ${tier} plan`,
      tier,
      demoMode: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Subscription failed" }, { status: 500 });
  }
}

/**
 * GET /api/billing/subscribe
 * Returns the current subscription status.
 */
export async function GET() {
  const uid = await resolveTenantId();
  const user = uid ? await db.user.findUnique({ where: { id: uid } }) : null;
  if (!user) return NextResponse.json({ tier: "free", demoMode: false, usage: null });

  return NextResponse.json({
    tier: user.subscriptionTier,
    status: user.subStatus,
    demoMode: false,
    usage: {
      analysesUsed: user.analysesUsed,
      campaignsUsed: user.campaignsUsed,
      emailsSent: user.emailsSent,
      aiCallsUsed: user.aiCallsUsed,
      usageResetAt: user.usageResetAt,
    },
  });
}
