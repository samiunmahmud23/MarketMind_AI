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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { email, name, company, notes } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check if recipient already exists
    const existing = await db.recipient.findFirst({
      where: { campaignId: id, email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Recipient with this email already exists" },
        { status: 409 }
      );
    }

    // Create the recipient
    const recipient = await db.recipient.create({
      data: {
        campaignId: id,
        email,
        name: name || null,
        company: company || null,
        notes: notes || null,
      },
    });

    // Get updated total count
    const total = await db.recipient.count({ where: { campaignId: id } });

    return NextResponse.json({
      ok: true,
      recipient,
      total,
    });
  } catch (e: any) {
    console.error("POST /recipients error", e);
    return NextResponse.json(
      { error: e?.message || "Failed to add recipient" },
      { status: 500 }
    );
  }
}
