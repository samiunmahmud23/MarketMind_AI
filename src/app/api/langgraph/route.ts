import { NextRequest, NextResponse } from "next/server";
import { runMarketingGraph } from "@/lib/langchain/graph";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Runs the LangGraph marketing workflow on a URL.
 *
 * The graph executes:
 *   fetch → RAG retrieval → (parallel: analysis + SEO + CRO)
 *   → conditional deep-dive (if score < 50) → RAG-grounded consolidation
 *
 * This is the LangGraph-powered replacement for running each agent
 * separately — it orchestrates them as a state machine with parallel
 * execution and conditional routing.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const result = await runMarketingGraph(url);

    return NextResponse.json({
      ok: true,
      url: result.url,
      domain: result.domain,
      analysis: result.analysisResult,
      seo: result.seoResult,
      cro: result.croResult,
      needsDeepDive: result.needsDeepDive,
      deepDive: result.deepDiveResult,
      ragContext: result.ragContext,
      finalReport: result.finalReport,
      errors: result.errors,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (e: any) {
    console.error("LangGraph run error", e);
    return NextResponse.json(
      { error: e?.message || "LangGraph execution failed" },
      { status: 500 }
    );
  }
}
