"use client";

import React from "react";
import { Copy, Edit2, Star, Trash2, Utensils, Hash, Calendar, Layers, ShieldCheck } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { fmt } from "@/components/ui/primitives";
import type { FoodSummary } from "@/lib/domain";
import { nutrientsForGrams, nutrientsPer100g, roundNutrients } from "@/lib/nutrition/core";
import { defaultServing, servingOptions } from "@/lib/nutrition/servings";
import { cn } from "@/lib/utils";

interface FoodDetailsSheetProps {
  food: FoodSummary | null;
  open: boolean;
  onClose: () => void;
  onEdit: (food: FoodSummary) => void;
  onDuplicate: (food: FoodSummary) => void;
  onDelete: (food: FoodSummary) => void;
  onToggleFavorite: (food: FoodSummary) => void;
}

export function FoodDetailsSheet({
  food,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: FoodDetailsSheetProps) {
  if (!food) return null;

  const { option, quantity } = defaultServing(food);
  const baseGrams = quantity * option.grams;
  const servingLabel =
    option.id === "g"
      ? `${fmt.qty(baseGrams)} g`
      : `${option.label}${/\(/.test(option.label) ? "" : ` (${fmt.qty(baseGrams)} g)`}`;

  const nPerServing = roundNutrients(nutrientsForGrams(food, baseGrams));
  const nPer100g = roundNutrients(nutrientsPer100g(food));
  const allServings = servingOptions(food);

  const isUserFood = !!food.userId;
  const sourceLabel = !food.userId
    ? "Verified Library"
    : food.source === "SCANNED"
      ? "Scanned Barcode"
      : food.source === "IMPORTED"
        ? "Imported"
        : "My Custom Food";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="truncate">{food.name}</span>
          <button
            type="button"
            onClick={() => onToggleFavorite(food)}
            className="btn btn-ghost btn-icon btn-sm text-fg-2 hover:text-fg"
            aria-label={food.isFavorite ? `Remove ${food.name} from favorites` : `Add ${food.name} to favorites`}
            aria-pressed={food.isFavorite}
          >
            <Star className={cn("h-4 w-4", food.isFavorite ? "fill-current text-accent" : "text-fg-3")} />
          </button>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2 min-w-0">
          {isUserFood ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-negative hover:bg-negative/10 shrink-0"
              onClick={() => onDelete(food)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          ) : (
            <span className="text-xs text-fg-3 truncate">System library</span>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className="btn btn-secondary btn-sm shrink-0"
              onClick={() => onDuplicate(food)}
              title="Create a copy to customize"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>
            {isUserFood && (
              <button
                type="button"
                className="btn btn-primary btn-sm shrink-0"
                onClick={() => onEdit(food)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Header Metadata Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isUserFood ? "bg-accent/15 text-accent" : "bg-surface-2 text-fg-2"
          )}>
            <ShieldCheck className="h-3 w-3" />
            {sourceLabel}
          </span>
          {food.brand && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-2">
              Brand: <strong className="text-fg font-medium">{food.brand}</strong>
            </span>
          )}
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-3">
            {food.category}
          </span>
          {food.barcode && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-fg-3">
              #{food.barcode}
            </span>
          )}
        </div>

        {/* Primary Macros Card (per default serving) */}
        <div className="rounded-xl border border-line bg-surface-1 p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-2 border-b border-line pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-fg-3">Standard Serving</p>
              <p className="text-base font-semibold text-fg">{servingLabel}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold tabular tracking-tight text-fg">
                {fmt.int(nPerServing.calories)}
              </span>
              <span className="ml-1 text-xs text-fg-3">kcal</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-2/60 p-2">
              <span className="block text-[11px] font-medium uppercase text-fg-3">Protein</span>
              <span className="text-base font-semibold tabular text-protein">
                {fmt.g(nPerServing.protein)}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2/60 p-2">
              <span className="block text-[11px] font-medium uppercase text-fg-3">Carbs</span>
              <span className="text-base font-semibold tabular text-carbs">
                {fmt.g(nPerServing.carbs)}
              </span>
            </div>
            <div className="rounded-lg bg-surface-2/60 p-2">
              <span className="block text-[11px] font-medium uppercase text-fg-3">Fat</span>
              <span className="text-base font-semibold tabular text-fat">
                {fmt.g(nPerServing.fat)}
              </span>
            </div>
          </div>
        </div>

        {/* Nutrition Comparison: Per Serving vs Per 100g */}
        <div className="rounded-xl border border-line bg-surface-1 overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-3">
              Nutrition Breakdown
            </h4>
          </div>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[30%]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-line text-fg-3">
                <th className="py-2 pl-3 text-left font-normal truncate">Nutrient</th>
                <th className="py-2 px-2 text-right font-normal truncate">Per Serving</th>
                <th className="py-2 pr-3 text-right font-normal truncate">Per 100 g</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 tabular">
              <tr>
                <td className="py-2 pl-4 text-fg font-medium">Calories</td>
                <td className="py-2 px-3 text-right text-fg">{fmt.int(nPerServing.calories)} kcal</td>
                <td className="py-2 pr-4 text-right text-fg-2">{fmt.int(nPer100g.calories)} kcal</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-fg font-medium">Protein</td>
                <td className="py-2 px-3 text-right text-protein">{fmt.g(nPerServing.protein)}</td>
                <td className="py-2 pr-4 text-right text-fg-2">{fmt.g(nPer100g.protein)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-fg font-medium">Carbohydrates</td>
                <td className="py-2 px-3 text-right text-carbs">{fmt.g(nPerServing.carbs)}</td>
                <td className="py-2 pr-4 text-right text-fg-2">{fmt.g(nPer100g.carbs)}</td>
              </tr>
              <tr>
                <td className="py-2 pl-4 text-fg font-medium">Fat</td>
                <td className="py-2 px-3 text-right text-fat">{fmt.g(nPerServing.fat)}</td>
                <td className="py-2 pr-4 text-right text-fg-2">{fmt.g(nPer100g.fat)}</td>
              </tr>
              {food.fiberPer100g > 0 && (
                <tr>
                  <td className="py-2 pl-4 text-fg-2">Fiber</td>
                  <td className="py-2 px-3 text-right text-fg-2">{fmt.g(nPerServing.fiber)}</td>
                  <td className="py-2 pr-4 text-right text-fg-3">{fmt.g(nPer100g.fiber)}</td>
                </tr>
              )}
              {food.totalSugarsPer100g !== null && food.totalSugarsPer100g !== undefined && (
                <tr>
                  <td className="py-2 pl-4 text-fg-2">Sugar</td>
                  <td className="py-2 px-3 text-right text-fg-2">{fmt.g(nPerServing.totalSugars ?? 0)}</td>
                  <td className="py-2 pr-4 text-right text-fg-3">{fmt.g(nPer100g.totalSugars ?? 0)}</td>
                </tr>
              )}
              {food.saturatedFatPer100g !== null && food.saturatedFatPer100g !== undefined && (
                <tr>
                  <td className="py-2 pl-4 text-fg-2">Saturated Fat</td>
                  <td className="py-2 px-3 text-right text-fg-2">{fmt.g(nPerServing.saturatedFat ?? 0)}</td>
                  <td className="py-2 pr-4 text-right text-fg-3">{fmt.g(nPer100g.saturatedFat ?? 0)}</td>
                </tr>
              )}
              {food.sodiumPer100g !== null && food.sodiumPer100g !== undefined && (
                <tr>
                  <td className="py-2 pl-4 text-fg-2">Sodium</td>
                  <td className="py-2 px-3 text-right text-fg-2">{fmt.int(nPerServing.sodium ?? 0)} mg</td>
                  <td className="py-2 pr-4 text-right text-fg-3">{fmt.int(nPer100g.sodium ?? 0)} mg</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Serving Definitions */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-3">
            Available Servings
          </h4>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface-1">
            {allServings.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                <span className="font-medium text-fg">{s.label}</span>
                <span className="tabular text-fg-3">{fmt.qty(s.grams)} g</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Logging History / Provenance */}
        {(food.useCount > 0 || food.lastUsedAt) && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3.5 py-2.5 text-xs text-fg-3">
            <span className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Logged {food.useCount} {food.useCount === 1 ? "time" : "times"}
            </span>
            {food.lastUsedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Last used {new Date(food.lastUsedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
