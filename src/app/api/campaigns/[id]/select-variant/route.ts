import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Selects the winning email variant. The user picks the best draft;
 * this stores selectedVariantId on the campaign so the send flow knows
 * which email to personalize + send to all recipients.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { variantId } = await req.json();

  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }

  const variant = await db.emailVariant.findFirst({
    where: { id: variantId, campaignId: id },
  });
  if (!variant) {
    return NextResponse.json({ error: "variant not found" }, { status: 404 });
  }

  await db.campaign.update({
    where: { id },
    data: { selectedVariantId: variantId },
  });

  return NextResponse.json({ ok: true, selectedVariantId: variantId });
}
