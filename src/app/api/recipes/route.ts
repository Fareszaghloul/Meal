import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getRecipes, createRecipe } from "@/lib/services/recipes";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const favorites = searchParams.get("favorites") === "true";
    const sortBy = searchParams.get("sortBy") || "newest";

    const recipes = await getRecipes(user.id, { q, tag, favorites, sortBy });
    return NextResponse.json(recipes);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    if (!body || !body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
    }

    if (body.servings !== undefined && Number(body.servings) <= 0) {
      return NextResponse.json({ error: "Servings must be greater than zero" }, { status: 400 });
    }

    if (body.yieldWeightGrams !== undefined && body.yieldWeightGrams !== null && Number(body.yieldWeightGrams) <= 0) {
      return NextResponse.json({ error: "Cooked yield weight must be greater than zero" }, { status: 400 });
    }

    const recipe = await createRecipe(user.id, body);
    return NextResponse.json(recipe, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recipe" },
      { status: 500 }
    );
  }
}
