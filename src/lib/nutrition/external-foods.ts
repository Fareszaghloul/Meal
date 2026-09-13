import { prisma } from "@/lib/db";

export interface ExternalFoodCandidate {
  id: string; // e.g. "usda-171077" or "off-737628064502"
  source: "usda" | "openfoodfacts";
  name: string;
  brand?: string | null;
  category: string;
  rawOrCooked: "raw" | "cooked" | "dry" | "unspecified";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  defaultUnit: string;
  servingWeightGrams: number;
  confidence?: number;
  barcode?: string | null;
  imageUrl?: string | null;
}

// Helper to detect raw vs cooked state from ingredient text/description
export function detectRawOrCooked(text: string): "raw" | "cooked" | "dry" | "unspecified" {
  const lower = text.toLowerCase();
  if (/\b(raw|fresh|uncooked)\b/.test(lower)) return "raw";
  if (/\b(dry|uncooked|rolled|raw oats|grains dry)\b/.test(lower)) return "dry";
  if (
    /\b(cooked|roasted|baked|boiled|fried|steamed|grilled|microwaved|braised|broiled|seared)\b/.test(
      lower
    )
  )
    return "cooked";
  return "unspecified";
}

// Helper to infer category for external foods
export function inferCategory(name: string, broadCategory?: string): string {
  const n = (name + " " + (broadCategory || "")).toLowerCase();
  if (/\b(chicken|beef|pork|turkey|meat|steak|lamb|bacon|sausage|veal|venison|duck)\b/.test(n))
    return "Meat";
  if (/\b(fish|salmon|tuna|shrimp|cod|tilapia|seafood|crab|lobster|prawn)\b/.test(n))
    return "Seafood";
  if (/\b(milk|egg|eggs|yogurt|cheese|parmesan|cheddar|mozzarella|butter|whey|casein)\b/.test(n))
    return "Dairy & Eggs";
  if (/\b(rice|oats|oatmeal|pasta|bread|flour|quinoa|cereal|noodle|grain|tortilla)\b/.test(n))
    return "Grains";
  if (
    /\b(apple|banana|broccoli|spinach|tomato|potato|onion|garlic|carrot|berry|berries|lettuce|avocado|vegetable|fruit)\b/.test(
      n
    )
  )
    return "Produce";
  if (/\b(protein powder|creatine|bcaa|supplement)\b/.test(n)) return "Supplements";
  return "Pantry";
}

/**
 * 39a. Query USDA FoodData Central
 * Free official API: https://api.nal.usda.gov/fdc/v1/foods/search
 */
export async function searchUSDAFoodDataCentral(
  query: string,
  apiKey?: string | null
): Promise<ExternalFoodCandidate[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const key = apiKey || process.env.USDA_API_KEY || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    cleanQuery
  )}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)&pageSize=15&api_key=${encodeURIComponent(
    key
  )}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`USDA API search returned ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    if (!data.foods || !Array.isArray(data.foods)) return [];

    const candidates: ExternalFoodCandidate[] = data.foods.map((item: any) => {
      let calories = 0;
      let protein = 0;
      let fat = 0;
      let carbs = 0;
      let fiber = 0;

      if (Array.isArray(item.foodNutrients)) {
        for (const nut of item.foodNutrients) {
          const nutName = (nut.nutrientName || "").toLowerCase();
          const nutNum = String(nut.nutrientNumber || "");
          const nutId = Number(nut.nutrientId || 0);
          const val = Number(nut.value) || 0;

          // Energy / Calories (KCAL)
          if (
            nutNum === "208" ||
            nutId === 1008 ||
            (nutName.includes("energy") && (nut.unitName === "KCAL" || !nut.unitName))
          ) {
            calories = val;
          }
          // Protein
          else if (nutNum === "203" || nutId === 1003 || nutName === "protein") {
            protein = val;
          }
          // Total lipid (fat)
          else if (
            nutNum === "204" ||
            nutId === 1004 ||
            nutName.includes("total lipid") ||
            nutName === "fat"
          ) {
            fat = val;
          }
          // Carbohydrate
          else if (
            nutNum === "205" ||
            nutId === 1005 ||
            nutName.includes("carbohydrate, by difference") ||
            nutName === "carbohydrate"
          ) {
            carbs = val;
          }
          // Dietary fiber
          else if (
            nutNum === "291" ||
            nutId === 1079 ||
            nutName.includes("fiber, total dietary") ||
            nutName === "fiber"
          ) {
            fiber = val;
          }
        }
      }

      const description = item.description || cleanQuery;
      const rawOrCooked = detectRawOrCooked(description);
      const category = inferCategory(description, item.foodCategory);

      // Serving weight from portions if available
      let servingWeight = 100;
      let defaultUnit = "g";
      if (Array.isArray(item.foodPortions) && item.foodPortions.length > 0) {
        const portion = item.foodPortions[0];
        if (portion.gramWeight && portion.gramWeight > 0) {
          servingWeight = Math.round(portion.gramWeight);
        }
        if (portion.measureUnit?.name) {
          const mUnit = portion.measureUnit.name.toLowerCase();
          if (mUnit.includes("piece") || mUnit.includes("item") || mUnit.includes("egg")) {
            defaultUnit = "piece";
          } else if (mUnit.includes("tbsp") || mUnit.includes("tablespoon")) {
            defaultUnit = "tbsp";
          } else if (mUnit.includes("tsp") || mUnit.includes("teaspoon")) {
            defaultUnit = "tsp";
          } else if (mUnit.includes("cup")) {
            defaultUnit = "cup";
          }
        }
      }

      return {
        id: `usda-${item.fdcId || Math.random().toString(36).substring(2, 9)}`,
        source: "usda",
        name: description,
        brand: item.brandOwner || null,
        category,
        rawOrCooked,
        caloriesPer100g: Math.round(calories * 10) / 10,
        proteinPer100g: Math.round(protein * 10) / 10,
        carbsPer100g: Math.round(carbs * 10) / 10,
        fatPer100g: Math.round(fat * 10) / 10,
        fiberPer100g: Math.round(fiber * 10) / 10,
        defaultUnit,
        servingWeightGrams: servingWeight,
      };
    });

    return candidates;
  } catch (error) {
    console.error("USDA FoodData Central search error:", error);
    return [];
  }
}

/**
 * 39b. Query Open Food Facts
 * Free crowdsourced API: https://world.openfoodfacts.org/
 */
export async function searchOpenFoodFacts(query: string): Promise<ExternalFoodCandidate[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const isBarcode = /^\d{8,14}$/.test(cleanQuery);
  const userAgent = "MealPrepApp - Web - Version 1.0 (personal meal planner)";

  try {
    if (isBarcode) {
      // Direct Barcode Lookup
      const url = `https://world.openfoodfacts.org/api/v0/product/${cleanQuery}.json`;
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (data.status !== 1 || !data.product) return [];

      const p = data.product;
      const nuts = p.nutriments || {};

      let calories =
        Number(nuts["energy-kcal_100g"]) ||
        Number(nuts["energy-kcal"]) ||
        Math.round((Number(nuts["energy_100g"]) || 0) / 4.184) ||
        0;
      let protein = Number(nuts["proteins_100g"]) || Number(nuts["proteins"]) || 0;
      let carbs = Number(nuts["carbohydrates_100g"]) || Number(nuts["carbohydrates"]) || 0;
      let fat = Number(nuts["fat_100g"]) || Number(nuts["fat"]) || 0;
      let fiber = Number(nuts["fiber_100g"]) || Number(nuts["fiber"]) || 0;

      let servingWeight = Number(p.serving_quantity) || 100;
      let defaultUnit = "g";

      const title = p.product_name || p.generic_name || `Product ${cleanQuery}`;
      const brand = p.brands || null;
      const fullName = brand ? `${brand} - ${title}` : title;

      return [
        {
          id: `off-${p.code || cleanQuery}`,
          source: "openfoodfacts",
          name: fullName,
          brand,
          category: inferCategory(fullName, p.categories),
          rawOrCooked: detectRawOrCooked(fullName),
          caloriesPer100g: Math.round(calories * 10) / 10,
          proteinPer100g: Math.round(protein * 10) / 10,
          carbsPer100g: Math.round(carbs * 10) / 10,
          fatPer100g: Math.round(fat * 10) / 10,
          fiberPer100g: Math.round(fiber * 10) / 10,
          defaultUnit,
          servingWeightGrams: servingWeight,
          barcode: cleanQuery,
          imageUrl: p.image_url || p.image_front_url || null,
        },
      ];
    } else {
      // General Product Name Search
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        cleanQuery
      )}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,generic_name,brands,categories,nutriments,serving_size,serving_quantity,image_url`;

      const res = await fetch(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!data.products || !Array.isArray(data.products)) return [];

      const candidates: ExternalFoodCandidate[] = data.products
        .filter((p: any) => p.product_name && p.product_name.trim())
        .map((p: any) => {
          const nuts = p.nutriments || {};

          let calories =
            Number(nuts["energy-kcal_100g"]) ||
            Number(nuts["energy-kcal"]) ||
            Math.round((Number(nuts["energy_100g"]) || 0) / 4.184) ||
            0;
          let protein = Number(nuts["proteins_100g"]) || Number(nuts["proteins"]) || 0;
          let carbs = Number(nuts["carbohydrates_100g"]) || Number(nuts["carbohydrates"]) || 0;
          let fat = Number(nuts["fat_100g"]) || Number(nuts["fat"]) || 0;
          let fiber = Number(nuts["fiber_100g"]) || Number(nuts["fiber"]) || 0;

          let servingWeight = Number(p.serving_quantity) || 100;
          let defaultUnit = "g";

          const title = p.product_name || p.generic_name || cleanQuery;
          const brand = p.brands ? p.brands.split(",")[0].trim() : null;
          const fullName =
            brand && !title.toLowerCase().includes(brand.toLowerCase())
              ? `${brand} ${title}`
              : title;

          return {
            id: `off-${p.code || Math.random().toString(36).substring(2, 9)}`,
            source: "openfoodfacts",
            name: fullName,
            brand,
            category: inferCategory(fullName, p.categories),
            rawOrCooked: detectRawOrCooked(fullName),
            caloriesPer100g: Math.round(calories * 10) / 10,
            proteinPer100g: Math.round(protein * 10) / 10,
            carbsPer100g: Math.round(carbs * 10) / 10,
            fatPer100g: Math.round(fat * 10) / 10,
            fiberPer100g: Math.round(fiber * 10) / 10,
            defaultUnit,
            servingWeightGrams: servingWeight,
            barcode: p.code || null,
            imageUrl: p.image_url || null,
          };
        });

      return candidates;
    }
  } catch (error) {
    console.error("Open Food Facts search error:", error);
    return [];
  }
}

/**
 * 39d. searchExternalFoodSources
 * Queries USDA FoodData Central first, then Open Food Facts, and merges the candidate list.
 */
export async function searchExternalFoodSources(
  query: string,
  customApiKey?: string | null
): Promise<ExternalFoodCandidate[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const isBarcode = /^\d{8,14}$/.test(cleanQuery);

  // If it's a barcode, query Open Food Facts directly
  if (isBarcode) {
    return await searchOpenFoodFacts(cleanQuery);
  }

  // Otherwise query USDA FoodData Central first
  const usdaResults = await searchUSDAFoodDataCentral(cleanQuery, customApiKey);

  // Query Open Food Facts concurrently or as supplement for branded goods
  const offResults = await searchOpenFoodFacts(cleanQuery);

  // Merge and rank results: USDA whole/raw foods first, followed by branded Open Food Facts
  const combined: ExternalFoodCandidate[] = [...usdaResults, ...offResults];

  // Deduplicate by name (case-insensitive)
  const seenNames = new Set<string>();
  const deduplicated: ExternalFoodCandidate[] = [];

  for (const item of combined) {
    const key = item.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

/**
 * 39d. importExternalFood
 * Saves a selected external candidate into the local Food table (Section 26),
 * mapping fields and handling name conflicts safely.
 */
export async function importExternalFood(candidate: ExternalFoodCandidate, userId?: string) {
  let targetName = candidate.name.trim();

  // Check if a food with this name already exists for this user or globally
  const existing = await prisma.food.findFirst({
    where: {
      name: targetName,
      OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
    },
  });

  if (existing) {
    // If exact name exists, differentiate by appending brand/source tag
    const disambiguation = candidate.brand
      ? ` (${candidate.brand})`
      : candidate.source === "usda"
      ? " (USDA)"
      : " (OFF)";
    targetName = `${targetName}${disambiguation}`;
  }

  const food = await prisma.food.create({
    data: {
      userId: userId || null,
      name: targetName,
      category: candidate.category || "Pantry",
      rawOrCooked: candidate.rawOrCooked || "unspecified",
      caloriesPer100g: Number(candidate.caloriesPer100g) || 0,
      proteinPer100g: Number(candidate.proteinPer100g) || 0,
      carbsPer100g: Number(candidate.carbsPer100g) || 0,
      fatPer100g: Number(candidate.fatPer100g) || 0,
      fiberPer100g: Number(candidate.fiberPer100g) || 0,
      defaultUnit: candidate.defaultUnit || "g",
      servingWeightGrams: Number(candidate.servingWeightGrams) || 100,
    },
  });

  return food;
}
