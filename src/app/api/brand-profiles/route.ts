import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const profiles = await db.brandProfile.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(
    profiles.map((p) => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : [],
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, website, industry, audience, valueProp, tone, voice, keywords, primaryColor, logoUrl, isDefault } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await db.brandProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const profile = await db.brandProfile.create({
    data: {
      name,
      website: website || null,
      industry: industry || null,
      audience: audience || null,
      valueProp: valueProp || null,
      tone: tone || "professional",
      voice: voice || null,
      keywords: keywords?.length ? JSON.stringify(keywords) : null,
      primaryColor: primaryColor || null,
      logoUrl: logoUrl || null,
      isDefault: !!isDefault,
    },
  });

  return NextResponse.json({
    ...profile,
    keywords: profile.keywords ? JSON.parse(profile.keywords) : [],
  });
}
