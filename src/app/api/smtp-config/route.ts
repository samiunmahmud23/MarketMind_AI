import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Returns the default email config.
 * SMTP password is NOT returned (security). Web3Forms key IS returned
 * because it's public/safe to expose (can only receive form inputs).
 */
export async function GET() {
  const config = await db.smtpConfig.findFirst({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  if (!config) return NextResponse.json(null);
  return NextResponse.json({
    id: config.id,
    provider: config.provider || "smtp",
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    isDefault: config.isDefault,
    hasPassword: !!config.pass,
    web3formsKey: config.web3formsKey || "",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    provider,
    host,
    port,
    secure,
    user,
    pass,
    web3formsKey,
    fromName,
    fromEmail,
  } = body;

  if (!fromEmail) {
    return NextResponse.json(
      { error: "fromEmail is required" },
      { status: 400 }
    );
  }

  // Validate per-provider required fields
  const prov = provider || "smtp";
  if (prov === "smtp" && (!host || !user)) {
    return NextResponse.json(
      { error: "For SMTP: host and user are required" },
      { status: 400 }
    );
  }
  if (prov === "web3forms" && !web3formsKey) {
    return NextResponse.json(
      { error: "For Web3Forms: access key is required" },
      { status: 400 }
    );
  }

  const data: any = {
    provider: prov,
    host: prov === "smtp" ? host : null,
    port: parseInt(port) || 587,
    secure: !!secure,
    user: prov === "smtp" ? user : null,
    fromName: fromName || "MarketMind AI",
    fromEmail,
    web3formsKey: prov === "web3forms" ? web3formsKey : null,
    isDefault: true,
  };

  if (id) {
    const existing = await db.smtpConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    // Keep old password if switching to SMTP and no new password provided
    if (prov === "smtp" && !pass) {
      data.pass = existing.pass;
    } else if (pass) {
      data.pass = pass;
    } else {
      data.pass = null;
    }
    const updated = await db.smtpConfig.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      provider: updated.provider,
      host: updated.host,
      port: updated.port,
      secure: updated.secure,
      user: updated.user,
      fromName: updated.fromName,
      fromEmail: updated.fromEmail,
      isDefault: updated.isDefault,
      hasPassword: !!updated.pass,
      web3formsKey: updated.web3formsKey || "",
    });
  }

  // create new — replace any existing (single default config)
  await db.smtpConfig.deleteMany({});
  if (pass) data.pass = pass;
  const created = await db.smtpConfig.create({ data });
  return NextResponse.json({
    id: created.id,
    provider: created.provider,
    host: created.host,
    port: created.port,
    secure: created.secure,
    user: created.user,
    fromName: created.fromName,
    fromEmail: created.fromEmail,
    isDefault: created.isDefault,
    hasPassword: !!created.pass,
    web3formsKey: created.web3formsKey || "",
  });
}

export async function DELETE() {
  await db.smtpConfig.deleteMany({});
  return NextResponse.json({ ok: true });
}
