"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Minus, ArrowLeft } from "lucide-react";
import type { FoodSummary, MealCategory, RecipeSummary } from "@/lib/domain";
import { MEAL_CATEGORIES, MEAL_LABELS } from "@/lib/domain";
import type { NormalizedFood } from "@/lib/nutrition/providers/types";
import { nutrientsForGrams, roundNutrients, scaleNutrients, toNutrients, type Nutrients } from "@/lib/nutrition/core";
import { defaultServing, portionToEntry, servingOptions, type ServingOption } from "@/lib/nutrition/servings";
import { NumberField, fmt, parseNum } from "@/components/ui/primitives";
import type { DateString } from "@/lib/dates";
import { todayLocal, isToday, isYesterday, formatDisplayDate } from "@/lib/dates";
import type { EntryDraft } from "./types";
import type { RowItem } from "./FoodResultRow";
import { cn } from "@/lib/utils";

interface FoodPortionEditorProps {
  item: RowItem;
  initialQuantity?: number | null;
  initialUnit?: string | null;
  meal: MealCategory;
  onMealChange: (m: MealCategory) => void;
  date: DateString;
  onDateChange: (d: DateString) => void;
  onAdd: (entry: EntryDraft, keepOpen: boolean) => void;
  onBack: () => void;
}

export function FoodPortionEditor({
  item,
  initialQuantity,
  initialUnit,
  meal,
  onMealChange,
  date,
  onDateChange,
  onAdd,
  onBack,
}: FoodPortionEditorProps) {
  // Compute serving options
  const options = useMemo<ServingOption[]>(() => {
    if (item.kind === "food") {
      return servingOptions(item.food);
    } else if (item.kind === "recipe") {
      return [{ id: "serving", label: "serving", grams: 0 }];
    } else {
      // Online food
      const grams = item.food.servingWeightGrams || 100;
      const opts: ServingOption[] = [
        {
          id: "serving",
          label: item.food.servingSize && item.food.servingUnit ? `${fmt.qty(item.food.servingSize)} ${item.food.servingUnit}` : "serving",
          grams,
        },
        {
          id: "g",
          label: "g",
          grams: 1,
        },
      ];
      return opts;
    }
  }, [item]);

  // Determine initial serving option and quantity
  const defaultOpt = useMemo(() => {
    if (item.kind === "food") {
      const def = defaultServing(item.food);
      if (initialUnit) {
        const match = options.find((o) => o.label.toLowerCase().includes(initialUnit.toLowerCase()) || o.id === initialUnit);
        if (match) return { option: match, quantity: initialQuantity || def.quantity };
      }
      return { option: def.option, quantity: initialQuantity || def.quantity };
    } else if (item.kind === "recipe") {
      return { option: options[0], quantity: initialQuantity || 1 };
    } else {
      return { option: options[0], quantity: initialQuantity || 1 };
    }
  }, [item, options, initialQuantity, initialUnit]);

  const [optionId, setOptionId] = useState(defaultOpt.option.id);
  const [qty, setQty] = useState(fmt.qty(defaultOpt.quantity));
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qtyRef.current?.focus();
    qtyRef.current?.select();
  }, []);

  const option = options.find((o) => o.id === optionId) ?? options[0];
  const n = parseNum(qty);
  const isGrams = option.id === "g";

  // Calculate live nutrients safely
  const nutrients = useMemo<Nutrients>(() => {
    if (!(n > 0)) return toNutrients({});

    if (item.kind === "recipe") {
      const r = item.recipe;
      const perServ = toNutrients({
        calories: r.caloriesPerServing,
        protein: r.proteinPerServing,
        carbs: r.carbsPerServing,
        fat: r.fatPerServing,
        fiber: r.fiberPerServing,
        totalSugars: r.totalSugarsPerServing,
        addedSugars: r.addedSugarsPerServing,
        saturatedFat: r.saturatedFatPerServing,
        transFat: r.transFatPerServing,
        sodium: r.sodiumPerServing,
      });
      return roundNutrients(scaleNutrients(perServ, n));
    } else if (item.kind === "food") {
      return roundNutrients(nutrientsForGrams(item.food, n * option.grams));
    } else {
      // Online food
      const o = item.food;
      const base = toNutrients({
        calories: o.calories,
        protein: o.protein,
        carbs: o.carbohydrates,
        fat: o.fat,
        fiber: o.dietaryFiber ?? 0,
        totalSugars: o.totalSugars,
        addedSugars: o.addedSugars,
        saturatedFat: o.saturatedFat,
        transFat: o.transFat,
        sodium: o.sodium,
      });
      const gramsTotal = n * option.grams;
      const per100 =
        o.nutritionBasis === "PER_100G" || o.nutritionBasis === "PER_100ML"
          ? base
          : scaleNutrients(base, 100 / (o.servingWeightGrams || 100));
      return roundNutrients(scaleNutrients(per100, gramsTotal / 100));
    }
  }, [item, option, n]);

  const switchOption = (nextId: string) => {
    const next = options.find((o) => o.id === nextId);
    if (!next) return;
    const currentGrams = n * option.grams;
    setOptionId(nextId);
    if (next.id === "g") {
      setQty(fmt.qty(Math.round(currentGrams)));
    } else if (next.grams > 0) {
      setQty(fmt.qty(Math.round((currentGrams / next.grams) * 100) / 100 || 1));
    }
  };

  const step = isGrams ? 25 : option.grams >= 100 ? 0.5 : 1;
  const bump = (delta: number) => {
    setQty(fmt.qty(Math.max(0, Math.round((n + delta) * 100) / 100)));
  };

  const buildDraft = (): EntryDraft => {
    if (item.kind === "recipe") {
      return {
        name: item.recipe.name,
        servings: n,
        servingUnit: "serving",
        foodId: null,
        recipeId: item.recipe.id,
        ...nutrients,
      };
    } else if (item.kind === "food") {
      const p = portionToEntry(option, n);
      return {
        name: item.food.name,
        brand: item.food.brand,
        servings: p.servings,
        servingUnit: p.servingUnit,
        foodId: item.food.id,
        recipeId: null,
        ...nutrients,
      };
    } else {
      // online food
      const o = item.food;
      const isWeight = option.id === "g";
      return {
        name: o.name,
        brand: o.brand,
        servings: isWeight ? n : n * (o.servingSize || 1),
        servingUnit: isWeight ? "g" : o.servingUnit || "serving",
        foodId: o.isLocal && o.providerId ? o.providerId : null,
        recipeId: null,
        ...nutrients,
      };
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (submitting || !(n > 0)) return;
    setSubmitting(true);
    try {
      onAdd(buildDraft(), keepOpen);
    } finally {
      if (keepOpen) setSubmitting(false);
    }
  };

  const foodName =
    item.kind === "food" ? item.food.name : item.kind === "recipe" ? item.recipe.name : item.food.name;
  const foodBrand =
    item.kind === "food" ? item.food.brand : item.kind === "online" ? item.food.brand : null;

  return (
    <form className="space-y-5 py-1" onSubmit={(e) => handleSubmit(e, false)}>
      {/* Portion Controls: Stepper & Unit Selector */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
          Portion
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-end gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-icon h-10 w-10 text-fg-2 hover:text-fg text-base"
              onClick={() => bump(-step)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="w-24">
              <input
                ref={qtyRef}
                type="text"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input h-10 text-center font-medium text-base tabular"
                aria-label="Quantity"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-icon h-10 w-10 text-fg-2 hover:text-fg text-base"
              onClick={() => bump(step)}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Serving Unit Dropdown */}
          <div>
            <div className="relative">
              {item.kind === "recipe" ? (
                <div className="input h-10 flex items-center text-fg-2 bg-surface-2 text-sm">
                  1 serving
                </div>
              ) : (
                <select
                  value={option.id}
                  onChange={(e) => switchOption(e.target.value)}
                  className="input h-10 w-full pr-8 text-sm"
                  aria-label="Serving size"
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id === "g"
                        ? "grams (g)"
                        : `${o.label}${/\(/.test(o.label) ? "" : ` (${fmt.qty(o.grams)}g)`}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Quick weight chips if grams unit selected */}
        {isGrams && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[50, 100, 150, 200, 250, 300].map((g) => (
              <button
                key={g}
                type="button"
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs tabular font-medium transition-colors",
                  n === g
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg"
                )}
                onClick={() => setQty(String(g))}
              >
                {g}g
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Macro Display - Unboxed, clean layout */}
      <div className="rounded-lg bg-surface-2/40 p-3.5 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-fg-3">Nutrition</span>
          <div className="text-right">
            <span className="text-2xl font-bold tabular text-fg">
              {fmt.int(nutrients.calories)}
            </span>
            <span className="ml-1 text-xs font-normal text-fg-3">kcal</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-line/40">
          <div className="flex items-center gap-1.5">
            <span className="text-fg-3">Protein</span>
            <span className="font-semibold tabular text-fg">{fmt.one(nutrients.protein)}g</span>
          </div>
          <span className="text-fg-4 select-none">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-fg-3">Carbs</span>
            <span className="font-semibold tabular text-fg">{fmt.one(nutrients.carbs)}g</span>
          </div>
          <span className="text-fg-4 select-none">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-fg-3">Fat</span>
            <span className="font-semibold tabular text-fg">{fmt.one(nutrients.fat)}g</span>
          </div>
        </div>

        {/* Secondary Micronutrients */}
        {(nutrients.fiber > 0 || nutrients.sodium || (item.kind === "food" && !isGrams && option.grams > 0)) && (
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] tabular text-fg-3 pt-0.5">
            {item.kind === "food" && !isGrams && option.grams > 0 && (
              <span>Total weight: {fmt.qty(Math.round(n * option.grams))}g</span>
            )}
            {nutrients.fiber > 0 && <span>· Fiber {fmt.one(nutrients.fiber)}g</span>}
            {nutrients.sodium ? <span>· Sodium {fmt.int(nutrients.sodium)}mg</span> : null}
          </div>
        )}
      </div>

      {/* Meal & Date target row */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-3">
            Meal
          </label>
          <select
            value={meal}
            onChange={(e) => onMealChange(e.target.value as MealCategory)}
            className="input h-9 text-xs"
          >
            {MEAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MEAL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fg-3">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value as DateString)}
            className="input h-9 text-xs"
          />
        </div>
      </div>

      {/* Primary and Secondary Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-line">
        <button
          type="button"
          disabled={!(n > 0)}
          onClick={(e) => handleSubmit(e, true)}
          className="btn btn-secondary w-full sm:w-auto h-10 text-xs font-medium"
        >
          Add &amp; continue
        </button>
        <button
          type="submit"
          disabled={!(n > 0)}
          className="btn btn-primary w-full sm:w-auto h-10 text-xs font-semibold shadow-sm"
        >
          Add to {MEAL_LABELS[meal]} · {fmt.int(nutrients.calories)} kcal
          <span className="kbd ml-1.5 hidden sm:inline-block">↵</span>
        </button>
      </div>
    </form>
  );
}
