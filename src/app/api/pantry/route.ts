import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const items = await prisma.pantryItem.findMany({
      where: { userId: user.id },
      include: { food: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/pantry error:", error);
    return NextResponse.json({ error: "Failed to fetch pantry" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { name, quantity = 1, unit = "g", category = "Pantry", foodId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    if (foodId) {
      const food = await prisma.food.findFirst({
        where: { id: foodId, OR: [{ userId: null }, { userId: user.id }] },
        select: { id: true },
      });
      if (!food) {
        return NextResponse.json({ error: "Food not found" }, { status: 404 });
      }
    }

    const item = await prisma.pantryItem.create({
      data: {
        userId: user.id,
        name: name.trim(),
        quantity: Number(quantity) || 1,
        unit: unit || "g",
        category: category || "Pantry",
        foodId: foodId || null,
      },
      include: { food: true },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/pantry error:", error);
    return NextResponse.json({ error: "Failed to add pantry item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, quantity, unit, name, category } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.pantryItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pantry item not found" }, { status: 404 });
    }

    const updated = await prisma.pantryItem.update({
      where: { id },
      data: {
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        unit: unit !== undefined ? unit : undefined,
        name: name ? name.trim() : undefined,
        category: category !== undefined ? category : undefined,
      },
      include: { food: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/pantry error:", error);
    return NextResponse.json({ error: "Failed to update pantry item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.pantryItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pantry item not found" }, { status: 404 });
    }

    await prisma.pantryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/pantry error:", error);
    return NextResponse.json({ error: "Failed to delete pantry item" }, { status: 500 });
  }
}
