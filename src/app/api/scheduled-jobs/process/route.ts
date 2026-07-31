import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/scheduled-jobs/process
 * Processes all pending scheduled jobs whose scheduledFor time has passed.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  try {
    const now = new Date();
    const dueJobs = await db.scheduledJob.findMany({
      where: { status: "pending", scheduledFor: { lte: now } },
      include: { campaign: { include: { variants: true, recipients: true } } },
    });

    if (dueJobs.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "No due jobs." });
    }

    const results: any[] = [];

    for (const job of dueJobs) {
      await db.scheduledJob.update({ where: { id: job.id }, data: { status: "running", startedAt: now } });

      try {
        const campaign = job.campaign;
        if (!campaign.selectedVariantId) throw new Error("No variant selected");
        const selected = campaign.variants.find((v) => v.id === campaign.selectedVariantId);
        if (!selected) throw new Error("Selected variant not found");
        const toSend = campaign.recipients.filter((r) => r.status !== "sent");
        if (toSend.length === 0) throw new Error("All recipients already sent");

        const { getSmtpConfig, sendCampaignEmail, textToHtml } = await import("@/lib/email");
        const { personalize } = await import("@/lib/personalize");
        const smtp = await getSmtpConfig();
        if (!smtp) throw new Error("Email sending not configured");

        let sent = 0, failed = 0;
        for (const r of toSend) {
          const sentSubject = personalize(selected.subject, r);
          const sentBody = personalize(selected.body, r);
          const result = await sendCampaignEmail(smtp, {
            to: r.email, toName: r.name || undefined, subject: sentSubject, text: sentBody, html: textToHtml(sentBody),
          });
          if (result.ok) { sent++; await db.recipient.update({ where: { id: r.id }, data: { status: "sent", sentSubject, sentBody, sentAt: now } }); }
          else { failed++; await db.recipient.update({ where: { id: r.id }, data: { status: "failed", sentSubject, sentBody, sentAt: now } }); }
          await new Promise((res) => setTimeout(res, 200));
        }

        if (sent > 0) await db.campaign.update({ where: { id: campaign.id }, data: { status: "sent" } });
        await db.scheduledJob.update({ where: { id: job.id }, data: { status: "completed", completedAt: new Date(), result: JSON.stringify({ sent, failed, total: toSend.length }) } });
        results.push({ jobId: job.id, campaign: campaign.name, sent, failed, ok: true });
      } catch (e: any) {
        await db.scheduledJob.update({ where: { id: job.id }, data: { status: "failed", completedAt: new Date(), result: JSON.stringify({ error: e.message }) } });
        results.push({ jobId: job.id, error: e.message, ok: false });
      }
    }

    return NextResponse.json({ ok: true, processed: dueJobs.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Processing failed" }, { status: 500 });
  }
}
