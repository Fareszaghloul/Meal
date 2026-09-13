import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string" || token.length < 16) {
      return NextResponse.json(
        { error: "Invalid or missing verification token" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "This verification link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      await prisma.verificationToken.delete({ where: { id: record.id } }).catch(() => {});
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark email as verified and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { id: record.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully!",
    });
  } catch (error) {
    console.error("GET /api/auth/verify-email error:", error);
    return NextResponse.json(
      { error: "Failed to verify email. Please try again." },
      { status: 500 }
    );
  }
}
