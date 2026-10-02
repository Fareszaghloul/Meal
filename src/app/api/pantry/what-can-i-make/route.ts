import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { rankRecipesByPantry } from "@/lib/pantry/matcher";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const [recipes, pantry] = await Promise.all([
      prisma.recipe.findMany({
        where: { userId: user.id },
        include: {
          ingredients: {
            include: { food: true },
          },
        },
      }),
      prisma.pantryItem.findMany({
        where: { userId: user.id },
      }),
    ]);

    const ranked = rankRecipesByPantry(
      recipes.map((r) => ({
        id: r.id,
        name: r.name,
        imageUrl: r.imageUrl,
        caloriesPerServing: r.caloriesPerServing,
        proteinPerServing: r.proteinPerServing,
        carbsPerServing: r.carbsPerServing,
        fatPerServing: r.fatPerServing,
        servings: r.servings,
        ingredients: r.ingredients.map((ing) => ({
          id: ing.id,
          rawName: ing.rawName,
          foodId: ing.foodId,
          food: ing.food ? { name: ing.food.name } : null,
        })),
      })),
      pantry.map((p) => ({
        id: p.id,
        name: p.name,
        foodId: p.foodId,
        quantity: p.quantity,
        unit: p.unit,
      }))
    );

    return NextResponse.json(ranked);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/pantry/what-can-i-make error:", error);
    return NextResponse.json(
      { error: "Failed to calculate recipe matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    const [pantryItems, settings] = await Promise.all([
      prisma.pantryItem.findMany({ where: { userId: user.id } }),
      prisma.userSettings.findUnique({ where: { userId: user.id } }),
    ]);

    if (pantryItems.length === 0) {
      return NextResponse.json(
        { error: "Your pantry is empty! Add ingredients to your pantry first." },
        { status: 400 }
      );
    }

    const pantryList = pantryItems
      .map((p) => `${p.quantity} ${p.unit} of ${p.name}`)
      .join(", ");
    const baseUrl = process.env.OLLAMA_BASE_URL || settings?.ollamaUrl || "http://localhost:11434";
    const model = settings?.ollamaModel || "qwen2.5:7b";

    const prompt = `You are a culinary chef and nutritionist.
The user currently has these ingredients in their pantry:
${pantryList}

Generate 2-3 nutritious, high-protein meal prep recipe suggestions they can make right now using these items.
Return ONLY valid JSON in this exact schema with no surrounding commentary or markdown tags:
{
  "suggestions": [
    {
      "name": "Recipe Name",
      "description": "Appetizing description of the dish",
      "prepTimeMinutes": 10,
      "cookTimeMinutes": 15,
      "calories": 480,
      "protein": 42,
      "carbs": 38,
      "fat": 14,
      "ingredients": ["Item 1 with quantity", "Item 2 with quantity"],
      "instructions": ["Step 1", "Step 2"]
    }
  ]
}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
      headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID.trim();
      headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET.trim();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let aiRes: Response;
    try {
      aiRes = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: "json",
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiRes.ok) {
      throw new Error(`AI service returned status ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.message?.content || aiData.response || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      success: true,
      suggestions: parsed.suggestions || [],
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/pantry/what-can-i-make error:", error);
    return NextResponse.json(
      { error: "Could not generate AI pantry suggestions: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
