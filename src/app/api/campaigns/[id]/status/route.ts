import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Update a campaign's status (e.g. "sent" after client-side Web3Forms send).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  if (!status || !["draft", "generating", "ready", "sent"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.campaign.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, status });
}
