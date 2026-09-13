import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashToken, invalidateAllUserSessions } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const resetSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
});

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "AUTH");
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json().catch(() => ({}));
    const parseResult = resetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { token, password } = parseResult.data;
    const tokenHash = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      new Date() > resetRecord.expiresAt ||
      resetRecord.user.status !== "active"
    ) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(password);

    // Atomically update password, mark token as used, and invalidate all existing sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      await tx.session.deleteMany({
        where: { userId: resetRecord.userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. Please log in with your new password.",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
