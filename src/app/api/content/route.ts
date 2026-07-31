import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ContentStrategist } from "@/lib/ai/content-strategist";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, topic, brand, audience, keywords } = body;
    if (!type || !topic) {
      return NextResponse.json(
        { error: "type, topic required" },
        { status: 400 }
      );
    }

    const strategist = new ContentStrategist();
    const result = await strategist.run({
      type,
      topic,
      brand,
      audience,
      keywords,
    });

    const saved = await db.contentProject.create({
      data: {
        type,
        topic,
        brand: brand || null,
        audience: audience || null,
        keywords: keywords ? JSON.stringify(keywords) : null,
        outline: result.outline ? JSON.stringify(result.outline) : null,
        content: result.content,
        title: result.title || null,
        metaDesc: result.metaDesc || null,
        wordCount: result.wordCount,
      },
    });

    return NextResponse.json({
      id: saved.id,
      ...result,
      keywords: keywords || [],
    });
  } catch (e: any) {
    console.error("content error", e);
    return NextResponse.json(
      { error: e?.message || "Content generation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.contentProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      topic: true,
      title: true,
      wordCount: true,
      createdAt: true,
    },
  });
  return NextResponse.json(items);
}
