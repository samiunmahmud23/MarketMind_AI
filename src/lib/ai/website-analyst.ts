import { readPage, htmlToText, llm, extractJson, webSearch } from "./zai";

export interface WebsiteAnalysisResult {
  url: string;
  sourceType: string;
  title: string;
  industry: string;
  description: string;
  summary: string;
  scores: {
    overall: number;
    clarity: number;
    valueProposition: number;
    design: number;
    content: number;
    conversion: number;
    trust: number;
  };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  competitors: string[];
  targetAudience: string;
  recommendations: { title: string; detail: string }[];
  report: string; // full markdown
  meta: Record<string, any>;
  wordCount: number;
}

const SYSTEM = `You are MarketMind's WebsiteAnalyst agent — a senior growth strategist and brand analyst with 15+ years experience auditing websites for SaaS, e-commerce, and service businesses.

You receive raw page content and produce a rigorous, evidence-based analysis. You are concrete, specific, and never generic. Every claim must trace back to something actually present (or missing) on the page.

You always respond with valid JSON when asked, and rich Markdown when asked for prose.`;

/**
 * WebsiteAnalyst agent.
 * Pipeline:
 *   1. fetch   — read the page via page_reader
 *   2. extract — pull plain text + brand signals
 *   3. research — web_search competitor / industry context
 *   4. analyze — LLM structured analysis (scores, SWOT, audience)
 *   5. report  — LLM full markdown report
 */
export class WebsiteAnalyst {
  async run(url: string): Promise<WebsiteAnalysisResult> {
    // Normalize URL
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    const sourceType = /facebook\.com/i.test(normalized)
      ? "facebook"
      : /instagram\.com/i.test(normalized)
      ? "instagram"
      : "website";

    // Node 1: fetch
    let pageHtml = "";
    let pageTitle = normalized;
    let pageUrl = normalized;
    let publishedTime: string | undefined;
    try {
      const page = await readPage(normalized);
      pageHtml = (page as any)?.html || "";
      pageTitle = (page as any)?.title || normalized;
      pageUrl = (page as any)?.url || normalized;
      publishedTime = (page as any)?.publishedTime;
    } catch (e) {
      // If page_reader fails, we still attempt analysis with the URL
      pageHtml = "";
    }

    // Node 2: extract
    const text = htmlToText(pageHtml).slice(0, 12000);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Node 3: research — competitor & industry context
    let competitors: string[] = [];
    try {
      const results = await webSearch(
        `${pageTitle} competitors alternatives`,
        6
      );
      competitors = (results as any[])
        .slice(0, 5)
        .map((r) => r?.host_name || r?.url || "")
        .filter(Boolean);
    } catch {
      // non-fatal
    }

    // Node 4: structured analysis
    const analysisPrompt = `Analyze this webpage and return STRICT JSON only (no markdown, no commentary).

URL: ${pageUrl}
Page Title: ${pageTitle}
Source type: ${sourceType}
${publishedTime ? `Published: ${publishedTime}` : ""}

PAGE CONTENT (truncated):
"""
${text.slice(0, 9000)}
"""

${competitors.length ? `Competitor domains found via search: ${competitors.join(", ")}` : ""}

Return JSON with this exact shape:
{
  "title": "best descriptive title for the business",
  "industry": "the industry/niche",
  "description": "1-2 sentence description of what the business does",
  "targetAudience": "who they seem to target",
  "scores": {
    "overall": 0-100,
    "clarity": 0-100,
    "valueProposition": 0-100,
    "design": 0-100,
    "content": 0-100,
    "conversion": 0-100,
    "trust": 0-100
  },
  "strengths": ["3-5 concrete strengths"],
  "weaknesses": ["3-5 concrete weaknesses"],
  "opportunities": ["3-5 growth opportunities"],
  "competitors": ["3-5 likely competitor names/domains"],
  "recommendations": [{"title":"short","detail":"1-2 sentence actionable advice"}]
}

Score honestly. Be specific to THIS page. No placeholder text.`;

    const analysisRaw = await llm(SYSTEM, analysisPrompt);
    const analysis =
      extractJson<Partial<WebsiteAnalysisResult>>(analysisRaw) || {};

    // Node 5: full markdown report
    const reportPrompt = `Write a comprehensive, professional Website Analysis Report in Markdown for a marketing agency client.

Context (from structured analysis):
${JSON.stringify(analysis, null, 2)}

URL analyzed: ${pageUrl}
Source type: ${sourceType}

Structure the report with these H2 sections:
## Executive Summary
## Business Overview
## Target Audience
## Scorecard (use a markdown table with each score + a one-line note)
## Strengths
## Weaknesses & Risks
## Opportunities
## Competitor Landscape
## Strategic Recommendations (numbered, prioritized)
## Next Steps for Marketing

Be specific, evidence-based, and actionable. Write at least 600 words. Use bullet points and tables where helpful. Do NOT include a top-level H1 — start directly with the Executive Summary.`;

    const report = await llm(SYSTEM, reportPrompt);

    const summary =
      (analysis.description as string) ||
      `Analysis of ${pageTitle}. See full report for details.`;

    return {
      url: pageUrl,
      sourceType,
      title: pageTitle,
      industry: (analysis.industry as string) || "Unknown",
      description: summary,
      summary:
        (analysis.description as string) ||
        `Website analysis for ${pageUrl}.`,
      scores: (analysis.scores as WebsiteAnalysisResult["scores"]) || {
        overall: 0,
        clarity: 0,
        valueProposition: 0,
        design: 0,
        content: 0,
        conversion: 0,
        trust: 0,
      },
      strengths: (analysis.strengths as string[]) || [],
      weaknesses: (analysis.weaknesses as string[]) || [],
      opportunities: (analysis.opportunities as string[]) || [],
      competitors: (analysis.competitors as string[]) || competitors,
      targetAudience: (analysis.targetAudience as string) || "",
      recommendations:
        (analysis.recommendations as { title: string; detail: string }[]) ||
        [],
      report,
      meta: {
        publishedTime,
        pageUrl,
        competitorSearch: competitors,
      },
      wordCount,
    };
  }
}
