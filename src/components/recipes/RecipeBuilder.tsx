"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Pencil,
  RotateCw,
  Check,
} from "lucide-react";
import type { FoodSummary } from "@/lib/domain";
import { loadCatalog, invalidateCatalog, rankMatches } from "@/lib/client/catalog";
import { calculateRecipeNutrition, type IngredientForCalculation } from "@/lib/nutrition/calculator";
import { servingOptions, defaultServing, type ServingOption } from "@/lib/nutrition/servings";
import { fmt, parseNum } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";

export interface RecipeBuilderIngredient {
  tempId: string;
  foodId: string | null;
  rawName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  sortOrder: number;
  food?: FoodSummary | null;
  grams?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sodium?: number | null;
}

interface RecipeBuilderProps {
  initialRecipe?: {
    id: string;
    name: string;
    description?: string | null;
    servings: number;
    servingLabel?: string | null;
    yieldWeightGrams?: number | null;
    tags?: string[];
    ingredients: Array<{
      id?: string;
      foodId?: string | null;
      rawName: string;
      quantity: number;
      unit: string;
      notes?: string | null;
      sortOrder?: number;
      food?: any;
      grams?: number | null;
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      fiber?: number | null;
      sodium?: number | null;
    }>;
    instructions?: Array<{ stepNumber: number; instruction: string } | string>;
  };
  mode: "create" | "edit";
}

export function RecipeBuilder({ initialRecipe, mode }: RecipeBuilderProps) {
  const router = useRouter();

  // Basic Details
  const [name, setName] = useState(initialRecipe?.name || "");
  const [servings, setServings] = useState(String(initialRecipe?.servings || "4"));
  const [servingLabel, setServingLabel] = useState(initialRecipe?.servingLabel || "");
  const [yieldWeight, setYieldWeight] = useState(
    initialRecipe?.yieldWeightGrams ? String(initialRecipe.yieldWeightGrams) : ""
  );
  const [description, setDescription] = useState(initialRecipe?.description || "");

  // Ingredients State
  const [ingredients, setIngredients] = useState<RecipeBuilderIngredient[]>(() => {
    if (!initialRecipe?.ingredients) return [];
    return initialRecipe.ingredients.map((ing, idx) => ({
      tempId: ing.id || `ing-${idx}-${Date.now()}`,
      foodId: ing.foodId || null,
      rawName: ing.rawName,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes || null,
      sortOrder: ing.sortOrder ?? idx + 1,
      food: ing.food || null,
      grams: ing.grams ?? null,
      calories: ing.calories ?? null,
      protein: ing.protein ?? null,
      carbs: ing.carbs ?? null,
      fat: ing.fat ?? null,
      fiber: ing.fiber ?? null,
      sodium: ing.sodium ?? null,
    }));
  });

  // Food Catalog for ingredient picker
  const [catalogFoods, setCatalogFoods] = useState<FoodSummary[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  // Ingredient Picker Subview State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [selectedFoodForPortion, setSelectedFoodForPortion] = useState<FoodSummary | null>(null);
  const [pickerQty, setPickerQty] = useState("100");
  const [pickerUnit, setPickerUnit] = useState("g");

  // Inline editing of amount/unit in list
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  // Duplicate candidate warning
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string } | null>(null);
  const duplicateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Submission & Dirty Tracking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Mark dirty on any change
  useEffect(() => {
    setIsDirty(true);
  }, [name, servings, servingLabel, yieldWeight, description, ingredients]);

  // Load catalog foods once on mount
  useEffect(() => {
    setIsCatalogLoading(true);
    loadCatalog()
      .then((cat) => {
        setCatalogFoods(cat.foods);
        // Link any existing ingredients with missing full food objects
        setIngredients((prev) =>
          prev.map((ing) => {
            if (ing.foodId && !ing.food) {
              const matched = cat.foods.find((f) => f.id === ing.foodId);
              if (matched) return { ...ing, food: matched };
            }
            return ing;
          })
        );
      })
      .finally(() => setIsCatalogLoading(false));
  }, []);

  // Debounced duplicate name check in "create" mode
  useEffect(() => {
    if (mode !== "create") return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 3) {
      setDuplicateWarning(null);
      return;
    }

    if (duplicateTimeoutRef.current) clearTimeout(duplicateTimeoutRef.current);
    duplicateTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/check-duplicate?name=${encodeURIComponent(cleanName)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasDuplicate && data.duplicateCandidate) {
            setDuplicateWarning(data.duplicateCandidate);
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch {
        // Ignore check failure
      }
    }, 350);

    return () => {
      if (duplicateTimeoutRef.current) clearTimeout(duplicateTimeoutRef.current);
    };
  }, [name, mode]);

  // Unsaved changes browser guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting && (name.trim() || ingredients.length > 0)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSubmitting, name, ingredients]);

  // Parsed numerical values
  const numServings = Math.max(0.1, parseNum(servings) || 1);
  const numYieldGrams = yieldWeight.trim() ? Math.max(0, parseNum(yieldWeight)) : null;

  // Authoritative live calculated nutrition
  const calculatedNutrition = useMemo(() => {
    const calculationItems: IngredientForCalculation[] = ingredients.map((ing) => ({
      id: ing.tempId,
      rawName: ing.rawName,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
      foodId: ing.foodId,
      sortOrder: ing.sortOrder,
      grams: ing.grams,
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      fiber: ing.fiber,
      sodium: ing.sodium,
      food: ing.food
        ? {
            id: ing.food.id,
            name: ing.food.name,
            caloriesPer100g: ing.food.caloriesPer100g,
            proteinPer100g: ing.food.proteinPer100g,
            carbsPer100g: ing.food.carbsPer100g,
            fatPer100g: ing.food.fatPer100g,
            fiberPer100g: ing.food.fiberPer100g,
            defaultUnit: ing.food.defaultUnit,
            servingWeightGrams: ing.food.servingWeightGrams,
          }
        : null,
    }));

    return calculateRecipeNutrition(calculationItems, numServings, numYieldGrams);
  }, [ingredients, numServings, numYieldGrams]);

  // Filtered food catalog search results for ingredient picker
  const pickerResults = useMemo(() => {
    if (!pickerQuery.trim()) return catalogFoods.slice(0, 40);
    return rankMatches(catalogFoods, pickerQuery, (f) => `${f.name} ${f.brand ?? ""}`).slice(0, 50);
  }, [catalogFoods, pickerQuery]);

  // Open picker
  const handleOpenPicker = (targetId?: string) => {
    setReplaceTargetId(targetId || null);
    setSelectedFoodForPortion(null);
    setPickerQuery("");
    setIsPickerOpen(true);
  };

  // Select food from list to configure portion
  const handleSelectFoodForPortion = (food: FoodSummary) => {
    setSelectedFoodForPortion(food);
    const def = defaultServing(food);
    setPickerQty(String(def.quantity || 100));
    setPickerUnit(def.option.id === "g" ? "g" : def.option.id);
  };

  // Available serving options for selected food in picker
  const availablePortionOptions = useMemo<ServingOption[]>(() => {
    if (!selectedFoodForPortion) return [{ id: "g", label: "g", grams: 1 }];
    return servingOptions(selectedFoodForPortion);
  }, [selectedFoodForPortion]);

  // Commit picked ingredient into recipe
  const handleConfirmAddIngredient = () => {
    if (!selectedFoodForPortion) return;
    const qty = Math.max(0.01, parseNum(pickerQty) || 1);

    const newIng: RecipeBuilderIngredient = {
      tempId: replaceTargetId || `ing-${Date.now()}`,
      foodId: selectedFoodForPortion.id,
      rawName: selectedFoodForPortion.name,
      quantity: qty,
      unit: pickerUnit,
      notes: selectedFoodForPortion.brand ? selectedFoodForPortion.brand : null,
      sortOrder: replaceTargetId
        ? ingredients.find((i) => i.tempId === replaceTargetId)?.sortOrder || ingredients.length + 1
        : ingredients.length + 1,
      food: selectedFoodForPortion,
    };

    if (replaceTargetId) {
      setIngredients((prev) => prev.map((i) => (i.tempId === replaceTargetId ? newIng : i)));
    } else {
      setIngredients((prev) => [...prev, newIng]);
    }

    setIsPickerOpen(false);
    setSelectedFoodForPortion(null);
    setReplaceTargetId(null);
  };

  const handleRemoveIngredient = (tempId: string) => {
    setIngredients((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleUpdateIngredientAmount = (tempId: string, quantity: number, unit: string) => {
    setIngredients((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, quantity, unit } : i))
    );
    setEditingIngredientId(null);
  };

  // Form Save
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError("Recipe name is required.");
      return;
    }

    if (numServings <= 0) {
      setSubmitError("Servings must be greater than zero.");
      return;
    }

    if (ingredients.length === 0) {
      setSubmitError("Please add at least one ingredient.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      servings: numServings,
      servingLabel: servingLabel.trim() || null,
      yieldWeightGrams: numYieldGrams,
      ingredients: ingredients.map((ing, idx) => ({
        foodId: ing.foodId,
        rawName: ing.rawName,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || null,
        sortOrder: idx + 1,
      })),
      instructions: initialRecipe?.instructions || [],
      tags: initialRecipe?.tags || [],
    };

    try {
      const url = mode === "edit" ? `/api/recipes/${initialRecipe!.id}` : "/api/recipes";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save recipe");
      }

      const saved = await res.json();
      invalidateCatalog();
      toast(mode === "edit" ? "Recipe updated successfully" : "Recipe created successfully", {
        kind: "success",
      });
      router.push(`/recipes/${saved.id}`);
      router.refresh();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSaveRecipe} noValidate className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* ─── Top Header Navigation ─── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={mode === "edit" ? `/recipes/${initialRecipe!.id}` : "/recipes"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-3 hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{mode === "edit" ? "Cancel & Return" : "Cancel"}</span>
        </Link>

        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || ingredients.length === 0}
          className="btn btn-primary h-10 px-5 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface border-t-current" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{mode === "edit" ? "Save Changes" : "Save Recipe"}</span>
        </button>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-[var(--status-over-target-bg)] border border-[var(--status-over-target-border)] text-[var(--status-over-target)] text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{submitError}</span>
        </div>
      )}

      {/* ─── 1. Recipe Header Fields ─── */}
      <div className="rounded-2xl border border-line/50 bg-surface-1 p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-2">
          {mode === "edit" ? "Edit Recipe" : "New Recipe"}
        </h2>

        {/* Recipe Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-3 mb-1.5">
            Recipe Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Protein Pancakes, Chicken Curry, Overnight Oats"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input h-11 w-full text-base font-semibold"
            autoFocus={mode === "create"}
          />

          {/* Duplicate candidate warning */}
          {duplicateWarning && (
            <div className="mt-2 p-2.5 rounded-lg bg-surface-2 border border-line flex items-center justify-between text-xs text-fg-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>
                  Possible duplicate recipe: <strong>{duplicateWarning.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/recipes/${duplicateWarning.id}`}
                  className="font-semibold text-[var(--accent)] hover:underline"
                >
                  Open existing
                </Link>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="text-fg-4 hover:text-fg"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Servings, Serving Label, Optional Yield Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Servings */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-3 mb-1">
              Makes (Servings) *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setServings(String(Math.max(1, (parseNum(servings) || 4) - 1)))}
                className="btn btn-secondary btn-icon h-10 w-10 text-fg-2"
                aria-label="Decrease servings"
              >
                -
              </button>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="input h-10 flex-1 text-center font-bold text-sm tabular"
              />
              <button
                type="button"
                onClick={() => setServings(String((parseNum(servings) || 4) + 1))}
                className="btn btn-secondary btn-icon h-10 w-10 text-fg-2"
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
          </div>

          {/* Custom Serving Label */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-3 mb-1">
              Serving Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. bowl, slice, muffin, jar"
              value={servingLabel}
              onChange={(e) => setServingLabel(e.target.value)}
              className="input h-10 w-full text-xs"
            />
            <p className="text-[10px] text-fg-4 mt-1">Defaults to &ldquo;serving&rdquo;</p>
          </div>

          {/* Final Cooked Yield Weight */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-3 mb-1">
              Final Cooked Weight (Optional)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 2400"
                value={yieldWeight}
                onChange={(e) => setYieldWeight(e.target.value)}
                className="input h-10 w-full pr-8 text-xs font-medium tabular"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-3">g</span>
            </div>
            <p className="text-[10px] text-fg-4 mt-1">Enables per-100g batch logging</p>
          </div>
        </div>

        {/* Optional Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-3 mb-1">
            Notes / Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. High protein meal prep, makes 4 lunch boxes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input h-9 w-full text-xs"
          />
        </div>
      </div>

      {/* ─── 2. Ingredients Section ─── */}
      <div className="rounded-2xl border border-line/50 bg-surface-1 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-line/40">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-fg-2">
              Ingredients ({ingredients.length})
            </h2>
            <p className="text-xs text-fg-3">
              Combine foods from your library or search
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenPicker()}
            className="btn btn-secondary btn-sm h-9 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Add Ingredient</span>
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-line/50 rounded-xl bg-surface-2/30 space-y-2">
            <p className="text-sm font-medium text-fg">No ingredients added yet</p>
            <p className="text-xs text-fg-3 max-w-sm mx-auto">
              Add ingredients from your food library to calculate authoritative total recipe and per-serving nutrition.
            </p>
            <div>
              <button
                type="button"
                onClick={() => handleOpenPicker()}
                className="btn btn-primary btn-sm text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first ingredient</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line/30 rounded-xl bg-surface-2/40 border border-line/40 overflow-hidden">
            {calculatedNutrition.resolvedIngredients.map((ing) => {
              const isEditing = editingIngredientId === ing.id;

              return (
                <div
                  key={ing.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Ingredient Info & Inline Amount Form */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-fg text-sm truncate">
                        {ing.rawName}
                      </span>
                      {ing.food?.brand && (
                        <span className="text-fg-3 text-xs shrink-0">· {ing.food.brand}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          defaultValue={ing.quantity}
                          id={`edit-qty-${ing.id}`}
                          className="input h-7 w-20 text-xs tabular font-medium text-center"
                        />
                        <select
                          id={`edit-unit-${ing.id}`}
                          defaultValue={ing.unit}
                          className="input h-7 w-24 text-xs"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="cup">cup</option>
                          <option value="piece">piece</option>
                          <option value="egg">egg</option>
                          <option value="slice">slice</option>
                          <option value="scoop">scoop</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const qInput = document.getElementById(`edit-qty-${ing.id}`) as HTMLInputElement;
                            const uInput = document.getElementById(`edit-unit-${ing.id}`) as HTMLSelectElement;
                            handleUpdateIngredientAmount(
                              ing.id!,
                              parseNum(qInput?.value) || ing.quantity,
                              uInput?.value || ing.unit
                            );
                          }}
                          className="btn btn-primary btn-sm h-7 px-2.5 text-[11px]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIngredientId(null)}
                          className="btn btn-ghost btn-sm h-7 px-2 text-[11px] text-fg-3"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-fg-3 tabular flex items-center gap-1">
                        <span className="font-medium text-fg-2">
                          {fmt.qty(ing.quantity)} {ing.unit}
                        </span>
                        {ing.computedGrams && ing.unit !== "g" ? (
                          <span className="text-fg-4">({fmt.qty(ing.computedGrams)}g)</span>
                        ) : null}
                        {ing.notes && <span className="text-fg-4">· {ing.notes}</span>}
                      </div>
                    )}
                  </div>

                  {/* Right: Authoritative Macros & Actions */}
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold tabular text-fg">
                        {fmt.int(ing.calories)} <span className="font-normal text-fg-3">kcal</span>
                      </div>
                      <div className="text-[11px] tabular text-fg-3 mt-0.5">
                        {fmt.g(ing.protein)}P · {fmt.g(ing.carbs)}C · {fmt.g(ing.fat)}F
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingIngredientId(isEditing ? null : ing.id!)}
                        className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
                        title="Edit quantity"
                        aria-label={`Edit ${ing.rawName} quantity`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPicker(ing.id)}
                        className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
                        title="Replace ingredient"
                        aria-label={`Replace ${ing.rawName}`}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id!)}
                        className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-[var(--status-over-target)]"
                        title="Remove ingredient"
                        aria-label={`Remove ${ing.rawName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. Live Calculated Nutrition Section ─── */}
      <div className="rounded-2xl border border-line/50 bg-surface-1 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-line/40">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-fg-2">
              Calculated Nutrition
            </h2>
            <p className="text-xs text-fg-3">
              Deterministic sum of authoritative ingredient nutrients
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TOTAL RECIPE */}
          <div className="rounded-xl bg-surface-2/60 p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-fg-3">
                Total Recipe
              </span>
              <div className="text-right">
                <span className="text-2xl font-bold tabular text-fg">
                  {fmt.int(calculatedNutrition.total.calories)}
                </span>
                <span className="ml-1 text-xs font-normal text-fg-3">kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/40 text-xs">
              <div>
                <span className="text-fg-3 block text-[11px]">Protein</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.total.protein)}g
                </span>
              </div>
              <div>
                <span className="text-fg-3 block text-[11px]">Carbs</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.total.carbs)}g
                </span>
              </div>
              <div>
                <span className="text-fg-3 block text-[11px]">Fat</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.total.fat)}g
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 text-[11px] tabular text-fg-4 pt-1">
              <span>Fiber: {fmt.one(calculatedNutrition.total.fiber)}g</span>
              <span>·</span>
              <span>Sodium: {fmt.int(calculatedNutrition.total.sodium ?? 0)}mg</span>
              <span>·</span>
              <span>Raw weight: {fmt.qty(calculatedNutrition.totalWeightGrams)}g</span>
            </div>
          </div>

          {/* PER SERVING */}
          <div className="rounded-xl bg-surface-2/60 p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                Per Serving ({numServings} {servingLabel || "servings"})
              </span>
              <div className="text-right">
                <span className="text-2xl font-bold tabular text-fg">
                  {fmt.int(calculatedNutrition.perServing.calories)}
                </span>
                <span className="ml-1 text-xs font-normal text-fg-3">kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/40 text-xs">
              <div>
                <span className="text-fg-3 block text-[11px]">Protein</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.perServing.protein)}g
                </span>
              </div>
              <div>
                <span className="text-fg-3 block text-[11px]">Carbs</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.perServing.carbs)}g
                </span>
              </div>
              <div>
                <span className="text-fg-3 block text-[11px]">Fat</span>
                <span className="font-semibold tabular text-fg">
                  {fmt.one(calculatedNutrition.perServing.fat)}g
                </span>
              </div>
            </div>

            {calculatedNutrition.per100g ? (
              <div className="flex items-center gap-1.5 text-[11px] tabular text-fg-3 pt-1 border-t border-line/20">
                <span className="font-semibold text-fg">Per 100g:</span>
                <span>{fmt.int(calculatedNutrition.per100g.calories)} kcal</span>
                <span>·</span>
                <span>{fmt.one(calculatedNutrition.per100g.protein)}P</span>
                <span>·</span>
                <span>{fmt.one(calculatedNutrition.per100g.carbs)}C</span>
                <span>·</span>
                <span>{fmt.one(calculatedNutrition.per100g.fat)}F</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ─── Bottom Actions ─── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={mode === "edit" ? `/recipes/${initialRecipe!.id}` : "/recipes"}
          className="btn btn-secondary h-11 px-5 text-xs font-medium"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || ingredients.length === 0}
          className="btn btn-primary h-11 px-6 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-current" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{mode === "edit" ? "Save Changes" : "Save Recipe"}</span>
        </button>
      </div>

      {/* ─── Ingredient Picker Modal / Sheet ─── */}
      {isPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ingredient Picker"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setIsPickerOpen(false);
            setSelectedFoodForPortion(null);
            setReplaceTargetId(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-surface-1 border border-line p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-semibold text-base text-fg tracking-tight">
                  {replaceTargetId ? "Replace Ingredient" : "Add Ingredient"}
                </h3>
                <p className="text-xs text-fg-3">
                  Search across your Food Library and foods catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPickerOpen(false);
                  setSelectedFoodForPortion(null);
                  setReplaceTargetId(null);
                }}
                className="btn btn-ghost btn-icon btn-sm text-fg-3 hover:text-fg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedFoodForPortion ? (
              /* Subview 2: Portion Selector for picked food */
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-xl bg-surface-2/60">
                  <div className="font-semibold text-sm text-fg">
                    {selectedFoodForPortion.name}
                  </div>
                  {selectedFoodForPortion.brand && (
                    <div className="text-xs text-fg-3">{selectedFoodForPortion.brand}</div>
                  )}
                  <div className="text-xs text-fg-3 tabular mt-1">
                    {selectedFoodForPortion.caloriesPer100g} kcal / 100g ·{" "}
                    {selectedFoodForPortion.proteinPer100g}P · {selectedFoodForPortion.carbsPer100g}C ·{" "}
                    {selectedFoodForPortion.fatPer100g}F
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-3">
                    Amount &amp; Unit
                  </label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={pickerQty}
                      onChange={(e) => setPickerQty(e.target.value)}
                      className="input h-10 text-center font-bold text-base tabular"
                      autoFocus
                    />
                    <select
                      value={pickerUnit}
                      onChange={(e) => setPickerUnit(e.target.value)}
                      className="input h-10 w-36 text-xs font-medium"
                    >
                      {availablePortionOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} ({opt.grams}g)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedFoodForPortion(null)}
                    className="btn btn-secondary h-10 text-xs font-medium"
                  >
                    Back to search
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddIngredient}
                    disabled={!(parseNum(pickerQty) > 0)}
                    className="btn btn-primary h-10 px-5 text-xs font-semibold"
                  >
                    Add to Recipe
                  </button>
                </div>
              </div>
            ) : (
              /* Subview 1: Food Search List */
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
                  <input
                    type="text"
                    placeholder="Search foods..."
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    className="input h-10 w-full pl-10 pr-4 text-xs sm:text-sm"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-line/30 rounded-xl border border-line/40 bg-surface-2/30 min-h-[260px] max-h-[360px]">
                  {isCatalogLoading ? (
                    <div className="py-8 text-center text-xs text-fg-3">Loading foods...</div>
                  ) : pickerResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-fg-3">
                      No foods found for &ldquo;{pickerQuery}&rdquo;
                    </div>
                  ) : (
                    pickerResults.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        data-testid="picker-food-item"
                        onClick={() => handleSelectFoodForPortion(food)}
                        className="w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-surface-2 cursor-pointer transition-colors text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-fg truncate">{food.name}</div>
                          <div className="text-[11px] text-fg-3 truncate">
                            {food.brand ? `${food.brand} · ` : ""}
                            {food.caloriesPer100g} kcal / 100g
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular text-fg-3 text-[11px]">
                          {food.proteinPer100g}P · {food.carbsPer100g}C · {food.fatPer100g}F
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
