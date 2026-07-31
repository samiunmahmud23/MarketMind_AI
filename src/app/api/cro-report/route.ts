import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CroAgent } from "@/lib/ai/marketing-skills";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const agent = new CroAgent();
    const result = await agent.run(url);
    const saved = await db.croReport.create({
      data: {
        url: result.url, pageType: result.pageType, overallScore: result.overallScore,
        scoreBreakdown: JSON.stringify(result.scoreBreakdown),
        issues: JSON.stringify(result.issues), report: result.report,
      },
    });
    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("cro error", e);
    return NextResponse.json({ error: e?.message || "CRO analysis failed" }, { status: 500 });
  }
}

export async function GET() {
  const items = await db.croReport.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, url: true, pageType: true, overallScore: true, createdAt: true } });
  return NextResponse.json(items);
}
