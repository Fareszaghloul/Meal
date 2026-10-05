import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { requireAuth, clearSessionCookie } from "@/lib/auth/session";
import { accountPatch } from "@/lib/validation";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password confirmation is required"),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const parseResult = accountPatch.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: parseResult.data.displayName },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/auth/account error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const parseResult = deleteAccountSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Please enter your password to confirm account deletion" },
        { status: 400 }
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await verifyPassword(parseResult.data.password, fullUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Account was not deleted." },
        { status: 400 }
      );
    }

    // Cascade delete user and all associated private records
    await prisma.user.delete({
      where: { id: user.id },
    });

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    });

    clearSessionCookie(response);
    return response;
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/auth/account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
