"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  Barcode,
  X,
  ArrowRight,
  Calculator,
  Loader2,
  Check,
  Search,
  BookOpen,
  Apple,
  Globe,
  Plus,
  Flame,
  Dna,
  Wheat,
  Droplet,
  SlidersHorizontal,
  ChevronRight,
  Database,
  DownloadCloud,
} from "lucide-react";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import { DynamicPortionAdjuster, ScaledNutrition } from "@/components/food-log/DynamicPortionAdjuster";
import mcdonaldsData from "@/data/mcdonalds-jordan-menu.json";
import { cn } from "@/lib/utils";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMealSuccess?: () => void;
}

type DestinationType = "food-log" | "meal-plan";
type TabType = "recipes" | "foods" | "mcdonalds" | "online" | "quick";

export function QuickAddModal({ isOpen, onClose, onAddMealSuccess }: QuickAddModalProps) {
  const router = useRouter();

  // Log destination (Default: Today's Food Log)
  const [destination, setDestination] = useState<DestinationType>("food-log");
  const [activeTab, setActiveTab] = useState<TabType>("recipes");

  // Date & Category state
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const [logDate, setLogDate] = useState<string>(getTodayStr());
  const [dayOfWeek, setDayOfWeek] = useState<string>("monday");
  const [mealCategory, setMealCategory] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Library state
  const [recipes, setRecipes] = useState<any[]>([]);
  const [userFoods, setUserFoods] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Search queries per tab
  const [recipeSearch, setRecipeSearch] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [mcdSearch, setMcdSearch] = useState("");
  const [onlineQuery, setOnlineQuery] = useState("");

  // Online search state
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Selected item to log & portion scale
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

  // Quick custom form state
  const [quickName, setQuickName] = useState("");
  const [quickCalories, setQuickCalories] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");

  // Submitting & success feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch recipes and foods on modal open
  useEffect(() => {
    if (isOpen) {
      setLogDate(getTodayStr());
      setSuccessMsg(null);
      setSelectedItem(null);
      setScaledPortion(null);

      setIsLoadingLibrary(true);
      Promise.all([
        fetch("/api/recipes").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/foods").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([recs, fds]) => {
          if (Array.isArray(recs)) setRecipes(recs);
          if (Array.isArray(fds)) setUserFoods(fds);
        })
        .catch(console.error)
        .finally(() => setIsLoadingLibrary(false));
    }
  }, [isOpen]);

  // Escape key handler & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedItem(null);
    setScaledPortion(null);
    setSuccessMsg(null);
    onClose();
  };

  // Online outsourced database search
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

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    const q = recipeSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
    );
  }, [recipes, recipeSearch]);

  // Filtered user foods
  const filteredUserFoods = useMemo(() => {
    if (!foodSearch.trim()) return userFoods;
    const q = foodSearch.toLowerCase();
    return userFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q)
    );
  }, [userFoods, foodSearch]);

  // Filtered McDonald's items
  const filteredMcdItems = useMemo(() => {
    const items = mcdonaldsData.items as any[];
    if (!mcdSearch.trim()) return items;
    const q = mcdSearch.toLowerCase();
    return items.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [mcdSearch]);

  // Selecting a Recipe
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

  // Selecting a Food
  const selectFood = (f: any) => {
    const baseWeight = f.servingWeightGrams || 100;
    const factor = baseWeight / 100;
    setSelectedItem({
      type: "food",
      item: f,
      baseWeightGrams: baseWeight,
      baseCalories: Math.round((f.caloriesPer100g || 0) * factor),
      baseProtein: Math.round((f.proteinPer100g || 0) * factor * 10) / 10,
      baseCarbs: Math.round((f.carbsPer100g || 0) * factor * 10) / 10,
      baseFat: Math.round((f.fatPer100g || 0) * factor * 10) / 10,
      baseFiber: Math.round((f.fiberPer100g || 0) * factor * 10) / 10,
      defaultUnit: f.defaultUnit || "g",
    });
  };

  // Selecting a McDonald's item
  const selectMcd = (m: any) => {
    const baseWeight = m.servingSize || 100;
    setSelectedItem({
      type: "mcdonalds",
      item: m,
      baseWeightGrams: baseWeight,
      baseCalories: m.calories || 0,
      baseProtein: m.protein || 0,
      baseCarbs: m.carbs || 0,
      baseFat: m.fat || 0,
      defaultUnit: m.servingUnit || "g",
    });
  };

  // Selecting an Online External Candidate
  const selectOnlineCandidate = (c: any) => {
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

  // Submission handler for selected item
  const handleConfirmLogItem = async () => {
    if (!selectedItem || !scaledPortion) return;
    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      let loggedName = selectedItem.item.name || selectedItem.item.cleanName;
      let foodId = selectedItem.type === "food" ? selectedItem.item.id : null;
      let recipeId = selectedItem.type === "recipe" ? selectedItem.item.id : null;

      // If online candidate, optionally auto-import to user's local database
      if (selectedItem.type === "online") {
        try {
          const importRes = await fetch("/api/foods/external/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedItem.item),
          });
          if (importRes.ok) {
            const importedFood = await importRes.json();
            foodId = importedFood.id;
            loggedName = importedFood.name;
          }
        } catch (e) {
          console.error("Auto-importing online food error:", e);
        }
      }

      if (destination === "food-log") {
        // Log to Food Log
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

        if (!res.ok) throw new Error("Failed to log food");
        setSuccessMsg(`Logged "${loggedName}" (${scaledPortion.grams}g, ${scaledPortion.calories} kcal) to today's food log!`);
      } else {
        // Log to Weekly Meal Plan Schedule
        const res = await fetch("/api/meal-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek,
            mealCategory,
            recipeId: recipeId || undefined,
            customName: !recipeId ? loggedName : undefined,
            servings: scaledPortion.servings,
            calories: scaledPortion.calories,
            protein: scaledPortion.protein,
            carbs: scaledPortion.carbs,
            fat: scaledPortion.fat,
          }),
        });

        if (!res.ok) throw new Error("Failed to schedule meal");
        setSuccessMsg(`Scheduled "${loggedName}" to ${dayOfWeek.toUpperCase()} ${mealCategory.toUpperCase()}!`);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("meal-logged"));
      }

      setTimeout(() => {
        onAddMealSuccess?.();
        handleClose();
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error logging meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Manual Add handler
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg(null);

    const cal = Number(quickCalories) || 0;
    const pro = Number(quickProtein) || 0;
    const carb = Number(quickCarbs) || 0;
    const fat = Number(quickFat) || 0;

    try {
      if (destination === "food-log") {
        const res = await fetch("/api/food-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: logDate,
            mealCategory,
            name: quickName.trim(),
            servings: 1,
            servingUnit: "serving",
            calories: cal,
            protein: pro,
            carbs: carb,
            fat: fat,
          }),
        });
        if (!res.ok) throw new Error("Failed to log custom entry");
        setSuccessMsg(`Logged "${quickName}" (${cal} kcal) to today's food log!`);
      } else {
        const res = await fetch("/api/meal-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek,
            mealCategory,
            customName: quickName.trim(),
            servings: 1,
            calories: cal,
            protein: pro,
            carbs: carb,
            fat: fat,
          }),
        });
        if (!res.ok) throw new Error("Failed to schedule custom entry");
        setSuccessMsg(`Scheduled "${quickName}" to ${dayOfWeek.toUpperCase()} ${mealCategory.toUpperCase()}!`);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("meal-logged"));
      }

      setTimeout(() => {
        setQuickName("");
        setQuickCalories("");
        setQuickProtein("");
        setQuickCarbs("");
        setQuickFat("");
        onAddMealSuccess?.();
        handleClose();
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error logging entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoCalcCalories = () => {
    const p = Number(quickProtein) || 0;
    const c = Number(quickCarbs) || 0;
    const f = Number(quickFat) || 0;
    if (p > 0 || c > 0 || f > 0) {
      setQuickCalories(String(Math.round(p * 4 + c * 4 + f * 9)));
    }
  };

  return (
    <>
      <div
        id="quick-add-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar: Title, Destination Switcher, Close */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Add &amp; Log Food
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Log meals with real-time portion scaling &amp; outsourced food library search
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Destination Switcher */}
              <div className="flex rounded-xl bg-[var(--background)] p-1 border border-[var(--border)] text-xs">
                <button
                  type="button"
                  onClick={() => setDestination("food-log")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition cursor-pointer",
                    destination === "food-log"
                      ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Today&apos;s Food Log
                </button>
                <button
                  type="button"
                  onClick={() => setDestination("meal-plan")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition cursor-pointer",
                    destination === "meal-plan"
                      ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Meal Plan Schedule
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Controls: Date & Meal Category */}
          <div className="px-6 py-3 bg-[var(--background)]/50 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">Meal Category:</span>
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMealCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg capitalize font-medium transition cursor-pointer",
                    mealCategory === cat
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {destination === "food-log" ? (
                <>
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-tabular text-xs focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </>
              ) : (
                <>
                  <span className="text-[var(--text-secondary)] font-medium">Day:</span>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs capitalize"
                  >
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Source Tabs Bar */}
          {!selectedItem && (
            <div className="flex items-center px-6 pt-3 pb-1 gap-2 overflow-x-auto border-b border-[var(--border)] text-xs scrollbar-none">
              <button
                onClick={() => setActiveTab("recipes")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 cursor-pointer",
                  activeTab === "recipes"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Saved Recipes ({recipes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("foods")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 cursor-pointer",
                  activeTab === "foods"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>Foods &amp; Pantry ({userFoods.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("mcdonalds")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 cursor-pointer",
                  activeTab === "mcdonalds"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <span>🍔</span>
                <span>McDonald&apos;s (79)</span>
              </button>

              <button
                onClick={() => setActiveTab("online")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 cursor-pointer",
                  activeTab === "online"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Search Online DBs</span>
              </button>

              <button
                onClick={() => setActiveTab("quick")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 cursor-pointer",
                  activeTab === "quick"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Quick Manual</span>
              </button>

              <div className="ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--accent)] font-medium flex items-center gap-1.5 hover:bg-[var(--surface)] transition cursor-pointer"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-[var(--ui-success-bg)] border border-[var(--ui-success-border)] text-[var(--ui-success)] text-xs flex items-center space-x-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Body Content Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* VIEW A: A SELECTED ITEM IS BEING PORTION-SCALED */}
            {selectedItem ? (
              <div className="space-y-4 animate-in fade-in duration-200">
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
                      ← Back to item search
                    </button>
                    <h3 className="font-bold text-base text-[var(--text-primary)]">
                      {selectedItem.item.name || selectedItem.item.cleanName}
                    </h3>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Base portion: {selectedItem.baseWeightGrams}g ({Math.round(selectedItem.baseCalories)} kcal)
                    </div>
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

                {/* Dynamic Portion & Gram Adjuster */}
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

                {/* Action Confirmation */}
                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || !scaledPortion}
                    onClick={handleConfirmLogItem}
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
              /* VIEW B: TABS TO PICK AN ITEM */
              <>
                {/* 1. RECIPES TAB */}
                {activeTab === "recipes" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search your saved recipes..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    {isLoadingLibrary ? (
                      <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--accent)]" />
                        <p>Loading recipes...</p>
                      </div>
                    ) : filteredRecipes.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
                        <BookOpen className="w-6 h-6 mx-auto opacity-40 text-[var(--text-secondary)]" />
                        <p>No recipes found matching query.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {filteredRecipes.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => selectRecipe(r)}
                            className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-xs transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="space-y-1">
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
                                <span>({r.servingWeightGrams || 100}g / serv)</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold text-xs group-hover:bg-[var(--accent)] group-hover:text-white transition"
                            >
                              Scale &amp; Log →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. FOODS & PANTRY TAB */}
                {activeTab === "foods" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search custom foods, pantry items, or imported items..."
                        value={foodSearch}
                        onChange={(e) => setFoodSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    {isLoadingLibrary ? (
                      <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--accent)]" />
                        <p>Loading food library...</p>
                      </div>
                    ) : filteredUserFoods.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
                        <Apple className="w-6 h-6 mx-auto opacity-40 text-[var(--text-secondary)]" />
                        <p>No foods found in your library.</p>
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
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {filteredUserFoods.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => selectFood(f)}
                            className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-xs transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                                  {f.name}
                                </h4>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--accent)] uppercase font-semibold">
                                  {f.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)] font-mono">
                                <span>{f.caloriesPer100g} kcal/100g</span>
                                <span>•</span>
                                <span className="text-[var(--macro-protein)]">{f.proteinPer100g}g P</span>
                                <span>•</span>
                                <span className="text-[var(--macro-carbs)]">{f.carbsPer100g}g C</span>
                                <span>•</span>
                                <span className="text-[var(--macro-fat)]">{f.fatPer100g}g F</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold text-xs group-hover:bg-[var(--accent)] group-hover:text-white transition"
                            >
                              Scale &amp; Log →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MCDONALD'S JORDAN TAB */}
                {activeTab === "mcdonalds" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder="Search official McDonald's Jordan menu (Big Mac, McChicken, Fries...)..."
                        value={mcdSearch}
                        onChange={(e) => setMcdSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {filteredMcdItems.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => selectMcd(m)}
                          className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-xs transition cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--background)] relative shrink-0 border border-[var(--border)]">
                              <Image
                                src={m.image}
                                alt={m.name}
                                fill
                                className="object-contain p-0.5"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                                  {m.name}
                                </h4>
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)] font-mono">
                                <span>{m.calories} kcal</span>
                                <span>•</span>
                                <span className="text-[var(--macro-protein)]">{m.protein}g P</span>
                                <span>•</span>
                                <span className="text-[var(--macro-carbs)]">{m.carbs}g C</span>
                                <span>•</span>
                                <span className="text-[var(--macro-fat)]">{m.fat}g F</span>
                                <span>({m.servingSize || 100}g)</span>
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
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. OUTSOURCED FOOD LIBRARIES SEARCH (USDA & OPEN FOOD FACTS) */}
                {activeTab === "online" && (
                  <div className="space-y-3">
                    <form onSubmit={handleSearchOnline} className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search whole foods via USDA & branded packaged foods via Open Food Facts..."
                          value={onlineQuery}
                          onChange={(e) => setOnlineQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingOnline || !onlineQuery.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {isSearchingOnline ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Search</span>
                      </button>
                    </form>

                    {isSearchingOnline ? (
                      <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
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
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {onlineResults.map((candidate) => (
                          <div
                            key={candidate.id}
                            onClick={() => selectOnlineCandidate(candidate)}
                            className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-xs transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="space-y-1">
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
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. QUICK MANUAL TAB */}
                {activeTab === "quick" && (
                  <form onSubmit={handleQuickAdd} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                        Food / Meal Description *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Protein shake with oats, 2 Boiled Eggs"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Macronutrients
                        </span>
                        <button
                          type="button"
                          onClick={handleAutoCalcCalories}
                          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Auto-calc kcal (4P+4C+9F)</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                            Calories
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={quickCalories}
                            onChange={(e) => setQuickCalories(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
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
      </div>

      {/* Barcode Scanner Modal Integration */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode="meal"
        onProductSelected={(prod) => {
          setIsScannerOpen(false);
          selectOnlineCandidate({
            id: `scan-${prod.barcode || Date.now()}`,
            source: "openfoodfacts",
            name: prod.name,
            caloriesPer100g: Number(prod.caloriesPer100g) || 0,
            proteinPer100g: Number(prod.proteinPer100g) || 0,
            carbsPer100g: Number(prod.carbsPer100g) || 0,
            fatPer100g: Number(prod.fatPer100g) || 0,
            servingWeightGrams: 100,
          });
        }}
      />
    </>
  );
}
