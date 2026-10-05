import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getWhatShouldIEat } from "@/lib/services/meal-recommendations";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const data = await getWhatShouldIEat(user.id, date);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/meal-recommendations/what-should-i-eat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load meal recommendations" },
      { status: error.status || 500 }
    );
  }
}
