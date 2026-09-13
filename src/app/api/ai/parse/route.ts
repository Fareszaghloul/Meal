import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiProvider } from "@/lib/ai/provider";
import { requireAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "EXPENSIVE");
    if (rateLimitRes) return rateLimitRes;

    const user = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const { type, content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required for parsing" },
        { status: 400 }
      );
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    const baseUrl = settings?.ollamaUrl || "http://localhost:11434";
    const model = settings?.ollamaModel || "qwen2.5:7b";

    let result;
    let sourcePlatform = "Manual";
    let sourceUrl: string | undefined = undefined;

    if (type === "url") {
      const parsedUrl = await aiProvider.parseRecipeUrl(content.trim(), { baseUrl, model });
      result = parsedUrl;
      sourcePlatform = parsedUrl.platform || "Web";
      sourceUrl = parsedUrl.sourceUrl;
    } else if (type === "image") {
      result = await aiProvider.parseRecipeImage(content, { baseUrl, model });
      sourcePlatform = "Screenshot";
    } else {
      // type === "text" (paste)
      result = await aiProvider.parseRecipeText(content.trim(), { baseUrl, model });
      sourcePlatform = "Pasted Text";
    }

    // Identify any warnings for the user review stage
    const warnings: string[] = [];
    const uncertainIngredients = result.ingredients.filter((i) => i.uncertainQuantity);
    if (uncertainIngredients.length > 0) {
      warnings.push(
        `${uncertainIngredients.length} ingredient(s) have estimated or uncertain quantities. Please check them in the review screen.`
      );
    }
    if (!result.nutrition || (!result.nutrition.calories && !result.nutrition.protein)) {
      warnings.push(
        "Nutrition was not explicitly stated in the source text. It will be computed automatically from your food database."
      );
    }

    return NextResponse.json({
      success: true,
      recipe: result,
      sourcePlatform,
      sourceUrl,
      warnings,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/ai/parse error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse recipe",
      },
      { status: 500 }
    );
  }
}
