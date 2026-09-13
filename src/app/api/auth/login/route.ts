import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, dummyPasswordVerify } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required").max(128),
});

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "AUTH");
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Execute constant-time dummy verification to block timing attacks
      await dummyPasswordVerify();
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Require email verification (allow admin role or verified users)
    if (!user.emailVerified && user.role !== "admin") {
      return NextResponse.json(
        {
          error: "Please verify your email address before logging in. Check your inbox for the verification link.",
          needsEmailVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session & issue cookie
    const { rawToken, expiresAt } = await createSession(user.id, request);

    const { passwordHash: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: "Logged in successfully",
    });

    setSessionCookie(response, rawToken, expiresAt);
    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
