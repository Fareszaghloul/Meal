import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { duplicateRecipe } from "@/lib/services/recipes";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const duplicated = await duplicateRecipe(user.id, id);
    return NextResponse.json(duplicated, { status: 201 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/recipes/[id]/duplicate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to duplicate recipe" },
      { status: 500 }
    );
  }
}

