import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashToken } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email/resend";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimitRes = enforceRateLimit(request, "AUTH");
    if (rateLimitRes) return rateLimitRes;

    let dbUser = null;

    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email ? String(body.email).trim().toLowerCase() : null;

    if (targetEmail) {
      dbUser = await prisma.user.findUnique({
        where: { email: targetEmail },
      });
    } else {
      try {
        const user = await requireAuth(request);
        dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
      } catch {
        return NextResponse.json({ error: "Email or authentication required" }, { status: 400 });
      }
    }

    if (!dbUser) {
      // Don't leak whether email exists
      return NextResponse.json({
        success: true,
        message: "If an unverified account exists with that email, a verification link has been sent.",
      });
    }

    if (dbUser.emailVerified) {
      return NextResponse.json({
        message: "Your email is already verified. You can log in now.",
        alreadyVerified: true,
      });
    }

    // Delete existing unused verification tokens
    await prisma.verificationToken.deleteMany({
      where: { userId: dbUser.id },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        userId: dbUser.id,
        tokenHash,
        expiresAt,
      },
    });

    const emailRes = await sendVerificationEmail(dbUser.email, dbUser.displayName, rawToken);

    return NextResponse.json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/auth/send-verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
