import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 1000);

  const recipients = await db.recipient.findMany({
    where: {
      campaignId: id,
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
              { company: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const total = await db.recipient.count({ where: { campaignId: id } });

  return NextResponse.json({ recipients, total });
}
