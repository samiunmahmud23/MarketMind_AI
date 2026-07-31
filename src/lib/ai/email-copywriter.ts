import { llm, extractJson } from "./zai";

export interface EmailVariant {
  variant: string; // "1" | "2" | "3"
  strategy: string;
  subject: string;
  preheader: string;
  body: string;
  cta: string;
}

export interface EmailCampaignResult {
  variants: EmailVariant[];
  seoKeywords: string[];
  notes: string;
}

const SYSTEM = `You are MarketMind's EmailCopywriter — an elite cold-email specialist. You write short, sharp, human cold emails that get replies.

Rules you never break:
- Subject line under 55 characters. Spark curiosity or promise a specific value. Never use spam triggers (FREE, !!!, ALL CAPS, "guarantee", "act now").
- The first sentence is a specific, relevant observation about the recipient or their company — never "I hope this finds you well", never "My name is…", never open by talking about yourself.
- 3 to 5 very short paragraphs (1-2 sentences each). One idea per email. Concrete, benefit-led, tied to a real pain the audience feels.
- Conversational and confident. Zero corporate jargon, zero filler, no em-dashes, no "delighted/thrilled/leverage/seamless".
- Personalize naturally with {{first_name}} for the recipient's first name and {{company}} for their company. These tokens are replaced per-recipient at send time.
- End with ONE low-friction call to action — a simple question or a 15-minute ask.
- Never reveal you are an AI. Write like a real founder reaching out.`;

const ANGLES = [
  { label: "Pain-driven — open on a specific problem the audience feels", short: "Pain-driven" },
  { label: "Outcome-driven — open on a desirable result or transformation", short: "Outcome-driven" },
  { label: "Authority / social-proof — open on a credible result or sharp insight", short: "Authority-driven" },
];

/** Grab a single-line labelled field (SUBJECT:, CTA:, …) from a draft block. */
function field(block: string, key: string): string {
  const m = block.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, "im"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

/** Everything after the "BODY:" label to the end of the block (newline-safe). */
function extractBody(block: string): string {
  const m = block.match(/^\s*BODY\s*:/im);
  if (!m || m.index == null) return "";
  let body = block.slice(m.index + m[0].length).trim();
  // If the model appended CTA/labels after the body, trim them off.
  // ([\s\S]*$ instead of a dotAll `s` flag — keeps the ES2017 target valid.)
  body = body.replace(/\n\s*(?:CTA|SUBJECT|PREHEADER|STRATEGY)\s*:[\s\S]*$/i, "").trim();
  return body;
}

/**
 * Parse the delimited draft format. Robust to the newlines inside email
 * bodies that break JSON parsing.
 */
function parseDelimitedDrafts(raw: string, count: number): EmailVariant[] {
  const cleaned = raw.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "");
  const parts = cleaned
    .split(/\[\[\s*DRAFT[^\]]*\]\]/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: EmailVariant[] = [];
  for (const block of parts) {
    // A real draft block must at least have a SUBJECT and a BODY.
    if (!/BODY\s*:/i.test(block) || !/SUBJECT\s*:/i.test(block)) continue;
    const subject = field(block, "SUBJECT");
    const body = extractBody(block);
    if (!subject && !body) continue;
    out.push({
      variant: String(out.length + 1),
      strategy: field(block, "STRATEGY") || ANGLES[out.length]?.short || "Cold email",
      subject,
      preheader: field(block, "PREHEADER"),
      body: body || subject,
      cta: field(block, "CTA"),
    });
    if (out.length >= count) break;
  }
  return out;
}

/** Secondary path: some models still return valid JSON — normalize it. */
function normalizeJsonVariants(arr: any[], count: number): EmailVariant[] {
  return arr
    .filter((v) => v && (v.subject || v.body))
    .slice(0, count)
    .map((v, i) => ({
      variant: String(i + 1),
      strategy: String(v.strategy || ANGLES[i]?.short || "Cold email"),
      subject: String(v.subject || "").trim(),
      preheader: String(v.preheader || "").trim(),
      body: String(v.body || "").trim(),
      cta: String(v.cta || "").trim(),
    }));
}

export class EmailCopywriter {
  async run(params: {
    productName: string;
    productDesc?: string;
    targetAudience: string;
    valueProp?: string;
    goal?: string;
    tone?: string;
    brand?: string;
    url?: string;
    draftCount?: number; // 1-3
    productImageDesc?: string; // VLM-generated description of the product picture
  }): Promise<EmailCampaignResult> {
    const {
      productName,
      productDesc,
      targetAudience,
      valueProp,
      goal = "leads",
      tone = "professional",
      brand,
      url,
      draftCount = 2,
      productImageDesc,
    } = params;

    const count = Math.max(1, Math.min(3, draftCount));

    // Node 1: quick SEO keyword ideas (robust comma-list, no web-search dependency)
    let seoKeywords: string[] = [];
    try {
      const kwRaw = await llm(
        SYSTEM,
        `List 6-8 short, high-intent keywords/phrases that "${targetAudience}" would actually search for, related to "${productName}"${productDesc ? ` (${productDesc})` : ""}. Reply with ONLY a comma-separated list — no numbering, no other text.`
      );
      seoKeywords = kwRaw
        .split(/[,\n]/)
        .map((s) => s.replace(/^[-*\d.\s]+/, "").trim())
        .filter((s) => s && s.length < 40)
        .slice(0, 8);
    } catch {
      // non-fatal
    }

    // Node 2: generate N draft emails with distinct angles — DELIMITED format
    // (not JSON) so multi-line bodies never break parsing.
    const angleLines = ANGLES.slice(0, count)
      .map((a, i) => `  Draft ${i + 1}: ${a.label}`)
      .join("\n");

    const genPrompt = `Write ${count} cold email draft${count > 1 ? "s" : ""}. Each draft uses a DIFFERENT angle so the reader has a real choice:
${angleLines}

Campaign brief:
- Product / service: ${productName}
- What it does: ${productDesc || "(infer a plausible, specific description from the name)"}
- Who we're emailing: ${targetAudience}
- Value proposition: ${valueProp || "(derive a compelling, specific one)"}
- Goal of the email: ${goal}
- Tone: ${tone}
${brand ? `- Brand voice: ${brand}` : ""}
${url ? `- Website: ${url}` : ""}
${seoKeywords.length ? `- Weave in naturally ONLY where it fits (never stuff): ${seoKeywords.join(", ")}` : ""}
${productImageDesc ? `- A product image is attached to this email; here is what it shows: ${productImageDesc}\n  Reference the product's look/features naturally to make the email concrete.` : ""}

OUTPUT RULES — follow EXACTLY:
- Plain text ONLY. Do NOT use JSON, markdown, asterisks, or code fences.
- Begin EACH draft with a line containing exactly: [[DRAFT]]
- Then these four labels, each on its own line: STRATEGY:, SUBJECT:, PREHEADER:, CTA:
- Then a line that says exactly BODY: and, on the following lines, the full email body (several short paragraphs). Use {{first_name}} and {{company}} where natural. 70-130 words.

Use this exact template for each draft:
[[DRAFT]]
STRATEGY: <the angle for this draft>
SUBJECT: <under 55 chars>
PREHEADER: <under 90 chars>
CTA: <one low-friction ask>
BODY:
Hi {{first_name}},

<the rest of the email>`;

    const raw = await llm(SYSTEM, genPrompt);

    // Primary: delimited parse (newline-safe).
    let variants = parseDelimitedDrafts(raw, count);

    // Secondary: if the model ignored the format and returned JSON, salvage it.
    if (!variants.length) {
      const parsed = extractJson<any>(raw);
      const arr = Array.isArray(parsed?.variants) ? parsed!.variants : Array.isArray(parsed) ? parsed : null;
      if (arr) variants = normalizeJsonVariants(arr, count);
    }

    // Last resort: NEVER surface raw JSON/model scaffolding as an email. Build
    // a clean, human templated draft from the brief instead.
    if (!variants.length) {
      variants = [buildFallbackDraft(productName, targetAudience, valueProp, goal)];
    }

    return {
      variants,
      seoKeywords,
      notes:
        "Pick the strongest angle for your list, send in small batches, and keep sending windows to business hours in the recipient's timezone. The {{first_name}} and {{company}} tokens are replaced per-recipient when you send.",
    };
  }
}

/** Clean, human fallback — used only if both parsers fail. Never JSON. */
function buildFallbackDraft(
  productName: string,
  targetAudience: string,
  valueProp?: string,
  goal?: string
): EmailVariant {
  const promise = valueProp || `get more out of ${productName} without the busywork`;
  return {
    variant: "1",
    strategy: "Pain-driven",
    subject: `A quicker path for {{company}}`,
    preheader: `A 15-minute idea for ${targetAudience}`,
    body: `Hi {{first_name}},

I work with ${targetAudience.toLowerCase()} and kept seeing the same bottleneck — marketing that eats hours you don't have.

That's why we built ${productName}: a way to ${promise}.

Worth a quick look for {{company}}? Happy to send a 2-minute example, or grab 15 minutes this week — whatever's easier.

Best,
The ${productName} team`,
    cta: goal === "leads" ? "Open to a quick 15-minute call?" : "Want me to send a short example?",
  };
}

// Re-export personalize from the pure-function module so server-side
// imports from "@/lib/ai/email-copywriter" still work.
export { personalize } from "@/lib/personalize";
