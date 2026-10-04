import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getRecipeById, updateRecipe, deleteRecipe } from "@/lib/services/recipes";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const recipe = await getRecipeById(user.id, id);
    return NextResponse.json(recipe);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const body = await request.json();

    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: "Recipe name cannot be empty" }, { status: 400 });
    }

    if (body.servings !== undefined && Number(body.servings) <= 0) {
      return NextResponse.json({ error: "Servings must be greater than zero" }, { status: 400 });
    }

    if (body.yieldWeightGrams !== undefined && body.yieldWeightGrams !== null && Number(body.yieldWeightGrams) <= 0) {
      return NextResponse.json({ error: "Cooked yield weight must be greater than zero" }, { status: 400 });
    }

    const updated = await updateRecipe(user.id, id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    await deleteRecipe(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/recipes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}

