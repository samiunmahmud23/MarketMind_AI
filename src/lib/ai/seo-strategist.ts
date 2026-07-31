import { readPage, htmlToText, extractSeoSignals, llm, extractJson, webSearch } from "./zai";

export interface SeoIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  fix: string;
}

export interface SeoKeyword {
  keyword: string;
  intent: string;
  volume: string;
  difficulty: string;
  opportunity: number; // 0-100
}

export interface SeoAnalysisResult {
  url: string;
  domain: string;
  overallScore: number;
  scoreBreakdown: { onpage: number; technical: number; content: number; performance: number };
  issues: SeoIssue[];
  keywords: SeoKeyword[];
  onPageAudit: {
    titleTag: string;
    metaDescription: string;
    headings: string[];
    images: number;
    links: { internal: number; external: number };
    wordCount: number;
  };
  recommendations: string; // markdown
  actionPlan: string; // markdown — doing SEO based on the condition
}

const SYSTEM = `You are MarketMind's SeoStrategist agent — a technical SEO consultant (think Ahrefs/Semrush expertise) who audits pages and produces prioritized, implementable fixes.

You reason about: title tag length & keyword presence, meta description, heading hierarchy, content depth, internal linking, image alt text, URL structure, Core Web Vitals proxies, keyword gaps vs competitors, and topical authority.

Be precise and cite the actual values found. Respond in valid JSON when asked, rich Markdown for prose.`;

export class SeoStrategist {
  async run(url: string): Promise<SeoAnalysisResult> {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

    let domain = "";
    try {
      domain = new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      domain = normalized;
    }

    // Node 1: fetch page
    let html = "";
    try {
      const page = await readPage(normalized);
      html = (page as any)?.html || "";
    } catch {
      html = "";
    }

    // Node 2: deterministic on-page audit
    const signals = extractSeoSignals(html);

    const onPageAudit = {
      titleTag: signals.title,
      metaDescription: signals.metaDescription,
      headings: [...signals.h1s, ...signals.h2s].slice(0, 15),
      images: signals.images,
      links: { internal: signals.internalLinks, external: signals.externalLinks },
      wordCount: signals.wordCount,
    };

    // Node 3: competitor keyword research via web_search
    let keywords: SeoKeyword[] = [];
    try {
      const results = await webSearch(`${domain} top keywords seo`, 6);
      const kwRaw = await llm(
        SYSTEM,
        `Given this website "${domain}" (title: "${signals.title}") and these search results, produce 8-12 target SEO keywords. Return JSON: {"keywords":[{"keyword":"...","intent":"informational|commercial|transactional|navigational","volume":"low|medium|high","difficulty":"low|medium|high","opportunity":0-100}]}

Search results:
${(results as any[]).slice(0, 5).map((r) => `- ${r?.name}: ${r?.snippet}`).join("\n")}`
      );
      const kw = extractJson<{ keywords: SeoKeyword[] }>(kwRaw);
      keywords = kw?.keywords || [];
    } catch {
      // non-fatal
    }

    // Node 4: structured issues + scoring
    const auditPrompt = `Audit this webpage for SEO. Return STRICT JSON.

URL: ${normalized}
Domain: ${domain}
Title tag: "${signals.title}" (length ${signals.title.length})
Meta description: "${signals.metaDescription}" (length ${signals.metaDescription.length})
H1s: ${JSON.stringify(signals.h1s)}
H2s (first 10): ${JSON.stringify(signals.h2s.slice(0, 10))}
Images: ${signals.images} total, ${signals.imgsWithoutAlt} missing alt text
Internal links: ${signals.internalLinks}, External links: ${signals.externalLinks}
Word count: ${signals.wordCount}
Meta keywords tag: "${signals.metaKeywords}"

${keywords.length ? `Researched target keywords: ${keywords.map((k) => k.keyword).join(", ")}` : ""}

Return:
{
  "overallScore": 0-100,
  "scoreBreakdown": {"onpage":0-100,"technical":0-100,"content":0-100,"performance":0-100},
  "issues": [
    {"type":"title|meta|headings|content|images|links|technical","severity":"critical|warning|info","title":"short label","detail":"what's wrong, citing the actual value","fix":"specific actionable fix"}
  ]
}

Generate 6-12 issues covering the categories. Be specific with real values. No markdown.`;

    const auditRaw = await llm(SYSTEM, auditPrompt);
    const audit = extractJson<{
      overallScore: number;
      scoreBreakdown: SeoAnalysisResult["scoreBreakdown"];
      issues: SeoIssue[];
    }>(auditRaw) || { overallScore: 0, scoreBreakdown: { onpage: 0, technical: 0, content: 0, performance: 0 }, issues: [] };

    // Node 5: recommendations (markdown)
    const recsPrompt = `Write a prioritized SEO Recommendations report in Markdown for ${domain}.

Audit data:
${JSON.stringify(audit, null, 2)}

Target keywords: ${keywords.map((k) => k.keyword).join(", ") || "n/a"}

Use these H2 sections:
## SEO Health Summary (1 paragraph + the score)
## Critical Fixes (highest priority issues — bullets with the fix)
## On-Page Optimization (title, meta, headings)
## Content Strategy (depth, gaps, keyword targeting)
## Technical Recommendations
## Keyword Roadmap (markdown table: keyword | intent | opportunity | suggested page)

No top-level H1. Be concrete and implementable.`;
    const recommendations = await llm(SYSTEM, recsPrompt);

    // Node 6: action plan (doing SEO based on the condition)
    const actionPrompt = `Based on the SEO audit for ${domain} (overall score ${audit.overallScore}/100), write a concrete 30-day SEO Action Plan in Markdown. This is "doing SEO based on the condition" — a hands-on execution plan, not just recommendations.

Audit issues:
${JSON.stringify(audit.issues, null, 2)}

Use these H2 sections:
## Week 1: Critical Fixes
## Week 2: On-Page & Content
## Week 3: Technical & Authority
## Week 4: Measurement & Iteration

Each week should have 3-5 checkbox tasks (\`- [ ] task\`) with a short rationale. End with a "Definition of Done" section listing measurable success criteria.`;
    const actionPlan = await llm(SYSTEM, actionPrompt);

    return {
      url: normalized,
      domain,
      overallScore: audit.overallScore || 0,
      scoreBreakdown: audit.scoreBreakdown || {
        onpage: 0,
        technical: 0,
        content: 0,
        performance: 0,
      },
      issues: audit.issues || [],
      keywords,
      onPageAudit,
      recommendations,
      actionPlan,
    };
  }
}
