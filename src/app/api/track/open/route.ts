import { NextRequest, NextResponse } from "next/server";
import { baseDb as db } from "@/lib/db-base";

// A 1x1 transparent GIF base64 string
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    try {
      // Find the recipient to check their current status
      const recipient = await db.recipient.findUnique({
        where: { id },
        select: { status: true },
      });

      // Only update if they are currently "sent" (to not downgrade from "clicked")
      if (recipient && recipient.status === "sent") {
        await db.recipient.update({
          where: { id },
          data: { status: "opened" },
        });
      }
    } catch (e) {
      // Ignore errors silently for tracking pixels so it doesn't break the client
      console.error("Open tracking error:", e);
    }
  }

  // Always return the 1x1 transparent GIF, prevent caching
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
