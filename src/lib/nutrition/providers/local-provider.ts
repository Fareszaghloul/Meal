import { prisma } from "@/lib/db";
import {
  FoodDatabaseProvider,
  NormalizedFood,
  ProviderSearchOptions,
  FoodProviderName,
} from "./types";

export class LocalFoodProvider implements FoodDatabaseProvider {
  getProviderName(): FoodProviderName {
    return "local";
  }

  isEnabled(): boolean {
    return true;
  }

  async search(query: string, options?: ProviderSearchOptions): Promise<NormalizedFood[]> {
    const clean = query.trim();
    if (!clean) return [];

    const limit = options?.limit || 25;
    const userId = options?.userId;

    const words = clean.split(/\s+/).filter((w) => w.length > 1);
    const stemmedWords = words.map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w));

    const textMatchConditions: any[] = [
      { name: { contains: clean, mode: "insensitive" } },
      { brand: { contains: clean, mode: "insensitive" } },
      { category: { contains: clean, mode: "insensitive" } },
      ...(clean.length >= 6 ? [{ barcode: clean }] : []),
    ];

    if (words.length > 1) {
      textMatchConditions.push({
        AND: stemmedWords.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { brand: { contains: term, mode: "insensitive" } },
            { category: { contains: term, mode: "insensitive" } },
          ],
        })),
      });
    }

    const whereConditions: any[] = [
      {
        OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
      },
      {
        OR: textMatchConditions,
      },
    ];

    const records = await prisma.food.findMany({
      where: { AND: whereConditions },
      take: limit,
      orderBy: [{ name: "asc" }],
    });

    return records.map((r) => this.normalizeFood(r));
  }

  async getById(id: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const cleanId = id.startsWith("local-") ? id.slice(6) : id;
    const record = await prisma.food.findFirst({
      where: {
        id: cleanId,
        OR: [{ userId: null }, ...(options?.userId ? [{ userId: options.userId }] : [])],
      },
    });
    if (!record) return null;
    return this.normalizeFood(record);
  }

  async getByBarcode(barcode: string, options?: ProviderSearchOptions): Promise<NormalizedFood | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const record = await prisma.food.findFirst({
      where: {
        barcode: cleanBarcode,
        OR: [{ userId: null }, ...(options?.userId ? [{ userId: options.userId }] : [])],
      },
    });

    if (!record) return null;
    return this.normalizeFood(record);
  }

  normalizeFood(raw: any): NormalizedFood {
    const servingWeight = Number(raw.servingWeightGrams) || 100;
    const factor = servingWeight / 100;

    // Use exact per-serving values when available; fall back to scaled per-100g
    const calories =
      raw.caloriesPerServing !== null && raw.caloriesPerServing !== undefined
        ? Math.round(Number(raw.caloriesPerServing))
        : Math.round((Number(raw.caloriesPer100g) || 0) * factor);

    const protein =
      raw.proteinPerServing !== null && raw.proteinPerServing !== undefined
        ? Math.round(Number(raw.proteinPerServing) * 10) / 10
        : Math.round((Number(raw.proteinPer100g) || 0) * factor * 10) / 10;

    const carbohydrates =
      raw.carbsPerServing !== null && raw.carbsPerServing !== undefined
        ? Math.round(Number(raw.carbsPerServing) * 10) / 10
        : Math.round((Number(raw.carbsPer100g) || 0) * factor * 10) / 10;

    const fat =
      raw.fatPerServing !== null && raw.fatPerServing !== undefined
        ? Math.round(Number(raw.fatPerServing) * 10) / 10
        : Math.round((Number(raw.fatPer100g) || 0) * factor * 10) / 10;

    const dietaryFiber =
      raw.fiberPerServing !== null && raw.fiberPerServing !== undefined
        ? Math.round(Number(raw.fiberPerServing) * 10) / 10
        : raw.fiberPer100g !== null && raw.fiberPer100g !== undefined
        ? Math.round(Number(raw.fiberPer100g) * factor * 10) / 10
        : null;

    const totalSugars =
      raw.totalSugarsPerServing !== null && raw.totalSugarsPerServing !== undefined
        ? Math.round(Number(raw.totalSugarsPerServing) * 10) / 10
        : raw.totalSugarsPer100g !== null && raw.totalSugarsPer100g !== undefined
        ? Math.round(Number(raw.totalSugarsPer100g) * factor * 10) / 10
        : null;

    const addedSugars =
      raw.addedSugarsPerServing !== null && raw.addedSugarsPerServing !== undefined
        ? Math.round(Number(raw.addedSugarsPerServing) * 10) / 10
        : raw.addedSugarsPer100g !== null && raw.addedSugarsPer100g !== undefined
        ? Math.round(Number(raw.addedSugarsPer100g) * factor * 10) / 10
        : null;

    const saturatedFat =
      raw.saturatedFatPerServing !== null && raw.saturatedFatPerServing !== undefined
        ? Math.round(Number(raw.saturatedFatPerServing) * 10) / 10
        : raw.saturatedFatPer100g !== null && raw.saturatedFatPer100g !== undefined
        ? Math.round(Number(raw.saturatedFatPer100g) * factor * 10) / 10
        : null;

    const transFat =
      raw.transFatPerServing !== null && raw.transFatPerServing !== undefined
        ? Math.round(Number(raw.transFatPerServing) * 10) / 10
        : raw.transFatPer100g !== null && raw.transFatPer100g !== undefined
        ? Math.round(Number(raw.transFatPer100g) * factor * 10) / 10
        : null;

    const sodium =
      raw.sodiumPerServing !== null && raw.sodiumPerServing !== undefined
        ? Math.round(Number(raw.sodiumPerServing))
        : raw.sodiumPer100g !== null && raw.sodiumPer100g !== undefined
        ? Math.round(Number(raw.sodiumPer100g) * factor)
        : null;

    return {
      id: `local-${raw.id}`,
      provider: "local",
      providerId: raw.id,
      name: raw.name,
      brand: raw.brand || null,
      category: raw.category || "Pantry",
      rawOrCooked: raw.rawOrCooked || "unspecified",
      servingSize: raw.servingSize !== null && raw.servingSize !== undefined ? Number(raw.servingSize) : null,
      servingUnit: raw.servingUnit || "g",
      servingWeightGrams: servingWeight,
      nutritionBasis: (raw.nutritionBasis as any) || "PER_SERVING",
      defaultUnit: raw.defaultUnit || "g",
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
      barcode: raw.barcode || null,
      sourceUrl: raw.sourceUrl || null,
      imageUrl: null,
      isLocal: true,
      retrievedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
