import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { testSmtpConnection, type EmailConfig } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Tests an email configuration server-side.
 *
 * SMTP: opens a real connection and runs `transporter.verify()` (Nodemailer)
 * to confirm host/port/user/password are valid before the user saves.
 *
 * Web3Forms: its free tier blocks server-side calls (Cloudflare), so those
 * keys are tested from the browser instead (see lib/web3forms-client.ts).
 * If a Web3Forms config is POSTed here we say so rather than failing opaquely.
 *
 * Accepts the same body shape as the config form. If no password is supplied
 * but an `id` is given, the saved password is reused (so "Test" works after a
 * save without re-typing the app password).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const { id, provider, host, port, secure, user, pass, fromName, fromEmail } = body;
  const prov = provider || "smtp";

  if (prov === "web3forms") {
    return NextResponse.json({
      ok: false,
      message:
        "Web3Forms keys are tested from the browser (its free tier blocks server-side calls). Use the Test button in Settings, which runs the check client-side.",
    });
  }

  // Reuse the saved password if the form didn't include one (e.g. testing an
  // already-saved config where the password is never sent back to the client).
  let effectivePass = pass;
  if (!effectivePass && id) {
    const existing = await db.smtpConfig.findUnique({ where: { id } });
    effectivePass = existing?.pass || undefined;
  }

  if (!host || !user || !effectivePass) {
    return NextResponse.json(
      { ok: false, message: "Host, username, and password are required to test SMTP." },
      { status: 400 }
    );
  }

  const config: EmailConfig = {
    provider: "smtp",
    host,
    port: parseInt(port) || 587,
    secure: !!secure,
    user,
    pass: effectivePass,
    fromName: fromName || "Your Brand",
    fromEmail: fromEmail || user,
  };

  const result = await testSmtpConnection(config);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
