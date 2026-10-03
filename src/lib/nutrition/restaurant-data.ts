import menuData from "@/data/mcdonalds-jordan-menu.json";
import type { FoodSummary, FoodServing } from "@/lib/domain";

let cachedRestaurantFoods: FoodSummary[] | null = null;

export function getRestaurantFoods(): FoodSummary[] {
  if (cachedRestaurantFoods) return cachedRestaurantFoods;

  const items = (menuData.items as any[]) || [];
  cachedRestaurantFoods = items.map((item) => {
    const servingGrams = item.servingSize > 0 ? item.servingSize : 100;
    const factor = 100 / servingGrams;

    const defaultServing: FoodServing = {
      id: `serving-${item.id}`,
      label: `1 item (${servingGrams}g)`,
      grams: servingGrams,
      isDefault: true,
      sortOrder: 0,
    };

    const gramServing: FoodServing = {
      id: "g",
      label: "g",
      grams: 1,
      isDefault: false,
      sortOrder: 1,
    };

    return {
      id: `restaurant-${item.id}`,
      name: item.cleanName || item.name,
      brand: "McDonald's",
      category: "Restaurant",
      source: "restaurant",
      defaultUnit: "item",
      servingSize: 1,
      servingUnit: "item",
      servingWeightGrams: servingGrams,
      caloriesPer100g: Math.round(item.calories * factor),
      proteinPer100g: Math.round(item.protein * factor * 10) / 10,
      carbsPer100g: Math.round(item.carbs * factor * 10) / 10,
      fatPer100g: Math.round(item.fat * factor * 10) / 10,
      fiberPer100g: item.fiber ? Math.round(item.fiber * factor * 10) / 10 : 0,
      totalSugarsPer100g: item.sugar ? Math.round(item.sugar * factor * 10) / 10 : null,
      addedSugarsPer100g: null,
      saturatedFatPer100g: item.saturatedFat ? Math.round(item.saturatedFat * factor * 10) / 10 : null,
      transFatPer100g: item.transFat ? Math.round(item.transFat * factor * 10) / 10 : null,
      sodiumPer100g: item.sodiumMg ? Math.round(item.sodiumMg * factor) : null,
      barcode: null,
      isFavorite: false,
      lastUsedAt: null,
      useCount: 0,
      userId: null,
      servings: [defaultServing, gramServing],
    };
  });

  return cachedRestaurantFoods;
}
