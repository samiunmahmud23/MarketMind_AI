/**
 * AI provider layer.
 *
 * Originally wired to `z-ai-web-dev-sdk`, which only runs inside the z.ai
 * sandbox (it requires a `.z-ai-config` gateway credential and hits internal
 * endpoints). To run anywhere, this now talks to any OpenAI-compatible
 * chat-completions API, configured via environment variables:
 *
 *   LLM_BASE_URL      OpenAI-compatible base, e.g. https://api.z.ai/api/paas/v4
 *   LLM_API_KEY       your provider API key (required to enable AI features)
 *   LLM_MODEL         chat model, e.g. glm-4.6 | gpt-4o-mini | llama-3.3-70b-versatile
 *   LLM_VISION_MODEL  vision-capable model for describeImage (defaults to LLM_MODEL)
 *
 * All calls use POST {base}/chat/completions with `Authorization: Bearer <key>`
 * and the standard `{ model, messages }` -> `{ choices:[{ message:{ content } }] }`.
 */

const BASE_URL = (process.env.LLM_BASE_URL || "https://api.z.ai/api/paas/v4").replace(/\/+$/, "");
const API_KEY = process.env.LLM_API_KEY || "";
const MODEL = process.env.LLM_MODEL || "glm-4.6";
const VISION_MODEL = process.env.LLM_VISION_MODEL || MODEL;
// Cap the completion length. Without this, some providers default to a small
// value and truncate long JSON responses mid-object (breaking JSON parsing).
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || "4096", 10);

function requireKey() {
  if (!API_KEY) {
    throw new Error(
      "AI is not configured: set LLM_API_KEY (and optionally LLM_BASE_URL / LLM_MODEL) in .env, then restart the dev server. See .env.example."
    );
  }
}

type ChatMessage = { role: string; content: any };

/**
 * Low-level OpenAI-compatible chat completion.
 */
async function chatCompletion(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {}
): Promise<any> {
  requireKey();
  const body = JSON.stringify({
    model: opts.model || MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: MAX_TOKENS,
  });

  // Free LLM tiers (e.g. Groq) rate-limit by requests/tokens-per-minute. When
  // several AI features run close together, the provider returns 429. Rather
  // than surfacing a hard 500, retry with backoff — honoring the provider's
  // `retry-after` header (or the "try again in Xs" hint in the body) so the
  // call transparently recovers once the per-minute window resets.
  const MAX_ATTEMPTS = 4;
  let lastStatus = 0;
  let lastDetail = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body,
    });
    if (res.ok) return res.json();

    lastStatus = res.status;
    lastDetail = await res.text().catch(() => "");
    const retriable = res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
    if (!retriable || attempt === MAX_ATTEMPTS - 1) break;

    // How long to wait: Retry-After header (seconds) → body "try again in Xs" → exponential backoff.
    const retryAfter = parseFloat(res.headers.get("retry-after") || "");
    let waitMs: number;
    if (Number.isFinite(retryAfter)) {
      waitMs = retryAfter * 1000;
    } else {
      const m = lastDetail.match(/try again in ([\d.]+)\s*s/i);
      waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 250 : 800 * Math.pow(2, attempt);
    }
    waitMs = Math.min(Math.max(waitMs, 500), 15000); // clamp so a route never hangs
    await new Promise((r) => setTimeout(r, waitMs));
  }

  const hint = lastStatus === 429 ? " — the AI provider's rate limit was hit; wait a moment and try again, or upgrade your LLM plan." : "";
  throw new Error(`LLM request failed (${lastStatus})${hint}: ${lastDetail.slice(0, 300)}`);
}

/**
 * Backwards-compatible client shim.
 * Kept so existing callers (e.g. the LangChain wrapper) keep working after
 * the migration off z-ai-web-dev-sdk.
 */
export async function getZAI() {
  return {
    chat: {
      completions: {
        create: (body: any) =>
          chatCompletion(body.messages, { model: body.model, temperature: body.temperature }),
        createVision: (body: any) =>
          chatCompletion(body.messages, { model: body.model || VISION_MODEL, temperature: body.temperature }),
      },
    },
    functions: {
      invoke: async (name: string, args: any) => {
        if (name === "page_reader") return { data: await readPage(args?.url) };
        if (name === "web_search") return await webSearch(args?.query, args?.num);
        return null;
      },
    },
  };
}

/**
 * Run an LLM chat completion with a system + user message.
 */
export async function llm(
  systemPrompt: string,
  userMessage: string,
  _opts: { thinking?: boolean } = {}
): Promise<string> {
  const data = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Describe an image using a vision-capable model. Accepts a data URL
 * (data:image/...;base64,...) or a public image URL.
 */
export async function describeImage(imageUrl: string, prompt?: string): Promise<string> {
  const data = await chatCompletion(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt || "Describe this product image in detail: what the product is, its key features, appearance, target use, and any visible branding or text. Be concrete and marketing-relevant." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    { model: VISION_MODEL }
  );
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Fetch a web page's HTML server-side (replaces the sandbox page_reader).
 * Returns { url, html, title } — best-effort; never throws.
 */
export async function readPage(
  url: string
): Promise<{ url: string; html: string; title: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketMindAI/1.0; +https://marketmind.ai/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return { url, html, title: (titleMatch?.[1] || url).trim() };
  } catch (e: any) {
    return { url, html: "", title: url, error: e?.message };
  }
}

/**
 * Web search. The sandbox provided this via an internal function; there is no
 * universal free search API, so this returns [] unless a provider is wired via
 * SEARCH_API_URL/SEARCH_API_KEY (OpenAI-compatible JSON body). Every caller
 * treats [] as "no external research" and degrades gracefully.
 */
export async function webSearch(query: string, num = 8): Promise<any[]> {
  const endpoint = process.env.SEARCH_API_URL;
  const key = process.env.SEARCH_API_KEY;
  if (!endpoint || !key) return [];
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, num }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return (data as any)?.data ?? (data as any)?.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Strip HTML to plain text.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extract <title>, meta description, meta keywords, h1s, word count from raw HTML.
 */
export function extractSeoSignals(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  const keywordsMatch = html.match(
    /<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i
  );
  const ogTitleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  const ogDescMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  );
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").trim()
  );
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").trim()
  );
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
    (m) => m[1]
  );
  const imgsWithoutAlt = (
    html.match(/<img(?![^>]*\salt=)[^>]*>/gi) || []
  ).length;
  const internalLinks = [...html.matchAll(/href=["'](\/[^"']*)["']/gi)].map(
    (m) => m[1]
  );
  const externalLinks = [
    ...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi),
  ].map((m) => m[1]);

  const text = htmlToText(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: (titleMatch?.[1] || ogTitleMatch?.[1] || "").trim(),
    metaDescription: (descMatch?.[1] || ogDescMatch?.[1] || "").trim(),
    metaKeywords: (keywordsMatch?.[1] || "").trim(),
    h1s,
    h2s: h2s.slice(0, 20),
    images: imgs.length,
    imgsWithoutAlt,
    internalLinks: internalLinks.length,
    externalLinks: externalLinks.length,
    wordCount,
    text,
  };
}

/**
 * Robustly extract a JSON object/array from an LLM response that may wrap it
 * in markdown fences or include surrounding prose.
 */
export function extractJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    // fall through
  }
  const start = s.search(/[{[]/);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
