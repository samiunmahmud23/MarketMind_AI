import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variants = await db.emailVariant.findMany({
    where: { campaignId: id },
    orderBy: { variant: "asc" },
  });
  return NextResponse.json(variants);
}
