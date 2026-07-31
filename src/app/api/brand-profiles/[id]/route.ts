import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Returns the default brand profile (or the most recently updated one)
  const profile = await db.brandProfile.findFirst({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  if (!profile) return NextResponse.json(null);
  return NextResponse.json({
    ...profile,
    keywords: profile.keywords ? JSON.parse(profile.keywords) : [],
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, website, industry, audience, valueProp, tone, voice, keywords, primaryColor, logoUrl, isDefault } = body;

  const existing = await db.brandProfile.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (isDefault && !existing.isDefault) {
    await db.brandProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const updated = await db.brandProfile.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      website: website ?? existing.website,
      industry: industry ?? existing.industry,
      audience: audience ?? existing.audience,
      valueProp: valueProp ?? existing.valueProp,
      tone: tone ?? existing.tone,
      voice: voice ?? existing.voice,
      keywords: keywords !== undefined ? (keywords?.length ? JSON.stringify(keywords) : null) : existing.keywords,
      primaryColor: primaryColor ?? existing.primaryColor,
      logoUrl: logoUrl ?? existing.logoUrl,
      isDefault: isDefault ?? existing.isDefault,
    },
  });

  return NextResponse.json({
    ...updated,
    keywords: updated.keywords ? JSON.parse(updated.keywords) : [],
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.brandProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
