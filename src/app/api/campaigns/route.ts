import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { recipients: true, variants: true } },
    },
  });
  return NextResponse.json(
    campaigns.map((c) => ({
      ...c,
      seoKeywords: c.seoKeywords ? JSON.parse(c.seoKeywords) : [],
      recipientCount: c._count.recipients,
      variantCount: c._count.variants,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    productName,
    productDesc,
    targetAudience,
    valueProp,
    goal,
    tone,
    seoKeywords,
    url,
    draftCount,
    productImage,
  } = body;

  if (!name || !productName || !targetAudience) {
    return NextResponse.json(
      { error: "name, productName, targetAudience required" },
      { status: 400 }
    );
  }

  const campaign = await db.campaign.create({
    data: {
      name,
      productName,
      productDesc: productDesc || null,
      targetAudience,
      valueProp: valueProp || null,
      goal: goal || "leads",
      tone: tone || "professional",
      seoKeywords: seoKeywords ? JSON.stringify(seoKeywords) : null,
      draftCount: Math.max(1, Math.min(3, parseInt(draftCount) || 2)),
      productImage: productImage || null,
    },
  });

  return NextResponse.json({
    ...campaign,
    seoKeywords: campaign.seoKeywords ? JSON.parse(campaign.seoKeywords) : [],
  });
}
