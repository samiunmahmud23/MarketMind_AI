import { llm, extractJson, webSearch, readPage, htmlToText } from "./zai";

export interface SocialPost {
  platform: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  imagePrompt?: string;
  bestTime?: string;
  estReach?: string;
}

export interface SocialCampaignResult {
  posts: SocialPost[];
  strategy: string;
  hashtagBank: string[];
  contentPillars: string[];
  postingCadence: { day: string; platform: string; topic: string }[];
}

const SYSTEM = `You are MarketMind's SocialMediaAgent — a social media strategist and copywriter who lives and breathes platform algorithms. You know what stops the scroll on TikTok, what gets saved on Instagram, what earns reshares on LinkedIn, and what sparks threads on X.

Platform DNA:
- Facebook: community + storytelling, 1-2 posts/day, emotive hooks, link in comments
- Instagram: visual-first, thumb-stopping hook in first line, 5-15 relevant hashtags, carousel-friendly, Reels captions
- LinkedIn: authority + insight, professional vulnerability, 1-line spacing, no hashtags spam (3-5 max), doc-style posts
- X (Twitter): punchy, contrarian hot takes, threads for depth, <270 char hooks, 1-2 hashtags max

Always produce platform-native copy. Never recycle the same caption across platforms. Respond in valid JSON when asked.`;

/**
 * SocialMediaAgent.
 * Pipeline:
 *   1. context — optional URL/page fetch OR use the brand+product brief
 *   2. research — web_search trending hooks for the niche
 *   3. strategy — content pillars + cadence
 *   4. generate — platform-specific posts
 */
export class SocialMediaAgent {
  async run(params: {
    brand: string;
    product: string;
    audience: string;
    url?: string;
    platforms: string[]; // ["facebook","instagram","linkedin","x"]
    postsPerPlatform?: number;
    goal?: string;
  }): Promise<SocialCampaignResult> {
    const {
      brand,
      product,
      audience,
      url,
      platforms,
      postsPerPlatform = 2,
      goal = "engagement",
    } = params;

    // Node 1: optional page context
    let pageContext = "";
    if (url) {
      try {
        const page = await readPage(url);
        const text = htmlToText((page as any)?.html || "").slice(0, 3000);
        pageContext = `\n\nWebsite content (for context):\n${text}`;
      } catch {
        // non-fatal
      }
    }

    // Node 2: trending hooks research
    let trendSnippets = "";
    try {
      const results = await webSearch(
        `${product} ${audience} trending social media content ideas 2025`,
        5
      );
      trendSnippets = (results as any[])
        .slice(0, 4)
        .map((r) => `- ${r?.name || ""}: ${r?.snippet || ""}`)
        .join("\n");
    } catch {
      // non-fatal
    }

    // Node 3 + 4: strategy + posts in one structured call
    const prompt = `Create a multi-platform social media campaign. Return STRICT JSON.

Brand: ${brand}
Product: ${product}
Target audience: ${audience}
Goal: ${goal}
Platforms: ${platforms.join(", ")}
Posts per platform: ${postsPerPlatform}
${pageContext}
${trendSnippets ? `\nTrending content signals:\n${trendSnippets}` : ""}

Return JSON with this exact shape:
{
  "contentPillars": ["3-4 content pillars/themes for this brand"],
  "hashtagBank": ["10-15 relevant hashtags, mix of broad + niche"],
  "strategy": "2-3 sentence platform strategy summary",
  "postingCadence": [
    {"day":"Monday","platform":"instagram","topic":"..."},
    {"day":"Wednesday","platform":"linkedin","topic":"..."},
    {"day":"Friday","platform":"x","topic":"..."},
    {"day":"Saturday","platform":"facebook","topic":"..."}
  ],
  "posts": [
    {
      "platform": "instagram|facebook|linkedin|x",
      "hook": "the first line / scroll-stopper, platform-native",
      "caption": "full caption text (instagram: 8-15 lines with emojis; facebook: 3-6 lines storytelling; linkedin: 6-12 lines 1-line spacing; x: 1-3 tweets max 270 chars)",
      "hashtags": ["3-8 platform-appropriate hashtags"],
      "cta": "single clear call-to-action",
      "imagePrompt": "a 1-sentence visual direction for the image/design",
      "bestTime": "best posting time for this platform",
      "estReach": "estimated relative reach: low|medium|high"
    }
  ]
}

Generate ${postsPerPlatform} posts for EACH of these platforms: ${platforms.join(", ")}. Total posts = ${platforms.length * postsPerPlatform}. No markdown fences, no commentary.`;

    const raw = await llm(SYSTEM, prompt);
    const parsed = extractJson<SocialCampaignResult>(raw);

    if (parsed?.posts?.length) {
      // filter posts to only requested platforms (safety)
      const filtered = parsed.posts.filter((p) =>
        platforms.includes(p.platform.toLowerCase())
      );
      return {
        posts: filtered.length ? filtered : parsed.posts,
        strategy: parsed.strategy || "",
        hashtagBank: parsed.hashtagBank || [],
        contentPillars: parsed.contentPillars || [],
        postingCadence: parsed.postingCadence || [],
      };
    }

    return {
      posts: [],
      strategy: raw.slice(0, 600),
      hashtagBank: [],
      contentPillars: [],
      postingCadence: [],
    };
  }
}
