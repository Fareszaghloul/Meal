import {
  FoodDatabaseProvider,
  NormalizedFood,
  ProviderSearchOptions,
  FoodProviderName,
} from "./types";
import { nutritionCache } from "./cache";
import { inferCategory, detectRawOrCooked } from "../external-foods";

const TOKEN_ENDPOINT = "https://oauth.fatsecret.com/connect/token";
const API_ENDPOINT = "https://platform.fatsecret.com/rest/server.api";
const CACHE_TTL_SEARCH_MS = 15 * 60 * 1000; // 15 mins
const CACHE_TTL_BARCODE_MS = 60 * 60 * 1000; // 1 hour

export class FatSecretProvider implements FoodDatabaseProvider {
  getProviderName(): FoodProviderName {
    return "fatsecret";
  }

  isEnabled(): boolean {
    return Boolean(
      process.env.FATSECRET_CLIENT_ID && process.env.FATSECRET_CLIENT_SECRET
    );
  }

  /**
   * Fetch OAuth 2.0 Client Credentials Bearer Token
   */
  private async getAccessToken(signal?: AbortSignal): Promise<string | null> {
    if (!this.isEnabled()) return null;

    const cacheKey = "fatsecret:token";
    const cachedToken = nutritionCache.get<string>(cacheKey);
    if (cachedToken) return cachedToken;

    const clientId = process.env.FATSECRET_CLIENT_ID!;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET!;
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials&scope=basic",
        signal,
      });

      if (!res.ok) {
        console.warn(`FatSecret token request failed with status ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (!data.access_token) return null;

      const ttlMs = Math.max(60000, (Number(data.expires_in) - 300) * 1000);
      nutritionCache.set(cacheKey, data.access_token, ttlMs);
      return data.access_token;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("FatSecret OAuth2 token exchange error:", err);
      }
      return null;
    }
  }

  async search(query: string, options?: ProviderSearchOptions): Promise<NormalizedFood[]> {
    if (!this.isEnabled()) return [];
    const clean = query.trim();
    if (!clean) return [];

    const limit = options?.limit || 15;
    const cacheKey = `fatsecret:search:${clean.toLowerCase()}:${limit}`;
    const cached = nutritionCache.get<NormalizedFood[]>(cacheKey);
    if (cached) return cached;

    const token = await this.getAccessToken(options?.signal);
    if (!token) return [];

    const url = `${API_ENDPOINT}?method=foods.search.v3&search_expression=${encodeURIComponent(
      clean
    )}&format=json&max_results=${limit}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: options?.signal,
      });

      if (!res.ok) {
        console.warn(`FatSecret search returned status ${res.status}`);
        return [];
      }

      const data = await res.json();
      const foodsRaw = data.foods_search?.results?.food || data.foods?.food;
      if (!foodsRaw) return [];

      const list = Array.isArray(foodsRaw) ? foodsRaw : [foodsRaw];
      const results: NormalizedFood[] = list.map((item: any) => this.normalizeFood(item));

      nutritionCache.set(cacheKey, results, CACHE_TTL_SEARCH_MS);
      return results;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("FatSecret search failed:", err);
      }
      return [];
    }
  }

  async getById(id: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    if (!this.isEnabled()) return null;
    const foodId = id.startsWith("fatsecret-") ? id.slice(10) : id;

    const cacheKey = `fatsecret:id:${foodId}`;
    const cached = nutritionCache.get<NormalizedFood>(cacheKey);
    if (cached) return cached;

    const token = await this.getAccessToken(options?.signal);
    if (!token) return null;

    const url = `${API_ENDPOINT}?method=food.get.v4&food_id=${encodeURIComponent(
      foodId
    )}&format=json`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: options?.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.food) return null;

      const normalized = this.normalizeFood(data.food);
      nutritionCache.set(cacheKey, normalized, CACHE_TTL_BARCODE_MS);
      return normalized;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("FatSecret getById failed:", err);
      }
      return null;
    }
  }

  async getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    if (!this.isEnabled()) return null;
    const clean = barcode.trim();
    if (!clean) return null;

    const cacheKey = `fatsecret:barcode:${clean}`;
    const cached = nutritionCache.get<NormalizedFood>(cacheKey);
    if (cached) return cached;

    const token = await this.getAccessToken(options?.signal);
    if (!token) return null;

    const url = `${API_ENDPOINT}?method=food.find_id_for_barcode&barcode=${encodeURIComponent(
      clean
    )}&format=json`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: options?.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      const foodId = data.food_id?.value;
      if (!foodId) return null;

      const fullFood = await this.getById(foodId, options);
      if (fullFood) {
        fullFood.barcode = clean;
        nutritionCache.set(cacheKey, fullFood, CACHE_TTL_BARCODE_MS);
      }
      return fullFood;
    } catch (err: any) {
      // Barcode scope may not be available on all FatSecret tiers; fail gracefully
      return null;
    }
  }

  normalizeFood(raw: any): NormalizedFood {
    const foodId = String(raw.food_id || Math.random().toString(36).substring(2, 9));
    const name = raw.food_name || "Food Item";
    const brand = raw.brand_name || null;
    const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`
      : name;

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber: number | null = null;
    let sugars: number | null = null;
    let addedSugars: number | null = null;
    let satFat: number | null = null;
    let transFat: number | null = null;
    let sodium: number | null = null;

    let servingWeight = 100;
    let servingSize: number | null = 1;
    let servingUnit = "serving";

    // Servings list or single object
    const servings = raw.servings?.serving;
    if (servings) {
      const s = Array.isArray(servings) ? servings[0] : servings;
      if (s) {
        calories = Math.max(0, Math.round(Number(s.calories) || 0));
        protein = Math.max(0, Math.round((Number(s.protein) || 0) * 10) / 10);
        carbs = Math.max(0, Math.round((Number(s.carbohydrate) || 0) * 10) / 10);
        fat = Math.max(0, Math.round((Number(s.fat) || 0) * 10) / 10);

        if (s.fiber !== undefined && s.fiber !== null && s.fiber !== "") {
          fiber = Math.max(0, Math.round((Number(s.fiber) || 0) * 10) / 10);
        }
        if (s.sugar !== undefined && s.sugar !== null && s.sugar !== "") {
          sugars = Math.max(0, Math.round((Number(s.sugar) || 0) * 10) / 10);
        }
        if (s.added_sugars !== undefined && s.added_sugars !== null && s.added_sugars !== "") {
          addedSugars = Math.max(0, Math.round((Number(s.added_sugars) || 0) * 10) / 10);
        }
        if (s.saturated_fat !== undefined && s.saturated_fat !== null && s.saturated_fat !== "") {
          satFat = Math.max(0, Math.round((Number(s.saturated_fat) || 0) * 10) / 10);
        }
        if (s.trans_fat !== undefined && s.trans_fat !== null && s.trans_fat !== "") {
          transFat = Math.max(0, Math.round((Number(s.trans_fat) || 0) * 10) / 10);
        }
        if (s.sodium !== undefined && s.sodium !== null && s.sodium !== "") {
          sodium = Math.max(0, Math.round(Number(s.sodium) || 0));
        }

        if (s.metric_serving_amount) {
          servingWeight = Math.round(Number(s.metric_serving_amount)) || 100;
        }
        if (s.serving_description) {
          servingUnit = s.serving_description;
        }
      }
    } else if (raw.food_description) {
      // FatSecret search.v3 summary string: "Per 100g - Calories: 215kcal | Fat: 14.50g | Carbs: 0.00g | Protein: 21.00g"
      const desc = raw.food_description;
      const calMatch = desc.match(/Calories:\s*([0-9.]+)\s*kcal/i);
      const fatMatch = desc.match(/Fat:\s*([0-9.]+)\s*g/i);
      const carbMatch = desc.match(/Carbs:\s*([0-9.]+)\s*g/i);
      const proMatch = desc.match(/Protein:\s*([0-9.]+)\s*g/i);

      if (calMatch) calories = Math.round(parseFloat(calMatch[1]));
      if (fatMatch) fat = Math.round(parseFloat(fatMatch[1]) * 10) / 10;
      if (carbMatch) carbs = Math.round(parseFloat(carbMatch[1]) * 10) / 10;
      if (proMatch) protein = Math.round(parseFloat(proMatch[1]) * 10) / 10;
    }

    return {
      id: `fatsecret-${foodId}`,
      provider: "fatsecret",
      providerId: foodId,
      name: fullName,
      brand,
      category: inferCategory(fullName, raw.food_type),
      rawOrCooked: detectRawOrCooked(fullName),
      servingSize: servingSize || 1,
      servingUnit: servingUnit || "serving",
      servingWeightGrams: servingWeight > 0 ? servingWeight : 100,
      nutritionBasis: "PER_SERVING",
      defaultUnit: "g",
      calories,
      protein,
      carbohydrates: carbs,
      fat,
      dietaryFiber: fiber,
      totalSugars: sugars,
      addedSugars,
      saturatedFat: satFat,
      transFat,
      sodium,
      barcode: null,
      sourceUrl: raw.food_url || `https://www.fatsecret.com/calories-nutrition/search?q=${encodeURIComponent(name)}`,
      imageUrl: null,
      isLocal: false,
      retrievedAt: new Date().toISOString(),
    };
  }
}
