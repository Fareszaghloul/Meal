import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { getMonday } from "../meal-plan/route";
import { aggregateShoppingList, NeededIngredient } from "@/lib/shopping/aggregator";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") || getMonday();
    const subtractPantry = searchParams.get("subtractPantry") !== "false"; // default true

    // 1. Fetch custom items created for this week (or global custom items for this user)
    const customItems = await prisma.shoppingListItem.findMany({
      where: {
        userId: user.id,
        OR: [{ weekStart }, { weekStart: null }],
        isCustom: true,
      },
    });

    // 2. Fetch existing items for this week to preserve checked state
    const existingDbItems = await prisma.shoppingListItem.findMany({
      where: {
        userId: user.id,
        weekStart,
        isCustom: false,
      },
    });
    const checkedMap = new Map(existingDbItems.map((i) => [i.name.toLowerCase(), i.isChecked]));

    // 3. Fetch current user's meals with recipes and ingredients
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: user.id,
          weekStartDate: weekStart,
        },
      },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: { food: true },
                },
              },
            },
          },
        },
      },
    });

    // 4. Fetch user's pantry items
    const pantryItems = await prisma.pantryItem.findMany({
      where: { userId: user.id },
    });

    const neededIngredients: NeededIngredient[] = [];
    if (mealPlan && mealPlan.meals) {
      for (const meal of mealPlan.meals) {
        if (!meal.recipe || !meal.recipe.ingredients) continue;
        const recipeServings = Math.max(1, meal.recipe.servings);
        const mealServings = meal.servings;
        const multiplier = mealServings / recipeServings;

        for (const ing of meal.recipe.ingredients) {
          neededIngredients.push({
            foodId: ing.foodId,
            foodName: ing.food?.name,
            foodCategory: ing.food?.category,
            rawName: ing.rawName,
            quantity: ing.quantity * multiplier,
            unit: ing.unit,
          });
        }
      }
    }

    const aggregated = aggregateShoppingList(
      neededIngredients,
      pantryItems.map((p) => ({
        foodId: p.foodId,
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
      })),
      subtractPantry
    );

    // Save or update non-custom items into DB for persistent checked state
    const finalItems = [];

    for (const agg of aggregated) {
      const isChecked = checkedMap.get(agg.name.toLowerCase()) || false;
      const existing = existingDbItems.find(
        (i) => i.name.toLowerCase() === agg.name.toLowerCase()
      );

      if (existing) {
        finalItems.push({
          ...existing,
          quantity: agg.quantity,
          unit: agg.unit,
          category: agg.category,
          pantryQuantity: agg.pantryQuantity,
          neededBeforePantry: agg.neededBeforePantry,
        });
      } else {
        const created = await prisma.shoppingListItem.create({
          data: {
            userId: user.id,
            name: agg.name,
            quantity: agg.quantity,
            unit: agg.unit,
            category: agg.category,
            isChecked: false,
            isCustom: false,
            weekStart,
            foodId: agg.foodId,
          },
        });
        finalItems.push({
          ...created,
          pantryQuantity: agg.pantryQuantity,
          neededBeforePantry: agg.neededBeforePantry,
        });
      }
    }

    // Append custom items
    finalItems.push(...customItems);

    return NextResponse.json({
      weekStart,
      items: finalItems,
      totalCount: finalItems.length,
      checkedCount: finalItems.filter((i) => i.isChecked).length,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { name, quantity = 1, unit = "piece", category = "Other", weekStart } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        userId: user.id,
        name: name.trim(),
        quantity: Number(quantity) || 1,
        unit: unit || "piece",
        category: category || "Other",
        isCustom: true,
        isChecked: false,
        weekStart: weekStart || getMonday(),
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to add shopping list item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id, isChecked, quantity, unit, name, category } = body;

    if (!id) {
      return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    }

    const existing = await prisma.shoppingListItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id },
      data: {
        isChecked: isChecked !== undefined ? Boolean(isChecked) : undefined,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        unit: unit !== undefined ? unit : undefined,
        name: name ? name.trim() : undefined,
        category: category !== undefined ? category : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearCompleted = searchParams.get("clearCompleted") === "true";
    const weekStart = searchParams.get("weekStart") || getMonday();

    if (clearCompleted) {
      await prisma.shoppingListItem.deleteMany({
        where: {
          userId: user.id,
          weekStart,
          isChecked: true,
        },
      });
      return NextResponse.json({ success: true, cleared: true });
    }

    if (id) {
      const existing = await prisma.shoppingListItem.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      await prisma.shoppingListItem.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/shopping-list error:", error);
    return NextResponse.json(
      { error: "Failed to delete shopping list item(s)" },
      { status: 500 }
    );
  }
}
