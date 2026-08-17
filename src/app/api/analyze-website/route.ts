import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WebsiteAnalyst } from "@/lib/ai/website-analyst";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    let { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    try {
      url = new URL(url.includes("://") ? url : `https://${url}`).toString();
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    const analyst = new WebsiteAnalyst();
    const result = await analyst.run(url);

    const saved = await db.analysis.create({
      data: {
        url: result.url,
        sourceType: result.sourceType,
        title: result.title,
        industry: result.industry,
        description: result.description,
        summary: result.summary,
        scores: JSON.stringify(result.scores),
        meta: JSON.stringify({
          ...result.meta,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          opportunities: result.opportunities,
          competitors: result.competitors,
          targetAudience: result.targetAudience,
          recommendations: result.recommendations,
        }),
        report: result.report,
        recommendations: JSON.stringify(result.recommendations),
        wordCount: result.wordCount,
      },
    });

    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("analyze-website error", e);
    return NextResponse.json(
      { error: e?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const items = await db.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      url: true,
      sourceType: true,
      title: true,
      industry: true,
      summary: true,
      scores: true,
      createdAt: true,
    },
  });
  return NextResponse.json(
    items.map((i) => ({
      ...i,
      scores: i.scores ? JSON.parse(i.scores) : null,
    }))
  );
}
