import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import type { Prisma } from "@prisma/client";
import { COMMON_UNITS, normalizeUnit } from "@/lib/nutrition/units";
import type { PantryItemInput, PantryItemPatch } from "@/lib/validation";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export interface PantryItemDto {
  id: string;
  userId: string;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  storageLocation: string;
  expiryDate: string | null;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
  food?: {
    id: string;
    name: string;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
  } | null;
}

export function formatPantryItem(item: any): PantryItemDto {
  const isLowStock =
    typeof item.lowStockThreshold === "number" && item.lowStockThreshold !== null
      ? item.quantity <= item.lowStockThreshold
      : false;

  return {
    id: item.id,
    userId: item.userId,
    foodId: item.foodId,
    name: item.name,
    quantity: Math.round(item.quantity * 100) / 100,
    unit: item.unit,
    category: item.category || "Pantry",
    storageLocation: item.storageLocation || "Pantry",
    expiryDate: item.expiryDate || null,
    lowStockThreshold: item.lowStockThreshold ?? null,
    isLowStock,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
    food: item.food
      ? {
          id: item.food.id,
          name: item.food.name,
          caloriesPer100g: item.food.caloriesPer100g,
          proteinPer100g: item.food.proteinPer100g,
          carbsPer100g: item.food.carbsPer100g,
          fatPer100g: item.food.fatPer100g,
        }
      : null,
  };
}

export async function listPantryItems(userId: string): Promise<PantryItemDto[]> {
  const items = await prisma.pantryItem.findMany({
    where: { userId },
    include: { food: true },
    orderBy: [{ storageLocation: "asc" }, { name: "asc" }],
  });

  return items.map(formatPantryItem);
}

export async function getPantryItem(userId: string, id: string): Promise<PantryItemDto> {
  const item = await prisma.pantryItem.findFirst({
    where: { id, userId },
    include: { food: true },
  });
  if (!item) throw new HttpError(404, "Pantry item not found.", "not_found");
  return formatPantryItem(item);
}

export async function createPantryItem(
  userId: string,
  input: PantryItemInput
): Promise<PantryItemDto> {
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.pantryItem.create({
      data: {
        userId,
        name: input.name.trim(),
        quantity: input.quantity,
        unit: input.unit.trim() || "g",
        category: input.category || "Pantry",
        storageLocation: input.storageLocation || "Pantry",
        expiryDate: input.expiryDate || null,
        lowStockThreshold: input.lowStockThreshold ?? null,
        foodId: input.foodId || null,
      },
      include: { food: true },
    });

    await tx.pantryTransaction.create({
      data: {
        userId,
        pantryItemId: item.id,
        type: "ADD",
        quantity: item.quantity,
        unit: item.unit,
        sourceType: "manual",
      },
    });

    return item;
  });

  return formatPantryItem(created);
}

export async function updatePantryItem(
  userId: string,
  id: string,
  input: PantryItemPatch
): Promise<PantryItemDto> {
  const existing = await prisma.pantryItem.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new HttpError(404, "Pantry item not found.", "not_found");

  const updated = await prisma.$transaction(async (tx) => {
    let nextQuantity = existing.quantity;
    if (input.delta !== undefined) {
      nextQuantity = Math.max(0, existing.quantity + input.delta);
    } else if (input.quantity !== undefined) {
      nextQuantity = Math.max(0, input.quantity);
    }

    const qtyDiff = nextQuantity - existing.quantity;

    const row = await tx.pantryItem.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name.trim() : undefined,
        quantity: nextQuantity,
        unit: input.unit !== undefined ? input.unit.trim() : undefined,
        category: input.category !== undefined ? input.category : undefined,
        storageLocation: input.storageLocation !== undefined ? input.storageLocation : undefined,
        expiryDate: input.expiryDate !== undefined ? input.expiryDate : undefined,
        lowStockThreshold:
          input.lowStockThreshold !== undefined ? input.lowStockThreshold : undefined,
      },
      include: { food: true },
    });

    if (Math.abs(qtyDiff) > 0.0001) {
      await tx.pantryTransaction.create({
        data: {
          userId,
          pantryItemId: id,
          type: qtyDiff > 0 ? "ADD" : "REMOVE",
          quantity: Math.abs(qtyDiff),
          unit: row.unit,
          sourceType: "manual",
        },
      });
    }

    return row;
  });

  return formatPantryItem(updated);
}

export async function deletePantryItem(userId: string, id: string): Promise<void> {
  const existing = await prisma.pantryItem.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new HttpError(404, "Pantry item not found.", "not_found");

  await prisma.pantryItem.delete({ where: { id } });
}

/**
 * Deduct pantry items for a meal when logged
 */
export async function deductPantryForMeal(
  tx: Prisma.TransactionClient,
  userId: string,
  mealId: string,
  recipeId: string,
  mealServings: number
): Promise<number> {
  const recipe = await tx.recipe.findFirst({
    where: { id: recipeId },
    include: { ingredients: true },
  });
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return 0;

  const pantryItems = await tx.pantryItem.findMany({
    where: { userId },
  });
  if (pantryItems.length === 0) return 0;

  const multiplier = mealServings / Math.max(1, recipe.servings);
  let deductionsCount = 0;

  for (const ing of recipe.ingredients) {
    const neededRawQty = ing.quantity * multiplier;
    const ingNormUnit = normalizeUnit(ing.unit);
    const ingUnitInfo = COMMON_UNITS[ingNormUnit];
    const ingType = ingUnitInfo?.type || "mass";

    // Find pantry match by foodId first, then name
    const match = pantryItems.find((p) => {
      if (ing.foodId && p.foodId && ing.foodId === p.foodId) return true;
      const pName = p.name.toLowerCase().trim();
      const rName = ing.rawName.toLowerCase().trim();
      return pName.includes(rName) || rName.includes(pName);
    });

    if (!match) continue;

    const matchNormUnit = normalizeUnit(match.unit);
    const matchUnitInfo = COMMON_UNITS[matchNormUnit];
    const matchType = matchUnitInfo?.type || "mass";

    // Only deduct if unit dimensions match (mass to mass, volume to volume, count to count)
    if (ingType !== matchType) continue;

    // Convert needed quantity to pantry unit base
    let neededInPantryUnit = neededRawQty;
    if (ingNormUnit !== matchNormUnit && ingUnitInfo && matchUnitInfo) {
      const baseVal = neededRawQty * ingUnitInfo.baseGrams;
      neededInPantryUnit = baseVal / matchUnitInfo.baseGrams;
    }

    // Deduct up to available amount, minimum 0
    const actualDeduction = Math.min(match.quantity, neededInPantryUnit);
    if (actualDeduction <= 0) continue;

    const newStock = Math.max(0, match.quantity - actualDeduction);

    await tx.pantryItem.update({
      where: { id: match.id },
      data: { quantity: newStock },
    });

    await tx.pantryTransaction.create({
      data: {
        userId,
        pantryItemId: match.id,
        type: "MEAL_USAGE",
        quantity: actualDeduction,
        unit: match.unit,
        sourceType: "meal",
        sourceId: mealId,
      },
    });

    deductionsCount++;
  }

  return deductionsCount;
}

/**
 * Restore exact pantry quantities when a meal is unlogged
 */
export async function restorePantryForMeal(
  tx: Prisma.TransactionClient,
  userId: string,
  mealId: string
): Promise<number> {
  const transactions = await tx.pantryTransaction.findMany({
    where: {
      userId,
      sourceType: "meal",
      sourceId: mealId,
      type: "MEAL_USAGE",
    },
  });

  if (transactions.length === 0) return 0;

  let restoredCount = 0;
  for (const t of transactions) {
    const pantryItem = await tx.pantryItem.findFirst({
      where: { id: t.pantryItemId, userId },
    });

    if (pantryItem) {
      await tx.pantryItem.update({
        where: { id: pantryItem.id },
        data: { quantity: pantryItem.quantity + t.quantity },
      });

      await tx.pantryTransaction.create({
        data: {
          userId,
          pantryItemId: pantryItem.id,
          type: "RESTORE",
          quantity: t.quantity,
          unit: t.unit,
          sourceType: "meal",
          sourceId: mealId,
        },
      });

      restoredCount++;
    }
  }

  return restoredCount;
}

/**
 * Add or increment purchased shopping list item in pantry
 */
export async function addPurchasedItemToPantry(
  userId: string,
  item: {
    name: string;
    quantity: number;
    unit: string;
    category?: string;
    storageLocation?: string;
    foodId?: string | null;
  }
): Promise<PantryItemDto> {
  return await prisma.$transaction(async (tx) => {
    // Look for existing pantry item by foodId or exact name
    const existing = await tx.pantryItem.findFirst({
      where: {
        userId,
        OR: [
          ...(item.foodId ? [{ foodId: item.foodId }] : []),
          { name: { equals: item.name.trim() } },
        ],
      },
    });

    if (existing) {
      const normExisting = normalizeUnit(existing.unit);
      const normPurchased = normalizeUnit(item.unit);
      let addQty = item.quantity;

      const existingUnitInfo = COMMON_UNITS[normExisting];
      const purchasedUnitInfo = COMMON_UNITS[normPurchased];

      if (
        normExisting !== normPurchased &&
        existingUnitInfo &&
        purchasedUnitInfo &&
        existingUnitInfo.type === purchasedUnitInfo.type
      ) {
        const base = item.quantity * purchasedUnitInfo.baseGrams;
        addQty = base / existingUnitInfo.baseGrams;
      }

      const updated = await tx.pantryItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + addQty },
        include: { food: true },
      });

      await tx.pantryTransaction.create({
        data: {
          userId,
          pantryItemId: existing.id,
          type: "ADD",
          quantity: addQty,
          unit: existing.unit,
          sourceType: "shopping",
        },
      });

      return formatPantryItem(updated);
    } else {
      const created = await tx.pantryItem.create({
        data: {
          userId,
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit || "piece",
          category: item.category || "Pantry",
          storageLocation: item.storageLocation || "Pantry",
          foodId: item.foodId || null,
        },
        include: { food: true },
      });

      await tx.pantryTransaction.create({
        data: {
          userId,
          pantryItemId: created.id,
          type: "ADD",
          quantity: created.quantity,
          unit: created.unit,
          sourceType: "shopping",
        },
      });

      return formatPantryItem(created);
    }
  });
}
