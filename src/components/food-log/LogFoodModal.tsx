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
  Globe,
  SlidersHorizontal,
  Calculator,
} from "lucide-react";
import mcdonaldsData from "@/data/mcdonalds-jordan-menu.json";
import { DynamicPortionAdjuster, ScaledNutrition } from "@/components/food-log/DynamicPortionAdjuster";
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
  const [activeTab, setActiveTab] = useState<"recipes" | "foods" | "online" | "quick">("recipes");
  const [mealCategory, setMealCategory] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    defaultMealCategory
  );
  const [logDate, setLogDate] = useState<string>(
    selectedDate || new Date().toISOString().split("T")[0]
  );

  // Recipes state
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");

  // Foods & McDonald's state
  const [userFoods, setUserFoods] = useState<any[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodFilterSource, setFoodFilterSource] = useState<"all" | "mcdonalds" | "custom">("all");

  // Online search state
  const [onlineQuery, setOnlineQuery] = useState("");
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Dynamic portion scaling state
  const [selectedItem, setSelectedItem] = useState<{
    type: "recipe" | "food" | "mcdonalds" | "online";
    item: any;
    baseWeightGrams: number;
    baseCalories: number;
    baseProtein: number;
    baseCarbs: number;
    baseFat: number;
    baseFiber?: number;
    defaultUnit?: string;
  } | null>(null);

  const [scaledPortion, setScaledPortion] = useState<ScaledNutrition | null>(null);

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
    setSelectedItem(null);
    setScaledPortion(null);

    // Fetch user recipes & foods
    fetch("/api/recipes")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRecipes)
      .catch(console.error);

    fetch("/api/foods")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUserFoods)
      .catch(console.error);
  }, [isOpen]);

  // Combined Foods list: User DB + Jordanian McDonald's menu items
  const combinedFoods = useMemo(() => {
    const list: any[] = [];

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
        fiberPer100g: f.fiberPer100g || 0,
        servingWeightGrams: f.servingWeightGrams || 100,
        image: null,
      });
    });

    (mcdonaldsData.items as any[]).forEach((m) => {
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

  const handleSearchOnline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = onlineQuery.trim();
    if (!q) return;

    setIsSearchingOnline(true);
    setOnlineError(null);
    try {
      const res = await fetch(`/api/foods/external/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setOnlineResults(data);
        if (data.length === 0) {
          setOnlineError("No foods found matching query in USDA or Open Food Facts.");
        }
      } else {
        setOnlineError("Failed to query external food databases.");
      }
    } catch (err) {
      console.error(err);
      setOnlineError("Network error while searching external databases.");
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const selectRecipe = (r: any) => {
    const baseWeight = r.servingWeightGrams || 100;
    setSelectedItem({
      type: "recipe",
      item: r,
      baseWeightGrams: baseWeight,
      baseCalories: r.caloriesPerServing || 0,
      baseProtein: r.proteinPerServing || 0,
      baseCarbs: r.carbsPerServing || 0,
      baseFat: r.fatPerServing || 0,
      baseFiber: r.fiberPerServing || 0,
      defaultUnit: "g",
    });
  };

  const selectFood = (f: any) => {
    const baseWeight = f.servingWeightGrams || 100;
    const factor = baseWeight / 100;
    setSelectedItem({
      type: f.isMcDonalds ? "mcdonalds" : "food",
      item: f,
      baseWeightGrams: baseWeight,
      baseCalories: f.calories ?? Math.round((f.caloriesPer100g || 0) * factor),
      baseProtein: f.protein ?? Math.round((f.proteinPer100g || 0) * factor * 10) / 10,
      baseCarbs: f.carbs ?? Math.round((f.carbsPer100g || 0) * factor * 10) / 10,
      baseFat: f.fat ?? Math.round((f.fatPer100g || 0) * factor * 10) / 10,
      baseFiber: Math.round((f.fiberPer100g || 0) * factor * 10) / 10,
      defaultUnit: "g",
    });
  };

  const selectOnline = (c: any) => {
    const baseWeight = c.servingWeightGrams || 100;
    const factor = baseWeight / 100;
    setSelectedItem({
      type: "online",
      item: c,
      baseWeightGrams: baseWeight,
      baseCalories: Math.round((c.caloriesPer100g || 0) * factor),
      baseProtein: Math.round((c.proteinPer100g || 0) * factor * 10) / 10,
      baseCarbs: Math.round((c.carbsPer100g || 0) * factor * 10) / 10,
      baseFat: Math.round((c.fatPer100g || 0) * factor * 10) / 10,
      baseFiber: Math.round((c.fiberPer100g || 0) * factor * 10) / 10,
      defaultUnit: c.defaultUnit || "g",
    });
  };

  const handleConfirmLog = async () => {
    if (!selectedItem || !scaledPortion) return;
    setIsSubmitting(true);

    try {
      let loggedName = selectedItem.item.name || selectedItem.item.cleanName;
      let foodId = selectedItem.type === "food" ? selectedItem.item.dbId || selectedItem.item.id : null;
      let recipeId = selectedItem.type === "recipe" ? selectedItem.item.id : null;

      // Auto-import online candidate if selected
      if (selectedItem.type === "online") {
        try {
          const impRes = await fetch("/api/foods/external/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedItem.item),
          });
          if (impRes.ok) {
            const imported = await impRes.json();
            foodId = imported.id;
            loggedName = imported.name;
          }
        } catch (e) {
          console.error("Auto import error:", e);
        }
      }

      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: logDate,
          mealCategory,
          name: loggedName,
          servings: scaledPortion.grams,
          servingUnit: "g",
          calories: scaledPortion.calories,
          protein: scaledPortion.protein,
          carbs: scaledPortion.carbs,
          fat: scaledPortion.fat,
          fiber: scaledPortion.fiber,
          recipeId,
          foodId,
        }),
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("meal-logged"));
        }
        onLogSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
              <span>Log Food Intake</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Select an item, scale portion &amp; grams dynamically, or search outsourced food libraries.
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

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Date Logged
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-tabular focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {/* Selected Item Portion Scaler Screen */}
        {selectedItem ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setScaledPortion(null);
                  }}
                  className="text-xs text-[var(--accent)] hover:underline font-medium flex items-center gap-1 cursor-pointer mb-1"
                >
                  ← Choose a different item
                </button>
                <h4 className="font-bold text-base text-[var(--text-primary)]">
                  {selectedItem.item.name || selectedItem.item.cleanName}
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Base serving: {selectedItem.baseWeightGrams}g ({Math.round(selectedItem.baseCalories)} kcal)
                </p>
              </div>

              {selectedItem.item.image && (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--background)] relative shrink-0 border border-[var(--border)]">
                  <Image
                    src={selectedItem.item.image}
                    alt={selectedItem.item.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              )}
            </div>

            {/* Dynamic Portion Adjuster */}
            <DynamicPortionAdjuster
              baseWeightGrams={selectedItem.baseWeightGrams}
              baseCalories={selectedItem.baseCalories}
              baseProtein={selectedItem.baseProtein}
              baseCarbs={selectedItem.baseCarbs}
              baseFat={selectedItem.baseFat}
              baseFiber={selectedItem.baseFiber}
              initialGrams={selectedItem.baseWeightGrams}
              onChange={setScaledPortion}
            />

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isSubmitting || !scaledPortion}
                onClick={handleConfirmLog}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  Log {scaledPortion ? `${scaledPortion.grams}g (${scaledPortion.calories} kcal)` : "Item"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
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
                <span>Recipes ({recipes.length})</span>
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
                onClick={() => setActiveTab("online")}
                className={cn(
                  "flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  activeTab === "online"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Online DBs</span>
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

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border)] scrollbar-thin scrollbar-thumb-[var(--border)] max-h-[340px]">
                  {filteredRecipes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                      No recipes found matching query.
                    </div>
                  ) : (
                    filteredRecipes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => selectRecipe(r)}
                        className="pt-2.5 pb-2.5 first:pt-0 flex items-center justify-between gap-3 hover:bg-[var(--background)]/60 px-2 rounded-xl transition cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                            {r.name}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)] font-mono">
                            <span>{r.caloriesPerServing} kcal</span>
                            <span>•</span>
                            <span className="text-[var(--macro-protein)]">{r.proteinPerServing}g P</span>
                            <span>•</span>
                            <span className="text-[var(--macro-carbs)]">{r.carbsPerServing}g C</span>
                            <span>•</span>
                            <span className="text-[var(--macro-fat)]">{r.fatPerServing}g F</span>
                            <span>({r.servingWeightGrams || 100}g)</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold text-xs group-hover:bg-[var(--accent)] group-hover:text-white transition shrink-0"
                        >
                          Scale &amp; Log →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Foods & McDonald's */}
            {activeTab === "foods" && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search foods, ingredients, McDonald's..."
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setFoodFilterSource("all")}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer",
                        foodFilterSource === "all"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]"
                      )}
                    >
                      All ({combinedFoods.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoodFilterSource("mcdonalds")}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer",
                        foodFilterSource === "mcdonalds"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]"
                      )}
                    >
                      🍔 McDonald&apos;s
                    </button>
                    <button
                      type="button"
                      onClick={() => setFoodFilterSource("custom")}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer",
                        foodFilterSource === "custom"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]"
                      )}
                    >
                      Custom ({userFoods.length})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border)] scrollbar-thin scrollbar-thumb-[var(--border)] max-h-[340px]">
                  {filteredFoods.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                      <p>No foods found matching query.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOnlineQuery(foodSearch);
                          setActiveTab("online");
                          handleSearchOnline();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white font-medium text-xs shadow-xs"
                      >
                        Search Online DBs for &quot;{foodSearch || "food"}&quot; →
                      </button>
                    </div>
                  ) : (
                    filteredFoods.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => selectFood(f)}
                        className="pt-2.5 pb-2.5 first:pt-0 flex items-center justify-between gap-3 hover:bg-[var(--background)]/60 px-2 rounded-xl transition cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {f.image && (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--background)] relative shrink-0 border border-[var(--border)]">
                              <Image
                                src={f.image}
                                alt={f.name}
                                fill
                                className="object-contain p-0.5"
                              />
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition truncate">
                                {f.name}
                              </h4>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--accent)] uppercase font-semibold">
                                {f.category}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)] font-mono">
                              <span>{f.calories || f.caloriesPer100g} kcal</span>
                              <span>•</span>
                              <span className="text-[var(--macro-protein)]">{f.protein || f.proteinPer100g}g P</span>
                              <span>•</span>
                              <span className="text-[var(--macro-carbs)]">{f.carbs || f.carbsPer100g}g C</span>
                              <span>•</span>
                              <span className="text-[var(--macro-fat)]">{f.fat || f.fatPer100g}g F</span>
                              <span>({f.servingWeightGrams || 100}g)</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold text-xs group-hover:bg-[var(--accent)] group-hover:text-white transition shrink-0"
                        >
                          Scale &amp; Log →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Online Search (USDA & Open Food Facts) */}
            {activeTab === "online" && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <form onSubmit={handleSearchOnline} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search whole foods via USDA & branded goods via Open Food Facts..."
                      value={onlineQuery}
                      onChange={(e) => setOnlineQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingOnline || !onlineQuery.trim()}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSearchingOnline ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border)] max-h-[340px]">
                  {isSearchingOnline ? (
                    <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--accent)]" />
                      <p>Querying USDA FoodData Central &amp; Open Food Facts...</p>
                    </div>
                  ) : onlineError ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)]">
                      {onlineError}
                    </div>
                  ) : onlineResults.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
                      <Globe className="w-6 h-6 mx-auto opacity-40 text-[var(--accent)]" />
                      <p className="font-semibold text-[var(--text-primary)]">Outsourced Food Database Fallback</p>
                      <p>Search any ingredient or branded item to calculate grams and log it directly.</p>
                    </div>
                  ) : (
                    onlineResults.map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => selectOnline(candidate)}
                        className="pt-2.5 pb-2.5 first:pt-0 flex items-center justify-between gap-3 hover:bg-[var(--background)]/60 px-2 rounded-xl transition cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                              {candidate.name}
                            </h4>
                            <span
                              className={cn(
                                "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                                candidate.source === "usda"
                                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                                  : "bg-sky-500/10 text-sky-500"
                              )}
                            >
                              {candidate.source === "usda" ? "USDA" : "Open Food Facts"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)] font-mono">
                            <span>{candidate.caloriesPer100g} kcal/100g</span>
                            <span>•</span>
                            <span className="text-[var(--macro-protein)]">{candidate.proteinPer100g}g P</span>
                            <span>•</span>
                            <span className="text-[var(--macro-carbs)]">{candidate.carbsPer100g}g C</span>
                            <span>•</span>
                            <span className="text-[var(--macro-fat)]">{candidate.fatPer100g}g F</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold text-xs group-hover:bg-[var(--accent)] group-hover:text-white transition shrink-0"
                        >
                          Scale &amp; Log →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Quick Manual */}
            {activeTab === "quick" && (
              <form onSubmit={handleQuickAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Meal / Food Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scrambled Eggs & Toast"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={quickCalories}
                      onChange={(e) => setQuickCalories(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--macro-protein)] mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={quickProtein}
                      onChange={(e) => setQuickProtein(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--macro-carbs)] mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={quickCarbs}
                      onChange={(e) => setQuickCarbs(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--macro-fat)] mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={quickFat}
                      onChange={(e) => setQuickFat(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Add Quick Log</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
