import nodemailer from "nodemailer";
import { db } from "./db";

export type EmailProvider = "smtp" | "web3forms";

export interface EmailConfig {
  provider: EmailProvider;
  // SMTP fields (used when provider = "smtp")
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  // Web3Forms access key (used when provider = "web3forms")
  web3formsKey?: string;
  // Shared
  fromName: string;
  fromEmail: string;
}

/** @deprecated use EmailConfig — kept for backward compat with send route */
export type SmtpSettings = EmailConfig;

/**
 * Load the default email config from the database.
 * Returns null if no config exists.
 */
export async function getSmtpConfig(): Promise<EmailConfig | null> {
  const config = await db.smtpConfig.findFirst({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  if (!config) return null;
  return {
    provider: (config.provider as EmailProvider) || "smtp",
    host: config.host || undefined,
    port: config.port,
    secure: config.secure,
    user: config.user || undefined,
    pass: config.pass || undefined,
    web3formsKey: config.web3formsKey || undefined,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
  };
}

/**
 * Create a Nodemailer transporter from SMTP settings.
 *
 * Pass `{ pool: true }` for a campaign send: instead of opening a fresh SMTP
 * connection for every recipient (slow, and trips Gmail's "too many concurrent
 * connections" throttle on larger lists), one authenticated connection is
 * reused across the whole batch, with a built-in rate limit to stay under
 * provider send caps.
 */
export function createTransporter(settings: EmailConfig, opts?: { pool?: boolean }) {
  return nodemailer.createTransport({
    host: settings.host!,
    port: settings.port || 587,
    secure: !!settings.secure,
    auth: {
      user: settings.user!,
      pass: settings.pass!,
    },
    ...(opts?.pool
      ? { pool: true, maxConnections: 3, maxMessages: 100, rateDelta: 1000, rateLimit: 5 }
      : {}),
  });
}

/**
 * Test the SMTP connection by verifying the transporter.
 */
export async function testSmtpConnection(settings: EmailConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = createTransporter(settings);
    await transporter.verify();
    return { ok: true, message: "SMTP connection verified successfully. Ready to send emails." };
  } catch (e: any) {
    return {
      ok: false,
      message: e?.message || "SMTP connection failed. Check your host, port, user, and password/app-password.",
    };
  }
}

/**
 * Web3Forms submission endpoint.
 * NOTE: this must be https://api.web3forms.com/submit — NOT https://web3forms.com
 * (the latter is the marketing site and returns HTML, causing JSON parse errors).
 */
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/**
 * Test a Web3Forms access key by submitting a tiny test email.
 * The test email lands in the inbox registered with the access key.
 */
export async function testWeb3Forms(accessKey: string, fromEmail: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "MarketMind AI — Web3Forms test",
        name: "MarketMind AI",
        email: fromEmail,
        message: "This is a test email from MarketMind AI. If you received this, your Web3Forms access key is working correctly.",
      }),
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return {
        ok: false,
        message: "Web3Forms returned an unexpected response. Double-check the access key you pasted from your Web3Forms dashboard email.",
      };
    }
    const data = await res.json();
    if (data.success) {
      return { ok: true, message: "Web3Forms test email sent! Check the inbox registered with your access key." };
    }
    return { ok: false, message: data.message || "Web3Forms test failed. Check your access key." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Web3Forms test failed (network error)." };
  }
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  text: string; // plain text body
  html?: string; // optional HTML body
  productImage?: string; // optional base64 data URL — attached inline (SMTP only)
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sanitize a display name for use in an RFC 5322 address header.
 * Strips CR/LF (header injection) and escapes embedded double quotes.
 * Returns an empty string if the result would be empty/whitespace.
 */
export function sanitizeDisplayName(name: string): string {
  if (!name) return "";
  // Strip CR/LF to prevent header injection, then escape double quotes
  const cleaned = String(name).replace(/[\r\n]/g, " ").replace(/"/g, '\\"').trim();
  return cleaned;
}

/**
 * Send a single email via Web3Forms (free tier, 250/month).
 *
 * Web3Forms is designed for contact forms — it delivers the email to the
 * inbox registered with the access key. To make cold emails reach the
 * actual recipient, we put the recipient's address in the `cc` field so
 * they receive a copy. The access-key owner also receives a copy (useful
 * as a send record / backup).
 *
 * The access key is public and safe to expose (it can only receive form
 * inputs, never read/delete data).
 */
export async function sendEmailWeb3Forms(
  settings: EmailConfig,
  params: SendEmailParams
): Promise<SendEmailResult> {
  if (!settings.web3formsKey) {
    return { ok: false, error: "Web3Forms access key not configured" };
  }
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: settings.web3formsKey,
        subject: String(params.subject || "").replace(/[\r\n]/g, " "),
        name: params.toName || settings.fromName,
        email: settings.fromEmail, // reply-to = the sender
        cc: params.to, // recipient gets CC'd → they receive the email
        message: params.text,
        // Custom fields for record-keeping
        from_name: settings.fromName,
        recipient: params.to,
      }),
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return { ok: false, error: "Web3Forms rejected the submission (invalid access key or rate limit hit)." };
    }
    const data = await res.json();
    if (data.success) {
      return { ok: true, messageId: data.messageId || `web3forms-${Date.now()}` };
    }
    return { ok: false, error: data.message || "Web3Forms rejected the submission" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Web3Forms send failed (network error)" };
  }
}

/**
 * Unified send function — branches by provider.
 * Use this in the campaign send route so it works with either SMTP or Web3Forms.
 */
export async function sendCampaignEmail(
  settings: EmailConfig,
  params: SendEmailParams,
  sharedTransporter?: nodemailer.Transporter
): Promise<SendEmailResult> {
  if (settings.provider === "web3forms") {
    return sendEmailWeb3Forms(settings, params);
  }
  // Default: SMTP via Nodemailer. Reuse the batch's pooled transporter when the
  // caller supplies one; otherwise open a one-off connection for this message.
  const transporter = sharedTransporter || createTransporter(settings);
  const fromName = sanitizeDisplayName(settings.fromName);
  const toName = sanitizeDisplayName(params.toName || "");

  // Optional product image → inline CID attachment. `data:` URIs are stripped
  // by most email clients (Gmail/Outlook), so we attach the bytes and reference
  // them via `cid:` in the HTML instead.
  const img = params.productImage ? parseDataUrl(params.productImage) : null;
  const html =
    params.html ||
    textToHtml(params.text, { imageCid: img ? "productimg" : undefined, brandName: settings.fromName });
  const attachments = img
    ? [{
        filename: `product.${img.ext}`,
        content: img.buffer,
        cid: "productimg",
        contentType: img.mime,
        contentDisposition: "inline" as const,
      }]
    : undefined;

  try {
    const info = await transporter.sendMail({
      from: { name: fromName || settings.fromEmail, address: settings.fromEmail },
      to: toName ? { name: toName, address: params.to } : { address: params.to },
      subject: String(params.subject || "").replace(/[\r\n]/g, " "),
      text: params.text,
      html,
      attachments,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to send email" };
  }
}

/** Parse a base64 data URL into mime/buffer/ext for attaching. */
function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer; ext: string } | null {
  const m = String(dataUrl).match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  try {
    return { mime, buffer: Buffer.from(m[2], "base64"), ext };
  } catch {
    return null;
  }
}

/**
 * Send a single email via the configured SMTP.
 * (Legacy — prefer sendCampaignEmail which auto-branches by provider.)
 */
export async function sendEmail(
  settings: SmtpSettings,
  params: SendEmailParams
): Promise<SendEmailResult> {
  return sendCampaignEmail(settings, params);
}

/**
 * Convert a plain-text personalized email body into polished, client-safe HTML.
 * Splits blank-line-separated blocks into real paragraphs (proper spacing),
 * adds a hidden preheader, and optionally shows an inline product image (by cid).
 */
export function textToHtml(
  text: string,
  opts?: { imageCid?: string; brandName?: string; preheader?: string }
): string {
  const brand = opts?.brandName || "MarketMind AI";
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const preheader = (opts?.preheader || escaped.replace(/\s+/g, " ").slice(0, 110)).trim();
  const imageBlock = opts?.imageCid
    ? `<tr><td style="padding:24px 40px 0;"><img src="cid:${opts.imageCid}" alt="${brand}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;border:1px solid #eef0f2;" /></td></tr>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #eef0f2;">
        <tr><td style="height:4px;background:linear-gradient(90deg,#6366f1,#22d3ee);font-size:0;line-height:0;">&nbsp;</td></tr>
        ${imageBlock}
        <tr><td style="padding:${imageBlock ? "20" : "36"}px 40px 8px 40px;font-size:15px;line-height:1.65;color:#1f2430;">
          ${paragraphs}
        </td></tr>
        <tr><td style="padding:16px 40px 28px 40px;border-top:1px solid #eef0f2;font-size:12px;color:#98a0ae;">
          Sent by ${brand}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
