import { z } from "zod";

export const ParsedIngredientSchema = z.object({
  rawName: z.string().min(1, "Ingredient name required"),
  group: z.string().optional().nullable(),
  quantity: z.number().nullable().default(1),
  unit: z.string().default("g"),
  notes: z.string().optional().nullable(),
  uncertainQuantity: z.boolean().default(false),
});

export type ParsedIngredient = z.infer<typeof ParsedIngredientSchema>;

export const ParsedRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name required"),
  description: z.string().optional().nullable(),
  servings: z.number().int().positive().default(4),
  prepTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(ParsedIngredientSchema).min(1, "At least one ingredient required"),
  instructions: z.array(z.string()).min(1, "At least one step required"),
  nutrition: z
    .object({
      calories: z.number().optional().nullable(),
      protein: z.number().optional().nullable(),
      carbs: z.number().optional().nullable(),
      fat: z.number().optional().nullable(),
      fiber: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type ParsedRecipe = z.infer<typeof ParsedRecipeSchema>;

export interface AIProvider {
  parseRecipeText(text: string, options?: { model?: string; baseUrl?: string }): Promise<ParsedRecipe>;
  parseRecipeImage(imageDataBase64: string, options?: { model?: string; baseUrl?: string }): Promise<ParsedRecipe>;
  parseRecipeUrl(url: string, options?: { model?: string; baseUrl?: string }): Promise<ParsedRecipe>;
  checkHealth(baseUrl?: string): Promise<{ isRunning: boolean; models: string[]; error?: string }>;
}
