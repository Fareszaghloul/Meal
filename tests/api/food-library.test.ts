import { describe, expect, it } from "vitest";
import { call } from "./helpers";
import type { FoodSummary } from "@/lib/domain";

describe("Food Library API", () => {
  let createdFoodId: string | null = null;
  const testFoodName = `Test Honey Crisp Apple ${Date.now()}`;

  it("creates a new custom food per 100g", async () => {
    const { status, body } = await call<FoodSummary>("/api/foods", {
      method: "POST",
      json: {
        name: testFoodName,
        brand: "Orchard Fresh",
        category: "Produce",
        nutritionBasis: "PER_100G",
        servingSize: 100,
        servingUnit: "g",
        servingWeightGrams: 100,
        caloriesPer100g: 52,
        proteinPer100g: 0.3,
        carbsPer100g: 13.8,
        fatPer100g: 0.2,
        fiberPer100g: 2.4,
      },
    });

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.name).toBe(testFoodName);
    expect(body.brand).toBe("Orchard Fresh");
    expect(body.caloriesPer100g).toBe(52);
    expect(body.proteinPer100g).toBe(0.3);
    createdFoodId = body.id;
  });

  it("checks for duplicate candidates via API", async () => {
    const { status, body } = await call<{
      found: boolean;
      confidence: string;
      duplicate: { name: string; brand: string } | null;
    }>(`/api/foods/check-duplicate?name=${encodeURIComponent(testFoodName)}&brand=Orchard%20Fresh`);

    expect(status).toBe(200);
    expect(body.found).toBe(true);
    expect(body.duplicate?.name).toBe(testFoodName);
    expect(body.confidence).toBe("high");
  });

  it("updates an existing custom food", async () => {
    expect(createdFoodId).toBeDefined();
    const { status, body } = await call<FoodSummary>(`/api/foods/${createdFoodId}`, {
      method: "PUT",
      json: {
        name: `${testFoodName} (Updated)`,
        caloriesPer100g: 55,
        proteinPer100g: 0.4,
        carbsPer100g: 14.0,
        fatPer100g: 0.2,
      },
    });

    expect(status).toBe(200);
    expect(body.name).toBe(`${testFoodName} (Updated)`);
    expect(body.caloriesPer100g).toBe(55);
  });

  it("toggles favorite state on a food", async () => {
    expect(createdFoodId).toBeDefined();
    const { status, body } = await call<FoodSummary>(`/api/foods/${createdFoodId}`, {
      method: "PATCH",
      json: { isFavorite: true },
    });

    expect(status).toBe(200);
    expect(body.isFavorite).toBe(true);
  });

  it("deletes a custom food cleanly", async () => {
    expect(createdFoodId).toBeDefined();
    const { status, body } = await call<{ success: boolean }>(`/api/foods/${createdFoodId}`, {
      method: "DELETE",
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects unauthorized food deletion for non-existent or other foods", async () => {
    const { status } = await call("/api/foods/non-existent-food-id-9999", {
      method: "DELETE",
    });
    expect(status).toBe(404);
  });
});
