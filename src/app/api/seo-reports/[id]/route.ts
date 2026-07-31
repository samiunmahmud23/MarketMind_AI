import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await db.seoReport.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...item,
    scoreBreakdown: item.scoreBreakdown ? JSON.parse(item.scoreBreakdown) : null,
    issues: item.issues ? JSON.parse(item.issues) : null,
    keywords: item.keywords ? JSON.parse(item.keywords) : null,
    onPageAudit: item.onPageAudit ? JSON.parse(item.onPageAudit) : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.seoReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
