import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SeoStrategist } from "@/lib/ai/seo-strategist";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const strategist = new SeoStrategist();
    const result = await strategist.run(url);

    const saved = await db.seoReport.create({
      data: {
        url: result.url,
        domain: result.domain,
        overallScore: result.overallScore,
        scoreBreakdown: JSON.stringify(result.scoreBreakdown),
        issues: JSON.stringify(result.issues),
        keywords: JSON.stringify(result.keywords),
        onPageAudit: JSON.stringify(result.onPageAudit),
        recommendations: result.recommendations,
        actionPlan: result.actionPlan,
      },
    });

    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("seo-report error", e);
    return NextResponse.json(
      { error: e?.message || "SEO analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.seoReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      url: true,
      domain: true,
      overallScore: true,
      createdAt: true,
    },
  });
  return NextResponse.json(items);
}
