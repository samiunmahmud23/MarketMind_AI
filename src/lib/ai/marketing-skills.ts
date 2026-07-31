import { readPage, htmlToText, extractSeoSignals, llm, extractJson, webSearch } from "./zai";

/* ============================================================
   4 NEW AGENTS inspired by coreyhaines31/marketingskills
   - AiSeoAgent      (GEO/AEO — get cited by AI search engines)
   - CompetitorAgent (research competitors from URLs)
   - CroAgent        (conversion rate optimization audit)
   - SchemaAgent     (JSON-LD structured data generator)
   ============================================================ */

const AI_SEO_SYSTEM = `You are MarketMind's AI-SEO agent — an expert in AI search optimization (AEO/GEO/LLMO). Your goal is to make content discoverable, extractable, and citable by AI systems including Google AI Overviews, ChatGPT, Perplexity, Claude, Gemini, and Copilot.

Principles:
- AI search engines favor content that is structured, factual, and easily extractable.
- Direct answer paragraphs (30-50 words) at the top of pages get cited most.
- FAQ sections, comparison tables, and clear definitions boost AI visibility.
- llms.txt and structured data help AI agents understand the site.
- Brand mentions across the web increase AI citation likelihood.

Respond in valid JSON when asked, rich Markdown for prose.`;

const COMPETITOR_SYSTEM = `You are MarketMind's Competitor Profiling agent — a competitive intelligence analyst. You take competitor URLs and produce structured competitor profile documents by combining live site scraping with market analysis.

Principles:
- Every claim should be traceable to scraped page content or search data.
- All profiles follow the same template so they're comparable.
- Label inferences clearly vs. facts from the page.
- Focus on: positioning, pricing, target audience, strengths, weaknesses, content strategy, tech stack.

Respond in valid JSON when asked, rich Markdown for prose.`;

const CRO_SYSTEM = `You are MarketMind's CRO agent — a conversion rate optimization expert. You analyze marketing pages and provide actionable, prioritized recommendations to improve conversion rates.

CRO Analysis Framework (in order of impact):
1. Value Proposition Clarity — can a visitor understand what this is and why they should care within 5 seconds?
2. Call-to-Action — is there a single, clear, contrasting CTA? Is the button text action-oriented?
3. Trust & Credibility — social proof, testimonials, security badges, guarantees?
4. Friction Reduction — form fields, steps, cognitive load, distractions?
5. Mobile Experience — responsive, touch-friendly, fast?
6. Visual Hierarchy — does the design guide the eye to the CTA?

Score each dimension 0-100. Be specific and cite actual page elements.

Respond in valid JSON when asked, rich Markdown for prose.`;

const SCHEMA_SYSTEM = `You are MarketMind's Schema Markup agent — an expert in structured data and schema.org markup. You implement JSON-LD that helps search engines understand content and enables rich results.

Principles:
- Use JSON-LD format (Google's recommendation).
- Only mark up content that actually exists on the page.
- Include the most impactful schema types: Organization, WebSite, BreadcrumbList, FAQPage, Product, Article, HowTo.
- Validate everything — accurate schema only.
- Provide ready-to-paste JSON-LD that the user can add to their <head>.

Respond in valid JSON when asked, rich Markdown for prose.`;

/* -------------------- AI-SEO Agent -------------------- */

export interface AiSeoResult {
  url: string;
  domain: string;
  overallScore: number;
  scoreBreakdown: { aiVisibility: number; contentExtractability: number; structuredData: number; citationReadiness: number };
  aiVisibility: { platform: string; present: boolean; summary: string }[];
  recommendations: { issue: string; recommendation: string }[];
  report: string;
  llmsTxt: string;
}

export class AiSeoAgent {
  async run(url: string): Promise<AiSeoResult> {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    let domain = "";
    try { domain = new URL(normalized).hostname.replace(/^www\./, ""); } catch { domain = normalized; }

    // 1. Fetch page
    let html = "";
    try { const page = await readPage(normalized); html = (page as any)?.html || ""; } catch {}

    // 2. Check AI visibility via web search
    let aiVisibility: { platform: string; present: boolean; summary: string }[] = [];
    try {
      const results = await webSearch(`${domain} site:perplexity.ai OR site:chatgpt.com`, 5);
      aiVisibility = [
        { platform: "Google AI Overviews", present: false, summary: "Cannot verify programmatically — check manually by searching key queries in Google." },
        { platform: "ChatGPT", present: false, summary: "Check by asking ChatGPT about topics related to your domain." },
        { platform: "Perplexity", present: results.length > 0, summary: results.length > 0 ? `${results.length} mentions found in search.` : "No mentions found." },
      ];
    } catch {}

    // 3. Structured LLM analysis
    const auditPrompt = `Audit this website for AI search optimization (AEO/GEO/LLMO). Return STRICT JSON.

URL: ${normalized}
Domain: ${domain}
Title: ${extractSeoSignals(html).title || "unknown"}
Word count: ${extractSeoSignals(html).wordCount}
Has structured data: ${html.includes("application/ld+json")}

Return:
{
  "overallScore": 0-100,
  "scoreBreakdown": {"aiVisibility":0-100,"contentExtractability":0-100,"structuredData":0-100,"citationReadiness":0-100},
  "recommendations": [{"issue":"...","recommendation":"specific actionable fix"}]
}

Focus on: direct-answer paragraphs, FAQ sections, factual content, structured data presence, content clarity, and citation likelihood. 6-10 recommendations. No markdown.`;

    const auditRaw = await llm(AI_SEO_SYSTEM, auditPrompt);
    const audit = extractJson<any>(auditRaw) || { overallScore: 0, scoreBreakdown: { aiVisibility: 0, contentExtractability: 0, structuredData: 0, citationReadiness: 0 }, recommendations: [] };

    // 4. Markdown report
    const report = await llm(AI_SEO_SYSTEM, `Write an AI-SEO (GEO/AEO) optimization report in Markdown for ${domain}.

Audit data: ${JSON.stringify(audit, null, 2)}

Use H2 sections: ## AI Visibility Summary, ## Content Extractability, ## Citation Readiness, ## Structured Data for AI, ## llms.txt Recommendation, ## Action Plan (numbered, prioritized). No top-level H1.`);

    // 5. Generate llms.txt suggestion
    const llmsTxt = await llm(AI_SEO_SYSTEM, `Generate an llms.txt file for ${domain}. llms.txt is a simple text file that helps AI agents understand what your site is about. Format:

# ${domain}

> Brief description of what the site/product does.

## Key Pages
- [Page title](URL): description
- [Page title](URL): description

## About
Brief about section.

Keep it under 20 lines. Based on the page title "${extractSeoSignals(html).title || domain}".`);

    return {
      url: normalized,
      domain,
      overallScore: audit.overallScore || 0,
      scoreBreakdown: audit.scoreBreakdown || { aiVisibility: 0, contentExtractability: 0, structuredData: 0, citationReadiness: 0 },
      aiVisibility,
      recommendations: audit.recommendations || [],
      report,
      llmsTxt,
    };
  }
}

/* -------------------- Competitor Profiling Agent -------------------- */

export interface CompetitorResult {
  url: string;
  name: string;
  domain: string;
  description: string;
  profile: { pricing: string; positioning: string; targetAudience: string; strengths: string[]; weaknesses: string[]; techStack: string[] };
  report: string;
}

export class CompetitorAgent {
  async run(url: string): Promise<CompetitorResult> {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    let domain = "";
    try { domain = new URL(normalized).hostname.replace(/^www\./, ""); } catch { domain = normalized; }

    // 1. Fetch page
    let pageText = "";
    let pageTitle = domain;
    try {
      const page = await readPage(normalized);
      pageText = htmlToText((page as any)?.html || "").slice(0, 10000);
      pageTitle = (page as any)?.title || domain;
    } catch {}

    // 2. Research
    let researchContext = "";
    try {
      const results = await webSearch(`${domain} pricing reviews competitors alternatives`, 5);
      researchContext = (results as any[]).slice(0, 4).map((r) => `- ${r?.name}: ${r?.snippet}`).join("\n");
    } catch {}

    // 3. Structured profile
    const profilePrompt = `Create a structured competitor profile for this website. Return STRICT JSON.

URL: ${normalized}
Domain: ${domain}
Page title: ${pageTitle}
Page content (truncated): ${pageText.slice(0, 6000)}
Research context: ${researchContext}

Return:
{
  "name": "company name",
  "description": "1-2 sentence description",
  "profile": {
    "pricing": "pricing model and tiers if known, or 'not publicly available'",
    "positioning": "how they position themselves",
    "targetAudience": "who they target",
    "strengths": ["3-5 concrete strengths"],
    "weaknesses": ["3-5 weaknesses or gaps"],
    "techStack": ["technologies detected or likely"]
  }
}
No markdown.`;

    const profileRaw = await llm(COMPETITOR_SYSTEM, profilePrompt);
    const parsed = extractJson<any>(profileRaw) || { name: pageTitle, description: "", profile: {} };

    // 4. Full markdown report
    const report = await llm(COMPETITOR_SYSTEM, `Write a comprehensive competitor profile report in Markdown for ${parsed.name || domain}.

Profile data: ${JSON.stringify(parsed, null, 2)}

Use H2 sections: ## Company Overview, ## Positioning, ## Target Audience, ## Pricing, ## Strengths, ## Weaknesses & Gaps, ## Content & SEO Strategy, ## Opportunities for Us. No top-level H1.`);

    return {
      url: normalized,
      name: parsed.name || pageTitle,
      domain,
      description: parsed.description || "",
      profile: parsed.profile || { pricing: "", positioning: "", targetAudience: "", strengths: [], weaknesses: [], techStack: [] },
      report,
    };
  }
}

/* -------------------- CRO Agent -------------------- */

export interface CroResult {
  url: string;
  pageType: string;
  overallScore: number;
  scoreBreakdown: { valueProp: number; clarity: number; ctas: number; trust: number; friction: number; mobile: number };
  issues: { priority: "high" | "medium" | "low"; issue: string; recommendation: string; impact: string }[];
  report: string;
}

export class CroAgent {
  async run(url: string): Promise<CroResult> {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

    // 1. Fetch page
    let pageText = "";
    let pageTitle = "";
    try {
      const page = await readPage(normalized);
      pageText = htmlToText((page as any)?.html || "").slice(0, 10000);
      pageTitle = (page as any)?.title || "";
    } catch {}

    // 2. Structured CRO audit
    const auditPrompt = `Perform a CRO (conversion rate optimization) audit on this page. Return STRICT JSON.

URL: ${normalized}
Page title: ${pageTitle}
Page content (truncated): ${pageText.slice(0, 7000)}

Return:
{
  "pageType": "homepage|landing|pricing|feature|blog|other",
  "overallScore": 0-100,
  "scoreBreakdown": {"valueProp":0-100,"clarity":0-100,"ctas":0-100,"trust":0-100,"friction":0-100,"mobile":0-100},
  "issues": [{"priority":"high|medium|low","issue":"specific problem","recommendation":"specific fix","impact":"expected impact"}]
}

Analyze: value proposition clarity, CTA quality, trust signals, friction, visual hierarchy. 6-10 issues. Be specific — cite actual page elements. No markdown.`;

    const auditRaw = await llm(CRO_SYSTEM, auditPrompt);
    const audit = extractJson<any>(auditRaw) || { pageType: "unknown", overallScore: 0, scoreBreakdown: {}, issues: [] };

    // 3. Markdown report
    const report = await llm(CRO_SYSTEM, `Write a CRO audit report in Markdown for ${normalized}.

Audit data: ${JSON.stringify(audit, null, 2)}

Use H2 sections: ## CRO Scorecard (table), ## High Priority Fixes, ## Medium Priority, ## Low Priority, ## Quick Wins, ## A/B Test Ideas. No top-level H1.`);

    return {
      url: normalized,
      pageType: audit.pageType || "unknown",
      overallScore: audit.overallScore || 0,
      scoreBreakdown: audit.scoreBreakdown || { valueProp: 0, clarity: 0, ctas: 0, trust: 0, friction: 0, mobile: 0 },
      issues: audit.issues || [],
      report,
    };
  }
}

/* -------------------- Schema Markup Agent -------------------- */

export interface SchemaResult {
  url: string;
  pageType: string;
  jsonLd: string;
  existingAudit: { type: string; status: string; detail: string }[];
  report: string;
}

export class SchemaAgent {
  async run(url: string): Promise<SchemaResult> {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

    // 1. Fetch page + check existing schema
    let html = "";
    let pageTitle = "";
    try {
      const page = await readPage(normalized);
      html = (page as any)?.html || "";
      pageTitle = (page as any)?.title || "";
    } catch {}

    const existingSchema = html.includes("application/ld+json");
    const existingTypes: string[] = [];
    if (existingSchema) {
      const matches = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)];
      matches.forEach((m) => { if (m[1] && !existingTypes.includes(m[1])) existingTypes.push(m[1]); });
    }

    // 2. Generate JSON-LD
    const genPrompt = `Generate JSON-LD schema markup for this page. Return STRICT JSON.

URL: ${normalized}
Page title: ${pageTitle}
Existing schema types: ${existingTypes.length ? existingTypes.join(", ") : "none"}

Based on the page content, generate the most impactful JSON-LD markup. Return:
{
  "pageType": "homepage|product|article|landing|faq|other",
  "jsonLd": "the full JSON-LD as a string (can contain multiple @graph entries)",
  "existingAudit": [{"type":"schema type found","status":"ok|warning|error","detail":"what's there or missing"}],
  "recommendations": "brief text about what to add"
}

Generate valid JSON-LD for: Organization, WebSite, BreadcrumbList, and FAQPage (if applicable). Make it production-ready. No markdown.`;

    const genRaw = await llm(SCHEMA_SYSTEM, genPrompt);
    const parsed = extractJson<any>(genRaw) || { pageType: "unknown", jsonLd: "", existingAudit: [] };

    // 3. Markdown report
    const report = await llm(SCHEMA_SYSTEM, `Write a schema markup report in Markdown for ${normalized}.

Data: ${JSON.stringify({ pageType: parsed.pageType, existingTypes, existingAudit: parsed.existingAudit }, null, 2)}

Use H2 sections: ## Current Schema Status, ## Recommended Schema Types, ## Implementation Guide, ## Validation Checklist. No top-level H1.`);

    return {
      url: normalized,
      pageType: parsed.pageType || "unknown",
      jsonLd: parsed.jsonLd || "",
      existingAudit: parsed.existingAudit || [],
      report,
    };
  }
}
