"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Pencil,
  Copy,
  Plus,
  Minus,
  Check,
  Calendar,
  Utensils,
  ArrowLeft,
  X,
} from "lucide-react";
import { scaleIngredients } from "@/lib/nutrition/calculator";
import { cn } from "@/lib/utils";

interface RecipeDetailProps {
  initialRecipe: {
    id: string;
    name: string;
    description?: string | null;
    servings: number;
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
    saturatedFatPerServing?: number | null;
    sodiumMgPerServing?: number | null;
    tags: string[];
    ingredients: Array<{
      id: string;
      rawName: string;
      quantity: number;
      unit: string;
      notes?: string | null;
      foodId?: string | null;
    }>;
    instructions: Array<{
      id: string;
      stepNumber: number;
      instruction: string;
    }>;
  };
}

export function RecipeDetailView({ initialRecipe }: RecipeDetailProps) {
  const router = useRouter();
  const [recipe] = useState(initialRecipe);
  const [currentServings, setCurrentServings] = useState(initialRecipe.servings || 4);
  const [isFavorite, setIsFavorite] = useState(initialRecipe.isFavorite);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Add to meal plan modal state
  const [isMealPlanModalOpen, setIsMealPlanModalOpen] = useState(false);
  const [mealDay, setMealDay] = useState("monday");
  const [mealCategory, setMealCategory] = useState("lunch");
  const [mealServings, setMealServings] = useState(1);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [mealSuccessNotice, setMealSuccessNotice] = useState(false);

  // Dynamically scaled ingredients based on current servings
  const scaled = scaleIngredients(
    recipe.ingredients,
    recipe.servings,
    currentServings
  );

  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const handleToggleFavorite = async () => {
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      await fetch(`/api/recipes/${recipe.id}/favorite`, { method: "POST" });
    } catch {
      setIsFavorite(prev);
    }
  };

  const handleServingChange = (delta: number) => {
    const next = Math.max(1, Math.min(30, currentServings + delta));
    setCurrentServings(next);
  };

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleStepCheck = (id: string) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/recipes/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMeal(true);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          dayOfWeek: mealDay,
          mealCategory,
          servings: mealServings,
        }),
      });
      if (res.ok) {
        setIsMealPlanModalOpen(false);
        setMealSuccessNotice(true);
        setTimeout(() => setMealSuccessNotice(false), 4000);
      }
    } finally {
      setIsAddingMeal(false);
    }
  };

  // Stacked P/C/F split percentages
  const macroSplit = useMemo(() => {
    const pCals = (recipe.proteinPerServing || 0) * 4;
    const cCals = (recipe.carbsPerServing || 0) * 4;
    const fCals = (recipe.fatPerServing || 0) * 9;
    const total = pCals + cCals + fCals;
    if (total === 0) return { pPct: 33.3, cPct: 33.3, fPct: 33.4 };
    return {
      pPct: Math.round((pCals / total) * 100),
      cPct: Math.round((cCals / total) * 100),
      fPct: 100 - Math.round((pCals / total) * 100) - Math.round((cCals / total) * 100),
    };
  }, [recipe]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top back navigation */}
      <div>
        <Link
          href="/recipes"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to recipes</span>
        </Link>
      </div>

      {mealSuccessNotice && (
        <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[var(--lime)]" />
          <span>Added to your meal plan successfully!</span>
        </div>
      )}

      {/* ─── Top Header Section: Image on left, then tags, large title, meta, actions ─── */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Image on left */}
        <div className="w-full md:w-80 h-64 md:h-80 rounded-3xl overflow-hidden bg-[var(--surface)] shrink-0 flex items-center justify-center">
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60">
              <Utensils className="w-12 h-12 stroke-1 mb-2" />
              <span className="text-xs font-semibold tracking-wider uppercase">MealPrep</span>
            </div>
          )}
        </div>

        {/* Right Info: Tags, Large Title, Meta, Actions */}
        <div className="flex-1 space-y-4">
          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-secondary)] shadow-none"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Large Title */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {recipe.name}
          </h1>

          {recipe.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {recipe.description}
            </p>
          )}

          {/* Prep / Cook / Servings Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] font-tabular pt-1">
            {recipe.prepTimeMinutes && (
              <span>Prep: <strong className="text-[var(--text-primary)] font-semibold">{recipe.prepTimeMinutes}m</strong></span>
            )}
            {recipe.cookTimeMinutes && (
              <span>Cook: <strong className="text-[var(--text-primary)] font-semibold">{recipe.cookTimeMinutes}m</strong></span>
            )}
            {totalTime > 0 && (
              <span>Total: <strong className="text-[var(--text-primary)] font-semibold">{totalTime}m</strong></span>
            )}
            <span>Base recipe: <strong className="text-[var(--text-primary)] font-semibold">{recipe.servings} servings</strong></span>
          </div>

          {/* Actions: Primary "Add to meal plan", Edit, Duplicate, Favorite */}
          <div className="flex items-center gap-2.5 flex-wrap pt-3">
            <button
              type="button"
              onClick={() => setIsMealPlanModalOpen(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-none"
            >
              <Calendar className="w-4 h-4" />
              <span>Add to meal plan</span>
            </button>

            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 text-[var(--text-primary)] text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>

            <button
              type="button"
              onClick={handleDuplicate}
              className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 text-[var(--text-primary)] text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFavorite}
              className={cn(
                "w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 transition flex items-center justify-center cursor-pointer",
                isFavorite
                  ? "text-[var(--status-over-target)]"
                  : "text-[var(--text-muted)] hover:text-[var(--status-over-target)]"
              )}
              title={isFavorite ? "Remove favorite" : "Favorite"}
              aria-label="Toggle favorite"
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Main Layout: Ingredients & Method on left, Nutrition cards on right rail ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ingredients Card + Method Card */}
        <div className="lg:col-span-8 space-y-6">
          {/* Ingredients Card with servings stepper and divider rows */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 sm:p-7 space-y-4 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Ingredients
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Check off as you prep
                </p>
              </div>

              {/* Servings Stepper */}
              <div className="flex items-center space-x-3 self-start sm:self-auto">
                <span className="text-xs text-[var(--text-muted)] font-medium">Servings:</span>
                <button
                  type="button"
                  onClick={() => handleServingChange(-1)}
                  disabled={currentServings <= 1}
                  className="w-8 h-8 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-[var(--text-primary)] disabled:opacity-30 flex items-center justify-center font-bold transition cursor-pointer"
                  aria-label="Decrease servings"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-sm font-tabular text-[var(--text-primary)] w-6 text-center">
                  {currentServings}
                </span>
                <button
                  type="button"
                  onClick={() => handleServingChange(1)}
                  className="w-8 h-8 rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-[var(--text-primary)] flex items-center justify-center font-bold transition cursor-pointer"
                  aria-label="Increase servings"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Divider Rows */}
            <div className="divide-y divide-[var(--border)]">
              {scaled.map((ing) => {
                const isChecked = checkedIngredients[ing.id || ""] || false;
                return (
                  <div
                    key={ing.id}
                    onClick={() => ing.id && toggleIngredientCheck(ing.id)}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0",
                          isChecked
                            ? "bg-[var(--accent)] text-[var(--on-accent)]"
                            : "bg-[var(--background)]"
                        )}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium transition",
                          isChecked
                            ? "line-through text-[var(--text-muted)]"
                            : "text-[var(--text-primary)]"
                        )}
                      >
                        {ing.rawName}
                        {ing.notes && <span className="text-xs text-[var(--text-muted)] ml-1.5">({ing.notes})</span>}
                      </span>
                    </div>

                    <div className="font-tabular text-xs font-semibold text-[var(--text-secondary)] shrink-0">
                      {ing.quantity} {ing.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Numbered Method Card */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 sm:p-7 space-y-4 shadow-none">
            <h2 className="text-base font-semibold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
              Method
            </h2>

            <div className="space-y-4">
              {recipe.instructions.map((step) => {
                const isChecked = checkedSteps[step.id] || false;
                return (
                  <div
                    key={step.id}
                    onClick={() => toggleStepCheck(step.id)}
                    className="flex items-start space-x-4 cursor-pointer select-none group"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition font-tabular",
                        isChecked
                          ? "bg-[var(--accent)] text-[var(--on-accent)]"
                          : "bg-[var(--background)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      )}
                    >
                      {isChecked ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                    </div>

                    <p
                      className={cn(
                        "text-sm leading-relaxed transition pt-0.5",
                        isChecked
                          ? "line-through text-[var(--text-muted)]"
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {step.instruction}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Rail: Hero "Per serving" card + Micronutrients card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Hero "Per serving" Card with big kcal, stacked P/C/F split bar and macro rows */}
          <div className="rounded-[28px] bg-[var(--hero)] text-[var(--hero-text)] p-6 sm:p-7 space-y-5 shadow-none">
            <div>
              <span className="text-xs text-[var(--hero-muted)] font-normal uppercase tracking-wider">
                Per Serving
              </span>
              <div className="text-4xl font-bold tracking-tight text-[var(--hero-text)] font-tabular mt-1">
                {Math.round(recipe.caloriesPerServing)} <span className="text-lg font-normal text-[var(--hero-muted)]">kcal</span>
              </div>
            </div>

            {/* Stacked P / C / F Split Bar */}
            <div className="space-y-2">
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-[var(--hero-track)]">
                <div
                  style={{ width: `${macroSplit.pPct}%`, backgroundColor: "var(--macro-protein)" }}
                  className="h-full transition-all duration-300"
                  title={`Protein: ${macroSplit.pPct}%`}
                />
                <div
                  style={{ width: `${macroSplit.cPct}%`, backgroundColor: "var(--macro-carbs)" }}
                  className="h-full transition-all duration-300"
                  title={`Carbs: ${macroSplit.cPct}%`}
                />
                <div
                  style={{ width: `${macroSplit.fPct}%`, backgroundColor: "var(--macro-fat)" }}
                  className="h-full transition-all duration-300"
                  title={`Fat: ${macroSplit.fPct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--hero-muted)] font-tabular">
                <span>{macroSplit.pPct}% Pro</span>
                <span>{macroSplit.cPct}% Carb</span>
                <span>{macroSplit.fPct}% Fat</span>
              </div>
            </div>

            {/* Macro Rows with Dot Labels */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--hero-track)] text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: "var(--macro-protein)" }}
                  />
                  <span>Protein</span>
                </span>
                <span className="font-bold text-[var(--hero-text)] font-tabular">
                  {Math.round(recipe.proteinPerServing)}g
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: "var(--macro-carbs)" }}
                  />
                  <span>Carbs</span>
                </span>
                <span className="font-bold text-[var(--hero-text)] font-tabular">
                  {Math.round(recipe.carbsPerServing)}g
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-normal text-[var(--hero-text)]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: "var(--macro-fat)" }}
                  />
                  <span>Fat</span>
                </span>
                <span className="font-bold text-[var(--hero-text)] font-tabular">
                  {Math.round(recipe.fatPerServing)}g
                </span>
              </div>
            </div>
          </div>

          {/* Micronutrients Card: fiber, sugars, saturated fat and sodium */}
          <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-3.5 shadow-none">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
              Micronutrients
            </h3>

            <div className="space-y-3 divide-y divide-[var(--border)] text-xs">
              <div className="flex items-center justify-between pt-1 first:pt-0">
                <span className="text-[var(--text-secondary)]">Fiber</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.fiberPerServing ? `${recipe.fiberPerServing}g` : "0g"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[var(--text-secondary)]">Total sugars</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.totalSugarsPerServing ? `${recipe.totalSugarsPerServing}g` : "0g"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[var(--text-secondary)]">Saturated fat</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.saturatedFatPerServing ? `${recipe.saturatedFatPerServing}g` : "0g"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[var(--text-secondary)]">Sodium</span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.sodiumMgPerServing ? `${Math.round(recipe.sodiumMgPerServing)}mg` : "0mg"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add To Meal Plan Modal */}
      {isMealPlanModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsMealPlanModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add to meal plan
              </h3>
              <button
                type="button"
                onClick={() => setIsMealPlanModalOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddToMealPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Day of the week
                </label>
                <select
                  value={mealDay}
                  onChange={(e) => setMealDay(e.target.value)}
                  className="input-field"
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Meal slot
                </label>
                <select
                  value={mealCategory}
                  onChange={(e) => setMealCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Portion servings
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5"
                  value={mealServings}
                  onChange={(e) => setMealServings(parseFloat(e.target.value) || 1)}
                  className="input-field font-tabular"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMealPlanModalOpen(false)}
                  className="px-4 py-2 min-h-[44px] rounded-full bg-[var(--background)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--border)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMeal}
                  className="px-5 py-2 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isAddingMeal ? "Adding..." : "Add to plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
