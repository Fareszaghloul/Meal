import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { replacePlannedMeal } from "@/lib/services/meal-replacement";
import { replaceMealInput } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = replaceMealInput.parse(body);

    const updated = await replacePlannedMeal(user.id, id, parsed);
    return NextResponse.json({ success: true, meal: updated });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    console.error("POST /api/meal-plan/meals/[id]/replace error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to replace planned meal" },
      { status: error.status || 500 }
    );
  }
}
