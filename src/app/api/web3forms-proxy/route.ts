import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Server-side proxy for Web3Forms.
 *
 * NOTE: Web3Forms uses Cloudflare bot protection which blocks ALL server-side
 * requests with an HTML challenge page ("Just a moment..."). This means
 * Web3Forms free tier CANNOT be used from a server — only from a real browser.
 *
 * This proxy exists as a fallback for the client-side send flow. If the
 * browser can't reach Web3Forms directly (e.g. in a sandbox), this proxy
 * will also fail — and returns a clear, actionable error message.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { access_key, ...rest } = body;

  if (!access_key) {
    return NextResponse.json(
      { success: false, message: "access_key is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_key, ...rest }),
    });

    const text = await res.text();

    // Cloudflare bot protection returns HTML ("Just a moment...")
    if (text.includes("<!DOCTYPE html") || text.includes("Just a moment")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Web3Forms is protected by Cloudflare and cannot be called from a server. To send real emails: (1) use SMTP in Settings → Email Sending (works server-side with a Gmail App Password), or (2) deploy this app to a real host where the browser can call Web3Forms directly. The Web3Forms option will work once deployed.",
        },
        { status: 403 }
      );
    }

    // Try to parse as JSON
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Web3Forms returned an unexpected response.",
        },
        { status: 502 }
      );
    }

    // Check for the "Pro plan required" error
    if (!data.success && typeof data.message === "string" && data.message.includes("Pro plan")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Web3Forms free tier blocks server-side sending. Use SMTP instead (Settings → Email Sending) or deploy to a real host for browser-side Web3Forms delivery.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}
