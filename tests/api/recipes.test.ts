import { describe, expect, it } from "vitest";
import { call, BASE } from "./helpers";
import type { RecipeSummary } from "@/lib/domain";

describe("Recipes API Suite", () => {
  let testFoodId: string | null = null;
  let testRecipeId: string | null = null;
  let duplicatedRecipeId: string | null = null;

  const testRecipeName = `Batch Chili ${Date.now()}`;
  const testFoodName = `Lean Beef ${Date.now()}`;

  it("sets up a source food in the user's food library", async () => {
    const { status, body } = await call<{ id: string }>("/api/foods", {
      method: "POST",
      json: {
        name: testFoodName,
        brand: "Butcher Select",
        category: "Meat",
        nutritionBasis: "PER_100G",
        servingSize: 100,
        servingUnit: "g",
        servingWeightGrams: 100,
        caloriesPer100g: 200,
        proteinPer100g: 26,
        carbsPer100g: 0,
        fatPer100g: 10,
        fiberPer100g: 0,
        sodiumPer100g: 65,
      },
    });

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    testFoodId = body.id;
  });

  it("checks for duplicate recipe names via API", async () => {
    // Before creating, checking testRecipeName should report false
    const { status, body } = await call<{ hasDuplicate: boolean }>(
      `/api/recipes/check-duplicate?name=${encodeURIComponent(testRecipeName)}`
    );
    expect(status).toBe(200);
    expect(body.hasDuplicate).toBe(false);
  });

  it("creates a recipe with ingredients, servings, and cooked yield weight", async () => {
    expect(testFoodId).toBeDefined();

    const { status, body } = await call<RecipeSummary & { ingredients: any[] }>("/api/recipes", {
      method: "POST",
      json: {
        name: testRecipeName,
        description: "High protein meal prep chili",
        servings: 6,
        servingLabel: "bowl",
        yieldWeightGrams: 2400,
        ingredients: [
          {
            foodId: testFoodId,
            rawName: testFoodName,
            quantity: 600,
            unit: "g",
          },
        ],
      },
    });

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.name).toBe(testRecipeName);
    expect(body.servings).toBe(6);
    expect(body.servingLabel).toBe("bowl");
    expect(body.yieldWeightGrams).toBe(2400);

    // 600g beef = 1200 kcal total / 6 servings = 200 kcal per serving
    expect(body.caloriesPerServing).toBe(200);
    // 26 * 6 = 156P total / 6 servings = 26P per serving
    expect(body.proteinPerServing).toBe(26);

    testRecipeId = body.id;
  });

  it("reports duplicate after recipe is created", async () => {
    const { status, body } = await call<{ hasDuplicate: boolean; duplicateCandidate?: { id: string; name: string } }>(
      `/api/recipes/check-duplicate?name=${encodeURIComponent(testRecipeName)}`
    );
    expect(status).toBe(200);
    expect(body.hasDuplicate).toBe(true);
    expect(body.duplicateCandidate?.id).toBe(testRecipeId);
  });

  it("reads recipe by id", async () => {
    expect(testRecipeId).toBeDefined();

    const { status, body } = await call<RecipeSummary & { ingredients: any[] }>(`/api/recipes/${testRecipeId}`);
    expect(status).toBe(200);
    expect(body.id).toBe(testRecipeId);
    expect(body.name).toBe(testRecipeName);
    expect(body.ingredients.length).toBe(1);
    expect(body.ingredients[0].rawName).toBe(testFoodName);
    expect(body.ingredients[0].calories).toBe(1200);
    expect(body.ingredients[0].protein).toBe(156);
  });

  it("updates recipe servings and recalculates nutrition atomically", async () => {
    expect(testRecipeId).toBeDefined();

    // Change servings from 6 to 4 (1200 kcal / 4 = 300 kcal per serving)
    const { status, body } = await call<RecipeSummary>(`/api/recipes/${testRecipeId}`, {
      method: "PUT",
      json: {
        name: `${testRecipeName} (Updated)`,
        servings: 4,
        servingLabel: "portion",
        yieldWeightGrams: 2000,
      },
    });

    expect(status).toBe(200);
    expect(body.name).toBe(`${testRecipeName} (Updated)`);
    expect(body.servings).toBe(4);
    expect(body.servingLabel).toBe("portion");
    expect(body.caloriesPerServing).toBe(300);
    expect(body.proteinPerServing).toBe(39);
  });

  it("toggles favorite state on a recipe", async () => {
    expect(testRecipeId).toBeDefined();

    const { status, body } = await call<{ id: string; isFavorite: boolean }>(
      `/api/recipes/${testRecipeId}/favorite`,
      { method: "POST" }
    );

    expect(status).toBe(200);
    expect(body.isFavorite).toBe(true);
  });

  it("duplicates a recipe into an independent record", async () => {
    expect(testRecipeId).toBeDefined();

    const { status, body } = await call<RecipeSummary & { ingredients: any[] }>(
      `/api/recipes/${testRecipeId}/duplicate`,
      { method: "POST" }
    );

    expect(status).toBe(201);
    expect(body.id).not.toBe(testRecipeId);
    expect(body.name).toContain("(Copy)");
    expect(body.caloriesPerServing).toBe(300);
    expect(body.ingredients.length).toBe(1);

    duplicatedRecipeId = body.id;
  });

  it("validates server-side inputs and rejects invalid recipe creation", async () => {
    // Empty name
    const res1 = await call("/api/recipes", {
      method: "POST",
      json: { name: "", servings: 4 },
    });
    expect(res1.status).toBe(400);

    // Negative servings
    const res2 = await call("/api/recipes", {
      method: "POST",
      json: { name: "Invalid Servings", servings: -2 },
    });
    expect(res2.status).toBe(400);

    // Negative yield weight
    const res3 = await call("/api/recipes", {
      method: "POST",
      json: { name: "Invalid Yield", yieldWeightGrams: -100 },
    });
    expect(res3.status).toBe(400);
  });

  it("rejects unauthorized access when session is missing", async () => {
    const unauthRes = await fetch(`${BASE}/api/recipes`);
    expect(unauthRes.status).toBe(401);
  });

  it("preserves recipe nutrition snapshot even when source food is deleted from food library", async () => {
    expect(testFoodId).toBeDefined();
    expect(testRecipeId).toBeDefined();

    // Delete the source food
    const delFoodRes = await call(`/api/foods/${testFoodId}`, { method: "DELETE" });
    expect(delFoodRes.status).toBe(200);

    // Fetch the recipe: it must remain valid and preserve its frozen calories/macros
    const recipeRes = await call<RecipeSummary & { ingredients: any[] }>(`/api/recipes/${testRecipeId}`);
    expect(recipeRes.status).toBe(200);
    expect(recipeRes.body.caloriesPerServing).toBe(300);
    expect(recipeRes.body.ingredients.length).toBe(1);
    expect(recipeRes.body.ingredients[0].calories).toBe(1200);
    expect(recipeRes.body.ingredients[0].protein).toBe(156);
  });

  it("deletes recipes cleanly", async () => {
    if (testRecipeId) {
      const { status } = await call(`/api/recipes/${testRecipeId}`, { method: "DELETE" });
      expect(status).toBe(200);
    }
    if (duplicatedRecipeId) {
      const { status } = await call(`/api/recipes/${duplicatedRecipeId}`, { method: "DELETE" });
      expect(status).toBe(200);
    }
  });
});
