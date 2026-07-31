import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.aiSeoReport.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...item,
    scoreBreakdown: item.scoreBreakdown ? JSON.parse(item.scoreBreakdown) : null,
    aiVisibility: item.aiVisibility ? JSON.parse(item.aiVisibility) : null,
    recommendations: item.recommendations ? JSON.parse(item.recommendations) : null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.aiSeoReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
