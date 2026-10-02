import {
  FoodDatabaseProvider,
  NormalizedFood,
  ProviderSearchOptions,
  FoodProviderName,
} from "./types";
import { nutritionCache } from "./cache";
import { inferCategory, detectRawOrCooked } from "../external-foods";

const USER_AGENT = "MealPrepApp - Web - Version 1.0 (https://meal.1234567.website)";
const CACHE_TTL_SEARCH_MS = 15 * 60 * 1000; // 15 mins
const CACHE_TTL_BARCODE_MS = 60 * 60 * 1000; // 1 hour

export class OpenFoodFactsProvider implements FoodDatabaseProvider {
  getProviderName(): FoodProviderName {
    return "openfoodfacts";
  }

  isEnabled(): boolean {
    return true; // Open Food Facts is a public open API without keys
  }

  async search(query: string, options?: ProviderSearchOptions): Promise<NormalizedFood[]> {
    const clean = query.trim();
    if (!clean) return [];

    // If query is a barcode (8-14 digits), redirect to barcode lookup
    if (/^\d{8,14}$/.test(clean)) {
      const single = await this.getByBarcode(clean, options);
      return single ? [single] : [];
    }

    const limit = options?.limit || 15;
    const cacheKey = `off:search:${clean.toLowerCase()}:${limit}`;
    const cached = nutritionCache.get<NormalizedFood[]>(cacheKey);
    if (cached) return cached;

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      clean
    )}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,generic_name,brands,categories,nutriments,serving_size,serving_quantity,image_url,url`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: options?.signal,
      });

      if (!res.ok) {
        console.warn(`Open Food Facts search error: status ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!data.products || !Array.isArray(data.products)) return [];

      const results = data.products
        .filter((p: any) => p.product_name && p.product_name.trim())
        .map((p: any) => this.normalizeFood(p));

      nutritionCache.set(cacheKey, results, CACHE_TTL_SEARCH_MS);
      return results;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Open Food Facts search failed:", err);
      }
      return [];
    }
  }

  async getById(id: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const code = id.startsWith("off-") ? id.slice(4) : id;
    return this.getByBarcode(code, options);
  }

  async getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const cacheKey = `off:barcode:${cleanBarcode}`;
    const cached = nutritionCache.get<NormalizedFood>(cacheKey);
    if (cached) return cached;

    const url = `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: options?.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== 1 || !data.product) return null;

      const normalized = this.normalizeFood(data.product);
      nutritionCache.set(cacheKey, normalized, CACHE_TTL_BARCODE_MS);
      return normalized;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Open Food Facts barcode lookup failed:", err);
      }
      return null;
    }
  }

  normalizeFood(p: any): NormalizedFood {
    const nuts = p.nutriments || {};

    const rawCal =
      Number(nuts["energy-kcal_100g"]) ??
      Number(nuts["energy-kcal"]) ??
      (nuts["energy_100g"] ? Math.round(Number(nuts["energy_100g"]) / 4.184) : 0);
    const calories = Math.max(0, Math.round(rawCal || 0));

    const protein = Math.max(
      0,
      Math.round((Number(nuts["proteins_100g"]) ?? Number(nuts["proteins"]) ?? 0) * 10) / 10
    );

    const carbohydrates = Math.max(
      0,
      Math.round((Number(nuts["carbohydrates_100g"]) ?? Number(nuts["carbohydrates"]) ?? 0) * 10) / 10
    );

    const fat = Math.max(
      0,
      Math.round((Number(nuts["fat_100g"]) ?? Number(nuts["fat"]) ?? 0) * 10) / 10
    );

    // Parse nullables preserving 0 vs null
    const parseNullable = (val: any): number | null => {
      if (val === undefined || val === null || val === "") return null;
      const n = Number(val);
      if (isNaN(n) || n < 0) return null;
      return Math.round(n * 10) / 10;
    };

    const dietaryFiber = parseNullable(nuts["fiber_100g"] ?? nuts["fiber"]);
    const totalSugars = parseNullable(nuts["sugars_100g"] ?? nuts["sugars"]);
    const addedSugars = parseNullable(nuts["added-sugars_100g"] ?? nuts["added-sugars"]);
    const saturatedFat = parseNullable(nuts["saturated-fat_100g"] ?? nuts["saturated-fat"]);
    const transFat = parseNullable(nuts["trans-fat_100g"] ?? nuts["trans-fat"]);

    // Sodium in OFF is stored in grams; convert to whole mg
    let sodium: number | null = null;
    if (nuts["sodium_100g"] !== undefined && nuts["sodium_100g"] !== null && nuts["sodium_100g"] !== "") {
      const g = Number(nuts["sodium_100g"]);
      if (!isNaN(g)) sodium = Math.round(g * 1000);
    } else if (nuts["salt_100g"] !== undefined && nuts["salt_100g"] !== null && nuts["salt_100g"] !== "") {
      const g = Number(nuts["salt_100g"]);
      if (!isNaN(g)) sodium = Math.round(g * 400); // 1g salt ≈ 400mg sodium
    }

    // Serving weight & unit
    let servingWeight = Number(p.serving_quantity) || 100;
    let servingSize: number | null = null;
    let servingUnit = "g";

    if (p.serving_size && typeof p.serving_size === "string") {
      const m = p.serving_size.match(/([0-9.]+)\s*([a-zA-Z]+)?/);
      if (m && m[1]) {
        servingSize = parseFloat(m[1]);
        if (m[2]) servingUnit = m[2].trim();
      }
    }

    const title = p.product_name || p.generic_name || `Product ${p.code || ""}`;
    const brand = p.brands ? p.brands.split(",")[0].trim() : null;

    const code = p.code || String(Math.random()).substring(2, 10);

    return {
      id: `off-${code}`,
      provider: "openfoodfacts",
      providerId: code,
      name: title,
      brand,
      category: inferCategory(title, p.categories),
      rawOrCooked: detectRawOrCooked(title),
      servingSize: servingSize || (servingWeight > 0 ? servingWeight : 100),
      servingUnit: servingUnit || "g",
      servingWeightGrams: servingWeight > 0 ? servingWeight : 100,
      nutritionBasis: "PER_100G",
      defaultUnit: "g",
      calories,
      protein,
      carbohydrates,
      fat,
      dietaryFiber,
      totalSugars,
      addedSugars,
      saturatedFat,
      transFat,
      sodium,
      barcode: p.code || null,
      sourceUrl: p.url || `https://world.openfoodfacts.org/product/${code}`,
      imageUrl: p.image_url || p.image_front_url || null,
      isLocal: false,
      retrievedAt: new Date().toISOString(),
    };
  }
}
