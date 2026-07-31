import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCsv, listStats } from "@/lib/csv";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/")[3];

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    let csvText = "";
    if (file) {
      csvText = await file.text();
    } else if (rawText) {
      csvText = rawText;
    } else {
      return NextResponse.json(
        { error: "No file or text provided" },
        { status: 400 }
      );
    }

    const recipients = parseCsv(csvText);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses found in the CSV" },
        { status: 400 }
      );
    }

    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Atomically replace recipients: delete old + create new in a transaction
    // so a failure during create doesn't leave the campaign with zero recipients.
    await db.$transaction([
      db.recipient.deleteMany({ where: { campaignId: id } }),
      db.recipient.createMany({
        data: recipients.map((r) => ({
          campaignId: id,
          email: r.email,
          name: r.name || null,
          company: r.company || null,
          notes: r.notes || null,
        })),
      }),
    ]);

    const stats = listStats(recipients);
    return NextResponse.json({
      ok: true,
      campaignId: id,
      imported: recipients.length,
      stats,
      sample: recipients.slice(0, 5),
    });
  } catch (e: any) {
    console.error("upload-csv error", e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
