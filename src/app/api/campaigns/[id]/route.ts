import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      recipients: { take: 200, orderBy: { createdAt: "asc" } },
      variants: { orderBy: { variant: "asc" } },
      _count: { select: { recipients: true } },
    },
  });
  if (!campaign)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...campaign,
    seoKeywords: campaign.seoKeywords ? JSON.parse(campaign.seoKeywords) : [],
    recipientCount: campaign._count.recipients,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
