/**
 * Unit conversions and standard weight estimations for the Nutrition Engine
 */

export interface UnitInfo {
  name: string;
  aliases: string[];
  type: "mass" | "volume" | "count";
  baseGrams: number; // default gram equivalent if food density isn't known
}

export const COMMON_UNITS: Record<string, UnitInfo> = {
  g: { name: "g", aliases: ["g", "gram", "grams"], type: "mass", baseGrams: 1 },
  kg: { name: "kg", aliases: ["kg", "kilogram", "kilograms"], type: "mass", baseGrams: 1000 },
  oz: { name: "oz", aliases: ["oz", "ounce", "ounces"], type: "mass", baseGrams: 28.3495 },
  lb: { name: "lb", aliases: ["lb", "lbs", "pound", "pounds"], type: "mass", baseGrams: 453.592 },
  
  ml: { name: "ml", aliases: ["ml", "milliliter", "milliliters"], type: "volume", baseGrams: 1 },
  l: { name: "l", aliases: ["l", "liter", "liters", "litre", "litres"], type: "volume", baseGrams: 1000 },
  tbsp: { name: "tbsp", aliases: ["tbsp", "tablespoon", "tablespoons", "tbs"], type: "volume", baseGrams: 14.3 },
  tsp: { name: "tsp", aliases: ["tsp", "teaspoon", "teaspoons"], type: "volume", baseGrams: 4.8 },
  cup: { name: "cup", aliases: ["cup", "cups", "c"], type: "volume", baseGrams: 240 },
  "fl oz": { name: "fl oz", aliases: ["fl oz", "floz", "fluid ounce", "fluid ounces"], type: "volume", baseGrams: 29.57 },

  piece: { name: "piece", aliases: ["piece", "pieces", "pc", "pcs", "item", "items"], type: "count", baseGrams: 100 },
  egg: { name: "egg", aliases: ["egg", "eggs"], type: "count", baseGrams: 50 },
  slice: { name: "slice", aliases: ["slice", "slices"], type: "count", baseGrams: 35 },
  scoop: { name: "scoop", aliases: ["scoop", "scoops"], type: "count", baseGrams: 30 },
  clove: { name: "clove", aliases: ["clove", "cloves"], type: "count", baseGrams: 3 },
  pinch: { name: "pinch", aliases: ["pinch", "pinches"], type: "volume", baseGrams: 0.5 },
};

/**
 * Normalizes any unit string to a canonical unit key
 */
export function normalizeUnit(rawUnit: string): string {
  if (!rawUnit) return "g";
  const cleaned = rawUnit.trim().toLowerCase().replace(/[.]/g, "");
  
  for (const [canonical, info] of Object.entries(COMMON_UNITS)) {
    if (info.aliases.includes(cleaned)) {
      return canonical;
    }
  }
  return cleaned;
}

/**
 * Converts quantity + unit to equivalent grams based on optional food servingWeightGrams
 */
export function convertToGrams(
  quantity: number,
  unit: string,
  foodServingWeightGrams?: number | null,
  foodDefaultUnit?: string | null
): number {
  const canonUnit = normalizeUnit(unit);
  const unitInfo = COMMON_UNITS[canonUnit];

  // If unit matches food's default count unit (e.g. 1 piece, 1 scoop, 1 egg)
  if (
    foodServingWeightGrams &&
    foodDefaultUnit &&
    normalizeUnit(foodDefaultUnit) === canonUnit
  ) {
    return quantity * foodServingWeightGrams;
  }

  if (unitInfo) {
    return quantity * unitInfo.baseGrams;
  }

  // Fallback: assume 1:1 if unit is unknown or empty
  return quantity;
}

/**
 * Format quantity nicely for display (e.g. 1.5 kg, 500 g, 2 tbsp)
 */
export function formatQuantity(quantity: number, unit: string): string {
  const norm = normalizeUnit(unit);
  
  // Format numbers nicely: integers without decimals, floats with up to 1-2 decimals
  const rounded = Math.round(quantity * 10) / 10;
  return `${rounded} ${norm}`;
}
