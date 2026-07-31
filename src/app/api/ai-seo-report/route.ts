import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AiSeoAgent } from "@/lib/ai/marketing-skills";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const agent = new AiSeoAgent();
    const result = await agent.run(url);
    const saved = await db.aiSeoReport.create({
      data: {
        url: result.url, domain: result.domain, overallScore: result.overallScore,
        scoreBreakdown: JSON.stringify(result.scoreBreakdown),
        aiVisibility: JSON.stringify(result.aiVisibility),
        recommendations: JSON.stringify(result.recommendations),
        report: result.report, llmsTxt: result.llmsTxt,
      },
    });
    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("ai-seo error", e);
    return NextResponse.json({ error: e?.message || "AI-SEO analysis failed" }, { status: 500 });
  }
}

export async function GET() {
  const items = await db.aiSeoReport.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, url: true, domain: true, overallScore: true, createdAt: true } });
  return NextResponse.json(items);
}
