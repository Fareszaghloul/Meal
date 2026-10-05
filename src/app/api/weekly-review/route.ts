import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getWeeklyReview } from "@/lib/services/weekly-review";
import { startOfWeek, todayLocal, type DateString } from "@/lib/dates";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    // Default to the current Monday
    const weekStartParam = searchParams.get("weekStart");
    const weekStart = (weekStartParam || startOfWeek(todayLocal())) as DateString;

    const data = await getWeeklyReview(user.id, weekStart);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/weekly-review error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load weekly review" },
      { status: error.status || 500 }
    );
  }
}
