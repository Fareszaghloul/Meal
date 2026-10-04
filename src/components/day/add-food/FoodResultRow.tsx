"use client";

import React from "react";
import { Plus, Star, Globe } from "lucide-react";
import type { FoodSummary, RecipeSummary } from "@/lib/domain";
import type { NormalizedFood } from "@/lib/nutrition/providers/types";
import { fmt } from "@/components/ui/primitives";
import { defaultServing, portionToEntry } from "@/lib/nutrition/servings";
import { nutrientsForGrams, roundNutrients, scaleNutrients, toNutrients } from "@/lib/nutrition/core";
import { cn } from "@/lib/utils";

export type RowItem =
  | { kind: "food"; food: FoodSummary }
  | { kind: "recipe"; recipe: RecipeSummary }
  | { kind: "online"; food: NormalizedFood };

interface FoodResultRowProps {
  item: RowItem;
  onSelect: (item: RowItem) => void;
  onQuickAdd?: (item: RowItem) => void;
  onToggleFavorite?: (id: string, currentFav: boolean, kind?: "food" | "recipe") => void;
  isHighlighted?: boolean;
}

export function FoodResultRow({
  item,
  onSelect,
  onQuickAdd,
  onToggleFavorite,
  isHighlighted,
}: FoodResultRowProps) {
  let name = "";
  let brand: string | null = null;
  let servingText = "";
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let isFavorite = false;
  let foodIdForFav: string | null = null;
  let badgeText: string | null = null;

  if (item.kind === "food") {
    const f = item.food;
    name = f.name;
    brand = f.brand;
    isFavorite = f.isFavorite;
    foodIdForFav = f.id;
    if (f.brand === "McDonald's" || f.category === "Restaurant") {
      badgeText = f.brand ?? "Restaurant";
    }

    const { option, quantity } = defaultServing(f);
    const p = portionToEntry(option, quantity);
    const n = roundNutrients(nutrientsForGrams(f, p.grams));
    servingText =
      p.servingUnit === "g" || p.servingUnit === "ml"
        ? `${fmt.qty(p.servings)} ${p.servingUnit}`
        : `${fmt.qty(p.servings)} ${p.servingUnit}`;
    calories = n.calories;
    protein = n.protein;
    carbs = n.carbs;
    fat = n.fat;
  } else if (item.kind === "recipe") {
    const r = item.recipe;
    name = r.name;
    badgeText = "Recipe";
    const servingLabel = r.servingLabel?.trim() || "serving";
    servingText = `1 ${servingLabel}`;
    calories = r.caloriesPerServing;
    protein = r.proteinPerServing;
    carbs = r.carbsPerServing;
    fat = r.fatPerServing;
    isFavorite = r.isFavorite;
    foodIdForFav = r.id;
  } else if (item.kind === "online") {
    const o = item.food;
    name = o.name;
    brand = o.brand;
    badgeText = o.provider.toUpperCase();
    servingText = o.servingSize && o.servingUnit ? `${fmt.qty(o.servingSize)} ${o.servingUnit}` : `${o.servingWeightGrams || 100}g`;
    calories = Math.round(o.calories);
    protein = Math.round(o.protein * 10) / 10;
    carbs = Math.round(o.carbohydrates * 10) / 10;
    fat = Math.round(o.fat * 10) / 10;
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors cursor-pointer rounded-lg hover:bg-surface-2",
        isHighlighted && "bg-surface-2"
      )}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
    >
      {/* Left side: Food info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-fg sm:text-[15px]">
            {name}
          </span>
          {brand && (
            <span className="shrink-0 text-xs text-fg-3">· {brand}</span>
          )}
          {badgeText && !brand && (
            <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.2 text-[10px] font-medium text-fg-3 uppercase">
              {badgeText}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-3">
          <span className="text-fg-2">{servingText}</span>
          <span>·</span>
          <span>{fmt.g(protein)}P</span>
          <span>·</span>
          <span>{fmt.g(carbs)}C</span>
          <span>·</span>
          <span>{fmt.g(fat)}F</span>
        </div>
      </div>

      {/* Right side: Calories and Actions */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="text-right">
          <span className="text-sm font-semibold tabular text-fg">
            {fmt.int(calories)}
          </span>
          <span className="ml-1 text-xs text-fg-3">kcal</span>
        </div>

        {foodIdForFav && onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(foodIdForFav!, isFavorite, item.kind === "recipe" ? "recipe" : "food");
            }}
            className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
            aria-label={isFavorite ? "Remove favorite" : "Add to favorites"}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                isFavorite ? "fill-[var(--accent)] text-[var(--accent)]" : "text-fg-3 hover:text-fg"
              )}
            />
          </button>
        )}

        {onQuickAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(item);
            }}
            className="btn btn-secondary btn-icon btn-sm h-8 w-8 text-fg-2 hover:bg-[var(--accent)] hover:text-[var(--on-accent)] hover:border-transparent transition-colors"
            title="Quick add at default portion"
            aria-label={`Quick add ${name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
