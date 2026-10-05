import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getWeeklyMealPrepData } from "@/lib/services/meal-prep";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") || undefined;

    const data = await getWeeklyMealPrepData(user.id, weekStart);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/meal-prep error:", error);
    return NextResponse.json({ error: "Failed to fetch meal prep data" }, { status: 500 });
  }
}
