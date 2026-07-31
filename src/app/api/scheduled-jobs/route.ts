import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/scheduled-jobs
 * List all scheduled email jobs.
 */
export async function GET() {
  const jobs = await db.scheduledJob.findMany({
    orderBy: { scheduledFor: "desc" },
    take: 50,
  });
  // Enrich with campaign names
  const campaignIds = [...new Set(jobs.map((j) => j.campaignId))];
  const campaigns = await db.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true, productName: true },
  });
  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));
  return NextResponse.json(jobs.map((j) => ({
    ...j,
    campaign: campaignMap.get(j.campaignId) || null,
  })));
}

/**
 * POST /api/scheduled-jobs
 * Schedule a campaign to be sent at a future time.
 * Body: { campaignId, scheduledFor (ISO string) }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  try {
    const { campaignId, scheduledFor } = await req.json();

    if (!campaignId || !scheduledFor) {
      return NextResponse.json({ error: "campaignId and scheduledFor are required" }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const job = await db.scheduledJob.create({
      data: {
        campaignId,
        scheduledFor: scheduledDate,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, job });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Scheduling failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/scheduled-jobs (cancel all pending)
 * Or with ?id=xxx to cancel a specific job
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("id");

  if (jobId) {
    await db.scheduledJob.update({
      where: { id: jobId },
      data: { status: "canceled" },
    });
  } else {
    await db.scheduledJob.updateMany({
      where: { status: "pending" },
      data: { status: "canceled" },
    });
  }

  return NextResponse.json({ ok: true });
}
