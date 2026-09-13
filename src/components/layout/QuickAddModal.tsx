"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Apple,
  Calendar,
  Package,
  Barcode,
  X,
  Plus,
  ArrowRight,
  Calculator,
  Loader2,
  Check,
  Search,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFoodSuccess?: () => void;
  onAddMealSuccess?: () => void;
}

type TabType = "menu" | "meal" | "pantry" | "food";
type MealSource = "custom" | "recipe";

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("menu");

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"meal" | "pantry" | "food" | "general">("general");

  // Meal Tab State
  const [mealSource, setMealSource] = useState<MealSource>("custom");
  const [customMealName, setCustomMealName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [mealCategory, setMealCategory] = useState("lunch");
  const [mealServings, setMealServings] = useState("1");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
  const [mealSuccessMsg, setMealSuccessMsg] = useState<string | null>(null);

  // Recipe selection in Meal Tab
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  // Quick Food State
  const [foodName, setFoodName] = useState("");
  const [foodCategory, setFoodCategory] = useState("Meat");
  const [foodRawCooked, setFoodRawCooked] = useState("raw");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");
  const [foodUnit, setFoodUnit] = useState("g");
  const [isSubmittingFood, setIsSubmittingFood] = useState(false);

  // Quick Pantry State
  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("1");
  const [pantryUnit, setPantryUnit] = useState("piece");
  const [pantryCategory, setPantryCategory] = useState("Pantry");
  const [isSubmittingPantry, setIsSubmittingPantry] = useState(false);

  // Fetch user's recipes when meal tab is opened
  useEffect(() => {
    if (isOpen && activeTab === "meal" && recipes.length === 0) {
      setIsLoadingRecipes(true);
      fetch("/api/recipes")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setRecipes(data);
          }
        })
        .catch((err) => console.error("Failed to load recipes:", err))
        .finally(() => setIsLoadingRecipes(false));
    }
  }, [isOpen, activeTab, recipes.length]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("menu");
    setMealSuccessMsg(null);
    onClose();
  };

  // Auto-calculate calories helper based on standard Atwater factors (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat)
  const handleAutoCalcCalories = () => {
    const p = Number(mealProtein) || 0;
    const c = Number(mealCarbs) || 0;
    const f = Number(mealFat) || 0;
    if (p > 0 || c > 0 || f > 0) {
      const computed = Math.round(p * 4 + c * 4 + f * 9);
      setMealCalories(String(computed));
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMeal(true);
    setMealSuccessMsg(null);

    try {
      let payload: any = {
        dayOfWeek,
        mealCategory,
        servings: Number(mealServings) || 1,
      };

      if (mealSource === "recipe") {
        if (!selectedRecipeId) {
          alert("Please select a recipe");
          setIsSubmittingMeal(false);
          return;
        }
        payload.recipeId = selectedRecipeId;
      } else {
        if (!customMealName.trim()) {
          setIsSubmittingMeal(false);
          return;
        }
        payload.customName = customMealName.trim();
        payload.calories = Number(mealCalories) || 0;
        payload.protein = Number(mealProtein) || 0;
        payload.carbs = Number(mealCarbs) || 0;
        payload.fat = Number(mealFat) || 0;
      }

      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMealSuccessMsg(`Logged to ${dayOfWeek.toUpperCase()} ${mealCategory.toUpperCase()}!`);
        setTimeout(() => {
          setCustomMealName("");
          setMealCalories("");
          setMealProtein("");
          setMealCarbs("");
          setMealFat("");
          setSelectedRecipeId("");
          handleClose();
          router.refresh();
        }, 800);
      }
    } finally {
      setIsSubmittingMeal(false);
    }
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    setIsSubmittingFood(true);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: foodName.trim(),
          category: foodCategory,
          rawOrCooked: foodRawCooked,
          caloriesPer100g: Number(foodCalories) || 0,
          proteinPer100g: Number(foodProtein) || 0,
          carbsPer100g: Number(foodCarbs) || 0,
          fatPer100g: Number(foodFat) || 0,
          defaultUnit: foodUnit,
          servingWeightGrams: 100,
        }),
      });
      if (res.ok) {
        setFoodName("");
        setFoodCalories("");
        setFoodProtein("");
        setFoodCarbs("");
        setFoodFat("");
        handleClose();
        router.refresh();
      }
    } finally {
      setIsSubmittingFood(false);
    }
  };

  const handleSavePantry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantryName.trim()) return;
    setIsSubmittingPantry(true);
    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pantryName.trim(),
          quantity: Number(pantryQuantity) || 1,
          unit: pantryUnit || "piece",
          category: pantryCategory,
        }),
      });
      if (res.ok) {
        setPantryName("");
        setPantryQuantity("1");
        handleClose();
        router.refresh();
      }
    } finally {
      setIsSubmittingPantry(false);
    }
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <>
      <div
        id="quick-add-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer touch-manipulation"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {activeTab === "menu" && "Quick Add"}
                {activeTab === "meal" && "Log Meal to Plan"}
                {activeTab === "pantry" && "Add to Pantry Inventory"}
                {activeTab === "food" && "Add Food / Ingredient"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[var(--text-secondary)] active:text-[var(--text-primary)] active:bg-[var(--background)] cursor-pointer touch-manipulation transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Bar when in a specific form */}
          {activeTab !== "menu" && (
            <div className="flex items-center justify-between px-6 py-2 bg-[var(--background)]/40 border-b border-[var(--border)] text-xs">
              <button
                onClick={() => setActiveTab("menu")}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1"
              >
                ← Back to Menu
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setScannerMode(activeTab === "pantry" ? "pantry" : "meal");
                    setIsScannerOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] font-medium text-[11px] flex items-center gap-1 hover:opacity-90 transition"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Scan Barcode</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* MAIN MENU TAB */}
            {activeTab === "menu" && (
              <div className="space-y-3">
                {/* 1. Log Meal */}
                <button
                  onClick={() => setActiveTab("meal")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--macro-protein)] hover:bg-[var(--background)] text-left transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--macro-protein-bg)] text-[var(--macro-protein)] flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--macro-protein)] transition">
                        Log Meal to Schedule
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Add custom meal with macros, pick from saved recipes, or scan
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition shrink-0" />
                </button>

                {/* 2. Barcode Camera Scanner */}
                <button
                  onClick={() => {
                    setScannerMode("general");
                    setIsScannerOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--background)] text-left transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                        Scan Barcode (UPC / EAN)
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Use device camera to instantly scan packaged food &amp; lookup nutrition
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition shrink-0" />
                </button>

                {/* 3. Add to Pantry */}
                <button
                  onClick={() => setActiveTab("pantry")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--background)] text-left transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--background)] text-[var(--text-primary)] flex items-center justify-center border border-[var(--border)] shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                        Add to Pantry Inventory
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Track ingredients in your fridge, freezer, or cupboard
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition shrink-0" />
                </button>

                {/* 4. Add Food to Database */}
                <button
                  onClick={() => setActiveTab("food")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--macro-carbs)] hover:bg-[var(--background)] text-left transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)] flex items-center justify-center shrink-0">
                      <Apple className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--macro-carbs)] transition">
                        Add Food / Ingredient
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Add custom item with 100g macros to your local database
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition shrink-0" />
                </button>

                {/* 5. Create Recipe */}
                <button
                  onClick={() => {
                    handleClose();
                    router.push("/recipes/new");
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--background)] text-left transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                        Create New Recipe
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        AI parser, text paste, link import, or manual builder
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition shrink-0" />
                </button>
              </div>
            )}

            {/* TAB: LOG MEAL */}
            {activeTab === "meal" && (
              <form onSubmit={handleSaveMeal} className="space-y-4">
                {mealSuccessMsg && (
                  <div className="p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs text-[var(--accent)] flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{mealSuccessMsg}</span>
                  </div>
                )}

                {/* Mode Selector: Custom vs From Recipe */}
                <div className="flex rounded-lg border border-[var(--border)] p-1 bg-[var(--background)]/60">
                  <button
                    type="button"
                    onClick={() => setMealSource("custom")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                      mealSource === "custom"
                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Custom Entry / Quick Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setMealSource("recipe")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                      mealSource === "recipe"
                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    From Saved Recipes ({recipes.length})
                  </button>
                </div>

                {/* Day and Category Pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Day of Week
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] capitalize"
                    >
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                        (d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Meal Category
                    </label>
                    <select
                      value={mealCategory}
                      onChange={(e) => setMealCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] capitalize"
                    >
                      {["breakfast", "lunch", "dinner", "snack"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* OPTION A: CUSTOM MEAL WITH DETAILED MACROS */}
                {mealSource === "custom" && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[var(--text-primary)]">
                          Meal name / Description *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerMode("meal");
                            setIsScannerOpen(true);
                          }}
                          className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          <span>Scan barcode</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Scrambled Eggs & Avocado, Chicken Rice Bowl"
                        value={customMealName}
                        onChange={(e) => setCustomMealName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    {/* Detailed Macros Input with Auto-Calc Button */}
                    <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Nutritional Breakdown
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoCalcCalories}
                          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 font-medium transition"
                          title="Calculate Calories = (4*P + 4*C + 9*F)"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Auto-calc kcal</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] text-[var(--text-primary)] font-medium mb-1">
                            Calories
                          </label>
                          <input
                            type="number"
                            placeholder="kcal"
                            value={mealCalories}
                            onChange={(e) => setMealCalories(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--macro-protein)] font-medium mb-1">
                            Protein (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="g"
                            value={mealProtein}
                            onChange={(e) => setMealProtein(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--macro-carbs)] font-medium mb-1">
                            Carbs (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="g"
                            value={mealCarbs}
                            onChange={(e) => setMealCarbs(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--macro-fat)] font-medium mb-1">
                            Fat (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="g"
                            value={mealFat}
                            onChange={(e) => setMealFat(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPTION B: FROM RECIPE LIBRARY */}
                {mealSource === "recipe" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                        Select Recipe from Library *
                      </label>
                      {isLoadingRecipes ? (
                        <div className="py-4 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                          <span>Loading your recipes...</span>
                        </div>
                      ) : recipes.length === 0 ? (
                        <div className="p-3 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
                          No saved recipes found. Create one first or use Custom Entry.
                        </div>
                      ) : (
                        <select
                          value={selectedRecipeId}
                          onChange={(e) => setSelectedRecipeId(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                        >
                          <option value="">-- Choose a recipe --</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.caloriesPerServing} kcal • {r.proteinPerServing}g P)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {selectedRecipe && (
                      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {selectedRecipe.name}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            Base: {selectedRecipe.caloriesPerServing} kcal / serving
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                            Number of Servings to Log
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={mealServings}
                            onChange={(e) => setMealServings(e.target.value)}
                            className="w-24 px-2.5 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>

                        {/* Calculated Nutrition Summary */}
                        <div className="pt-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--text-secondary)]">Total Logged:</span>
                          <span className="font-tabular font-semibold text-[var(--text-primary)]">
                            {Math.round(
                              selectedRecipe.caloriesPerServing * (Number(mealServings) || 1)
                            )}{" "}
                            kcal •{" "}
                            <span className="text-[var(--macro-protein)]">
                              {Math.round(
                                selectedRecipe.proteinPerServing * (Number(mealServings) || 1) * 10
                              ) / 10}
                              g P
                            </span>{" "}
                            •{" "}
                            <span className="text-[var(--macro-carbs)]">
                              {Math.round(
                                selectedRecipe.carbsPerServing * (Number(mealServings) || 1) * 10
                              ) / 10}
                              g C
                            </span>{" "}
                            •{" "}
                            <span className="text-[var(--macro-fat)]">
                              {Math.round(
                                selectedRecipe.fatPerServing * (Number(mealServings) || 1) * 10
                              ) / 10}
                              g F
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("menu")}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMeal}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition flex items-center gap-1.5"
                  >
                    {isSubmittingMeal ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                    <span>Log to Meal Plan</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: ADD TO PANTRY */}
            {activeTab === "pantry" && (
              <form onSubmit={handleSavePantry} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      Item Name *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode("pantry");
                        setIsScannerOpen(true);
                      }}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Scan barcode</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rolled Oats, Greek Yogurt, Olive Oil"
                    value={pantryName}
                    onChange={(e) => setPantryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={pantryQuantity}
                      onChange={(e) => setPantryQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Unit
                    </label>
                    <select
                      value={pantryUnit}
                      onChange={(e) => setPantryUnit(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="l">Liters (l)</option>
                      <option value="piece">Pieces / Items</option>
                      <option value="can">Cans</option>
                      <option value="package">Packages / Bags</option>
                      <option value="scoop">Scoops</option>
                      <option value="tbsp">Tablespoons (tbsp)</option>
                      <option value="cup">Cups</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Storage Category
                  </label>
                  <select
                    value={pantryCategory}
                    onChange={(e) => setPantryCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                  >
                    <option value="Pantry">Pantry / Dry Goods</option>
                    <option value="Meat">Meat &amp; Poultry</option>
                    <option value="Dairy & Eggs">Dairy &amp; Eggs</option>
                    <option value="Produce">Produce / Fresh Fruits &amp; Veggies</option>
                    <option value="Grains">Grains &amp; Pasta</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Supplements">Supplements &amp; Whey</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("menu")}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPantry}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition flex items-center gap-1.5"
                  >
                    {isSubmittingPantry ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>Add to Pantry</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: ADD FOOD / INGREDIENT */}
            {activeTab === "food" && (
              <form onSubmit={handleSaveFood} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Food Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greek Yogurt 2%, Chicken Thigh, Oats"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Category
                    </label>
                    <select
                      value={foodCategory}
                      onChange={(e) => setFoodCategory(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    >
                      <option value="Meat">Meat</option>
                      <option value="Dairy & Eggs">Dairy & Eggs</option>
                      <option value="Grains">Grains / Carbs</option>
                      <option value="Produce">Produce</option>
                      <option value="Seafood">Seafood</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Supplements">Supplements</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      State
                    </label>
                    <select
                      value={foodRawCooked}
                      onChange={(e) => setFoodRawCooked(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    >
                      <option value="raw">Raw</option>
                      <option value="cooked">Cooked</option>
                      <option value="dry">Dry</option>
                      <option value="unspecified">Unspecified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Default Unit
                    </label>
                    <select
                      value={foodUnit}
                      onChange={(e) => setFoodUnit(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="piece">Piece</option>
                      <option value="tbsp">Tablespoon (tbsp)</option>
                      <option value="scoop">Scoop</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    Nutrition per 100g (or standard serving)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-[var(--text-primary)] font-medium mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        placeholder="kcal"
                        value={foodCalories}
                        onChange={(e) => setFoodCalories(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--macro-protein)] font-medium mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="g"
                        value={foodProtein}
                        onChange={(e) => setFoodProtein(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--macro-carbs)] font-medium mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="g"
                        value={foodCarbs}
                        onChange={(e) => setFoodCarbs(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--macro-fat)] font-medium mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="g"
                        value={foodFat}
                        onChange={(e) => setFoodFat(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-tabular rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("menu")}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFood}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition"
                  >
                    {isSubmittingFood ? "Saving..." : "Save Food to DB"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal Integration */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode={scannerMode}
        defaultDayOfWeek={dayOfWeek}
        defaultMealCategory={mealCategory}
        onSuccess={() => {
          router.refresh();
        }}
        onProductSelected={(prod) => {
          if (activeTab === "meal" && mealSource === "custom") {
            setCustomMealName(prod.name);
            setMealCalories(String(prod.caloriesPer100g || ""));
            setMealProtein(String(prod.proteinPer100g || ""));
            setMealCarbs(String(prod.carbsPer100g || ""));
            setMealFat(String(prod.fatPer100g || ""));
          } else if (activeTab === "pantry") {
            setPantryName(prod.name);
            setPantryCategory(prod.category || "Pantry");
          }
        }}
      />
    </>
  );
}
