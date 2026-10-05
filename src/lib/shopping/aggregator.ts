import { normalizeUnit, COMMON_UNITS } from "../nutrition/units";

export interface NeededIngredient {
  foodId?: string | null;
  foodName?: string | null;
  foodCategory?: string | null;
  rawName: string;
  quantity: number;
  unit: string;
}

export interface AggregatedShoppingItem {
  foodId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  pantryQuantity?: number;
  neededBeforePantry?: number;
}

export interface PantryStockItem {
  foodId?: string | null;
  name: string;
  quantity: number;
  unit: string;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  chicken: "Meat",
  beef: "Meat",
  turkey: "Meat",
  pork: "Meat",
  steak: "Meat",
  bacon: "Meat",
  tuna: "Meat",
  salmon: "Meat",
  fish: "Meat",
  shrimp: "Meat",

  milk: "Dairy",
  yogurt: "Dairy",
  cheese: "Dairy",
  parmesan: "Dairy",
  cheddar: "Dairy",
  butter: "Dairy",
  egg: "Dairy",
  eggs: "Dairy",
  cream: "Dairy",

  rice: "Carbs",
  pasta: "Carbs",
  oats: "Carbs",
  oatmeal: "Carbs",
  bread: "Carbs",
  potato: "Carbs",
  potatoes: "Carbs",
  noodle: "Carbs",
  quinoa: "Carbs",
  tortilla: "Carbs",

  broccoli: "Vegetables",
  spinach: "Vegetables",
  onion: "Vegetables",
  garlic: "Vegetables",
  pepper: "Vegetables",
  tomato: "Vegetables",
  lettuce: "Vegetables",
  carrot: "Vegetables",
  zucchini: "Vegetables",
  mushroom: "Vegetables",

  apple: "Fruit",
  banana: "Fruit",
  berry: "Fruit",
  berries: "Fruit",
  lemon: "Fruit",
  lime: "Fruit",
  orange: "Fruit",

  oil: "Sauces & Spices",
  olive: "Sauces & Spices",
  soy: "Sauces & Spices",
  vinegar: "Sauces & Spices",
  salt: "Sauces & Spices",
  paprika: "Sauces & Spices",
  cinnamon: "Sauces & Spices",
  sauce: "Sauces & Spices",

  frozen: "Frozen",
};

export function inferCategory(name: string, fallback?: string): string {
  if (fallback && fallback !== "Pantry") return fallback;
  const lower = name.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) {
      return cat;
    }
  }
  return fallback || "Other";
}

/**
 * Aggregates ingredients from weekly meal plans and optionally subtracts available pantry stock
 */
export function aggregateShoppingList(
  neededIngredients: NeededIngredient[],
  pantryStock: PantryStockItem[] = [],
  subtractPantry: boolean = true
): AggregatedShoppingItem[] {
  // Map of key -> { name, foodId, category, totalGrams, countUnit, countTotal }
  interface ItemAccumulator {
    name: string;
    foodId?: string | null;
    category: string;
    unitType: "mass" | "volume" | "count";
    baseAmount: number; // in grams or ml or raw count
    unitDisplay: string;
  }

  const accumulators = new Map<string, ItemAccumulator>();

  for (const item of neededIngredients) {
    const displayName = item.foodName || item.rawName;
    const category = inferCategory(displayName, item.foodCategory || undefined);
    const normUnit = normalizeUnit(item.unit);

    let unitType: "mass" | "volume" | "count" = "mass";
    let baseAmount = item.quantity;

    if (["ml", "l", "tbsp", "tsp", "cup", "fl oz"].includes(normUnit)) {
      unitType = "volume";
      if (normUnit === "l") baseAmount = item.quantity * 1000;
      else if (normUnit === "tbsp") baseAmount = item.quantity * 15;
      else if (normUnit === "tsp") baseAmount = item.quantity * 5;
      else if (normUnit === "cup") baseAmount = item.quantity * 240;
      else if (normUnit === "fl oz") baseAmount = item.quantity * 29.57;
      else baseAmount = item.quantity;
    } else if (["piece", "egg", "slice", "scoop", "clove"].includes(normUnit)) {
      unitType = "count";
      baseAmount = item.quantity;
    } else {
      // mass: g, kg, oz, lb
      unitType = "mass";
      if (normUnit === "kg") baseAmount = item.quantity * 1000;
      else if (normUnit === "oz") baseAmount = item.quantity * 28.35;
      else if (normUnit === "lb") baseAmount = item.quantity * 453.59;
      else baseAmount = item.quantity;
    }

    const baseKey = (item.foodId || item.foodName || item.rawName).trim().toLowerCase();
    const groupKey = `${baseKey}:::${unitType}`;

    if (!accumulators.has(groupKey)) {
      accumulators.set(groupKey, {
        name: displayName,
        foodId: item.foodId,
        category,
        unitType,
        baseAmount,
        unitDisplay: normUnit,
      });
    } else {
      const existing = accumulators.get(groupKey)!;
      existing.baseAmount += baseAmount;
    }
  }

  // If subtractPantry is active, find matching pantry items with compatible unit dimensions and deduct
  const results: AggregatedShoppingItem[] = [];

  for (const [groupKey, acc] of accumulators.entries()) {
    const baseKey = groupKey.split(":::")[0];
    let neededAmount = acc.baseAmount;
    let pantryAmount = 0;

    if (subtractPantry) {
      // Look for matching item in pantry by foodId or normalized name, matching unit dimension
      const pantryMatch = pantryStock.find((p) => {
        const pNormUnit = normalizeUnit(p.unit);
        const pUnitInfo = COMMON_UNITS[pNormUnit];
        const pType = pUnitInfo?.type || "mass";
        if (pType !== acc.unitType) return false;

        const matchesId = Boolean(acc.foodId && p.foodId && p.foodId === acc.foodId);
        const pName = p.name.toLowerCase().trim();
        const matchesName = pName.includes(baseKey) || baseKey.includes(pName);
        return matchesId || matchesName;
      });

      if (pantryMatch) {
        const pNormUnit = normalizeUnit(pantryMatch.unit);
        const pUnitInfo = COMMON_UNITS[pNormUnit];
        let pBase = pantryMatch.quantity;
        if (pUnitInfo) {
          pBase = pantryMatch.quantity * pUnitInfo.baseGrams;
        }

        pantryAmount = pBase;
        neededAmount = Math.max(0, neededAmount - pBase);
      }
    }

    // Skip items that are completely covered by pantry
    if (neededAmount <= 0) {
      continue;
    }

    // Convert to best display unit (e.g. >= 1000g -> kg)
    let finalQty = neededAmount;
    let finalUnit = acc.unitDisplay;

    if (acc.unitType === "mass") {
      if (neededAmount >= 1000) {
        finalQty = Math.round((neededAmount / 1000) * 100) / 100;
        finalUnit = "kg";
      } else {
        finalQty = Math.round(neededAmount);
        finalUnit = "g";
      }
    } else if (acc.unitType === "volume") {
      if (neededAmount >= 1000) {
        finalQty = Math.round((neededAmount / 1000) * 100) / 100;
        finalUnit = "l";
      } else {
        finalQty = Math.round(neededAmount);
        finalUnit = "ml";
      }
    } else {
      finalQty = Math.round(neededAmount * 10) / 10;
      finalUnit = acc.unitDisplay;
    }

    results.push({
      foodId: acc.foodId,
      name: acc.name,
      quantity: finalQty,
      unit: finalUnit,
      category: acc.category,
      pantryQuantity: pantryAmount > 0 ? pantryAmount : undefined,
      neededBeforePantry: acc.baseAmount,
    });
  }

  // Sort by category then name
  return results.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}
