import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ZaiChatModel } from "./zai-chat-model";
import { RagVectorStore } from "./zai-embeddings";
import { readPage, htmlToText, webSearch } from "../ai/zai";

/* ============================================================
   LANGGRAPH MARKETING WORKFLOW
   ============================================================
   This is a LangGraph StateGraph that orchestrates the full
   marketing analysis pipeline with:
   - Typed state (Annotation)
   - Parallel node execution (analyze + seo + cro run simultaneously)
   - Conditional routing (low score → deep-dive branch)
   - RAG retrieval (grounds recommendations in past work)
   - LCEL chains (prompt | model | parser)
   ============================================================ */

// ---- Typed State ----
const MarketingState = Annotation.Root({
  url: Annotation<string>,
  domain: Annotation<string>,
  pageContent: Annotation<string>,
  pageTitle: Annotation<string>,
  // Parallel analysis results
  analysisResult: Annotation<any>,
  seoResult: Annotation<any>,
  croResult: Annotation<any>,
  // RAG context (retrieved from past work)
  ragContext: Annotation<string>,
  // Conditional routing
  needsDeepDive: Annotation<boolean>,
  deepDiveResult: Annotation<string>,
  // Final output
  finalReport: Annotation<string>,
  // Metadata
  startedAt: Annotation<string>,
  completedAt: Annotation<string>,
  errors: Annotation<string[]>,
});

export type MarketingGraphState = typeof MarketingState.State;

// ---- LCEL Chains ----

const model = new ZaiChatModel();

// Chain 1: Website analysis (LCEL: prompt | model | parser)
const analysisChain = RunnableSequence.from([
  ChatPromptTemplate.fromTemplate(`
You are a website analyst. Analyze this page and return STRICT JSON.

URL: {url}
Page title: {title}
Page content (truncated): {content}

Return JSON:
{{
  "industry": "...",
  "scores": {{"overall": 0-100, "clarity": 0-100, "conversion": 0-100}},
  "strengths": ["3 strengths"],
  "weaknesses": ["3 weaknesses"],
  "summary": "2-sentence summary"
}}
`),
  model,
  new StringOutputParser(),
]);

// Chain 2: SEO analysis (LCEL)
const seoChain = RunnableSequence.from([
  ChatPromptTemplate.fromTemplate(`
You are an SEO strategist. Audit this page for SEO. Return STRICT JSON.

URL: {url}
Page title: {title}
Content (truncated): {content}

Return JSON:
{{
  "overallScore": 0-100,
  "issues": ["3-5 specific SEO issues"],
  "recommendations": ["3-5 actionable fixes"],
  "keywords": ["5 target keywords"]
}}
`),
  model,
  new StringOutputParser(),
]);

// Chain 3: CRO analysis (LCEL)
const croChain = RunnableSequence.from([
  ChatPromptTemplate.fromTemplate(`
You are a conversion rate optimization expert. Audit this page. Return STRICT JSON.

URL: {url}
Page title: {title}
Content (truncated): {content}

Return JSON:
{{
  "overallScore": 0-100,
  "issues": [{{"priority": "high|medium|low", "issue": "...", "recommendation": "..."}}],
  "quickWins": ["3 quick wins"]
}}
`),
  model,
  new StringOutputParser(),
]);

// Chain 4: Deep-dive analysis (conditional — only runs if score < 50)
const deepDiveChain = RunnableSequence.from([
  ChatPromptTemplate.fromTemplate(`
You are a senior marketing strategist performing a deep-dive analysis on a website that scored poorly.

URL: {url}
Analysis: {analysis}
SEO: {seo}
CRO: {cro}
RAG context (past work for this domain or industry): {ragContext}

Provide a comprehensive deep-dive recovery plan in markdown with H2 sections:
## Critical Issues, ## Recovery Strategy, ## 30-Day Action Plan, ## Expected Outcomes
`),
  model,
  new StringOutputParser(),
]);

// Chain 5: Final consolidation (RAG-grounded)
const finalReportChain = RunnableSequence.from([
  ChatPromptTemplate.fromTemplate(`
You are a marketing strategist consolidating parallel analysis results into a final report.

URL: {url}
Domain: {domain}

Analysis: {analysis}
SEO Audit: {seo}
CRO Audit: {cro}

Relevant past work (from knowledge base):
{ragContext}

Deep-dive (if performed):
{deepDive}

Create a consolidated marketing report in markdown with H2 sections:
## Executive Summary, ## Website Analysis, ## SEO Findings, ## CRO Findings,
## Strategic Recommendations, ## Priority Actions, ## Knowledge Base Insights

If past work is available, reference it: "Based on your previous {{type}} analysis from {{date}}..."
`),
  model,
  new StringOutputParser(),
]);

// ---- Graph Nodes ----

// Node 1: Fetch page content
async function fetchNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    let normalized = state.url;
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    let domain = "";
    try { domain = new URL(normalized).hostname.replace(/^www\./, ""); } catch {}

    const page = await readPage(normalized);
    const content = htmlToText((page as any)?.html || "").slice(0, 8000);
    const title = (page as any)?.title || domain;

    return { url: normalized, domain, pageContent: content, pageTitle: title, errors: [] };
  } catch (e: any) {
    return { pageContent: "", pageTitle: "", errors: [`fetch: ${e.message}`] };
  }
}

// Node 2: RAG retrieval — get relevant past work
async function ragNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const query = `${state.domain} ${state.pageTitle} ${state.pageContent.slice(0, 500)}`;
    const results = await RagVectorStore.similaritySearch(query, 3);

    if (results.length === 0) {
      return { ragContext: "No relevant past work found in the knowledge base." };
    }

    const context = results
      .map((r, i) => `[${i + 1}] Type: ${r.metadata.type} | Date: ${r.metadata.date || "unknown"}\n${r.content.slice(0, 500)}`)
      .join("\n\n");

    return { ragContext: context };
  } catch {
    return { ragContext: "RAG retrieval failed." };
  }
}

// Node 3: Website analysis (parallel)
async function analysisNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const raw = await analysisChain.invoke({
      url: state.url,
      title: state.pageTitle,
      content: state.pageContent.slice(0, 6000),
    });
    // Try to parse JSON
    let result: any = raw;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch {}
    return { analysisResult: result };
  } catch (e: any) {
    return { analysisResult: { error: e.message }, errors: [...(state.errors || []), `analysis: ${e.message}`] };
  }
}

// Node 4: SEO analysis (parallel)
async function seoNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const raw = await seoChain.invoke({
      url: state.url,
      title: state.pageTitle,
      content: state.pageContent.slice(0, 6000),
    });
    let result: any = raw;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch {}
    return { seoResult: result };
  } catch (e: any) {
    return { seoResult: { error: e.message }, errors: [...(state.errors || []), `seo: ${e.message}`] };
  }
}

// Node 5: CRO analysis (parallel)
async function croNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const raw = await croChain.invoke({
      url: state.url,
      title: state.pageTitle,
      content: state.pageContent.slice(0, 6000),
    });
    let result: any = raw;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch {}
    return { croResult: result };
  } catch (e: any) {
    return { croResult: { error: e.message }, errors: [...(state.errors || []), `cro: ${e.message}`] };
  }
}

// Node 6: Conditional router — check if deep-dive is needed
function routeAfterAnalysis(state: typeof MarketingState.State): "deep_dive" | "consolidate" {
  const analysis = state.analysisResult;
  const score = analysis?.scores?.overall ?? analysis?.overallScore ?? 100;
  const needsDeepDive = score < 50;
  return needsDeepDive ? "deep_dive" : "consolidate";
}

// Node 7: Deep-dive (conditional — only runs for low-scoring sites)
async function deepDiveNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const result = await deepDiveChain.invoke({
      url: state.url,
      analysis: JSON.stringify(state.analysisResult).slice(0, 2000),
      seo: JSON.stringify(state.seoResult).slice(0, 2000),
      cro: JSON.stringify(state.croResult).slice(0, 2000),
      ragContext: state.ragContext,
    });
    return { deepDiveResult: result, needsDeepDive: true };
  } catch (e: any) {
    return { deepDiveResult: "", errors: [...(state.errors || []), `deep-dive: ${e.message}`] };
  }
}

// Node 8: Final consolidation (RAG-grounded)
async function consolidateNode(state: typeof MarketingState.State): Promise<Partial<typeof MarketingState.State>> {
  try {
    const report = await finalReportChain.invoke({
      url: state.url,
      domain: state.domain,
      analysis: JSON.stringify(state.analysisResult).slice(0, 2000),
      seo: JSON.stringify(state.seoResult).slice(0, 2000),
      cro: JSON.stringify(state.croResult).slice(0, 2000),
      ragContext: state.ragContext,
      deepDive: state.deepDiveResult || "Not performed (score was adequate).",
    });

    // Store the final report in RAG for future retrieval
    await RagVectorStore.addText(report, {
      type: "langgraph-report",
      url: state.url,
      domain: state.domain,
      date: new Date().toISOString(),
    });

    return { finalReport: report, completedAt: new Date().toISOString() };
  } catch (e: any) {
    return { finalReport: "Consolidation failed.", errors: [...(state.errors || []), `consolidate: ${e.message}`] };
  }
}

// ---- Build the StateGraph ----

export function buildMarketingGraph() {
  const graph = new StateGraph(MarketingState)
    .addNode("fetch", fetchNode)
    .addNode("rag", ragNode)
    .addNode("analysis", analysisNode)
    .addNode("seo", seoNode)
    .addNode("cro", croNode)
    .addNode("deep_dive", deepDiveNode)
    .addNode("consolidate", consolidateNode)

    // Start → fetch → rag
    .addEdge(START, "fetch")
    .addEdge("fetch", "rag")

    // rag → parallel fan-out (analysis + seo + cro all run simultaneously)
    .addEdge("rag", "analysis")
    .addEdge("rag", "seo")
    .addEdge("rag", "cro")

    // Conditional routing after analysis completes
    .addConditionalEdges("analysis", routeAfterAnalysis, {
      deep_dive: "deep_dive",
      consolidate: "consolidate",
    })

    // deep_dive → consolidate
    .addEdge("deep_dive", "consolidate")

    // seo and cro also feed into consolidate (they complete in parallel)
    .addEdge("seo", "consolidate")
    .addEdge("cro", "consolidate")

    // consolidate → END
    .addEdge("consolidate", END);

  return graph.compile();
}

/**
 * Run the full marketing analysis graph on a URL.
 * This executes: fetch → RAG retrieval → (parallel: analysis + SEO + CRO)
 *                → conditional deep-dive → RAG-grounded consolidation.
 */
export async function runMarketingGraph(url: string) {
  const app = buildMarketingGraph();
  const result = await app.invoke({
    url,
    domain: "",
    pageContent: "",
    pageTitle: "",
    analysisResult: null,
    seoResult: null,
    croResult: null,
    ragContext: "",
    needsDeepDive: false,
    deepDiveResult: "",
    finalReport: "",
    startedAt: new Date().toISOString(),
    completedAt: "",
    errors: [],
  });
  return result;
}
