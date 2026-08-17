import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─────────────────────────────────────────────────────────────────────────────
// FLUX-OPTIMISED PROMPT ENGINEER
// Gemini 3.5 Flash writes a FLUX-specific prompt — a completely different
// structure from SD prompts. FLUX excels with descriptive natural language,
// not just comma-separated tags.
// ─────────────────────────────────────────────────────────────────────────────
const PROMPT_ENGINEER_SYSTEM = `You are an elite advertising art director and FLUX image model prompt specialist.
You write prompts for the FLUX image generation model which produces photorealistic, cinematic, magazine-quality imagery.

CRITICAL: FLUX responds best to DESCRIPTIVE NATURAL LANGUAGE, not comma-separated tags.
Write 3-5 rich, descriptive sentences, then end with technical quality boosters.

The user wants a PROFESSIONAL MARKETING ADVERTISEMENT IMAGE — the kind you see in Vogue, Nike campaigns, Apple ads.

RULES:
1. Describe the product with EXTREME specificity — shape, color, material, finish, texture
2. Place it in a CINEMATIC SCENE matching the visual style — be architectural and detailed about the background
3. Describe LIGHTING like a real cinematographer — direction, color, quality, intensity
4. Describe the MOOD and COLOR GRADING as if you're a film colorist
5. If there's a HEADLINE — describe it as bold 3D embossed typographic text floating on the image
6. End with: "Photorealistic, ultra-high resolution, professional commercial photography, 8K, shot on Phase One camera, hyperdetailed, advertising campaign, award-winning, no watermarks, no text artifacts, no blurry areas"
7. NEVER use the word "generate" or "create" — FLUX doesn't like meta-instructions
8. Keep the full prompt under 400 words

STYLE DIRECTIONS:
"Dynamic Liquid Splash":
  The product sits at the epicenter of an explosive liquid chrome and iridescent paint splash frozen in time at 1/10000th of a second. The background is pure obsidian black. Droplets of cyan, magenta, and electric silver arc gracefully around the product in perfect symmetry. Volumetric rim lighting from below creates dramatic neon reflections across every surface.

"Clean Studio Lighting":
  The product rests on a seamless white infinity cove. Three-point studio lighting — a soft key light from the upper left, a fill light from the right, and a warm backlight from behind — creates crisp, defined shadows with perfect specular highlights. The background transitions from pure white to a very light warm grey. Apple commercial product photography aesthetic.

"Urban Streetwear":
  Golden hour sunlight at 6pm rakes diagonally across the product from the left, casting a long dramatic shadow across weathered concrete. The background is an authentic urban alley — aged brick walls, peeling street art murals, texture-rich asphalt. Colors are deep, saturated Kodachrome oranges, teals, and warm browns. Editorial documentary style.

"Neon Cyberpunk":
  The product floats above a rain-drenched Tokyo street at midnight. The wet pavement below perfectly reflects glowing purple and electric cyan neon signs in rippling bokeh. Volumetric fog drifts through the air. Holographic data streams and light trails surround the product. Color grade: deep shadows with punchy cyan/violet highlights. Blade Runner 2049 cinematography.

"Minimalist Floating":
  The product hovers in a pure white infinite void, casting a single perfect geometric shadow below it. A barely-visible gradient — from pure white to the faintest ice blue — gives the background subtle depth. One thin beam of light illuminates the product from above. Ultra-clean, zero distraction, Apple-level restraint and elegance.

"Nature Outdoor Setup":
  The product rests on a mossy forest rock in a sun-dappled clearing at golden hour. Warm amber light filters through dense forest canopy leaves, creating bokeh light orbs in the background. Morning mist drifts low across the ground. Colors are rich earthy greens, warm ambers, and deep forest browns. National Geographic lifestyle photography quality.

"Luxury Gold":
  The product sits on deep black velvet fabric under a single theatrical overhead spotlight. Fine 24-karat gold dust particles float in the air around the product, caught mid-drift in the beam. The background is dark charcoal with subtle baroque ornate gold leaf frame details at the edges. Deep shadows, maximum contrast, ultra-premium prestige aesthetic.

"Pop Art Energy":
  The product is illustrated in bold Andy Warhol-inspired Pop Art style. Flat primary color blocking in red, yellow, blue, and black. Ben-Day halftone dot overlay across the entire image. Thick hand-drawn black outlines. High contrast, zero gradients. Screen-print texture. Comic book energy mixed with luxury.`;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "write");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { productName, headline, style, originalImage, customPrompt } = body;

    if (!productName || !style) {
      return NextResponse.json(
        { error: "productName and style are required." },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Please add it to your .env file." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Fallback model list — tries each in order if one is overloaded
    const GEMINI_MODELS = [
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ];

    // Helper: try content generation across fallback models
    async function tryGemini(parts: any[]): Promise<string> {
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(parts);
          return result.response.text().trim();
        } catch (err: any) {
          const isOverloaded = err?.message?.includes("503") || err?.message?.includes("high demand") || err?.message?.includes("overloaded");
          if (!isOverloaded) throw err; // Non-503 error — throw immediately
          console.warn(`Model ${modelName} overloaded, trying next...`);
        }
      }
      throw new Error("All Gemini models are currently busy. Please try again in a moment.");
    }

    // ─── STEP 1: Analyze uploaded product photo with Gemini Vision ───────────
    let productPhotoDescription = "";
    if (originalImage) {
      try {
        const base64Data = originalImage.includes(",")
          ? originalImage.split(",")[1]
          : originalImage;
        const mimeType = originalImage.startsWith("data:image/png") ? "image/png" : "image/jpeg";

        productPhotoDescription = await tryGemini([
          { inlineData: { data: base64Data, mimeType } },
          `You are an expert product analyst for a luxury marketing agency.
           Describe this product image with extreme visual precision for a FLUX image generation model.
           Include: exact shape geometry, dominant and accent colors (use specific color names like "cobalt blue" not just "blue"), 
           materials and surface finishes (matte, glossy, leather, mesh, etc.), key structural features, branding elements visible.
           Your description will be used verbatim in a prompt. Be a visual poet. 3 sentences maximum.`,
        ]);
      } catch (err) {
        console.warn("Vision analysis skipped:", err);
      }
    }

    // ─── STEP 2: Generate the FLUX-optimised marketing prompt via Gemini ─────
    let masterPrompt = customPrompt || "";
    if (!masterPrompt) {
      const userMessage = [
        `Product Name: ${productName}`,
        `Visual Style: ${style}`,
        headline ? `Marketing Headline (show as bold typography on the image): "${headline}"` : "No headline needed",
        productPhotoDescription
          ? `Product Visual Description from uploaded photo: ${productPhotoDescription}`
          : `No product photo uploaded — invent a visually stunning version of the product based on its name.`,
      ]
        .filter(Boolean)
        .join("\n");

      masterPrompt = await tryGemini([PROMPT_ENGINEER_SYSTEM, userMessage]) ||
        `A premium ${productName} in a stunning ${style} marketing campaign setting, photorealistic, 8K, award-winning advertising photography`;
    }

    // ─── STEP 3: Render with FLUX model on Pollinations (far better quality) ─
    // Use model=flux for FLUX.1 Schnell — dramatically better than default SD
    const cleanPrompt = masterPrompt
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const negativePrompt = "blurry, low quality, pixelated, watermark, text artifacts, distorted, deformed, ugly, bad anatomy, duplicate, cropped, out of frame, worst quality, low resolution, overexposed, underexposed, cartoon, anime, sketch, painting";

    const seed = Math.floor(Math.random() * 2147483647);

    // FLUX model via Pollinations — significantly higher quality than default
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&negative=${encodeURIComponent(negativePrompt)}`;

    // ─── STEP 4: Save to database ─────────────────────────────────────────────
    const saved = await db.productPhotography.create({
      data: {
        productName,
        headline: headline || null,
        style,
        originalImage: originalImage ? "User Upload" : null,
        generatedImage: imageUrl,
        promptUsed: masterPrompt,
      },
    });

    return NextResponse.json({
      ok: true,
      data: saved,
      promptUsed: masterPrompt,
      photoAnalysis: productPhotoDescription || null,
    });
  } catch (e: any) {
    console.error("Product Studio API Error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to generate product marketing image." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const history = await db.productPhotography.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(history);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to fetch product photography history." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.productPhotography.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
