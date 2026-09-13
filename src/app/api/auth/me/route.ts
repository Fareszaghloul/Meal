import { NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      const response = NextResponse.json({ user: null, error: "Unauthenticated" }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: {
        dailyCalories: true,
        dailyProtein: true,
        dailyCarbs: true,
        dailyFat: true,
        measurementSystem: true,
        theme: true,
      },
    });

    return NextResponse.json({
      user,
      settings,
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to fetch current user session" },
      { status: 500 }
    );
  }
}
