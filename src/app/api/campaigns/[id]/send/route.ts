import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalize } from "@/lib/ai/email-copywriter";
import { getSmtpConfig, sendCampaignEmail, createTransporter } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Sends the SELECTED email variant to all recipients as REAL emails via SMTP.
 *
 * For each recipient:
 *   1. Personalizes the subject + body ({{first_name}} → name, {{company}} → company)
 *   2. Sends a real email via the configured SMTP server (Nodemailer)
 *   3. Stores the personalized sentSubject + sentBody + messageId on the recipient
 *   4. Marks status as "sent" (or "failed" if SMTP rejected it)
 *
 * Requires SMTP config to be set up in Settings. If not configured, returns 400.
 *
 * Sends individually to each recipient (To: only that recipient) so each email
 * is fully personalized and private — never CC/BCC a list.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = req.nextUrl.origin;

  // 1. Load email config (SMTP or Web3Forms)
  const smtp = await getSmtpConfig();
  if (!smtp) {
    return NextResponse.json(
      {
        error:
          "Email sending is not configured. Go to Settings → Email Sending and add either SMTP credentials or a Web3Forms access key before sending.",
      },
      { status: 400 }
    );
  }

  // Validate the chosen provider has its required fields
  if (smtp.provider === "web3forms" && !smtp.web3formsKey) {
    return NextResponse.json(
      { error: "Web3Forms access key not set. Add it in Settings → Email Sending." },
      { status: 400 }
    );
  }
  if (smtp.provider === "smtp" && (!smtp.host || !smtp.user || !smtp.pass)) {
    return NextResponse.json(
      { error: "SMTP host/user/password not set. Add them in Settings → Email Sending, or switch to Web3Forms." },
      { status: 400 }
    );
  }

  // 2. Load campaign + selected variant + recipients
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { variants: true, recipients: true },
  });
  if (!campaign)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!campaign.selectedVariantId) {
    return NextResponse.json(
      { error: "Select an email draft first, then send." },
      { status: 400 }
    );
  }

  const selected = campaign.variants.find(
    (v) => v.id === campaign.selectedVariantId
  );
  if (!selected) {
    return NextResponse.json(
      { error: "Selected variant no longer exists. Regenerate or reselect." },
      { status: 400 }
    );
  }

  if (campaign.recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients. Add a CSV or type email addresses first." },
      { status: 400 }
    );
  }

  // 3. Send personalized emails one-by-one.
  // Idempotent: skip recipients already marked "sent" (so retries don't
  // double-send). Only pending/failed recipients get (re)sent.
  // Uses sendCampaignEmail() which auto-branches by provider (SMTP or Web3Forms).
  const toSend = campaign.recipients.filter(
    (r) => r.status !== "sent"
  );

  // For SMTP: open ONE pooled connection for the whole batch and verify the
  // login up-front. Bad credentials now fail fast with a clear message instead
  // of silently failing on every single recipient. (Web3Forms is stateless —
  // no connection to pool or verify.)
  let sharedTransporter: ReturnType<typeof createTransporter> | undefined;
  if (smtp.provider === "smtp") {
    sharedTransporter = createTransporter(smtp, { pool: true });
    try {
      await sharedTransporter.verify();
    } catch (e: any) {
      sharedTransporter.close();
      return NextResponse.json(
        {
          error:
            "SMTP login failed — the server rejected your credentials. Re-check the host, port, username, and app password in Settings → Email Sending. " +
            (e?.message ? `(${e.message})` : ""),
        },
        { status: 400 }
      );
    }
  }

  let sent = 0;
  let failed = 0;
  let withoutName = 0;
  let skippedAlreadySent = campaign.recipients.length - toSend.length;
  const errors: { email: string; error: string }[] = [];

  for (const r of toSend) {
    if (!r.name) withoutName++;
    const sentSubject = personalize(selected.subject, r);
    const sentBody = personalize(selected.body, r);

    const result = await sendCampaignEmail(
      smtp,
      {
        to: r.email,
        toName: r.name || undefined,
        subject: sentSubject,
        text: sentBody,
        productImage: campaign.productImage || undefined,
        trackingPixelUrl: `${origin}/api/track/open?id=${r.id}`,
        clickBaseUrl: `${origin}/api/track/click?id=${r.id}`,
      },
      sharedTransporter
    );

    if (result.ok) {
      sent++;
      await db.recipient.update({
        where: { id: r.id },
        data: {
          status: "sent",
          sentSubject,
          sentBody,
          sentAt: new Date(),
        },
      });
    } else {
      failed++;
      errors.push({ email: r.email, error: result.error || "unknown error" });
      await db.recipient.update({
        where: { id: r.id },
        data: {
          status: "failed",
          sentSubject,
          sentBody,
          sentAt: new Date(),
        },
      });
    }

    // Small delay between sends to respect rate limits & avoid spam filters
    await new Promise((res) => setTimeout(res, 200));
  }

  // Release the pooled SMTP connection now the batch is done.
  sharedTransporter?.close();

  // 4. Update campaign status — only mark "sent" if at least one email
  // succeeded. If everything failed, keep it ready so the user can retry.
  if (sent > 0) {
    await db.campaign.update({
      where: { id },
      data: { status: "sent" },
    });
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    withoutName,
    skippedAlreadySent,
    total: campaign.recipients.length,
    errors: errors.slice(0, 10), // first 10 errors for the UI
    warning:
      withoutName > 0
        ? `${withoutName} recipient(s) had no name in the CSV — they were addressed as "there" instead of by name. For best results, ensure your CSV has a "name" column.`
        : null,
  });
}
