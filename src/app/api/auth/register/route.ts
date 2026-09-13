import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const registerSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255).toLowerCase(),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
});

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "AUTH");
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json().catch(() => ({}));
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { email, displayName, password } = parseResult.data;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // Secure password hashing with Argon2id
    const passwordHash = await hashPassword(password);

    // Atomic creation of user, default settings, and initial session
    const { user, rawToken, expiresAt } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          displayName,
          passwordHash,
          role: "user",
          status: "active",
          settings: {
            create: {
              dailyCalories: 2300,
              dailyProtein: 180,
              dailyCarbs: 220,
              dailyFat: 70,
              defaultServings: 4,
              measurementSystem: "metric",
              theme: "system",
              ollamaUrl: "http://localhost:11434",
              ollamaModel: "qwen2.5:7b",
              screenshotMethod: "ocr_local",
            },
          },
        },
      });

      return { user: newUser, rawToken: "", expiresAt: new Date() };
    });

    // Generate email verification token and send via Resend
    try {
      const crypto = await import("crypto");
      const { hashToken } = await import("@/lib/auth/session");
      const { sendVerificationEmail } = await import("@/lib/email/resend");

      const verifyRawToken = crypto.randomBytes(32).toString("hex");
      const verifyTokenHash = hashToken(verifyRawToken);
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verifyTokenHash,
          expiresAt: verifyExpiresAt,
        },
      });

      // Send verification email — required, not optional
      await sendVerificationEmail(user.email, user.displayName, verifyRawToken);
    } catch (emailErr) {
      console.error("Error sending verification email on registration:", emailErr);
      // Clean up the user so they can try again
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Failed to send verification email. Please check your email address and try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        email: user.email,
        message: "Account created! Please check your email and verify your account before logging in.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
