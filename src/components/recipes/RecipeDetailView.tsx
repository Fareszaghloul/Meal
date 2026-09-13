"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Pencil,
  Clock,
  Users,
  ExternalLink,
  Plus,
  Minus,
  Check,
  Calendar,
  Share2,
  Trash2,
  Utensils,
  ChevronRight,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
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
    fiberPerServing: number;
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
  const [recipe, setRecipe] = useState(initialRecipe);
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

  const handleDeleteRecipe = async () => {
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/recipes");
      router.refresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top action navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/recipes"
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-1"
        >
          <span>← Back to recipes</span>
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMealPlanModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium shadow-xs transition"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Add to meal plan</span>
          </button>
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition"
            title="Edit recipe"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={handleDeleteRecipe}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
            title="Delete recipe"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mealSuccessNotice && (
        <div className="p-3 rounded-xl bg-[var(--ui-success-bg)] border border-[var(--ui-success-border)] text-[var(--ui-success)] text-xs flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[var(--ui-success)]" />
          <span>Added to your meal plan successfully!</span>
        </div>
      )}

      {/* Recipe Header Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {recipe.imageUrl && (
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[var(--background)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {recipe.sourcePlatform && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                    Source: {recipe.sourcePlatform}
                  </span>
                )}
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-[var(--accent)] hover:underline"
                  >
                    <span>View original link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {recipe.name}
              </h1>
            </div>

            <button
              onClick={handleToggleFavorite}
              className={cn(
                "p-3 rounded-2xl border transition shadow-xs shrink-0",
                isFavorite
                  ? "bg-[var(--status-over-target)]/10 border-[var(--status-over-target)]/30 text-[var(--status-over-target)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--status-over-target)] hover:bg-[var(--background)]"
              )}
            >
              <Heart
                className={cn("w-5 h-5", isFavorite && "fill-current")}
              />
            </button>
          </div>

          {recipe.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {recipe.description}
            </p>
          )}

          {/* Time & Servings Meta info */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-[var(--text-secondary)]">
            {recipe.prepTimeMinutes && (
              <div>
                <span className="opacity-70">Prep: </span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.prepTimeMinutes} mins
                </span>
              </div>
            )}
            {recipe.cookTimeMinutes && (
              <div>
                <span className="opacity-70">Cook: </span>
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {recipe.cookTimeMinutes} mins
                </span>
              </div>
            )}
            {totalTime > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 opacity-70" />
                <span className="font-semibold text-[var(--text-primary)] font-tabular">
                  {totalTime} mins total
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 opacity-70" />
              <span className="font-semibold text-[var(--text-primary)] font-tabular">
                Base recipe: {recipe.servings} servings
              </span>
            </div>
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {recipe.tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nutrition Card (Per Serving) */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
            Nutrition (per serving)
          </h2>
          <span className="text-xs text-[var(--text-secondary)] font-tabular">
            Based on 1 of {currentServings} servings
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <MacroBadge
            label="Calories"
            value={Math.round(recipe.caloriesPerServing)}
            unit="kcal"
            type="calories"
            size="lg"
          />
          <MacroBadge
            label="Protein"
            value={Math.round(recipe.proteinPerServing)}
            unit="g"
            type="protein"
            size="lg"
          />
          <MacroBadge
            label="Carbs"
            value={Math.round(recipe.carbsPerServing)}
            unit="g"
            type="carbs"
            size="lg"
          />
          <MacroBadge
            label="Fat"
            value={Math.round(recipe.fatPerServing)}
            unit="g"
            type="fat"
            size="lg"
          />
        </div>
      </div>

      {/* Serving Scaler Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Adjust recipe yield
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Changing servings automatically scales all ingredient measurements below.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-center">
          <button
            onClick={() => handleServingChange(-1)}
            disabled={currentServings <= 1}
            className="w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-30 flex items-center justify-center font-bold hover:bg-[var(--background)] transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="text-center min-w-[70px]">
            <span className="text-base font-semibold text-[var(--text-primary)] font-tabular">
              {currentServings}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-1">servings</span>
          </div>
          <button
            onClick={() => handleServingChange(1)}
            className="w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] flex items-center justify-center font-bold hover:bg-[var(--background)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Ingredients
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Click to cross off as you prep
          </span>
        </div>

        <div className="space-y-2">
          {scaled.map((ing) => {
            const isChecked = checkedIngredients[ing.id || ""] || false;
            return (
              <div
                key={ing.id}
                onClick={() => ing.id && toggleIngredientCheck(ing.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition",
                  isChecked
                    ? "bg-[var(--background)] border-[var(--border)] opacity-60 line-through"
                    : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--text-secondary)]/40"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition",
                      isChecked
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "border-[var(--border)]"
                    )}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {ing.rawName}
                  </span>
                  {ing.notes && (
                    <span className="text-xs text-[var(--text-secondary)]">({ing.notes})</span>
                  )}
                </div>

                <div className="font-tabular font-medium text-xs text-[var(--text-primary)]">
                  {ing.quantity} {ing.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions Steps */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Instructions
        </h2>

        <div className="space-y-4">
          {recipe.instructions.map((step) => {
            const isChecked = checkedSteps[step.id] || false;
            return (
              <div
                key={step.id}
                onClick={() => toggleStepCheck(step.id)}
                className={cn(
                  "flex items-start space-x-4 p-4 rounded-xl border cursor-pointer transition select-none",
                  isChecked
                    ? "bg-[var(--background)] border-[var(--border)] opacity-60"
                    : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--text-secondary)]/40"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 transition font-tabular",
                    isChecked
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  )}
                >
                  {isChecked ? <Check className="w-4 h-4" /> : step.stepNumber}
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed text-[var(--text-primary)]",
                    isChecked && "line-through text-[var(--text-secondary)]"
                  )}
                >
                  {step.instruction}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add To Meal Plan Modal */}
      {isMealPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              Add to weekly meal plan
            </h3>

            <form onSubmit={handleAddToMealPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Day of the week
                </label>
                <select
                  value={mealDay}
                  onChange={(e) => setMealDay(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Meal slot
                </label>
                <select
                  value={mealCategory}
                  onChange={(e) => setMealCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Portion servings
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5"
                  value={mealServings}
                  onChange={(e) => setMealServings(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMealPlanModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMeal}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition"
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
