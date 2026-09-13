import { NextResponse } from "next/server";
import { getSessionToken, invalidateSession, clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const rawToken = await getSessionToken(request);
    if (rawToken) {
      await invalidateSession(rawToken);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    const response = NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
    clearSessionCookie(response);
    return response;
  }
}
