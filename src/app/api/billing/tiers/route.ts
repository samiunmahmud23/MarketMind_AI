import { NextResponse } from "next/server";
import { SUBSCRIPTION_TIERS, TierKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/billing/tiers
 * Returns all subscription tiers with pricing + limits + features.
 */
export async function GET() {
  const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    price: tier.price,
    limits: tier.limits,
    features: tier.features,
  }));

  return NextResponse.json({ tiers });
}
