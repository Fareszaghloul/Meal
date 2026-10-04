import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api/route";
import {
  calculateRecipeNutrition,
  type IngredientForCalculation,
} from "@/lib/nutrition/calculator";

export interface RecipeIngredientInput {
  foodId?: string | null;
  rawName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  sortOrder?: number;
}

export interface CreateRecipeInput {
  name: string;
  description?: string | null;
  servings: number;
  servingLabel?: string | null;
  yieldWeightGrams?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  isFavorite?: boolean;
  tags?: string[];
  ingredients?: RecipeIngredientInput[];
  instructions?: Array<string | { stepNumber: number; instruction: string }>;
}

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

/**
 * Checks for possible duplicate recipe names for this user.
 */
export async function checkDuplicateRecipe(
  userId: string,
  name: string,
  excludeRecipeId?: string
): Promise<{ hasDuplicate: boolean; duplicateCandidate?: { id: string; name: string } | null }> {
  const clean = name.trim().toLowerCase();
  if (!clean) return { hasDuplicate: false };

  const existing = await prisma.recipe.findMany({
    where: {
      userId,
      ...(excludeRecipeId ? { id: { not: excludeRecipeId } } : {}),
    },
    select: { id: true, name: true },
  });

  const match = existing.find(
    (r) => r.name.trim().toLowerCase() === clean
  );

  return {
    hasDuplicate: Boolean(match),
    duplicateCandidate: match ?? null,
  };
}

/**
 * Retrieves recipes for a user with sorting, filtering, and tag resolution.
 */
export async function getRecipes(
  userId: string,
  options?: {
    q?: string;
    tag?: string;
    favorites?: boolean;
    sortBy?: string;
  }
) {
  const query = options?.q?.trim().toLowerCase() || "";
  const tag = options?.tag?.trim() || "";
  const favoritesOnly = options?.favorites === true;
  const sortBy = options?.sortBy || "newest";

  const whereClause: Record<string, unknown> = {
    userId,
  };

  if (favoritesOnly) {
    whereClause.isFavorite = true;
  }

  if (tag && tag !== "All") {
    whereClause.tags = {
      some: {
        tag: {
          name: tag.toLowerCase(),
        },
      },
    };
  }

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      {
        ingredients: {
          some: {
            rawName: { contains: query, mode: "insensitive" },
          },
        },
      },
      {
        tags: {
          some: {
            tag: {
              name: { contains: query, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sortBy === "oldest") orderBy = { createdAt: "asc" };
  if (sortBy === "name") orderBy = { name: "asc" };
  if (sortBy === "protein") orderBy = { proteinPerServing: "desc" };
  if (sortBy === "calories") orderBy = { caloriesPerServing: "desc" };

  const recipes = await prisma.recipe.findMany({
    where: whereClause,
    include: {
      tags: {
        include: { tag: true },
      },
      ingredients: {
        include: { food: true },
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { stepNumber: "asc" },
      },
    },
    orderBy,
  });

  return recipes.map((r) => ({
    ...r,
    tags: r.tags.map((t) => t.tag.name),
  }));
}

/**
 * Retrieves a single recipe by ID, ensuring ownership.
 */
export async function getRecipeById(userId: string, recipeId: string) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      tags: {
        include: { tag: true },
      },
      ingredients: {
        include: { food: true },
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });

  if (!recipe) {
    throw new HttpError(404, "Recipe not found.", "not_found");
  }

  return {
    ...recipe,
    tags: recipe.tags.map((t) => t.tag.name),
  };
}

/**
 * Creates a new recipe atomically inside a transaction with ingredient snapshots.
 */
export async function createRecipe(userId: string, input: CreateRecipeInput) {
  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new HttpError(400, "Recipe name is required.", "validation_error");
  }

  const rawServings = typeof input.servings === "number" ? input.servings : Number(input.servings);
  const servings = Number.isFinite(rawServings) && rawServings > 0 ? rawServings : 4;

  const rawYield = input.yieldWeightGrams !== undefined && input.yieldWeightGrams !== null
    ? Number(input.yieldWeightGrams)
    : null;
  const yieldWeightGrams = rawYield && Number.isFinite(rawYield) && rawYield > 0 ? rawYield : null;

  // Resolve foods for all ingredients
  const incomingIngredients = input.ingredients || [];
  const foodIds = incomingIngredients.map((i) => i.foodId).filter(Boolean) as string[];
  const referencedFoods = foodIds.length > 0
    ? await prisma.food.findMany({
        where: {
          id: { in: foodIds },
          OR: [{ userId }, { userId: null }],
        },
      })
    : [];

  const foodMap = new Map(referencedFoods.map((f) => [f.id, f]));

  // Build ingredients for calculation and calculate authoritative nutrition
  const ingredientsForCalc: IngredientForCalculation[] = incomingIngredients.map((ing, idx) => ({
    rawName: ing.rawName?.trim() || "Ingredient",
    quantity: typeof ing.quantity === "number" && ing.quantity > 0 ? ing.quantity : 1,
    unit: ing.unit?.trim() || "g",
    notes: ing.notes?.trim() || null,
    foodId: ing.foodId || null,
    sortOrder: ing.sortOrder ?? idx + 1,
    food: ing.foodId ? foodMap.get(ing.foodId) ?? null : null,
  }));

  const calc = calculateRecipeNutrition(ingredientsForCalc, servings, yieldWeightGrams);

  // Connect or create tags
  const tagConnects: Array<{ tag: { connect: { id: string } } }> = [];
  if (Array.isArray(input.tags)) {
    for (const tagName of input.tags) {
      const cleanName = tagName.trim().toLowerCase();
      if (!cleanName) continue;
      const tagRecord = await prisma.tag.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName },
      });
      tagConnects.push({ tag: { connect: { id: tagRecord.id } } });
    }
  }

  // Atomically create recipe and ingredient rows with frozen nutrient snapshots
  const created = await prisma.$transaction(async (tx) => {
    return tx.recipe.create({
      data: {
        userId,
        name: trimmedName,
        description: input.description?.trim() || null,
        servings,
        servingLabel: input.servingLabel?.trim() || null,
        yieldWeightGrams,
        prepTimeMinutes: input.prepTimeMinutes ? Number(input.prepTimeMinutes) : null,
        cookTimeMinutes: input.cookTimeMinutes ? Number(input.cookTimeMinutes) : null,
        imageUrl: input.imageUrl?.trim() || null,
        sourceUrl: input.sourceUrl?.trim() || null,
        sourcePlatform: input.sourcePlatform?.trim() || "Manual",
        isFavorite: Boolean(input.isFavorite),
        caloriesPerServing: calc.perServing.calories,
        proteinPerServing: calc.perServing.protein,
        carbsPerServing: calc.perServing.carbs,
        fatPerServing: calc.perServing.fat,
        fiberPerServing: calc.perServing.fiber,
        totalSugarsPerServing: calc.perServing.totalSugars,
        addedSugarsPerServing: calc.perServing.addedSugars,
        saturatedFatPerServing: calc.perServing.saturatedFat,
        transFatPerServing: calc.perServing.transFat,
        sodiumPerServing: calc.perServing.sodium,
        isNutritionCalculated: true,
        tags: {
          create: tagConnects,
        },
        ingredients: {
          create: calc.resolvedIngredients.map((ing) => ({
            rawName: ing.rawName,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
            sortOrder: ing.sortOrder ?? 0,
            foodId: ing.foodId || null,
            grams: ing.computedGrams,
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            fiber: ing.fiber,
            totalSugars: ing.totalSugars,
            addedSugars: ing.addedSugars,
            saturatedFat: ing.saturatedFat,
            transFat: ing.transFat,
            sodium: ing.sodium,
          })),
        },
        instructions: {
          create: (input.instructions || []).map((inst, idx) => ({
            stepNumber: idx + 1,
            instruction: typeof inst === "string" ? inst : inst.instruction,
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
      },
    });
  });

  return {
    ...created,
    tags: created.tags.map((t) => t.tag.name),
  };
}

/**
 * Updates an existing recipe atomically inside a transaction with updated snapshots.
 */
export async function updateRecipe(userId: string, recipeId: string, input: UpdateRecipeInput) {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: true },
  });

  if (!existing) {
    throw new HttpError(404, "Recipe not found.", "not_found");
  }

  const trimmedName = input.name !== undefined ? input.name.trim() : existing.name;
  if (!trimmedName) {
    throw new HttpError(400, "Recipe name cannot be empty.", "validation_error");
  }

  const servings =
    input.servings !== undefined
      ? Number(input.servings) > 0
        ? Number(input.servings)
        : existing.servings
      : existing.servings;

  const yieldWeightGrams =
    input.yieldWeightGrams !== undefined
      ? input.yieldWeightGrams && Number(input.yieldWeightGrams) > 0
        ? Number(input.yieldWeightGrams)
        : null
      : existing.yieldWeightGrams;

  const servingLabel =
    input.servingLabel !== undefined ? input.servingLabel?.trim() || null : existing.servingLabel;

  // Resolve ingredients
  const incomingIngredients = input.ingredients !== undefined ? input.ingredients : existing.ingredients;
  const foodIds = incomingIngredients.map((i) => i.foodId).filter(Boolean) as string[];
  const referencedFoods = foodIds.length > 0
    ? await prisma.food.findMany({
        where: {
          id: { in: foodIds },
          OR: [{ userId }, { userId: null }],
        },
      })
    : [];

  const foodMap = new Map(referencedFoods.map((f) => [f.id, f]));

  const ingredientsForCalc: IngredientForCalculation[] = incomingIngredients.map((ing, idx) => ({
    rawName: ing.rawName?.trim() || "Ingredient",
    quantity: typeof ing.quantity === "number" && ing.quantity > 0 ? ing.quantity : 1,
    unit: ing.unit?.trim() || "g",
    notes: ing.notes?.trim() || null,
    foodId: ing.foodId || null,
    sortOrder: ing.sortOrder ?? idx + 1,
    food: ing.foodId ? foodMap.get(ing.foodId) ?? null : null,
  }));

  const calc = calculateRecipeNutrition(ingredientsForCalc, servings, yieldWeightGrams);

  // Connect or create tags
  const tagConnects: Array<{ tag: { connect: { id: string } } }> = [];
  if (Array.isArray(input.tags)) {
    for (const tagName of input.tags) {
      const cleanName = tagName.trim().toLowerCase();
      if (!cleanName) continue;
      const tagRecord = await prisma.tag.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName },
      });
      tagConnects.push({ tag: { connect: { id: tagRecord.id } } });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.recipeTag.deleteMany({ where: { recipeId } });
    await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    if (input.instructions !== undefined) {
      await tx.recipeStep.deleteMany({ where: { recipeId } });
    }

    return tx.recipe.update({
      where: { id: recipeId },
      data: {
        name: trimmedName,
        description: input.description !== undefined ? input.description?.trim() || null : existing.description,
        servings,
        servingLabel,
        yieldWeightGrams,
        prepTimeMinutes: input.prepTimeMinutes !== undefined ? (input.prepTimeMinutes ? Number(input.prepTimeMinutes) : null) : existing.prepTimeMinutes,
        cookTimeMinutes: input.cookTimeMinutes !== undefined ? (input.cookTimeMinutes ? Number(input.cookTimeMinutes) : null) : existing.cookTimeMinutes,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl?.trim() || null : existing.imageUrl,
        sourceUrl: input.sourceUrl !== undefined ? input.sourceUrl?.trim() || null : existing.sourceUrl,
        sourcePlatform: input.sourcePlatform !== undefined ? input.sourcePlatform?.trim() || "Manual" : existing.sourcePlatform,
        isFavorite: input.isFavorite !== undefined ? Boolean(input.isFavorite) : existing.isFavorite,
        caloriesPerServing: calc.perServing.calories,
        proteinPerServing: calc.perServing.protein,
        carbsPerServing: calc.perServing.carbs,
        fatPerServing: calc.perServing.fat,
        fiberPerServing: calc.perServing.fiber,
        totalSugarsPerServing: calc.perServing.totalSugars,
        addedSugarsPerServing: calc.perServing.addedSugars,
        saturatedFatPerServing: calc.perServing.saturatedFat,
        transFatPerServing: calc.perServing.transFat,
        sodiumPerServing: calc.perServing.sodium,
        isNutritionCalculated: true,
        tags: {
          create: tagConnects,
        },
        ingredients: {
          create: calc.resolvedIngredients.map((ing) => ({
            rawName: ing.rawName,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
            sortOrder: ing.sortOrder ?? 0,
            foodId: ing.foodId || null,
            grams: ing.computedGrams,
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            fiber: ing.fiber,
            totalSugars: ing.totalSugars,
            addedSugars: ing.addedSugars,
            saturatedFat: ing.saturatedFat,
            transFat: ing.transFat,
            sodium: ing.sodium,
          })),
        },
        ...(input.instructions !== undefined
          ? {
              instructions: {
                create: input.instructions.map((inst, idx) => ({
                  stepNumber: idx + 1,
                  instruction: typeof inst === "string" ? inst : inst.instruction,
                })),
              },
            }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
      },
    });
  });

  return {
    ...updated,
    tags: updated.tags.map((t) => t.tag.name),
  };
}

/**
 * Deletes a recipe cleanly. FoodLogEntry records reference with SetNull, leaving daily food logs 100% intact.
 */
export async function deleteRecipe(userId: string, recipeId: string) {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
  });

  if (!existing) {
    throw new HttpError(404, "Recipe not found.", "not_found");
  }

  await prisma.recipe.delete({
    where: { id: recipeId },
  });

  return { success: true };
}

/**
 * Duplicates a recipe and all its ingredients into independent records.
 */
export async function duplicateRecipe(userId: string, recipeId: string) {
  const source = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      tags: { include: { tag: true } },
      ingredients: true,
      instructions: true,
    },
  });

  if (!source) {
    throw new HttpError(404, "Source recipe not found.", "not_found");
  }

  const duplicatedName = `${source.name} (Copy)`;

  const duplicated = await prisma.recipe.create({
    data: {
      userId,
      name: duplicatedName,
      description: source.description,
      servings: source.servings,
      servingLabel: source.servingLabel,
      yieldWeightGrams: source.yieldWeightGrams,
      prepTimeMinutes: source.prepTimeMinutes,
      cookTimeMinutes: source.cookTimeMinutes,
      imageUrl: source.imageUrl,
      sourceUrl: source.sourceUrl,
      sourcePlatform: source.sourcePlatform,
      isFavorite: false,
      caloriesPerServing: source.caloriesPerServing,
      proteinPerServing: source.proteinPerServing,
      carbsPerServing: source.carbsPerServing,
      fatPerServing: source.fatPerServing,
      fiberPerServing: source.fiberPerServing,
      totalSugarsPerServing: source.totalSugarsPerServing,
      addedSugarsPerServing: source.addedSugarsPerServing,
      saturatedFatPerServing: source.saturatedFatPerServing,
      transFatPerServing: source.transFatPerServing,
      sodiumPerServing: source.sodiumPerServing,
      isNutritionCalculated: source.isNutritionCalculated,
      tags: {
        create: source.tags.map((t) => ({
          tag: { connect: { id: t.tagId } },
        })),
      },
      ingredients: {
        create: source.ingredients.map((ing) => ({
          rawName: ing.rawName,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
          sortOrder: ing.sortOrder,
          foodId: ing.foodId,
          grams: ing.grams,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          fiber: ing.fiber,
          totalSugars: ing.totalSugars,
          addedSugars: ing.addedSugars,
          saturatedFat: ing.saturatedFat,
          transFat: ing.transFat,
          sodium: ing.sodium,
        })),
      },
      instructions: {
        create: source.instructions.map((inst) => ({
          stepNumber: inst.stepNumber,
          instruction: inst.instruction,
        })),
      },
    },
    include: {
      tags: { include: { tag: true } },
      ingredients: { include: { food: true }, orderBy: { sortOrder: "asc" } },
      instructions: { orderBy: { stepNumber: "asc" } },
    },
  });

  return {
    ...duplicated,
    tags: duplicated.tags.map((t) => t.tag.name),
  };
}

/**
 * Toggles the favorite status of a recipe.
 */
export async function toggleRecipeFavorite(userId: string, recipeId: string) {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    select: { id: true, isFavorite: true },
  });

  if (!existing) {
    throw new HttpError(404, "Recipe not found.", "not_found");
  }

  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { isFavorite: !existing.isFavorite },
    select: { id: true, isFavorite: true },
  });

  return updated;
}
