/**
 * Deterministic natural quantity & unit parser for food search input.
 * Extracts leading numbers/fractions and optional standard units.
 *
 * Examples:
 *   "4 sunny side up eggs" -> { quantity: 4, unit: null, foodQuery: "sunny side up eggs" }
 *   "250g chicken breast"   -> { quantity: 250, unit: "g", foodQuery: "chicken breast" }
 *   "1.5 cups white rice"   -> { quantity: 1.5, unit: "cup", foodQuery: "white rice" }
 *   "1/2 avocado"           -> { quantity: 0.5, unit: null, foodQuery: "avocado" }
 *   "2 scoops whey protein" -> { quantity: 2, unit: "scoop", foodQuery: "whey protein" }
 */

export interface ParsedSearchInput {
  rawInput: string;
  foodQuery: string;
  quantity: number | null;
  unit: string | null;
  hasNaturalQuantity: boolean;
}

export type ParsedNaturalSearch = ParsedSearchInput;

const FRACTIONS: Record<string, number> = {
  "1/2": 0.5,
  "1/3": 0.33,
  "2/3": 0.67,
  "1/4": 0.25,
  "3/4": 0.75,
  "1/8": 0.125,
  "½": 0.5,
  "⅓": 0.33,
  "⅔": 0.67,
  "¼": 0.25,
  "¾": 0.75,
};

const UNIT_MAP: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  slice: "slice",
  slices: "slice",
  piece: "piece",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",
  scoop: "scoop",
  scoops: "scoop",
  serving: "serving",
  servings: "serving",
  can: "can",
  cans: "can",
  bottle: "bottle",
  bottles: "bottle",
  bar: "bar",
  bars: "bar",
};

export function parseNaturalSearch(input: string): ParsedSearchInput {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      rawInput: input,
      foodQuery: "",
      quantity: null,
      unit: null,
      hasNaturalQuantity: false,
    };
  }

  // Regex pattern to match leading quantity and optional unit:
  // 1) "250g chicken" or "250ml milk"
  // 2) "1 1/2 cups rice" or "1/2 cup rice"
  // 3) "4 eggs"
  // 4) "1.5 slice bread"

  // Check attached unit e.g. "250g" or "100ml" or "4oz"
  const attachedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)(?:\s+(.*))?$/);
  if (attachedMatch) {
    const numPart = parseFloat(attachedMatch[1]);
    const rawUnit = attachedMatch[2].toLowerCase();
    const rest = (attachedMatch[3] || "").trim();

    if (
      UNIT_MAP[rawUnit] &&
      rest.length >= 2 &&
      Number.isFinite(numPart) &&
      numPart > 0 &&
      numPart <= 10000
    ) {
      return {
        rawInput: input,
        foodQuery: rest,
        quantity: numPart,
        unit: UNIT_MAP[rawUnit],
        hasNaturalQuantity: true,
      };
    }
  }

  // Check fraction e.g. "1 1/2", "1/2", "½"
  const mixedFractionMatch = trimmed.match(/^(\d+)\s+([1-9]\/[1-9]|½|⅓|⅔|¼|¾)(?:\s+([a-zA-Z]+))?(?:\s+(.*))?$/);
  if (mixedFractionMatch) {
    const whole = parseInt(mixedFractionMatch[1], 10);
    const frac = FRACTIONS[mixedFractionMatch[2]] || 0;
    const totalQty = whole + frac;
    const potentialUnit = mixedFractionMatch[3]?.toLowerCase();
    const rest = (mixedFractionMatch[4] || "").trim();

    if (potentialUnit && UNIT_MAP[potentialUnit]) {
      return {
        rawInput: input,
        foodQuery: rest || mixedFractionMatch[3],
        quantity: totalQty,
        unit: UNIT_MAP[potentialUnit],
        hasNaturalQuantity: true,
      };
    }

    const queryRest = [mixedFractionMatch[3], rest].filter(Boolean).join(" ").trim();
    if (queryRest) {
      return {
        rawInput: input,
        foodQuery: queryRest,
        quantity: totalQty,
        unit: null,
        hasNaturalQuantity: true,
      };
    }
  }

  const singleFractionMatch = trimmed.match(/^([1-9]\/[1-9]|½|⅓|⅔|¼|¾)(?:\s+([a-zA-Z]+))?(?:\s+(.*))?$/);
  if (singleFractionMatch) {
    const totalQty = FRACTIONS[singleFractionMatch[1]] || 0.5;
    const potentialUnit = singleFractionMatch[2]?.toLowerCase();
    const rest = (singleFractionMatch[3] || "").trim();

    if (potentialUnit && UNIT_MAP[potentialUnit] && rest.length > 0) {
      return {
        rawInput: input,
        foodQuery: rest,
        quantity: totalQty,
        unit: UNIT_MAP[potentialUnit],
        hasNaturalQuantity: true,
      };
    }

    const queryRest = [singleFractionMatch[2], rest].filter(Boolean).join(" ").trim();
    if (queryRest) {
      return {
        rawInput: input,
        foodQuery: queryRest,
        quantity: totalQty,
        unit: null,
        hasNaturalQuantity: true,
      };
    }
  }

  // Check standard leading decimal / integer quantity with optional unit:
  // e.g. "4 sunny side up eggs" or "1.5 cups rice"
  const standardMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+(.*))?$/);
  if (standardMatch) {
    const numPart = parseFloat(standardMatch[1]);
    const potentialUnit = standardMatch[2].toLowerCase();
    const rest = (standardMatch[3] || "").trim();

    if (Number.isFinite(numPart) && numPart > 0 && numPart <= 10000) {
      if (UNIT_MAP[potentialUnit] && rest.length >= 2) {
        return {
          rawInput: input,
          foodQuery: rest,
          quantity: numPart,
          unit: UNIT_MAP[potentialUnit],
          hasNaturalQuantity: true,
        };
      }

      // No recognized unit, but leading number e.g. "4 sunny side up eggs"
      const queryRest = [standardMatch[2], rest].filter(Boolean).join(" ").trim();
      if (queryRest.length >= 2) {
        return {
          rawInput: input,
          foodQuery: queryRest,
          quantity: numPart,
          unit: null,
          hasNaturalQuantity: true,
        };
      }
    }
  }

  // No natural quantity found
  return {
    rawInput: input,
    foodQuery: trimmed,
    quantity: null,
    unit: null,
    hasNaturalQuantity: false,
  };
}
