import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getMealAlternatives } from "@/lib/services/meal-replacement";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const data = await getMealAlternatives(user.id, id);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/meal-plan/meals/[id]/alternatives error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load meal alternatives" },
      { status: error.status || 500 }
    );
  }
}
