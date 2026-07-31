import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EmailCopywriter } from "@/lib/ai/email-copywriter";
import { describeImage } from "@/lib/ai/zai";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign)
      return NextResponse.json({ error: "not found" }, { status: 404 });

    await db.campaign.update({ where: { id }, data: { status: "generating" } });

    // Node 0: If a product picture was uploaded, describe it with VLM
    let productImageDesc: string | undefined;
    if (campaign.productImage) {
      try {
        productImageDesc = await describeImage(
          campaign.productImage,
          `This is a product picture for a cold email campaign. The product is "${campaign.productName}". Describe what you see: the product itself, its key features, appearance, packaging, any visible text/branding, and the likely use case. Be concrete and marketing-relevant — these details will be used to make cold emails specific and compelling. 4-6 sentences.`
        );
        await db.campaign.update({
          where: { id },
          data: { productImageDesc },
        });
      } catch (e) {
        // non-fatal — continue without image description
        console.error("VLM describe failed", e);
      }
    }

    const copywriter = new EmailCopywriter();
    const result = await copywriter.run({
      productName: campaign.productName,
      productDesc: campaign.productDesc || undefined,
      targetAudience: campaign.targetAudience,
      valueProp: campaign.valueProp || undefined,
      goal: campaign.goal,
      tone: campaign.tone,
      draftCount: campaign.draftCount,
      productImageDesc,
    });

    // Atomically replace variants: delete old + create new in a transaction
    // so a partial failure doesn't leave the campaign with zero variants.
    const variants = await db.$transaction(async (tx) => {
      await tx.emailVariant.deleteMany({ where: { campaignId: id } });
      return Promise.all(
        result.variants.map((v) =>
          tx.emailVariant.create({
            data: {
              campaignId: id,
              variant: v.variant,
              subject: v.subject,
              preheader: v.preheader || null,
              body: v.body,
              cta: v.cta || null,
              strategy: v.strategy || null,
            },
          })
        )
      );
    });

    await db.campaign.update({
      where: { id },
      data: {
        status: "ready",
        seoKeywords: JSON.stringify(result.seoKeywords),
        selectedVariantId: null, // reset selection on regeneration
      },
    });

    return NextResponse.json({
      ok: true,
      variants,
      seoKeywords: result.seoKeywords,
      notes: result.notes,
      productImageDesc: productImageDesc || null,
    });
  } catch (e: any) {
    console.error("generate emails error", e);
    await db.campaign
      .update({ where: { id }, data: { status: "draft" } })
      .catch(() => {});
    return NextResponse.json(
      { error: e?.message || "Generation failed" },
      { status: 500 }
    );
  }
}
