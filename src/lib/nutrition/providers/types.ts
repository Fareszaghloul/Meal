export type FoodProviderName = "local" | "openfoodfacts" | "usda" | "fatsecret";

export type NutritionBasis = "PER_SERVING" | "PER_100G" | "PER_100ML" | "PER_CONTAINER";

export interface NormalizedFood {
  id: string; // Unique string prefixed with provider, e.g. "local-cuid", "off-737628064502", "usda-171077", "fatsecret-35712"
  provider: FoodProviderName;
  providerId: string; // ID within provider's system
  name: string;
  brand: string | null;
  category: string;
  rawOrCooked: "raw" | "cooked" | "dry" | "unspecified";
  
  // Serving & Packaging
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number;
  nutritionBasis: NutritionBasis;
  defaultUnit: string;

  // Core Nutrition
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;

  // Carbohydrate Details (null = unknown, 0 = explicit zero)
  dietaryFiber: number | null;
  totalSugars: number | null;
  addedSugars: number | null;

  // Fat Details
  saturatedFat: number | null;
  transFat: number | null;

  // Other Details
  sodium: number | null; // in mg

  // Provenance & Media
  barcode: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  isLocal: boolean;
  retrievedAt: string; // ISO date string

  // Ranking & Deduplication Metadata
  score?: number;
  matchType?: "exact_barcode" | "exact_name" | "prefix" | "fuzzy" | "generic";
  availableSources?: FoodProviderName[]; // Merged providers if deduplicated
}

export interface ProviderSearchOptions {
  limit?: number;
  userId?: string;
  usdaApiKey?: string | null;
  signal?: AbortSignal;
}

export interface FoodDatabaseProvider {
  getProviderName(): FoodProviderName;
  search(query: string, options?: ProviderSearchOptions): Promise<NormalizedFood[]>;
  getById(id: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null>;
  getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null>;
  normalizeFood(raw: any): NormalizedFood;
  isEnabled(): boolean;
}
