import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ContentRepurposer } from "@/lib/ai/content-repurposer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceType, sourceTitle, sourceContent, brand, audience } = body;

    if (!sourceType || !sourceTitle || !sourceContent) {
      return NextResponse.json(
        { error: "sourceType, sourceTitle, sourceContent required" },
        { status: 400 }
      );
    }

    const agent = new ContentRepurposer();
    const result = await agent.run({
      sourceType,
      sourceTitle,
      sourceContent,
      brand,
      audience,
    });

    const saved = await db.repurposeProject.create({
      data: {
        sourceType,
        sourceTitle,
        sourceContent: sourceContent.slice(0, 8000),
        brand: brand || null,
        audience: audience || null,
        outputs: JSON.stringify(result),
      },
    });

    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("repurpose error", e);
    return NextResponse.json(
      { error: e?.message || "Repurposing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.repurposeProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      sourceType: true,
      sourceTitle: true,
      brand: true,
      createdAt: true,
    },
  });
  return NextResponse.json(items);
}
