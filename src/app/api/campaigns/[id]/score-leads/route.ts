import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadScorer } from "@/lib/ai/lead-scorer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign)
      return NextResponse.json({ error: "not found" }, { status: 404 });

    const recipients = await db.recipient.findMany({
      where: { campaignId: id },
      take: 100, // batch cap for token budget
      orderBy: { createdAt: "asc" },
    });

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients to score. Upload a CSV first." },
        { status: 400 }
      );
    }

    const scorer = new LeadScorer();
    const result = await scorer.run({
      recipients: recipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        company: r.company,
      })),
      productName: campaign.productName,
      targetAudience: campaign.targetAudience,
    });

    // Persist scores to DB
    await Promise.all(
      result.scores.map((s) =>
        db.recipient.update({
          where: { id: s.recipientId },
          data: {
            leadScore: s.score,
            leadTier: s.tier,
            leadFit: s.fit,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      scores: result.scores,
    });
  } catch (e: any) {
    console.error("score-leads error", e);
    return NextResponse.json(
      { error: e?.message || "Lead scoring failed" },
      { status: 500 }
    );
  }
}
