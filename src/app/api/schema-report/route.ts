import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SchemaAgent } from "@/lib/ai/marketing-skills";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const agent = new SchemaAgent();
    const result = await agent.run(url);
    const saved = await db.schemaReport.create({
      data: {
        url: result.url, pageType: result.pageType, jsonLd: result.jsonLd,
        existingAudit: JSON.stringify(result.existingAudit), report: result.report,
      },
    });
    return NextResponse.json({ id: saved.id, ...result });
  } catch (e: any) {
    console.error("schema error", e);
    return NextResponse.json({ error: e?.message || "Schema analysis failed" }, { status: 500 });
  }
}

export async function GET() {
  const items = await db.schemaReport.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, url: true, pageType: true, createdAt: true } });
  return NextResponse.json(items);
}
