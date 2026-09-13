import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const forgotSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
});

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "AUTH");
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json().catch(() => ({}));
    const parseResult = forgotSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    let devResetUrl: string | undefined = undefined;

    if (user && user.status === "active") {
      // Invalidate existing unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Send password reset email via Resend
      const { sendPasswordResetEmail } = await import("@/lib/email/resend");
      sendPasswordResetEmail(user.email, user.displayName, rawToken).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });

      devResetUrl = `/reset-password?token=${rawToken}`;
    }

    // Generic response to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email address, password reset instructions have been generated.",
      resetToken: process.env.NODE_ENV !== "production" ? devResetUrl?.split("token=")[1] : undefined,
      devResetUrl: process.env.NODE_ENV !== "production" ? devResetUrl : undefined,
    });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
