import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const [
    analyses,
    campaigns,
    seoReports,
    copyAssets,
    contentProjects,
    recipients,
    variants,
    socialCampaigns,
    socialPosts,
    scoredLeads,
    brandProfiles,
    repurposeProjects,
    smtpConfig,
  ] = await Promise.all([
    db.analysis.count(),
    db.campaign.count(),
    db.seoReport.count(),
    db.copyAsset.count(),
    db.contentProject.count(),
    db.recipient.count(),
    db.emailVariant.count(),
    db.socialCampaign.count(),
    db.socialPost.count(),
    db.recipient.count({ where: { leadScore: { not: null } } }),
    db.brandProfile.count(),
    db.repurposeProject.count(),
    db.smtpConfig.findFirst({ orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
  ]);

  const recentAnalyses = await db.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, url: true, title: true, industry: true, scores: true, createdAt: true },
  });

  const recentCampaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { recipients: true } } },
  });

  const recentSocial = await db.socialCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { _count: { select: { posts: true } } },
  });

  const avgSeoScore = await db.seoReport.aggregate({ _avg: { overallScore: true } });

  // Hot leads count for the dashboard
  const hotLeads = await db.recipient.count({ where: { leadTier: "hot" } });

  return NextResponse.json({
    counts: {
      analyses,
      campaigns,
      seoReports,
      copyAssets,
      contentProjects,
      recipients,
      variants,
      socialCampaigns,
      socialPosts,
      scoredLeads,
      hotLeads,
      brandProfiles,
      repurposeProjects,
    },
    avgSeoScore: Math.round(avgSeoScore._avg.overallScore || 0),
    recentAnalyses: recentAnalyses.map((a) => ({
      ...a,
      scores: a.scores ? JSON.parse(a.scores) : null,
    })),
    recentCampaigns: recentCampaigns.map((c) => ({
      ...c,
      seoKeywords: c.seoKeywords ? JSON.parse(c.seoKeywords) : [],
      recipientCount: c._count.recipients,
    })),
    recentSocial: recentSocial.map((s) => ({
      ...s,
      platforms: s.platforms ? JSON.parse(s.platforms) : [],
      postCount: s._count.posts,
    })),
    smtp: smtpConfig
      ? {
          configured: true,
          provider: smtpConfig.provider || "smtp",
          host: smtpConfig.host,
          fromEmail: smtpConfig.fromEmail,
          fromName: smtpConfig.fromName,
        }
      : { configured: false },
  });
}
