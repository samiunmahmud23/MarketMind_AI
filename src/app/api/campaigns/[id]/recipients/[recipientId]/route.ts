import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Update a single recipient's send status + personalized content.
 * Called by the client-side Web3Forms send flow to record results.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const body = await req.json();
  const { status, sentSubject, sentBody, sentAt } = body;

  const recipient = await db.recipient.findFirst({
    where: { id: recipientId, campaignId: id },
  });
  if (!recipient) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await db.recipient.update({
    where: { id: recipientId },
    data: {
      status: status || recipient.status,
      sentSubject: sentSubject ?? recipient.sentSubject,
      sentBody: sentBody ?? recipient.sentBody,
      sentAt: sentAt ? new Date(sentAt) : recipient.sentAt,
    },
  });

  return NextResponse.json({ ok: true, recipient: updated });
}
