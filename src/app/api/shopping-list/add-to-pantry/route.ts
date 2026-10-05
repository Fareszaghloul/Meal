import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { addPurchasedItemToPantry } from "@/lib/services/pantry";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, name, quantity = 1, unit = "piece", category = "Pantry", foodId } = body;

    let itemName = name;
    let itemQuantity = Number(quantity) || 1;
    let itemUnit = unit;
    let itemCategory = category;
    let itemFoodId = foodId;

    if (id) {
      const shoppingItem = await prisma.shoppingListItem.findFirst({
        where: { id, userId: user.id },
      });
      if (shoppingItem) {
        itemName = shoppingItem.name;
        itemQuantity = shoppingItem.quantity;
        itemUnit = shoppingItem.unit;
        itemCategory = shoppingItem.category;
        itemFoodId = shoppingItem.foodId;

        // Mark as checked
        await prisma.shoppingListItem.update({
          where: { id: shoppingItem.id },
          data: { isChecked: true },
        });
      }
    }

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const pantryItem = await addPurchasedItemToPantry(user.id, {
      name: itemName,
      quantity: itemQuantity,
      unit: itemUnit,
      category: itemCategory,
      foodId: itemFoodId,
    });

    return NextResponse.json({ success: true, pantryItem });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/shopping-list/add-to-pantry error:", error);
    return NextResponse.json(
      { error: "Failed to add item to pantry" },
      { status: 500 }
    );
  }
}
