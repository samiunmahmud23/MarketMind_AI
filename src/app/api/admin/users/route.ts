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

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        analysesUsed: true,
        campaignsUsed: true,
        emailsSent: true,
        aiCallsUsed: true,
        createdAt: true,
      }
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Admin users error:", error);
    return new Response(error.message || "Error fetching users", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { userId, subscriptionTier, role } = body;

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    // Only allow changing tier and role
    const data: any = {};
    if (subscriptionTier) data.subscriptionTier = subscriptionTier;
    if (role) data.role = role;

    const updated = await db.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return new Response(error.message || "Error updating user", { status: 500 });
  }
}
