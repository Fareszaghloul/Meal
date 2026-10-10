"use client";

import React from "react";
import { RotateCcw, Clock, Sparkles, Plus, BookOpen, PenLine } from "lucide-react";
import type { FoodSummary, MealCategory, MealItem, MealTemplate, RecipeSummary } from "@/lib/domain";
import { MEAL_LABELS } from "@/lib/domain";
import { fmt } from "@/components/ui/primitives";
import { sumNutrients, roundNutrients } from "@/lib/nutrition/core";
import { FoodResultRow, rowKey, type RowItem } from "./FoodResultRow";
import { cn } from "@/lib/utils";

interface DefaultFoodViewProps {
  meal: MealCategory;
  yesterdayEntries?: MealItem[];
  frequentFoods?: MealItem[];
  recentFoods?: MealItem[];
  catalogFoods?: FoodSummary[];
  catalogRecipes?: RecipeSummary[];
  catalogTemplates?: MealTemplate[];
  onSelect: (item: RowItem) => void;
  onQuickAdd: (item: RowItem) => void;
  onRepeatYesterday: () => void;
  onApplyTemplate: (template: MealTemplate) => void;
  onOpenManualEntry: () => void;
  onToggleFavorite?: (foodId: string, currentFav: boolean) => void;
  isRepeating?: boolean;
  /** Row keys already added during this visit, and how to undo / bulk add. */
  addedKeys?: Set<string>;
  onUndoAdd?: (item: RowItem) => void;
  onAddAll?: (items: RowItem[]) => void;
}

export function mapMealItemToFood(
  item: MealItem,
  catalogFoods?: FoodSummary[],
  catalogRecipes?: RecipeSummary[]
): RowItem {
  // Check if item is a recipe in catalog
  if (item.recipeId && Array.isArray(catalogRecipes)) {
    const foundRecipe = catalogRecipes.find((r) => r.id === item.recipeId || r.name.toLowerCase() === item.name.toLowerCase());
    if (foundRecipe) return { kind: "recipe", recipe: foundRecipe };
  }

  // Check if food exists in catalog
  if (Array.isArray(catalogFoods)) {
    const foundFood = catalogFoods.find((f) => f.id === item.foodId || f.name.toLowerCase() === item.name.toLowerCase());
    if (foundFood) return { kind: "food", food: foundFood };
  }

  // Otherwise create synthetic FoodSummary based on the logged item
  const syntheticFood: FoodSummary = {
    id: item.foodId ?? `entry-${item.id}`,
    name: item.name,
    brand: null,
    category: "Recent",
    source: "recent",
    defaultUnit: item.servingUnit,
    servingSize: item.servings,
    servingUnit: item.servingUnit,
    servingWeightGrams: 100,
    caloriesPer100g: item.calories,
    proteinPer100g: item.protein,
    carbsPer100g: item.carbs,
    fatPer100g: item.fat,
    fiberPer100g: item.fiber,
    totalSugarsPer100g: item.totalSugars,
    addedSugarsPer100g: item.addedSugars,
    saturatedFatPer100g: item.saturatedFat,
    transFatPer100g: item.transFat,
    sodiumPer100g: item.sodium,
    barcode: null,
    isFavorite: false,
    lastUsedAt: item.loggedAt,
    useCount: 1,
    userId: null,
    servings: [
      {
        id: "default",
        label: `${fmt.qty(item.servings)} ${item.servingUnit}`,
        grams: 100,
        isDefault: true,
        sortOrder: 0,
      },
    ],
  };
  return { kind: "food", food: syntheticFood };
}

export function DefaultFoodView({
  meal,
  yesterdayEntries,
  frequentFoods,
  recentFoods,
  catalogFoods,
  catalogRecipes,
  catalogTemplates,
  onSelect,
  onQuickAdd,
  onRepeatYesterday,
  onApplyTemplate,
  onOpenManualEntry,
  onToggleFavorite,
  isRepeating,
  addedKeys,
  onUndoAdd,
  onAddAll,
}: DefaultFoodViewProps) {

  const hasYesterday = yesterdayEntries && yesterdayEntries.length > 0;
  const yesterdayTotals = hasYesterday
    ? roundNutrients(sumNutrients(yesterdayEntries))
    : null;

  const hasFrequent = frequentFoods && frequentFoods.length > 0;
  const hasRecent = recentFoods && recentFoods.length > 0;
  const hasTemplates = catalogTemplates && catalogTemplates.length > 0;

  const hasAnyData = hasYesterday || hasFrequent || hasRecent || hasTemplates;
  const usualItems = (frequentFoods ?? []).slice(0, 5).map((item) => mapMealItemToFood(item, catalogFoods, catalogRecipes));

  return (
    <div className="space-y-5 pb-4">
      {/* 1. Contextual Action: Yesterday's Meal Repeat */}
      {hasYesterday && yesterdayTotals && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
              <RotateCcw className="h-3 w-3 text-[var(--accent)]" />
              Yesterday&rsquo;s {MEAL_LABELS[meal]}
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-fg">
              {yesterdayEntries.map((e) => e.name).join(", ")}
            </div>
            <div className="mt-0.5 text-xs text-fg-3 tabular">
              <span className="font-semibold text-fg">
                {fmt.int(yesterdayTotals.calories)} kcal
              </span>{" "}
              · {fmt.g(yesterdayTotals.protein)}P · {fmt.g(yesterdayTotals.carbs)}C · {fmt.g(yesterdayTotals.fat)}F
            </div>
          </div>

          <button
            type="button"
            onClick={onRepeatYesterday}
            disabled={isRepeating}
            className="btn btn-primary h-11 shrink-0 px-5 text-sm font-bold"
          >
            {isRepeating ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-[var(--accent)]" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
            )}
            Repeat
          </button>
        </div>
      )}

      {/* 2. Frequently logged for current meal category */}
      {hasFrequent && (
        <section className="space-y-1">
          <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            Usually at {MEAL_LABELS[meal]}
            {onAddAll && usualItems.some((it) => !addedKeys?.has(rowKey(it))) && (
              <button
                type="button"
                onClick={() => onAddAll(usualItems)}
                className="-my-2 ml-auto min-h-[44px] px-2 text-[13px] font-semibold normal-case tracking-normal text-accent"
              >
                Add all {usualItems.length}
              </button>
            )}
          </div>
          <div className="divide-y divide-line/30">
            {usualItems.map((it, i) => (
              <FoodResultRow
                key={`freq-${frequentFoods[i].id}`}
                item={it}
                onSelect={onSelect}
                onQuickAdd={onQuickAdd}
                onToggleFavorite={onToggleFavorite}
                isAdded={addedKeys?.has(rowKey(it))}
                onUndoAdd={onUndoAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Recently logged items */}
      {hasRecent && (
        <section className="space-y-1">
          <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
            <Clock className="h-3 w-3 text-fg-3" />
            Recently Logged
          </div>
          <div className="divide-y divide-line/30">
            {recentFoods.slice(0, 8).map((item) => (
              <FoodResultRow
                key={`recent-${item.id}`}
                item={mapMealItemToFood(item, catalogFoods, catalogRecipes)}
                onSelect={onSelect}
                onQuickAdd={onQuickAdd}
                onToggleFavorite={onToggleFavorite}
                isAdded={addedKeys?.has(rowKey(mapMealItemToFood(item, catalogFoods, catalogRecipes)))}
                onUndoAdd={onUndoAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Saved Meals / Templates if available */}
      {hasTemplates && (
        <section className="space-y-1">
          <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
            <BookOpen className="h-3 w-3 text-fg-3" />
            Saved Meals
          </div>
          <div className="divide-y divide-line/30">
            {catalogTemplates.map((t) => {
              const total = roundNutrients(
                sumNutrients(t.items.map((i) => i))
              );
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors cursor-pointer rounded-lg hover:bg-surface-2/60"
                  onClick={() => onApplyTemplate(t)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-fg">
                      {t.name}
                    </div>
                    <div className="truncate text-xs text-fg-3 mt-0.5">
                      {t.items.map((i) => i.name).join(", ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular text-fg">
                      {fmt.int(total.calories)} <span className="text-xs font-normal text-fg-3">kcal</span>
                    </div>
                    <div className="text-xs text-fg-3 tabular">
                      {fmt.g(total.protein)}P · {fmt.g(total.carbs)}C · {fmt.g(total.fat)}F
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty State if no recent data exists */}
      {!hasAnyData && (
        <div className="py-8 text-center">
          <p className="text-sm text-fg-2 font-medium">No recent foods yet</p>
          <p className="text-xs text-fg-3 mt-1 max-w-xs mx-auto">
            Search foods from the library, restaurants, or add custom nutrition below.
          </p>
        </div>
      )}

      {/* Secondary Action: Enter Nutrition Manually */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onOpenManualEntry}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-2 hover:text-fg hover:underline transition-colors py-1.5 px-3 rounded-lg hover:bg-surface-2"
        >
          <PenLine className="h-3.5 w-3.5" />
          Enter nutrition manually
        </button>
      </div>
    </div>
  );
}
