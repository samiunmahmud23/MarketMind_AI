import { NextResponse } from "next/server";
import { baseDb as db } from "@/lib/db-base";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    // Use Prisma to get aggregate stats
    const totalUsers = await db.user.count();
    
    // Group by tier
    const tierGroup = await db.user.groupBy({
      by: ["subscriptionTier"],
      _count: { id: true },
    });

    const tiers = tierGroup.map(g => ({
      tier: g.subscriptionTier,
      count: g._count.id,
    }));

    // Aggregate usage stats
    const agg = await db.user.aggregate({
      _sum: {
        analysesUsed: true,
        campaignsUsed: true,
        emailsSent: true,
        aiCallsUsed: true,
      }
    });

    return NextResponse.json({
      totalUsers,
      tiers,
      usage: {
        analyses: agg._sum.analysesUsed || 0,
        campaigns: agg._sum.campaignsUsed || 0,
        emails: agg._sum.emailsSent || 0,
        aiCalls: agg._sum.aiCallsUsed || 0,
      }
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return new Response(error.message || "Error fetching stats", { status: 500 });
  }
}
