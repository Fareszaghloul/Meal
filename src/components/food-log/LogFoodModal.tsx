"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Search,
  Plus,
  Check,
  Sparkles,
  BookOpen,
  Apple,
  Zap,
  Flame,
  Dna,
  Wheat,
  Droplet,
  Clock,
  Loader2,
} from "lucide-react";
import mcdonaldsData from "@/data/mcdonalds-jordan-menu.json";
import { cn } from "@/lib/utils";

interface LogFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealCategory?: "breakfast" | "lunch" | "dinner" | "snack";
  selectedDate?: string;
  onLogSuccess: () => void;
}

export function LogFoodModal({
  isOpen,
  onClose,
  defaultMealCategory = "lunch",
  selectedDate,
  onLogSuccess,
}: LogFoodModalProps) {
  const [activeTab, setActiveTab] = useState<"recipes" | "foods" | "quick">("recipes");
  const [mealCategory, setMealCategory] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    defaultMealCategory
  );
  const [logDate, setLogDate] = useState<string>(
    selectedDate || new Date().toISOString().split("T")[0]
  );

  // Recipes state
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeServings, setRecipeServings] = useState<Record<string, number>>({});

  // Foods & McDonald's state
  const [userFoods, setUserFoods] = useState<any[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodFilterSource, setFoodFilterSource] = useState<"all" | "mcdonalds" | "custom">("all");
  const [foodGrams, setFoodGrams] = useState<Record<string, number>>({});

  // Quick Add Form State
  const [quickName, setQuickName] = useState("");
  const [quickCalories, setQuickCalories] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultMealCategory) setMealCategory(defaultMealCategory);
    if (selectedDate) setLogDate(selectedDate);
  }, [defaultMealCategory, selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch user recipes & foods
    fetch("/api/recipes")
      .then((r) => r.ok ? r.json() : [])
      .then(setRecipes)
      .catch(console.error);

    fetch("/api/foods")
      .then((r) => r.ok ? r.json() : [])
      .then(setUserFoods)
      .catch(console.error);
  }, [isOpen]);

  // Combined Foods list: User DB + Jordanian McDonald's menu items
  const combinedFoods = useMemo(() => {
    const list: any[] = [];

    // User's custom and imported foods
    userFoods.forEach((f) => {
      list.push({
        id: `food-${f.id}`,
        dbId: f.id,
        isCustom: true,
        isMcDonalds: f.category?.toLowerCase().includes("mcdonald"),
        name: f.name,
        category: f.category || "Custom Food",
        caloriesPer100g: f.caloriesPer100g || 0,
        proteinPer100g: f.proteinPer100g || 0,
        carbsPer100g: f.carbsPer100g || 0,
        fatPer100g: f.fatPer100g || 0,
        servingWeightGrams: f.servingWeightGrams || 100,
        image: null,
      });
    });

    // Jordanian McDonald's items directly from catalog
    (mcdonaldsData.items as any[]).forEach((m) => {
      // Avoid duplicate display if already in userFoods
      const alreadyInUser = userFoods.some(
        (uf) => uf.name.toLowerCase() === m.name.toLowerCase()
      );
      if (!alreadyInUser) {
        list.push({
          id: `mcd-${m.id}`,
          isCustom: false,
          isMcDonalds: true,
          name: m.name,
          category: `McDonald's: ${m.category}`,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          caloriesPer100g:
            m.servingSize > 0 ? Math.round((m.calories / m.servingSize) * 100) : m.calories,
          proteinPer100g:
            m.servingSize > 0
              ? Math.round((m.protein / m.servingSize) * 100 * 10) / 10
              : m.protein,
          carbsPer100g:
            m.servingSize > 0 ? Math.round((m.carbs / m.servingSize) * 100 * 10) / 10 : m.carbs,
          fatPer100g:
            m.servingSize > 0 ? Math.round((m.fat / m.servingSize) * 100 * 10) / 10 : m.fat,
          servingWeightGrams: m.servingSize || 100,
          image: m.image,
        });
      }
    });

    return list;
  }, [userFoods]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    const q = recipeSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [recipes, recipeSearch]);

  const filteredFoods = useMemo(() => {
    let list = combinedFoods;
    if (foodFilterSource === "mcdonalds") {
      list = list.filter((f) => f.isMcDonalds);
    } else if (foodFilterSource === "custom") {
      list = list.filter((f) => f.isCustom);
    }

    if (foodSearch.trim()) {
      const q = foodSearch.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [combinedFoods, foodFilterSource, foodSearch]);

  // Log a Recipe serving
  const handleLogRecipe = async (recipe: any) => {
    const servings = recipeServings[recipe.id] || 1;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: logDate,
          mealCategory,
          name: recipe.name,
          servings,
          servingUnit: "serving",
          calories: Math.round(recipe.caloriesPerServing * servings),
          protein: Math.round(recipe.proteinPerServing * servings * 10) / 10,
          carbs: Math.round(recipe.carbsPerServing * servings * 10) / 10,
          fat: Math.round(recipe.fatPerServing * servings * 10) / 10,
          fiber: Math.round((recipe.fiberPerServing || 0) * servings * 10) / 10,
          recipeId: recipe.id,
        }),
      });

      if (res.ok) {
        onLogSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log a Food / McDonald's Item
  const handleLogFood = async (food: any) => {
    const weightGrams = foodGrams[food.id] || food.servingWeightGrams || 100;
    const factor = weightGrams / 100;

    const calories = Math.round(food.caloriesPer100g * factor);
    const protein = Math.round(food.proteinPer100g * factor * 10) / 10;
    const carbs = Math.round(food.carbsPer100g * factor * 10) / 10;
    const fat = Math.round(food.fatPer100g * factor * 10) / 10;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: logDate,
          mealCategory,
          name: food.name,
          servings: weightGrams,
          servingUnit: "g",
          calories,
          protein,
          carbs,
          fat,
          foodId: food.dbId || null,
        }),
      });

      if (res.ok) {
        onLogSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Add Log
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: logDate,
          mealCategory,
          name: quickName.trim(),
          servings: 1,
          servingUnit: "serving",
          calories: Number(quickCalories) || 0,
          protein: Number(quickProtein) || 0,
          carbs: Number(quickCarbs) || 0,
          fat: Number(quickFat) || 0,
        }),
      });

      if (res.ok) {
        setQuickName("");
        setQuickCalories("");
        setQuickProtein("");
        setQuickCarbs("");
        setQuickFat("");
        onLogSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-5 sm:p-6 space-y-5 flex flex-col max-h-[90vh] text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
              <span>Log Food Intake</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Log foods from your recipes, personal food library, or McDonald&apos;s Jordan catalog.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meal Category & Date Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Meal Category Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Meal Time
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              {(
                [
                  { id: "breakfast", label: "Breakfast", icon: "🌅" },
                  { id: "lunch", label: "Lunch", icon: "☀️" },
                  { id: "dinner", label: "Dinner", icon: "🌙" },
                  { id: "snack", label: "Snack", icon: "🍎" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMealCategory(cat.id)}
                  className={cn(
                    "py-1.5 text-center rounded-lg text-xs font-medium transition-all cursor-pointer",
                    mealCategory === cat.id
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="block text-xs">{cat.icon}</span>
                  <span className="text-[10px] sm:text-xs">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Date Logged
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {/* Source Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
          <button
            onClick={() => setActiveTab("recipes")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === "recipes"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>My Recipes ({recipes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("foods")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === "foods"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Apple className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Foods &amp; McDonald&apos;s</span>
          </button>

          <button
            onClick={() => setActiveTab("quick")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === "quick"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Quick Add</span>
          </button>
        </div>

        {/* Tab 1: Recipes */}
        {activeTab === "recipes" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search recipe by name..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border)] scrollbar-thin scrollbar-thumb-[var(--border)]">
              {filteredRecipes.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                  No recipes found. Create recipes in the Recipes tab or use Quick Add!
                </div>
              ) : (
                filteredRecipes.map((r) => {
                  const servings = recipeServings[r.id] || 1;
                  const totalCal = Math.round(r.caloriesPerServing * servings);
                  const totalPro = Math.round(r.proteinPerServing * servings * 10) / 10;
                  const totalCarbs = Math.round(r.carbsPerServing * servings * 10) / 10;
                  const totalFat = Math.round(r.fatPerServing * servings * 10) / 10;

                  return (
                    <div
                      key={r.id}
                      className="pt-2.5 pb-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--border)]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 text-lg">
                            🍲
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-[var(--text-primary)] truncate">
                            {r.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                            <span className="text-[var(--text-primary)] font-bold">{totalCal} kcal</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-protein)] font-medium">{totalPro}g P</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-carbs)] font-medium">{totalCarbs}g C</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-fat)] font-medium">{totalFat}g F</span>
                          </div>
                        </div>
                      </div>

                      {/* Servings Stepper & Log Button */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1 border border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-secondary)] px-1">Servings:</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="10"
                            value={servings}
                            onChange={(e) =>
                              setRecipeServings((prev) => ({
                                ...prev,
                                [r.id]: Math.max(0.1, Number(e.target.value) || 1),
                              }))
                            }
                            className="w-12 text-center bg-[var(--surface)] border border-[var(--border)] rounded py-0.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleLogRecipe(r)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Foods & McDonald's */}
        {activeTab === "foods" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search Big Mac, chicken, rice, banana, latte..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setFoodFilterSource("all")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer",
                    foodFilterSource === "all"
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFoodFilterSource("mcdonalds")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer",
                    foodFilterSource === "mcdonalds"
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  )}
                >
                  <span>🍔 McDonald&apos;s</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFoodFilterSource("custom")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer",
                    foodFilterSource === "custom"
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  )}
                >
                  My Foods
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border)] scrollbar-thin scrollbar-thumb-[var(--border)]">
              {filteredFoods.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                  No foods matching your query.
                </div>
              ) : (
                filteredFoods.slice(0, 50).map((f) => {
                  const weight = foodGrams[f.id] || f.servingWeightGrams || 100;
                  const factor = weight / 100;
                  const totalCal = Math.round(f.caloriesPer100g * factor);
                  const totalPro = Math.round(f.proteinPer100g * factor * 10) / 10;
                  const totalCarbs = Math.round(f.carbsPer100g * factor * 10) / 10;
                  const totalFat = Math.round(f.fatPer100g * factor * 10) / 10;

                  return (
                    <div
                      key={f.id}
                      className="pt-2.5 pb-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {f.image ? (
                          <img
                            src={f.image}
                            alt={f.name}
                            className="w-10 h-10 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 text-sm">
                            {f.isMcDonalds ? "🍔" : "🥗"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                              {f.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                              {f.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                            <span className="text-[var(--text-primary)] font-bold">{totalCal} kcal</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-protein)] font-medium">{totalPro}g P</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-carbs)] font-medium">{totalCarbs}g C</span>
                            <span className="text-[var(--border)]">•</span>
                            <span className="text-[var(--macro-fat)] font-medium">{totalFat}g F</span>
                          </div>
                        </div>
                      </div>

                      {/* Weight Grams Input & Log Button */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-[var(--background)] rounded-lg p-1 border border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-secondary)] px-1">Weight:</span>
                          <input
                            type="number"
                            step="5"
                            min="1"
                            value={weight}
                            onChange={(e) =>
                              setFoodGrams((prev) => ({
                                ...prev,
                                [f.id]: Math.max(1, Number(e.target.value) || 100),
                              }))
                            }
                            className="w-14 text-center bg-[var(--surface)] border border-[var(--border)] rounded py-0.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none"
                          />
                          <span className="text-[10px] text-[var(--text-secondary)] pr-1">g</span>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleLogFood(f)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs flex items-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Quick Add Form */}
        {activeTab === "quick" && (
          <form onSubmit={handleQuickAdd} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">
                Food / Meal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Protein shake with berries, Shawarma wrap..."
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">Calories (kcal) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0"
                  value={quickCalories}
                  onChange={(e) => setQuickCalories(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">Protein (g)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quickProtein}
                  onChange={(e) => setQuickProtein(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">Carbs (g)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quickCarbs}
                  onChange={(e) => setQuickCarbs(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">Fat (g)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quickFat}
                  onChange={(e) => setQuickFat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !quickName.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Log to {mealCategory.toUpperCase()}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
