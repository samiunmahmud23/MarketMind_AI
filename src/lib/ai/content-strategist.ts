import { llm, extractJson, webSearch } from "./zai";

export interface CopyVariant {
  label: string;
  content: string;
}

export interface CopyResult {
  variants: CopyVariant[];
  notes?: string;
}

export interface ContentResult {
  title: string;
  metaDesc: string;
  outline: { heading: string; points: string[] }[];
  content: string; // markdown
  wordCount: number;
}

const COPY_SYSTEM = `You are MarketMind's Copywriter agent — a direct-response copywriter trained on Ogilvy, Halbert, and modern conversion copywriting. You write platform-native copy: Google Ads (responsive), Meta ads (thumb-stopping hooks), LinkedIn (authority), X (punchy), and landing pages (problem-agitate-solve).

Rules:
- Hooks in first 3 seconds / first 8 words.
- Benefits > features. Specifics > generalities.
- One CTA per asset.
- Match platform tone.

Respond in valid JSON when asked.`;

const CONTENT_SYSTEM = `You are MarketMind's ContentStrategist agent — an SEO content writer and strategist. You produce pillar articles, blog posts, content calendars, and content strategies that rank and convert.

Rules:
- Target keywords naturally in H1, first 100 words, H2s, and conclusion.
- Use clear H2/H3 hierarchy, short paragraphs, bullets, and a CTA.
- Include FAQ section for GEO/AI-citability (Perplexity, ChatGPT).
- Word counts: blog 900-1400, pillar 1800-2500.
- Write in active voice, second person.

Respond in valid JSON when asked, rich Markdown for final content.`;

export class Copywriter {
  async run(params: {
    type: string; // ad | landing | headline | cta | social | product
    brand: string;
    product: string;
    audience: string;
    tone?: string;
    platform?: string;
    angle?: string;
  }): Promise<CopyResult> {
    const { type, brand, product, audience, tone = "professional", platform, angle } = params;

    const prompt = `Generate marketing copy. Return STRICT JSON.

Type: ${type}
Brand: ${brand}
Product: ${product}
Target audience: ${audience}
Tone: ${tone}
Platform: ${platform || "general"}
Angle: ${angle || "mix of pain, outcome, authority"}

Return JSON:
{
  "variants": [
    {"label":"short descriptive label","content":"the actual copy"},
    {"label":"...","content":"..."}
  ],
  "notes":"1-2 sentences on usage/testing"
}

For "${type}" produce an appropriate number of variants:
- ad: 5 platform-ready ad copies (hook + body + CTA)
- landing: 1 full landing page copy (headline, subhead, 3 benefit bullets, problem, solution, CTA)
- headline: 8 headline variations
- cta: 8 CTA button / link variations (2-5 words each)
- social: 5 social posts with hooks + hashtags
- product: 1 product description (title, 2-paragraph description, 5 feature bullets)

No markdown fences.`;

    const raw = await llm(COPY_SYSTEM, prompt);
    const parsed = extractJson<CopyResult>(raw);
    if (parsed?.variants?.length) return parsed;
    return {
      variants: [{ label: type, content: raw.slice(0, 1200) }],
      notes: "Raw fallback.",
    };
  }
}

export class ContentStrategist {
  async run(params: {
    type: string; // blog | strategy | calendar | pillar
    topic: string;
    brand?: string;
    audience?: string;
    keywords?: string[];
  }): Promise<ContentResult> {
    const { type, topic, brand, audience, keywords } = params;

    // Node 1: optional keyword research
    let finalKeywords = keywords || [];
    if (!finalKeywords.length) {
      try {
        const results = await webSearch(`${topic} best guide`, 6);
        const kwRaw = await llm(
          CONTENT_SYSTEM,
          `Extract 6-8 SEO keywords for an article about "${topic}". Return JSON {"keywords":["..."]}\n\n${(results as any[]).slice(0, 5).map((r) => r?.snippet).join("\n")}`
        );
        const kw = extractJson<{ keywords: string[] }>(kwRaw);
        finalKeywords = kw?.keywords || [];
      } catch {
        // non-fatal
      }
    }

    if (type === "calendar") {
      const calPrompt = `Create a 4-week content calendar for "${topic}".
${brand ? `Brand: ${brand}` : ""}
${audience ? `Audience: ${audience}` : ""}
${finalKeywords.length ? `Keywords: ${finalKeywords.join(", ")}` : ""}

Return STRICT JSON:
{
  "title": "Content Calendar: ${topic}",
  "metaDesc": "...",
  "outline": [{"heading":"Week 1","points":["post idea 1","post idea 2","post idea 3"]},{"heading":"Week 2",...},{"heading":"Week 3",...},{"heading":"Week 4",...}],
  "content": "markdown version of the full calendar with a table: Day | Format | Topic | Keyword | CTA",
  "wordCount": 0
}`;
      const raw = await llm(CONTENT_SYSTEM, calPrompt);
      const parsed = extractJson<ContentResult>(raw);
      if (parsed && typeof parsed.content === "string" && parsed.content.trim()) {
        return {
          title: parsed.title || `Content Calendar: ${topic}`,
          metaDesc: parsed.metaDesc || "",
          outline: Array.isArray(parsed.outline) ? parsed.outline : [],
          content: parsed.content,
          wordCount: parsed.content.split(/\s+/).filter(Boolean).length,
        };
      }
      // Fallback so calendar requests never silently produce a blog article
      return {
        title: `Content Calendar: ${topic}`,
        metaDesc: "",
        outline: [],
        content: raw?.trim() ? raw : "Could not generate calendar. Please try again.",
        wordCount: raw?.trim() ? raw.split(/\s+/).filter(Boolean).length : 0,
      };
    }

    if (type === "strategy") {
      const stratPrompt = `Build a Content Strategy document for "${topic}".
${brand ? `Brand: ${brand}` : ""}
${audience ? `Audience: ${audience}` : ""}
${finalKeywords.length ? `Keywords: ${finalKeywords.join(", ")}` : ""}

Return STRICT JSON:
{
  "title": "Content Strategy: ${topic}",
  "metaDesc": "...",
  "outline": [{"heading":"Audience & Pillars","points":[...]},{"heading":"Topic Clusters","points":[...]},{"heading":"Channel Mix","points":[...]},{"heading":"Cadence","points":[...]},{"heading":"KPIs","points":[...]}],
  "content": "full markdown strategy document with H2 sections: Audience & Content Pillars, Topic Clusters, Channel Mix, Publishing Cadence, KPIs & Measurement, 90-Day Roadmap",
  "wordCount": 0
}`;
      const raw = await llm(CONTENT_SYSTEM, stratPrompt);
      const parsed = extractJson<ContentResult>(raw);
      if (parsed && typeof parsed.content === "string" && parsed.content.trim()) {
        return {
          title: parsed.title || `Content Strategy: ${topic}`,
          metaDesc: parsed.metaDesc || "",
          outline: Array.isArray(parsed.outline) ? parsed.outline : [],
          content: parsed.content,
          wordCount: parsed.content.split(/\s+/).filter(Boolean).length,
        };
      }
      return {
        title: `Content Strategy: ${topic}`,
        metaDesc: "",
        outline: [],
        content: raw?.trim() ? raw : "Could not generate strategy. Please try again.",
        wordCount: raw?.trim() ? raw.split(/\s+/).filter(Boolean).length : 0,
      };
    }

    // blog / pillar
    const isPillar = type === "pillar";
    const targetWords = isPillar ? 2000 : 1100;

    const outlinePrompt = `Create an article outline for a ${isPillar ? "pillar" : "blog"} article on "${topic}".
${brand ? `Brand: ${brand}` : ""}
${audience ? `Audience: ${audience}` : ""}
${finalKeywords.length ? `Target keywords: ${finalKeywords.join(", ")}` : ""}

Return STRICT JSON:
{
  "title": "SEO-optimized H1 title",
  "metaDesc": "155-char meta description",
  "outline": [{"heading":"H2 section","points":["subpoint","subpoint"]}, ...]
}

Include sections: Introduction, ${isPillar ? "4-6 main sections" : "3-4 main sections"}, FAQ (3-5 questions for GEO), Conclusion, CTA.`;
    const outlineRaw = await llm(CONTENT_SYSTEM, outlinePrompt);
    const outlineParsed = extractJson<{
      title: string;
      metaDesc: string;
      outline: { heading: string; points: string[] }[];
    }>(outlineRaw);

    const title = outlineParsed?.title || topic;
    const metaDesc = outlineParsed?.metaDesc || "";
    const outline = outlineParsed?.outline || [];

    const writePrompt = `Write the full ${isPillar ? "pillar" : "blog"} article in Markdown for: "${title}".

Use this outline (write each H2 section with rich content):
${JSON.stringify(outline, null, 2)}

Requirements:
- Target keywords: ${finalKeywords.join(", ") || "natural to topic"}
- ~${targetWords} words.
- Use H2 (##) for sections, H3 (###) for subsections.
- Short paragraphs, bullets where helpful.
- Include a FAQ section (## FAQ) with 3-5 Q&As (bold the question).
- End with a Conclusion and a single CTA.
- Do NOT include a top-level H1 — I'll add the title separately. Start with the first ## section.
- Write in active voice, second person ("you").`;

    const content = await llm(CONTENT_SYSTEM, writePrompt);
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      title,
      metaDesc,
      outline,
      content,
      wordCount,
    };
  }
}
