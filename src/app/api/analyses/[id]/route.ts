import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await db.analysis.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...item,
    scores: item.scores ? JSON.parse(item.scores) : null,
    meta: item.meta ? JSON.parse(item.meta) : null,
    recommendations: item.recommendations ? JSON.parse(item.recommendations) : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.analysis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
