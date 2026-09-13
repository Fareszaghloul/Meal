import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for pantry bulk import" }, { status: 400 });
    }

    let addedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const name = item.name?.trim();
      if (!name) continue;

      try {
        // Optional link to existing food item in user or global DB
        const matchedFood = await prisma.food.findFirst({
          where: {
            name: { equals: name },
            OR: [{ userId: null }, { userId: user.id }],
          },
        });

        await prisma.pantryItem.create({
          data: {
            userId: user.id,
            name,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || "item",
            category: item.category || "Pantry",
            foodId: matchedFood?.id || null,
          },
        });

        addedCount++;
      } catch (err: any) {
        console.error(`Failed to add pantry item "${name}":`, err.message);
        errors.push(name);
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      total: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/pantry/bulk-import error:", error);
    return NextResponse.json({ error: "Failed to bulk add to pantry" }, { status: 500 });
  }
}
