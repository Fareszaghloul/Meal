"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  Star,
  Plus,
} from "lucide-react";
import type { RecipeSummary } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { roundNutrients, scaleNutrients, toNutrients, type Nutrients } from "@/lib/nutrition/core";
import { LogRecipeModal } from "./LogRecipeModal";
import { toast } from "@/components/ui/Toast";
import { invalidateCatalog } from "@/lib/client/catalog";
import { cn } from "@/lib/utils";

interface RecipeDetailProps {
  initialRecipe: {
    id: string;
    name: string;
    description?: string | null;
    servings: number;
    servingLabel?: string | null;
    yieldWeightGrams?: number | null;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    imageUrl?: string | null;
    sourcePlatform?: string | null;
    sourceUrl?: string | null;
    isFavorite: boolean;
    caloriesPerServing: number;
    proteinPerServing: number;
    carbsPerServing: number;
    fatPerServing: number;
    fiberPerServing?: number | null;
    totalSugarsPerServing?: number | null;
    addedSugarsPerServing?: number | null;
    saturatedFatPerServing?: number | null;
    transFatPerServing?: number | null;
    sodiumPerServing?: number | null;
    sodiumMgPerServing?: number | null;
    tags?: string[];
    ingredients: Array<{
      id: string;
      rawName: string;
      quantity: number;
      unit: string;
      notes?: string | null;
      foodId?: string | null;
      grams?: number | null;
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      fiber?: number | null;
      sodium?: number | null;
      food?: {
        id: string;
        name: string;
        brand?: string | null;
      } | null;
    }>;
    instructions?: Array<{
      id?: string;
      stepNumber: number;
      instruction: string;
    }>;
  };
}

export function RecipeDetailView({ initialRecipe }: RecipeDetailProps) {
  const router = useRouter();
  const recipe = initialRecipe;
  const [isFavorite, setIsFavorite] = useState(initialRecipe.isFavorite);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [nutritionView, setNutritionView] = useState<"perServing" | "total" | "per100g">("perServing");

  const servingLabel = recipe.servingLabel?.trim() || (recipe.servings === 1 ? "serving" : "servings");
  const hasYield = Boolean(recipe.yieldWeightGrams && recipe.yieldWeightGrams > 0);

  // Authoritative nutrients per serving
  const perServingNutrients = useMemo<Nutrients>(() => {
    return toNutrients({
      calories: recipe.caloriesPerServing,
      protein: recipe.proteinPerServing,
      carbs: recipe.carbsPerServing,
      fat: recipe.fatPerServing,
      fiber: recipe.fiberPerServing ?? 0,
      totalSugars: recipe.totalSugarsPerServing ?? 0,
      addedSugars: recipe.addedSugarsPerServing ?? 0,
      saturatedFat: recipe.saturatedFatPerServing ?? 0,
      transFat: recipe.transFatPerServing ?? 0,
      sodium: recipe.sodiumPerServing ?? recipe.sodiumMgPerServing ?? 0,
    });
  }, [recipe]);

  // Total recipe nutrients = perServing * servings
  const totalRecipeNutrients = useMemo<Nutrients>(() => {
    return roundNutrients(scaleNutrients(perServingNutrients, recipe.servings));
  }, [perServingNutrients, recipe.servings]);

  // Per 100g nutrients if yield weight exists
  const per100gNutrients = useMemo<Nutrients | null>(() => {
    if (!hasYield || !recipe.yieldWeightGrams) return null;
    return roundNutrients(scaleNutrients(totalRecipeNutrients, 100 / recipe.yieldWeightGrams));
  }, [hasYield, recipe.yieldWeightGrams, totalRecipeNutrients]);

  const activeNutrients =
    nutritionView === "total"
      ? totalRecipeNutrients
      : nutritionView === "per100g" && per100gNutrients
      ? per100gNutrients
      : perServingNutrients;

  const handleToggleFavorite = async () => {
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      invalidateCatalog();
    } catch {
      setIsFavorite(prev);
      toast("Couldn't update favorite", { kind: "error" });
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast(`Duplicated as "${data.name}"`, { kind: "success" });
        invalidateCatalog();
        router.push(`/recipes/${data.id}`);
      } else {
        toast("Failed to duplicate recipe", { kind: "error" });
      }
    } catch {
      toast("Failed to duplicate recipe", { kind: "error" });
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete recipe "${recipe.name}"? Historical logs will remain intact.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (res.ok) {
        toast(`Deleted "${recipe.name}"`, { kind: "success" });
        invalidateCatalog();
        router.push("/recipes");
      } else {
        toast("Failed to delete recipe", { kind: "error" });
      }
    } catch {
      toast("Failed to delete recipe", { kind: "error" });
    }
  };

  // Adapter for LogRecipeModal
  const recipeSummaryForModal: RecipeSummary = {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description || null,
    servings: recipe.servings,
    servingLabel: recipe.servingLabel || null,
    yieldWeightGrams: recipe.yieldWeightGrams || null,
    prepTimeMinutes: recipe.prepTimeMinutes || null,
    cookTimeMinutes: recipe.cookTimeMinutes || null,
    imageUrl: recipe.imageUrl || null,
    isFavorite,
    caloriesPerServing: recipe.caloriesPerServing,
    proteinPerServing: recipe.proteinPerServing,
    carbsPerServing: recipe.carbsPerServing,
    fatPerServing: recipe.fatPerServing,
    fiberPerServing: recipe.fiberPerServing || 0,
    totalSugarsPerServing: recipe.totalSugarsPerServing || null,
    addedSugarsPerServing: recipe.addedSugarsPerServing || null,
    saturatedFatPerServing: recipe.saturatedFatPerServing || null,
    transFatPerServing: recipe.transFatPerServing || null,
    sodiumPerServing: recipe.sodiumPerServing ?? recipe.sodiumMgPerServing ?? null,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-3 hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to recipes</span>
        </Link>
      </div>

      {/* ─── Header & Inspector Summary ─── */}
      <div className="rounded-2xl border border-line/50 bg-surface-1 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="text-xs sm:text-sm text-fg-3 leading-relaxed max-w-xl">
                {recipe.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-fg-2">
              <span className="font-semibold tabular text-fg">
                {recipe.servings} {servingLabel}
              </span>
              <span className="text-fg-4 select-none">·</span>
              <span className="font-semibold tabular text-fg">
                {fmt.int(recipe.caloriesPerServing)} kcal per serving
              </span>
              {hasYield && recipe.yieldWeightGrams && (
                <>
                  <span className="text-fg-4 select-none">·</span>
                  <span className="text-fg-3 tabular">
                    {fmt.qty(recipe.yieldWeightGrams)}g cooked yield (
                    {fmt.int(
                      Math.round(
                        ((recipe.caloriesPerServing * recipe.servings) / recipe.yieldWeightGrams) * 100
                      )
                    )}{" "}
                    kcal/100g)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="btn btn-primary h-9 px-3.5 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Recipe</span>
            </button>

            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="btn btn-secondary h-9 px-3 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>

            <button
              type="button"
              onClick={handleDuplicate}
              className="btn btn-secondary btn-icon h-9 w-9 text-fg-2 hover:text-fg"
              title="Duplicate recipe"
              aria-label="Duplicate recipe"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleFavorite}
              className="btn btn-secondary btn-icon h-9 w-9 text-fg-2 hover:text-fg"
              title={isFavorite ? "Remove favorite" : "Add to favorites"}
              aria-label="Toggle favorite"
            >
              <Star
                className={cn(
                  "w-4 h-4 transition-transform",
                  isFavorite ? "fill-[var(--accent)] text-[var(--accent)] scale-110" : "text-fg-3"
                )}
              />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-ghost btn-icon h-9 w-9 text-fg-3 hover:text-[var(--status-over-target)] hover:bg-[var(--status-over-target-bg)]"
              title="Delete recipe"
              aria-label="Delete recipe"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Nutrition Inspector Panel ─── */}
        <div className="pt-3 border-t border-line/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
              Nutrition Inspector
            </span>

            {/* Scope Switcher Tabs */}
            <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setNutritionView("perServing")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                  nutritionView === "perServing"
                    ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                    : "text-fg-3 hover:text-fg"
                )}
              >
                Per Serving
              </button>
              <button
                type="button"
                onClick={() => setNutritionView("total")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                  nutritionView === "total"
                    ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                    : "text-fg-3 hover:text-fg"
                )}
              >
                Total Recipe
              </button>
              {hasYield && (
                <button
                  type="button"
                  onClick={() => setNutritionView("per100g")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                    nutritionView === "per100g"
                      ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                      : "text-fg-3 hover:text-fg"
                  )}
                >
                  Per 100g
                </button>
              )}
            </div>
          </div>

          {/* Macro Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-[11px] font-medium text-fg-3">Calories</div>
              <div className="text-xl sm:text-2xl font-bold tabular text-fg mt-0.5">
                {fmt.int(activeNutrients.calories)} <span className="text-xs font-normal text-fg-3">kcal</span>
              </div>
            </div>

            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-[11px] font-medium text-[var(--macro-protein)]">Protein</div>
              <div className="text-xl sm:text-2xl font-bold tabular text-fg mt-0.5">
                {fmt.one(activeNutrients.protein)} <span className="text-xs font-normal text-fg-3">g</span>
              </div>
            </div>

            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-[11px] font-medium text-[var(--macro-carbs)]">Carbs</div>
              <div className="text-xl sm:text-2xl font-bold tabular text-fg mt-0.5">
                {fmt.one(activeNutrients.carbs)} <span className="text-xs font-normal text-fg-3">g</span>
              </div>
            </div>

            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-[11px] font-medium text-[var(--macro-fat)]">Fat</div>
              <div className="text-xl sm:text-2xl font-bold tabular text-fg mt-0.5">
                {fmt.one(activeNutrients.fat)} <span className="text-xs font-normal text-fg-3">g</span>
              </div>
            </div>
          </div>

          {/* Secondary Micronutrients Breakdown */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3 pt-1">
            <span>Fiber: <strong className="font-semibold text-fg tabular">{fmt.one(activeNutrients.fiber)}g</strong></span>
            <span className="text-fg-4 select-none">·</span>
            <span>Sugars: <strong className="font-semibold text-fg tabular">{fmt.one(activeNutrients.totalSugars ?? 0)}g</strong></span>
            <span className="text-fg-4 select-none">·</span>
            <span>Sat. Fat: <strong className="font-semibold text-fg tabular">{fmt.one(activeNutrients.saturatedFat ?? 0)}g</strong></span>
            <span className="text-fg-4 select-none">·</span>
            <span>Sodium: <strong className="font-semibold text-fg tabular">{fmt.int(activeNutrients.sodium ?? 0)}mg</strong></span>
          </div>
        </div>
      </div>

      {/* ─── Compact Ingredients List ─── */}
      <div className="rounded-2xl border border-line/50 bg-surface-1 p-5 sm:p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-line/40">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-fg-2">
              Ingredients
            </h2>
            <p className="text-xs text-fg-3">
              {recipe.ingredients.length} items combined in recipe
            </p>
          </div>
        </div>

        <div className="divide-y divide-line/30">
          {recipe.ingredients.map((ing) => {
            const ingCalories = ing.calories ?? 0;
            const ingProtein = ing.protein ?? 0;
            const ingCarbs = ing.carbs ?? 0;
            const ingFat = ing.fat ?? 0;

            return (
              <div
                key={ing.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-fg text-sm truncate">
                      {ing.rawName}
                    </span>
                    {ing.food?.brand && (
                      <span className="text-fg-3 text-xs shrink-0">· {ing.food.brand}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-fg-3 tabular">
                    <span className="font-medium text-fg-2">
                      {fmt.qty(ing.quantity)} {ing.unit}
                    </span>
                    {ing.grams && ing.unit !== "g" ? (
                      <span className="text-fg-4"> ({fmt.qty(ing.grams)}g)</span>
                    ) : null}
                    {ing.notes && <span className="ml-1 text-fg-4">· {ing.notes}</span>}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-bold tabular text-fg">
                    {fmt.int(ingCalories)} <span className="font-normal text-fg-3">kcal</span>
                  </div>
                  <div className="text-[11px] tabular text-fg-3 mt-0.5">
                    {fmt.g(ingProtein)}P · {fmt.g(ingCarbs)}C · {fmt.g(ingFat)}F
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Optional Compact Instructions (if present) ─── */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <div className="rounded-2xl border border-line/50 bg-surface-1 p-5 sm:p-6 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-2 pb-2 border-b border-line/40">
            Instructions
          </h2>
          <div className="space-y-2.5 text-xs sm:text-sm text-fg-2">
            {recipe.instructions.map((step, idx) => (
              <div key={step.id || idx} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-surface-2 text-fg-3 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 tabular">
                  {step.stepNumber}
                </span>
                <p className="flex-1 leading-relaxed text-fg">{step.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Log Modal */}
      <LogRecipeModal
        recipe={recipeSummaryForModal}
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
}
