import { llm, extractJson } from "./zai";

export interface RepurposeOutput {
  summary: string;
  socialPosts: { platform: string; hook: string; caption: string }[];
  emailSequence: { step: number; subject: string; body: string }[];
  adCopies: { angle: string; headline: string; body: string; cta: string }[];
  keyTakeaways: string[];
}

const SYSTEM = `You are MarketMind's ContentRepurposer agent — a content multiplier that takes one piece of long-form content and spins it into a full multi-channel campaign.

Your job is to extract the highest-signal ideas from the source and repackage them natively for each channel — never just truncating the same text. Each output must feel purpose-built for its platform.

Principles:
- Distill the source into 3-5 key takeaways first.
- Social posts: thumb-stopping hooks, platform-native (IG visual, LinkedIn authority, X punchy).
- Email sequence: 3 emails (hook → value → soft CTA), each standalone-readable.
- Ad copies: 3 angles (pain, outcome, authority) with headline + body + CTA.
- Every asset must be self-contained — no "as mentioned above".

Respond in valid JSON only.`;

/**
 * ContentRepurposer agent.
 * Pipeline (single orchestrated LLM call that internally chains the logic):
 *   1. distill — extract key takeaways from the source content
 *   2. repurpose — generate social posts, email sequence, ad copies
 *
 * This is the "cross-agent orchestration" feature: one source → many channels.
 */
export class ContentRepurposer {
  async run(params: {
    sourceType: string; // blog | analysis | topic | url
    sourceTitle: string;
    sourceContent: string;
    brand?: string;
    audience?: string;
  }): Promise<RepurposeOutput> {
    const { sourceType, sourceTitle, sourceContent, brand, audience } = params;

    // Truncate very long source content to keep token budget reasonable
    const content = sourceContent.slice(0, 8000);

    const prompt = `Repurpose this ${sourceType} into a full multi-channel marketing campaign.

SOURCE TITLE: ${sourceTitle}
${brand ? `BRAND: ${brand}` : "BRAND: (derive from content)"}
${audience ? `AUDIENCE: ${audience}` : "AUDIENCE: (derive from content)"}

SOURCE CONTENT:
"""
${content}
"""

Return STRICT JSON with this exact shape:
{
  "summary": "2-3 sentence distillation of what this source is about and why it matters",
  "keyTakeaways": ["3-5 key points extracted from the source"],
  "socialPosts": [
    {"platform":"instagram","hook":"scroll-stopper first line","caption":"8-15 line caption with emojis"},
    {"platform":"linkedin","hook":"authority first line","caption":"6-12 line post, 1-line spacing"},
    {"platform":"x","hook":"punchy <270 char hook","caption":"1-3 tweet thread"}
  ],
  "emailSequence": [
    {"step":1,"subject":"...","body":"welcome/hook email, 80-120 words, single CTA"},
    {"step":2,"subject":"...","body":"value/education email, 100-150 words, single CTA"},
    {"step":3,"subject":"...","body":"soft CTA email, 80-120 words, single CTA"}
  ],
  "adCopies": [
    {"angle":"pain","headline":"...","body":"2-3 line ad body","cta":"..."},
    {"angle":"outcome","headline":"...","body":"...","cta":"..."},
    {"angle":"authority","headline":"...","body":"...","cta":"..."}
  ]
}

No markdown fences. No commentary. Every asset must be self-contained.`;

    const raw = await llm(SYSTEM, prompt);
    const parsed = extractJson<RepurposeOutput>(raw);

    if (parsed?.socialPosts?.length || parsed?.emailSequence?.length || parsed?.adCopies?.length) {
      return {
        summary: parsed.summary || "",
        socialPosts: parsed.socialPosts || [],
        emailSequence: parsed.emailSequence || [],
        adCopies: parsed.adCopies || [],
        keyTakeaways: parsed.keyTakeaways || [],
      };
    }

    // Fallback
    return {
      summary: raw.slice(0, 400),
      socialPosts: [],
      emailSequence: [],
      adCopies: [],
      keyTakeaways: [],
    };
  }
}
