import {
  FoodDatabaseProvider,
  NormalizedFood,
  ProviderSearchOptions,
  FoodProviderName,
} from "./types";
import { nutritionCache } from "./cache";
import { inferCategory, detectRawOrCooked } from "../external-foods";

const CACHE_TTL_SEARCH_MS = 15 * 60 * 1000; // 15 mins
const CACHE_TTL_BARCODE_MS = 60 * 60 * 1000; // 1 hour

export class USDAProvider implements FoodDatabaseProvider {
  getProviderName(): FoodProviderName {
    return "usda";
  }

  isEnabled(): boolean {
    return true; // Works with user key, env key, or public DEMO_KEY
  }

  private getApiKey(options?: ProviderSearchOptions): string {
    return options?.usdaApiKey || process.env.USDA_API_KEY || "DEMO_KEY";
  }

  async search(query: string, options?: ProviderSearchOptions): Promise<NormalizedFood[]> {
    const clean = query.trim();
    if (!clean) return [];

    const limit = options?.limit || 15;
    const cacheKey = `usda:search:${clean.toLowerCase()}:${limit}`;
    const cached = nutritionCache.get<NormalizedFood[]>(cacheKey);
    if (cached) return cached;

    const key = this.getApiKey(options);
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      clean
    )}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded&pageSize=${limit}&api_key=${encodeURIComponent(
      key
    )}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: options?.signal,
      });

      if (!res.ok) {
        console.warn(`USDA API search returned ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      if (!data.foods || !Array.isArray(data.foods)) return [];

      const results = data.foods.map((item: any) => this.normalizeFood(item));
      nutritionCache.set(cacheKey, results, CACHE_TTL_SEARCH_MS);
      return results;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("USDA FoodData Central search failed:", err);
      }
      return [];
    }
  }

  async getById(id: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const fdcId = id.startsWith("usda-") ? id.slice(5) : id;
    const cacheKey = `usda:id:${fdcId}`;
    const cached = nutritionCache.get<NormalizedFood>(cacheKey);
    if (cached) return cached;

    const key = this.getApiKey(options);
    const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(
      fdcId
    )}?api_key=${encodeURIComponent(key)}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: options?.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      const normalized = this.normalizeFood(data);
      nutritionCache.set(cacheKey, normalized, CACHE_TTL_BARCODE_MS);
      return normalized;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("USDA FoodData Central getById failed:", err);
      }
      return null;
    }
  }

  async getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const cacheKey = `usda:barcode:${cleanBarcode}`;
    const cached = nutritionCache.get<NormalizedFood>(cacheKey);
    if (cached) return cached;

    const key = this.getApiKey(options);
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      cleanBarcode
    )}&dataType=Branded&pageSize=5&api_key=${encodeURIComponent(key)}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: options?.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.foods || !Array.isArray(data.foods) || data.foods.length === 0) return null;

      // Find exact gtinUpc match
      const exact = data.foods.find(
        (f: any) => f.gtinUpc === cleanBarcode || f.gtinUpc?.replace(/^0+/, "") === cleanBarcode.replace(/^0+/, "")
      ) || data.foods[0];

      const normalized = this.normalizeFood(exact);
      nutritionCache.set(cacheKey, normalized, CACHE_TTL_BARCODE_MS);
      return normalized;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("USDA FoodData Central barcode lookup failed:", err);
      }
      return null;
    }
  }

  normalizeFood(item: any): NormalizedFood {
    let calories = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;
    let fiber: number | null = null;
    let totalSugars: number | null = null;
    let addedSugars: number | null = null;
    let saturatedFat: number | null = null;
    let transFat: number | null = null;
    let sodium: number | null = null;

    if (Array.isArray(item.foodNutrients)) {
      for (const nut of item.foodNutrients) {
        const nutName = (nut.nutrientName || "").toLowerCase();
        const nutNum = String(nut.nutrientNumber || "");
        const nutId = Number(nut.nutrientId || 0);
        const val = Number(nut.value);

        if (isNaN(val)) continue;

        // Energy / Calories (KCAL)
        if (
          nutNum === "208" ||
          nutId === 1008 ||
          (nutName.includes("energy") && (nut.unitName === "KCAL" || !nut.unitName))
        ) {
          calories = Math.max(0, Math.round(val));
        }
        // Protein
        else if (nutNum === "203" || nutId === 1003 || nutName === "protein") {
          protein = Math.max(0, Math.round(val * 100) / 100);
        }
        // Total lipid (fat)
        else if (
          nutNum === "204" ||
          nutId === 1004 ||
          nutName.includes("total lipid") ||
          nutName === "fat"
        ) {
          fat = Math.max(0, Math.round(val * 100) / 100);
        }
        // Carbohydrate
        else if (
          nutNum === "205" ||
          nutId === 1005 ||
          nutName.includes("carbohydrate, by difference") ||
          nutName === "carbohydrate"
        ) {
          carbs = Math.max(0, Math.round(val * 100) / 100);
        }
        // Dietary fiber
        else if (
          nutNum === "291" ||
          nutId === 1079 ||
          nutName.includes("fiber, total dietary") ||
          nutName === "fiber"
        ) {
          fiber = Math.max(0, Math.round(val * 100) / 100);
        }
        // Total sugars
        else if (
          nutNum === "269" ||
          nutId === 2000 ||
          nutName.includes("sugars, total") ||
          nutName === "sugars"
        ) {
          totalSugars = Math.max(0, Math.round(val * 100) / 100);
        }
        // Added sugars
        else if (nutNum === "539" || nutId === 1235 || nutName.includes("sugars, added")) {
          addedSugars = Math.max(0, Math.round(val * 100) / 100);
        }
        // Saturated fat
        else if (nutNum === "606" || nutId === 1258 || nutName.includes("fatty acids, total saturated")) {
          saturatedFat = Math.max(0, Math.round(val * 100) / 100);
        }
        // Trans fat
        else if (nutNum === "605" || nutId === 1257 || nutName.includes("fatty acids, total trans")) {
          transFat = Math.max(0, Math.round(val * 100) / 100);
        }
        // Sodium (mg)
        else if (nutNum === "307" || nutId === 1093 || nutName.includes("sodium, na")) {
          sodium = Math.max(0, Math.round(val));
        }
      }
    }

    const description = item.description || "USDA Food Item";
    const rawOrCooked = detectRawOrCooked(description);
    const category = inferCategory(description, item.foodCategory);

    // Serving weight from portions
    let servingWeight = 100;
    let servingSize: number | null = null;
    let servingUnit = "g";

    if (Array.isArray(item.foodPortions) && item.foodPortions.length > 0) {
      const portion = item.foodPortions[0];
      if (portion.gramWeight && portion.gramWeight > 0) {
        servingWeight = Math.round(portion.gramWeight);
      }
      if (portion.amount) {
        servingSize = Number(portion.amount) || 1;
      }
      if (portion.measureUnit?.name) {
        servingUnit = portion.measureUnit.name.toLowerCase();
      }
    } else if (item.servingSize && item.servingSizeUnit) {
      servingSize = Number(item.servingSize) || null;
      servingUnit = item.servingSizeUnit;
      if (servingUnit.toLowerCase() === "g" && servingSize) {
        servingWeight = servingSize;
      }
    }

    const fdcId = String(item.fdcId || Math.random().toString(36).substring(2, 9));

    return {
      id: `usda-${fdcId}`,
      provider: "usda",
      providerId: fdcId,
      name: description,
      brand: item.brandOwner || item.brandName || null,
      category,
      rawOrCooked,
      servingSize: servingSize || (servingWeight > 0 ? servingWeight : 100),
      servingUnit: servingUnit || "g",
      servingWeightGrams: servingWeight > 0 ? servingWeight : 100,
      nutritionBasis: "PER_100G",
      defaultUnit: servingUnit === "piece" ? "piece" : "g",
      calories,
      protein,
      carbohydrates: carbs,
      fat,
      dietaryFiber: fiber,
      totalSugars,
      addedSugars,
      saturatedFat,
      transFat,
      sodium,
      barcode: item.gtinUpc || null,
      sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`,
      imageUrl: null,
      isLocal: false,
      retrievedAt: new Date().toISOString(),
    };
  }
}
