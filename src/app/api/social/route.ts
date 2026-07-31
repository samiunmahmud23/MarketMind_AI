import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SocialMediaAgent } from "@/lib/ai/social-media";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand, product, audience, url, platforms, postsPerPlatform, goal } = body;

    if (!brand || !product || !audience || !platforms?.length) {
      return NextResponse.json(
        { error: "brand, product, audience, platforms required" },
        { status: 400 }
      );
    }

    const agent = new SocialMediaAgent();
    const result = await agent.run({
      brand,
      product,
      audience,
      url,
      platforms,
      postsPerPlatform,
      goal,
    });

    const saved = await db.socialCampaign.create({
      data: {
        brand,
        product,
        audience,
        url: url || null,
        goal: goal || "engagement",
        platforms: JSON.stringify(platforms),
        contentPillars: result.contentPillars.length
          ? JSON.stringify(result.contentPillars)
          : null,
        hashtagBank: result.hashtagBank.length
          ? JSON.stringify(result.hashtagBank)
          : null,
        strategy: result.strategy || null,
        cadence: result.postingCadence.length
          ? JSON.stringify(result.postingCadence)
          : null,
        posts: {
          create: result.posts.map((p) => ({
            platform: p.platform,
            hook: p.hook,
            caption: p.caption,
            hashtags: p.hashtags?.length ? JSON.stringify(p.hashtags) : null,
            cta: p.cta || null,
            imagePrompt: p.imagePrompt || null,
            bestTime: p.bestTime || null,
            estReach: p.estReach || null,
          })),
        },
      },
      include: { posts: true },
    });

    return NextResponse.json({
      id: saved.id,
      ...result,
      platforms,
    });
  } catch (e: any) {
    console.error("social campaign error", e);
    return NextResponse.json(
      { error: e?.message || "Social campaign generation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.socialCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json(
    items.map((i) => ({
      ...i,
      platforms: i.platforms ? JSON.parse(i.platforms) : [],
      contentPillars: i.contentPillars ? JSON.parse(i.contentPillars) : [],
      hashtagBank: i.hashtagBank ? JSON.parse(i.hashtagBank) : [],
      cadence: i.cadence ? JSON.parse(i.cadence) : [],
      postCount: i._count.posts,
    }))
  );
}
