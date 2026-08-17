import { NextRequest, NextResponse } from "next/server";
import { baseDb as db } from "@/lib/db-base";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  if (id) {
    try {
      // Find the recipient to check their current status
      const recipient = await db.recipient.findUnique({
        where: { id },
        select: { status: true },
      });

      // If they exist, update their status to clicked
      // (even if they were 'sent' and we missed the open tracking)
      if (recipient && recipient.status !== "clicked") {
        await db.recipient.update({
          where: { id },
          data: { status: "clicked" },
        });
      }
    } catch (e) {
      console.error("Click tracking error:", e);
    }
  }

  // Redirect to the actual destination URL
  return NextResponse.redirect(targetUrl);
}
