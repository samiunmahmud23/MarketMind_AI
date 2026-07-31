"use client";

/**
 * Client-side Web3Forms helper.
 *
 * Web3Forms free tier requires client-side (browser) calls — server-side
 * calls get a 403 "Pro plan required". 
 *
 * This module tries the direct browser-to-Web3Forms call first. If that
 * fails (e.g. in a sandbox where the browser can't reach external APIs),
 * it falls back to the server-side proxy at /api/web3forms-proxy.
 *
 * When deployed to a real hosting environment, the direct call will work.
 */

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export interface Web3FormsSendParams {
  accessKey: string;
  fromName: string;
  fromEmail: string;
  to: string;
  toName?: string;
  subject: string;
  text: string;
}

export interface Web3FormsSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single email via Web3Forms FROM THE BROWSER.
 * Tries direct call first, falls back to server proxy.
 */
export async function sendEmailWeb3FormsClient(
  params: Web3FormsSendParams
): Promise<Web3FormsSendResult> {
  const payload = {
    access_key: params.accessKey,
    subject: String(params.subject || "").replace(/[\r\n]/g, " "),
    name: params.toName || params.fromName,
    email: params.fromEmail,
    cc: params.to,
    message: params.text,
    from_name: params.fromName,
    recipient: params.to,
  };

  // Try 1: Direct browser-to-Web3Forms call (works in production/deployed)
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (data.success) {
        return { ok: true, messageId: data.messageId || `web3forms-${Date.now()}` };
      }
      return { ok: false, error: data.message || "Web3Forms rejected the submission" };
    }
  } catch {
    // Direct call failed (e.g. sandbox network restriction) — fall through to proxy
  }

  // Try 2: Server-side proxy fallback (works if Web3Forms allows the server IP,
  // e.g. on a Pro plan; otherwise returns a clear 403 error)
  try {
    const res = await fetch("/api/web3forms-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      return { ok: true, messageId: data.messageId || `web3forms-${Date.now()}` };
    }
    return { ok: false, error: data.message || "Web3Forms proxy call failed" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Web3Forms send failed (both direct and proxy)" };
  }
}

/**
 * Test a Web3Forms access key FROM THE BROWSER.
 * Tries direct call first, falls back to server proxy.
 */
export async function testWeb3FormsClient(
  accessKey: string,
  fromEmail: string
): Promise<{ ok: boolean; message: string }> {
  const payload = {
    access_key: accessKey,
    subject: "MarketMind AI — Web3Forms test",
    name: "MarketMind AI",
    email: fromEmail,
    message: "This is a test email from MarketMind AI. If you received this, your Web3Forms access key is working correctly.",
  };

  // Try 1: Direct browser call
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (data.success) {
        return { ok: true, message: "Web3Forms test email sent! Check the inbox registered with your access key." };
      }
      return { ok: false, message: data.message || "Web3Forms test failed." };
    }
  } catch {
    // Fall through to proxy
  }

  // Try 2: Server proxy
  try {
    const res = await fetch("/api/web3forms-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      return { ok: true, message: "Web3Forms test email sent (via proxy)! Check the inbox registered with your access key." };
    }
    return { ok: false, message: data.message || "Web3Forms test failed." };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Web3Forms test failed (network error)." };
  }
}
