import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { toggleRecipeFavorite } from "@/lib/services/recipes";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await props.params;
    const updated = await toggleRecipeFavorite(user.id, id);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/recipes/[id]/favorite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}

