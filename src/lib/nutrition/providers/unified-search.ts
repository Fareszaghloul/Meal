import {
  FoodDatabaseProvider,
  FoodProviderName,
  NormalizedFood,
  ProviderSearchOptions,
} from "./types";
import { LocalFoodProvider } from "./local-provider";
import { OpenFoodFactsProvider } from "./open-food-facts-provider";
import { USDAProvider } from "./usda-provider";
import { FatSecretProvider } from "./fatsecret-provider";
import { deduplicateAndRank } from "./deduplicator";

export interface UnifiedSearchOptions extends ProviderSearchOptions {
  source?: "all" | FoodProviderName;
  perProviderTimeoutMs?: number;
}

export interface UnifiedFoodSearchProviders {
  local?: FoodDatabaseProvider;
  openfoodfacts?: FoodDatabaseProvider;
  usda?: FoodDatabaseProvider;
  fatsecret?: FoodDatabaseProvider;
}

export class UnifiedFoodSearchService {
  private localProvider: FoodDatabaseProvider;
  private openFoodFactsProvider: FoodDatabaseProvider;
  private usdaProvider: FoodDatabaseProvider;
  private fatSecretProvider: FoodDatabaseProvider;

  constructor(providers?: UnifiedFoodSearchProviders) {
    this.localProvider = providers?.local || new LocalFoodProvider();
    this.openFoodFactsProvider = providers?.openfoodfacts || new OpenFoodFactsProvider();
    this.usdaProvider = providers?.usda || new USDAProvider();
    this.fatSecretProvider = providers?.fatsecret || new FatSecretProvider();
  }

  private getProvider(name: FoodProviderName): FoodDatabaseProvider {
    switch (name) {
      case "local":
        return this.localProvider;
      case "openfoodfacts":
        return this.openFoodFactsProvider;
      case "usda":
        return this.usdaProvider;
      case "fatsecret":
        return this.fatSecretProvider;
    }
  }

  /**
   * Search across multiple food providers in parallel with timeout safeguards and deduplication.
   */
  async search(query: string, options?: UnifiedSearchOptions): Promise<NormalizedFood[]> {
    const clean = query.trim();
    if (!clean) return [];

    const source = options?.source || "all";
    const timeoutMs = options?.perProviderTimeoutMs || 3800; // 3.8 second timeout per external provider

    // If a specific provider was requested:
    if (source !== "all") {
      const provider = this.getProvider(source);
      if (!provider.isEnabled()) return [];
      const results = await provider.search(clean, options);
      return deduplicateAndRank(results, clean);
    }

    // Helper: Run provider search with an abort signal timeout
    const runWithTimeout = async (
      provider: FoodDatabaseProvider
    ): Promise<NormalizedFood[]> => {
      if (!provider.isEnabled()) return [];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const results = await provider.search(clean, {
          ...options,
          signal: controller.signal,
        });
        return results;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`Provider [${provider.getProviderName()}] search error:`, err);
        }
        return [];
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Run local search first or concurrently
    const localPromise = this.localProvider.search(clean, options).catch((err) => {
      console.error("Local provider search error:", err);
      return [] as NormalizedFood[];
    });

    // Run external providers in parallel
    const externalPromises = [
      runWithTimeout(this.openFoodFactsProvider),
      runWithTimeout(this.usdaProvider),
      runWithTimeout(this.fatSecretProvider),
    ];

    const [localResults, ...settledExternals] = await Promise.all([
      localPromise,
      ...externalPromises.map((p) => p.catch(() => [] as NormalizedFood[])),
    ]);

    const allCandidates: NormalizedFood[] = [...localResults];
    for (const extList of settledExternals) {
      if (Array.isArray(extList)) {
        allCandidates.push(...extList);
      }
    }

    // Deduplicate and rank candidates
    const finalRanked = deduplicateAndRank(allCandidates, clean);

    const limit = options?.limit || 40;
    return finalRanked.slice(0, limit);
  }

  /**
   * Barcode lookup: checks Local -> Open Food Facts -> FatSecret -> USDA.
   */
  async lookupBarcode(
    barcode: string,
    options?: ProviderSearchOptions
  ): Promise<NormalizedFood | null> {
    const clean = barcode.trim();
    if (!clean) return null;

    // 1. Check local database first
    try {
      const local = await this.localProvider.getByBarcode(clean, options);
      if (local) return local;
    } catch (err) {
      console.error("Local barcode lookup error:", err);
    }

    // 2. Query Open Food Facts (the gold standard for barcodes)
    try {
      const off = await this.openFoodFactsProvider.getByBarcode(clean, options);
      if (off) return off;
    } catch (err) {
      console.error("Open Food Facts barcode lookup error:", err);
    }

    // 3. Query FatSecret if configured
    if (this.fatSecretProvider.isEnabled()) {
      try {
        const fs = await this.fatSecretProvider.getByBarcode(clean, options);
        if (fs) return fs;
      } catch (err) {
        // Ignore barcode tier issues
      }
    }

    // 4. Query USDA FoodData Central (Branded Foods GTIN/UPC)
    try {
      const usda = await this.usdaProvider.getByBarcode(clean, options);
      if (usda) return usda;
    } catch (err) {
      console.error("USDA barcode lookup error:", err);
    }

    return null;
  }

  async getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    return this.lookupBarcode(barcode, options);
  }

  async findByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    return this.lookupBarcode(barcode, options);
  }

  /**
   * Get single food by provider and providerId
   */
  async getById(
    providerName: FoodProviderName,
    id: string,
    options?: ProviderSearchOptions
  ): Promise<NormalizedFood | null> {
    const provider = this.getProvider(providerName);
    return await provider.getById(id, options);
  }
}

export const unifiedFoodSearch = new UnifiedFoodSearchService();
