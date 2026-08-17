import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Global search across all asset types.
 * Returns grouped results: analyses, campaigns, seoReports, copyAssets,
 * contentProjects, socialCampaigns, repurposeProjects.
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ results: {}, total: 0 });
  }

  const [
    analyses,
    campaigns,
    seoReports,
    copyAssets,
    contentProjects,
    socialCampaigns,
    repurposeProjects,
  ] = await Promise.all([
    db.analysis.findMany({
      where: {
        OR: [
          { url: { contains: q } },
          { title: { contains: q } },
          { industry: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, title: true, industry: true, createdAt: true },
    }),

    db.campaign.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { productName: { contains: q } },
          { targetAudience: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, productName: true, targetAudience: true, status: true, createdAt: true },
    }),

    db.seoReport.findMany({
      where: {
        OR: [{ url: { contains: q } }, { domain: { contains: q } }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, domain: true, overallScore: true, createdAt: true },
    }),

    db.copyAsset.findMany({
      where: {
        OR: [{ brand: { contains: q } }, { product: { contains: q } }, { audience: { contains: q } }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, brand: true, product: true, platform: true, createdAt: true },
    }),

    db.contentProject.findMany({
      where: {
        OR: [{ topic: { contains: q } }, { title: { contains: q } }, { brand: { contains: q } }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, topic: true, title: true, wordCount: true, createdAt: true },
    }),

    db.socialCampaign.findMany({
      where: {
        OR: [{ brand: { contains: q } }, { product: { contains: q } }, { audience: { contains: q } }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, brand: true, product: true, platforms: true, createdAt: true },
    }),

    db.repurposeProject.findMany({
      where: {
        OR: [{ sourceTitle: { contains: q } }, { brand: { contains: q } }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, sourceType: true, sourceTitle: true, brand: true, createdAt: true },
    }),
  ]);

  const total =
    analyses.length +
    campaigns.length +
    seoReports.length +
    copyAssets.length +
    contentProjects.length +
    socialCampaigns.length +
    repurposeProjects.length;

  return NextResponse.json({
    q,
    total,
    results: {
      analyses,
      campaigns,
      seoReports,
      copyAssets,
      contentProjects,
      socialCampaigns,
      repurposeProjects,
    },
  });
}
