import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Copywriter } from "@/lib/ai/content-strategist";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, brand, product, audience, tone, platform, angle } = body;
    if (!type || !brand || !product || !audience) {
      return NextResponse.json(
        { error: "type, brand, product, audience required" },
        { status: 400 }
      );
    }

    const copywriter = new Copywriter();
    const result = await copywriter.run({
      type,
      brand,
      product,
      audience,
      tone,
      platform,
      angle,
    });

    const saved = await db.copyAsset.create({
      data: {
        type,
        brand,
        product,
        audience,
        tone: tone || "professional",
        platform: platform || null,
        angle: angle || null,
        variants: JSON.stringify(result.variants),
      },
    });

    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("copywriting error", e);
    return NextResponse.json(
      { error: e?.message || "Copy generation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.copyAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      brand: true,
      product: true,
      platform: true,
      tone: true,
      createdAt: true,
    },
  });
  return NextResponse.json(items);
}
