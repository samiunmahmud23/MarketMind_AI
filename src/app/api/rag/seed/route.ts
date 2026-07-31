import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RagVectorStore, createTextSplitter } from "@/lib/langchain/zai-embeddings";
import { Document } from "@langchain/core/documents";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Seeds the RAG vector store from all existing data in the database.
 * This embeds every analysis, SEO report, campaign, content project, etc.
 * so that future LLM calls can retrieve relevant past work.
 */
export async function POST() {
  try {
    // Clear existing vector store
    await RagVectorStore.clear();

    const splitter = createTextSplitter(500, 50);
    const allDocs: Document[] = [];

    // 1. Website Analyses
    const analyses = await db.analysis.findMany({ take: 100 });
    for (const a of analyses) {
      const chunks = await splitter.splitText(a.report || a.summary || "");
      for (const chunk of chunks) {
        allDocs.push(new Document({
          pageContent: chunk,
          metadata: { type: "analysis", url: a.url, title: a.title, date: a.createdAt.toISOString(), id: a.id },
        }));
      }
    }

    // 2. SEO Reports
    const seoReports = await db.seoReport.findMany({ take: 100 });
    for (const s of seoReports) {
      const chunks = await splitter.splitText(s.recommendations || s.actionPlan || "");
      for (const chunk of chunks) {
        allDocs.push(new Document({
          pageContent: chunk,
          metadata: { type: "seo-report", url: s.url, domain: s.domain, date: s.createdAt.toISOString(), id: s.id },
        }));
      }
    }

    // 3. Campaigns + Email Variants
    const campaigns = await db.campaign.findMany({ include: { variants: true }, take: 100 });
    for (const c of campaigns) {
      for (const v of c.variants) {
        allDocs.push(new Document({
          pageContent: `${v.subject}\n\n${v.body}`,
          metadata: { type: "email-variant", campaign: c.name, product: c.productName, variant: v.variant, date: c.createdAt.toISOString(), id: v.id },
        }));
      }
    }

    // 4. Content Projects
    const contentProjects = await db.contentProject.findMany({ take: 100 });
    for (const cp of contentProjects) {
      const chunks = await splitter.splitText(cp.content || "");
      for (const chunk of chunks) {
        allDocs.push(new Document({
          pageContent: chunk,
          metadata: { type: "content", topic: cp.topic, type2: cp.type, date: cp.createdAt.toISOString(), id: cp.id },
        }));
      }
    }

    // 5. Copy Assets
    const copyAssets = await db.copyAsset.findMany({ take: 100 });
    for (const ca of copyAssets) {
      allDocs.push(new Document({
        pageContent: ca.variants || "",
        metadata: { type: "copy", brand: ca.brand, product: ca.product, copyType: ca.type, date: ca.createdAt.toISOString(), id: ca.id },
      }));
    }

    // 6. Repurpose Projects
    const repurpose = await db.repurposeProject.findMany({ take: 100 });
    for (const r of repurpose) {
      allDocs.push(new Document({
        pageContent: r.outputs || r.sourceContent || "",
        metadata: { type: "repurpose", title: r.sourceTitle, date: r.createdAt.toISOString(), id: r.id },
      }));
    }

    // 7. Competitor Profiles
    const competitors = await db.competitorProfile.findMany({ take: 100 });
    for (const comp of competitors) {
      allDocs.push(new Document({
        pageContent: comp.report || comp.description || "",
        metadata: { type: "competitor", name: comp.name, domain: comp.domain, date: comp.createdAt.toISOString(), id: comp.id },
      }));
    }

    // 8. CRO Reports
    const croReports = await db.croReport.findMany({ take: 100 });
    for (const cr of croReports) {
      allDocs.push(new Document({
        pageContent: cr.report || "",
        metadata: { type: "cro", url: cr.url, date: cr.createdAt.toISOString(), id: cr.id },
      }));
    }

    // 9. AI-SEO Reports
    const aiSeoReports = await db.aiSeoReport.findMany({ take: 100 });
    for (const ar of aiSeoReports) {
      allDocs.push(new Document({
        pageContent: ar.report || ar.llmsTxt || "",
        metadata: { type: "ai-seo", url: ar.url, domain: ar.domain, date: ar.createdAt.toISOString(), id: ar.id },
      }));
    }

    // Add all documents to the vector store
    if (allDocs.length > 0) {
      await RagVectorStore.addDocuments(allDocs);
    }

    return NextResponse.json({
      ok: true,
      seeded: allDocs.length,
      types: {
        analyses: analyses.length,
        seoReports: seoReports.length,
        campaigns: campaigns.length,
        contentProjects: contentProjects.length,
        copyAssets: copyAssets.length,
        repurpose: repurpose.length,
        competitors: competitors.length,
        croReports: croReports.length,
        aiSeoReports: aiSeoReports.length,
      },
    });
  } catch (e: any) {
    console.error("RAG seed error", e);
    return NextResponse.json({ error: e?.message || "RAG seeding failed" }, { status: 500 });
  }
}

/**
 * GET — returns RAG store stats + allows searching.
 * ?q=query → search the knowledge base
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (q) {
    // Search mode
    const results = await RagVectorStore.similaritySearch(q, 5);
    return NextResponse.json({ query: q, results, count: results.length });
  }

  // Stats mode
  const count = await RagVectorStore.count();
  return NextResponse.json({ documents: count });
}
