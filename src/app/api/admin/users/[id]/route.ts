import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, invalidateAllUserSessions } from "@/lib/auth/session";

const patchUserSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
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

    const { status, role } = parseResult.data;
    if (!status && !role) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
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

    // If user suspended, immediately revoke all their active sessions
    if (status === "suspended") {
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
