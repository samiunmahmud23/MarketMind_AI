import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await db.socialCampaign.findUnique({
    where: { id },
    include: { posts: { orderBy: { createdAt: "asc" } } },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...item,
    platforms: item.platforms ? JSON.parse(item.platforms) : [],
    contentPillars: item.contentPillars ? JSON.parse(item.contentPillars) : [],
    hashtagBank: item.hashtagBank ? JSON.parse(item.hashtagBank) : [],
    cadence: item.cadence ? JSON.parse(item.cadence) : [],
    posts: item.posts.map((p) => ({
      ...p,
      hashtags: p.hashtags ? JSON.parse(p.hashtags) : [],
    })),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.socialCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
