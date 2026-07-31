import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Simulates sending the campaign: marks recipients as sent/opened/clicked/failed
 * using realistic deliverability rates (delivered ~94%, open ~34%, click ~8%).
 * Also flips the campaign status to "sent".
 *
 * In a production system this would be replaced by a real SMTP/SES integration
 * + webhook receivers for opens/clicks. The schema already supports it via
 * the `status` field on Recipient.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!campaign)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  if (campaign.variants.length === 0) {
    return NextResponse.json(
      { error: "Generate email variants first" },
      { status: 400 }
    );
  }

  const recipients = await db.recipient.findMany({ where: { campaignId: id } });
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients to send to" },
      { status: 400 }
    );
  }

  // Deterministic-ish simulation rates
  let sent = 0,
    opened = 0,
    clicked = 0,
    failed = 0;

  // Update each recipient with a simulated outcome
  await Promise.all(
    recipients.map(async (r, i) => {
      // 94% delivered, 6% failed (bounce)
      const delivered = Math.random() > 0.06;
      if (!delivered) {
        failed++;
        return db.recipient.update({
          where: { id: r.id },
          data: { status: "failed" },
        });
      }
      sent++;
      // 34% of delivered get opened
      const isOpened = Math.random() < 0.34;
      if (!isOpened) {
        return db.recipient.update({
          where: { id: r.id },
          data: { status: "sent" },
        });
      }
      opened++;
      // ~24% of opened get clicked
      const isClicked = Math.random() < 0.24;
      if (isClicked) clicked++;
      return db.recipient.update({
        where: { id: r.id },
        data: { status: isClicked ? "clicked" : "opened" },
      });
    })
  );

  await db.campaign.update({ where: { id }, data: { status: "sent" } });

  return NextResponse.json({
    ok: true,
    summary: { sent, opened, clicked, failed, total: recipients.length },
  });
}
