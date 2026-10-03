import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, invalidateAllUserSessions } from "@/lib/auth/session";

const patchUserSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
  // There is no email flow: the administrator sets a new password directly.
  password: z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await props.params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You cannot change your own account role or status" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = patchUserSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { status, role, password } = parseResult.data;
    if (!status && !role && !password) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordHash = password ? await (await import("@/lib/auth/password")).hashPassword(password) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Suspension or a password reset immediately revokes all their active sessions
    if (status === "suspended" || passwordHash) {
      await invalidateAllUserSessions(id);
    }

    return NextResponse.json({
      success: true,
      user: updated,
      message: "User updated successfully",
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await props.params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account from the admin dashboard" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cascade delete user
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been permanently deleted`,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
