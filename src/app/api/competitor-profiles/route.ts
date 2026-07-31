import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CompetitorAgent } from "@/lib/ai/marketing-skills";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const agent = new CompetitorAgent();
    const result = await agent.run(url);
    const saved = await db.competitorProfile.create({
      data: {
        url: result.url, name: result.name, domain: result.domain, description: result.description,
        profile: JSON.stringify(result.profile), report: result.report,
      },
    });
    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("competitor error", e);
    return NextResponse.json({ error: e?.message || "Competitor analysis failed" }, { status: 500 });
  }
}

export async function GET() {
  const items = await db.competitorProfile.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, url: true, name: true, domain: true, createdAt: true } });
  return NextResponse.json(items);
}
