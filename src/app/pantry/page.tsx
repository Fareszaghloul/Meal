"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Apple,
  Package,
  Sparkles,
  Plus,
  Minus,
  Search,
  Trash2,
  Edit2,
  ChefHat,
  ArrowRight,
  Globe,
  Barcode,
  Database,
  DownloadCloud,
  Check,
  Loader2,
  Info,
  Layers,
  ArrowUpDown,
  Filter,
  X,
  Flame,
  Dna,
  Wheat,
  Droplet,
  SlidersHorizontal,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import { McDonaldsCalculator } from "@/components/foods/McDonaldsCalculator";
import { EditFoodModal } from "@/components/foods/EditFoodModal";
import { NutritionLabelScannerModal } from "@/components/scanner/NutritionLabelScannerModal";
import { UnifiedFoodSearchModal } from "@/components/foods/UnifiedFoodSearchModal";

type ActiveTab = "foods" | "pantry" | "what-can-i-make";

export default function FoodsAndPantryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pantry");

  // Foods DB state
  const [foods, setFoods] = useState<any[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState("All");
  const [foodSortBy, setFoodSortBy] = useState<
    "category" | "name-asc" | "name-desc" | "cal-desc" | "cal-asc" | "protein-desc" | "carbs-desc" | "fat-desc"
  >("category");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [foodToEdit, setFoodToEdit] = useState<any | null>(null);
  const [isEditFoodModalOpen, setIsEditFoodModalOpen] = useState(false);
  const [showMcdCalculator, setShowMcdCalculator] = useState(false);
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<any | null>(null);

  // Unified Search Modal State
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);

  // Barcode Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"food" | "pantry" | "meal" | "general">("food");

  // Pantry state
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [pantrySearch, setPantrySearch] = useState("");
  const [pantryCategoryFilter, setPantryCategoryFilter] = useState("All");
  const [pantrySortBy, setPantrySortBy] = useState<"category" | "name" | "qty-desc" | "qty-asc">("category");
  const [isAddPantryModalOpen, setIsAddPantryModalOpen] = useState(false);

  // What Can I Make state
  const [recipeMatches, setRecipeMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // New Food Form State
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodBrand, setNewFoodBrand] = useState("");
  const [newFoodCategory, setNewFoodCategory] = useState("Meat");
  const [newFoodRawCooked, setNewFoodRawCooked] = useState("raw");
  const [newFoodServingSize, setNewFoodServingSize] = useState("1");
  const [newFoodServingUnit, setNewFoodServingUnit] = useState("g");
  const [newFoodServingWeight, setNewFoodServingWeight] = useState("100");
  const [newFoodNutritionBasis, setNewFoodNutritionBasis] = useState<"PER_SERVING" | "PER_100G">("PER_SERVING");
  const [newFoodCalories, setNewFoodCalories] = useState("");
  const [newFoodProtein, setNewFoodProtein] = useState("");
  const [newFoodCarbs, setNewFoodCarbs] = useState("");
  const [newFoodFat, setNewFoodFat] = useState("");
  const [newFoodFiber, setNewFoodFiber] = useState("");
  const [newFoodTotalSugars, setNewFoodTotalSugars] = useState("");
  const [newFoodAddedSugars, setNewFoodAddedSugars] = useState("");
  const [newFoodSaturatedFat, setNewFoodSaturatedFat] = useState("");
  const [newFoodTransFat, setNewFoodTransFat] = useState("");
  const [newFoodSodium, setNewFoodSodium] = useState("");
  const [showNewFoodAdditional, setShowNewFoodAdditional] = useState(false);
  const [newFoodDefaultUnit, setNewFoodDefaultUnit] = useState("g");

  // Nutrition Label Scanner Modal State
  const [isNutritionScannerOpen, setIsNutritionScannerOpen] = useState(false);

  // New Pantry Form State
  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("500");
  const [pantryUnit, setPantryUnit] = useState("g");
  const [pantryCategory, setPantryCategory] = useState("Pantry");
  const [pantryStorageLocation, setPantryStorageLocation] = useState("Pantry");
  const [pantryExpiryDate, setPantryExpiryDate] = useState("");
  const [pantryLowStockThreshold, setPantryLowStockThreshold] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");

  const fetchFoods = async () => {
    try {
      const res = await fetch("/api/foods");
      if (res.ok) setFoods(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPantry = async () => {
    try {
      const res = await fetch("/api/pantry");
      if (res.ok) setPantryItems(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWhatCanIMake = async () => {
    setIsLoadingMatches(true);
    try {
      const res = await fetch("/api/pantry/what-can-i-make");
      if (res.ok) setRecipeMatches(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchFoods();
    fetchPantry();
    fetchWhatCanIMake();
  }, []);



  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName.trim()) return;

    try {
      const parseNum = (val: string) => {
        if (val === "" || val === null || val === undefined) return null;
        const n = Number(val);
        return isNaN(n) ? null : n;
      };

      const payload: Record<string, any> = {
        name: newFoodName.trim(),
        brand: newFoodBrand.trim() || null,
        category: newFoodCategory,
        rawOrCooked: newFoodRawCooked,
        servingSize: Number(newFoodServingSize) || 1,
        servingUnit: newFoodServingUnit.trim() || "g",
        servingWeightGrams: Number(newFoodServingWeight) || 100,
        nutritionBasis: newFoodNutritionBasis,
        defaultUnit: newFoodDefaultUnit || "g",
        source: "MANUAL",
      };

      if (newFoodNutritionBasis === "PER_SERVING") {
        payload.caloriesPerServing = Number(newFoodCalories) || 0;
        payload.proteinPerServing = Number(newFoodProtein) || 0;
        payload.carbsPerServing = Number(newFoodCarbs) || 0;
        payload.fatPerServing = Number(newFoodFat) || 0;
        payload.fiberPerServing = parseNum(newFoodFiber);
        payload.totalSugarsPerServing = parseNum(newFoodTotalSugars);
        payload.addedSugarsPerServing = parseNum(newFoodAddedSugars);
        payload.saturatedFatPerServing = parseNum(newFoodSaturatedFat);
        payload.transFatPerServing = parseNum(newFoodTransFat);
        payload.sodiumPerServing = parseNum(newFoodSodium);
      } else {
        payload.caloriesPer100g = Number(newFoodCalories) || 0;
        payload.proteinPer100g = Number(newFoodProtein) || 0;
        payload.carbsPer100g = Number(newFoodCarbs) || 0;
        payload.fatPer100g = Number(newFoodFat) || 0;
        payload.fiberPer100g = parseNum(newFoodFiber);
        payload.totalSugarsPer100g = parseNum(newFoodTotalSugars);
        payload.addedSugarsPer100g = parseNum(newFoodAddedSugars);
        payload.saturatedFatPer100g = parseNum(newFoodSaturatedFat);
        payload.transFatPer100g = parseNum(newFoodTransFat);
        payload.sodiumPer100g = parseNum(newFoodSodium);
      }

      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddFoodModalOpen(false);
        setNewFoodName("");
        setNewFoodBrand("");
        setNewFoodCalories("");
        setNewFoodProtein("");
        setNewFoodCarbs("");
        setNewFoodFat("");
        setNewFoodFiber("");
        setNewFoodTotalSugars("");
        setNewFoodAddedSugars("");
        setNewFoodSaturatedFat("");
        setNewFoodTransFat("");
        setNewFoodSodium("");
        setShowNewFoodAdditional(false);
        fetchFoods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!confirm("Are you sure you want to delete this food?")) return;
    await fetch(`/api/foods/${id}`, { method: "DELETE" });
    fetchFoods();
  };

  const handleCreatePantryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantryName.trim()) return;

    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pantryName,
          quantity: Number(pantryQuantity) || 1,
          unit: pantryUnit,
          category: pantryCategory,
          storageLocation: pantryStorageLocation || "Pantry",
          expiryDate: pantryExpiryDate || null,
          lowStockThreshold: pantryLowStockThreshold ? Number(pantryLowStockThreshold) : null,
          foodId: selectedFoodId || null,
        }),
      });

      if (res.ok) {
        setIsAddPantryModalOpen(false);
        setPantryName("");
        setPantryQuantity("500");
        setPantryStorageLocation("Pantry");
        setPantryExpiryDate("");
        setPantryLowStockThreshold("");
        fetchPantry();
        fetchWhatCanIMake();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePantryQuantity = async (item: any, delta: number) => {
    const newQty = Math.max(0, (Number(item.quantity) || 0) + delta);
    if (newQty === 0) {
      if (confirm(`Remove "${item.name}" from your pantry?`)) {
        await handleDeletePantryItem(item.id);
      }
      return;
    }

    try {
      const res = await fetch("/api/pantry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          quantity: newQty,
        }),
      });

      if (res.ok) {
        setPantryItems((prev) =>
          prev.map((pi) => (pi.id === item.id ? { ...pi, quantity: newQty } : pi))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePantryItem = async (id: string) => {
    await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    fetchPantry();
    fetchWhatCanIMake();
  };

  // Distinct categories in user foods (McDonald's included as first-class category)
  const foodCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("McDonald's");
    foods.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    const others = Array.from(cats).filter((c) => c !== "McDonald's").sort();
    return ["All", "McDonald's", ...others];
  }, [foods]);

  // Distinct categories in pantry items
  const pantryCategories = useMemo(() => {
    const cats = new Set<string>();
    pantryItems.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["All", ...Array.from(cats).sort()];
  }, [pantryItems]);

  // Filtered & Sorted Foods
  const filteredFoods = useMemo(() => {
    let result = foods.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
        (f.category || "").toLowerCase().includes(foodSearch.toLowerCase());
      
      let matchesCategory = foodCategoryFilter === "All";
      if (!matchesCategory) {
        if (foodCategoryFilter === "McDonald's") {
          matchesCategory =
            f.category === "McDonald's" ||
            f.name.toLowerCase().includes("mcdonald") ||
            (f.category === "Fast Food" && f.name.toLowerCase().includes("mc"));
        } else {
          matchesCategory = f.category === foodCategoryFilter;
        }
      }
      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      if (foodSortBy === "category") {
        const catComp = (a.category || "").localeCompare(b.category || "");
        return catComp !== 0 ? catComp : (a.name || "").localeCompare(b.name || "");
      }
      if (foodSortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (foodSortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (foodSortBy === "cal-desc") return (b.caloriesPer100g || 0) - (a.caloriesPer100g || 0);
      if (foodSortBy === "cal-asc") return (a.caloriesPer100g || 0) - (b.caloriesPer100g || 0);
      if (foodSortBy === "protein-desc") return (b.proteinPer100g || 0) - (a.proteinPer100g || 0);
      if (foodSortBy === "carbs-desc") return (b.carbsPer100g || 0) - (a.carbsPer100g || 0);
      if (foodSortBy === "fat-desc") return (b.fatPer100g || 0) - (a.fatPer100g || 0);
      return 0;
    });
  }, [foods, foodSearch, foodCategoryFilter, foodSortBy]);

  // Filtered & Sorted Pantry Items
  const filteredPantryItems = useMemo(() => {
    let result = pantryItems.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(pantrySearch.toLowerCase()) ||
        p.category.toLowerCase().includes(pantrySearch.toLowerCase());
      const matchesCategory =
        pantryCategoryFilter === "All" || p.category === pantryCategoryFilter;
      return matchesSearch && matchesCategory;
    });

    return result.sort((a, b) => {
      if (pantrySortBy === "category") {
        const catComp = (a.category || "").localeCompare(b.category || "");
        return catComp !== 0 ? catComp : (a.name || "").localeCompare(b.name || "");
      }
      if (pantrySortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (pantrySortBy === "qty-desc") return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
      if (pantrySortBy === "qty-asc") return (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      return 0;
    });
  }, [pantryItems, pantrySearch, pantryCategoryFilter, pantrySortBy]);



  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Header & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">
            Nutrition catalog & inventory
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
            Foods &amp; Pantry
          </h1>
        </div>

        {/* Segmented Control (Pill group on var(--surface)) */}
        <div className="flex items-center p-1 rounded-full bg-[var(--surface)] text-xs overflow-x-auto max-w-full scrollbar-none shrink-0 shadow-none">
          <button
            type="button"
            onClick={() => setActiveTab("foods")}
            className={cn(
              "px-4 py-2 min-h-[38px] rounded-full font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer",
              activeTab === "foods"
                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Foods ({foods.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pantry")}
            className={cn(
              "px-4 py-2 min-h-[38px] rounded-full font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer",
              activeTab === "pantry"
                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Pantry ({pantryItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("what-can-i-make")}
            className={cn(
              "px-4 py-2 min-h-[38px] rounded-full font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer",
              activeTab === "what-can-i-make"
                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>What Can I Make?</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Foods Database */}
      {activeTab === "foods" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Toolbar: Pill search, sort select, Scan label, Barcode, Online database, primary Custom food */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Pill Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search foods by name or brand..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-full bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border-none outline-none focus:ring-1 focus:ring-[var(--text-primary)]"
              />
              {foodSearch && (
                <button
                  type="button"
                  onClick={() => setFoodSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Select & Action Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={foodSortBy}
                  onChange={(e) => setFoodSortBy(e.target.value as any)}
                  className="px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium border-none outline-none focus:ring-1 focus:ring-[var(--text-primary)] cursor-pointer pr-8 appearance-none"
                >
                  <option value="category">Category</option>
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="protein-desc">Protein (High → Low)</option>
                  <option value="cal-desc">Calories (High → Low)</option>
                  <option value="carbs-desc">Carbs (High → Low)</option>
                  <option value="fat-desc">Fat (High → Low)</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => setIsNutritionScannerOpen(true)}
                className="px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 text-[var(--text-primary)] text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                title="Scan nutrition label"
              >
                <Camera className="w-4 h-4 text-[var(--lime)]" />
                <span>Scan label</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScannerMode("food");
                  setIsScannerOpen(true);
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 text-[var(--text-primary)] text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                title="Scan barcode"
              >
                <Barcode className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Barcode</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExternalModalOpen(true)}
                className="px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--surface)] hover:bg-[var(--surface)]/80 text-[var(--text-primary)] text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                title="Online database search"
              >
                <Globe className="w-4 h-4 text-[var(--lime)]" />
                <span>Online database</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddFoodModalOpen(true)}
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-none"
              >
                <Plus className="w-4 h-4" />
                <span>Custom food</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {foodCategories.map((cat) => {
              const isSelected = foodCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFoodCategoryFilter(cat)}
                  className={cn(
                    "px-4 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap",
                    isSelected
                      ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Two-Column Grid: Left Foods Table, Right Side Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Borderless Table inside Surface Card */}
            <div className="lg:col-span-8 rounded-3xl bg-[var(--surface)] p-6 shadow-none overflow-hidden space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  Food items ({filteredFoods.length})
                </h3>
                <span className="text-xs text-[var(--text-muted)] font-tabular">
                  Showing {filteredFoods.length} of {foods.length}
                </span>
              </div>

              {filteredFoods.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                  <Apple className="w-8 h-8 opacity-40 mx-auto" />
                  <p>No food items match your filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[var(--text-muted)] font-normal border-b border-[var(--border)]">
                        <th className="py-2.5 pr-4 font-normal">Food</th>
                        <th className="py-2.5 px-3 font-normal">Category</th>
                        <th className="py-2.5 px-3 font-normal text-right">Calories</th>
                        <th className="py-2.5 px-3 font-normal text-right">Protein</th>
                        <th className="py-2.5 px-3 font-normal text-right">Carbs</th>
                        <th className="py-2.5 px-3 font-normal text-right">Fat</th>
                        <th className="py-2.5 pl-3 text-right font-normal">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredFoods.map((f) => (
                        <tr key={f.id} className="hover:bg-[var(--background)]/50 transition-colors group">
                          <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                            <div className="font-semibold text-[var(--text-primary)]">{f.name}</div>
                            {f.brand && <div className="text-[10px] text-[var(--text-muted)]">{f.brand}</div>}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--background)] text-[10px]">
                              {f.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[var(--text-primary)] font-tabular whitespace-nowrap">
                            {f.caloriesPer100g}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-[var(--text-primary)] font-tabular whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: "var(--macro-protein)" }} />
                            {f.proteinPer100g}g
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-[var(--text-primary)] font-tabular whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: "var(--macro-carbs)" }} />
                            {f.carbsPer100g}g
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-[var(--text-primary)] font-tabular whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: "var(--macro-fat)" }} />
                            {f.fatPer100g}g
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setFoodToEdit(f);
                                  setIsEditFoodModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedFoodDetails(f)}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                                title="Details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFood(f.id)}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Per 100 g note under it */}
              <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                Values shown per 100 g basis unless specified.
              </div>
            </div>

            {/* Right: Side Cards ("You can make now" and "Running low") */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: You can make now */}
              <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-[var(--border)]">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] text-[var(--lime)] flex items-center justify-center shrink-0">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      You can make now
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Based on current pantry stock
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {recipeMatches.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                      Add ingredients to your pantry to see recipe matches.
                    </div>
                  ) : (
                    recipeMatches.slice(0, 4).map((m) => (
                      <Link
                        key={m.recipe.id}
                        href={`/recipes/${m.recipe.id}`}
                        className="p-3 rounded-2xl bg-[var(--background)] hover:bg-[var(--accent-subtle)] transition flex items-center justify-between gap-2 group block"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition">
                            {m.recipe.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-tabular mt-0.5">
                            {Math.round(m.recipe.caloriesPerServing)} kcal · {m.matchPercentage}% available
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition" />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Card 2: Running low */}
              <div className="rounded-3xl bg-[var(--surface)] p-6 space-y-4 shadow-none">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-[var(--border)]">
                  <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs-bg)] text-[var(--macro-carbs)] flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Running low
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Pantry items needing replenishment
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {pantryItems.filter((p) => (Number(p.quantity) || 0) <= 300).length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                      All pantry items are well-stocked!
                    </div>
                  ) : (
                    pantryItems
                      .filter((p) => (Number(p.quantity) || 0) <= 300)
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-[var(--background)] flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-[var(--text-primary)] truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Stock: {item.quantity} {item.unit}
                            </span>
                          </div>
                          <Link
                            href="/shopping-list"
                            className="px-3 py-1 rounded-full bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] text-[10px] font-semibold transition"
                          >
                            + List
                          </Link>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Pantry Inventory (Detailed with Category Sorting & Quick Qty Adjust) */}
      {activeTab === "pantry" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Controls Bar: Search, Category Pills, Sort Selector, Action Buttons */}
          <div className="space-y-4 p-6 sm:p-8 rounded-3xl bg-[var(--surface)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search pantry items..."
                  value={pantrySearch}
                  onChange={(e) => setPantrySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)] transition-colors"
                />
                {pantrySearch && (
                  <button
                    onClick={() => setPantrySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full bg-[var(--background)] text-xs text-[var(--text-primary)] w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                  <select
                    value={pantrySortBy}
                    onChange={(e) => setPantrySortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer w-full"
                  >
                    <option value="category">Sort: By Category</option>
                    <option value="name">Sort: Name (A → Z)</option>
                    <option value="qty-desc">Sort: Quantity (High → Low)</option>
                    <option value="qty-asc">Sort: Quantity (Low → High)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode("pantry");
                    setIsScannerOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-4 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--text-primary)] font-medium text-xs transition cursor-pointer"
                >
                  <Barcode className="w-4 h-4 text-[var(--accent)]" />
                  <span>Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPantryModalOpen(true)}
                  className="flex items-center space-x-1.5 px-5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Pantry</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[var(--border)]">
              <span className="text-[11px] text-[var(--text-secondary)] font-medium mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Category:
              </span>
              {pantryCategories.map((cat) => {
                const isSelected = pantryCategoryFilter === cat;
                const count =
                  cat === "All"
                    ? pantryItems.length
                    : pantryItems.filter((p) => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setPantryCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0",
                      isSelected
                        ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        isSelected
                          ? "bg-black/15 text-[var(--on-accent)]"
                          : "bg-[var(--surface)] text-[var(--text-secondary)]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pantry Cards Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span>
                Showing <strong>{filteredPantryItems.length}</strong> of {pantryItems.length} inventory items
              </span>
              <span>Use +/- to update quantity instantly</span>
            </div>

            {filteredPantryItems.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[var(--surface)] space-y-3">
                <Package className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pantry is empty</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Add items to your pantry manually, scan a barcode, or import a tray from the McDonald&apos;s Jordan menu!
                </p>
                <button
                  onClick={() => setIsAddPantryModalOpen(true)}
                  className="px-5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer"
                >
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredPantryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-[var(--surface)] hover:bg-[var(--surface)]/90 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                            {item.category || "Pantry"}
                          </span>
                          {item.storageLocation && item.storageLocation !== "Pantry" && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                              {item.storageLocation}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePantryItem(item.id)}
                          title="Delete item"
                          className="p-1 text-[var(--text-secondary)] hover:text-red-400 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
                        {item.name}
                      </h4>
                      {item.food && (
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Linked to: {item.food.name} ({item.food.caloriesPer100g} kcal/100g)
                        </p>
                      )}

                      {/* Expiry & Low Stock Badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {item.expiryDate && (() => {
                          const today = new Date().toISOString().slice(0, 10);
                          const isExpired = item.expiryDate < today;
                          const expDate = new Date(item.expiryDate).getTime();
                          const diffDays = Math.round((expDate - Date.now()) / (1000 * 60 * 60 * 24));
                          const isSoon = !isExpired && diffDays <= 3;

                          return (
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-full font-tabular",
                                isExpired
                                  ? "bg-red-500/15 text-red-500"
                                  : isSoon
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-[var(--background)] text-[var(--text-muted)]"
                              )}
                            >
                              {isExpired ? `Expired (${item.expiryDate})` : isSoon ? `Exp in ${diffDays}d` : `Exp: ${item.expiryDate}`}
                            </span>
                          );
                        })()}

                        {(item.isLowStock || (typeof item.lowStockThreshold === "number" && item.quantity <= item.lowStockThreshold)) && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-tabular">
                            Low stock (≤ {item.lowStockThreshold ?? item.quantity} {item.unit})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Adjustment Controls */}
                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                      <div className="text-xs text-[var(--text-secondary)]">Stock:</div>
                      <div className="flex items-center gap-1.5 bg-[var(--background)] rounded-full px-2 py-1">
                        {(item.unit === "g" || item.unit === "ml") && (
                          <button
                            onClick={() => handleUpdatePantryQuantity(item, -50)}
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-secondary)] transition"
                            title="Decrease by 50"
                          >
                            -50
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdatePantryQuantity(item, -1)}
                          className="w-6 h-6 rounded-full bg-[var(--surface)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--text-primary)] transition"
                          title="Decrease by 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs text-[var(--text-primary)] px-1">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => handleUpdatePantryQuantity(item, 1)}
                          className="w-6 h-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] flex items-center justify-center text-[var(--on-accent)] font-bold transition"
                          title="Increase by 1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {(item.unit === "g" || item.unit === "ml") && (
                          <button
                            onClick={() => handleUpdatePantryQuantity(item, 50)}
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] transition"
                            title="Increase by 50"
                          >
                            +50
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: What Can I Make? */}
      {activeTab === "what-can-i-make" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-5 rounded-3xl bg-[var(--surface)] text-xs text-[var(--text-primary)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChefHat className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <span>
                Recipes are automatically matched and ranked based on the ingredients in your pantry inventory.
              </span>
            </div>
            <button
              onClick={fetchWhatCanIMake}
              className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {isLoadingMatches ? (
            <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
              <p>Matching pantry against recipes...</p>
            </div>
          ) : recipeMatches.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[var(--surface)] space-y-2">
              <Package className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">No recipe matches found</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Add recipes to your library and ingredients to your pantry to see availability rankings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipeMatches.map((match) => {
                const r = match.recipe;
                const is100 = match.matchPercentage === 100;

                return (
                  <div
                    key={r.id}
                    className={cn(
                      "p-6 rounded-3xl bg-[var(--surface)] flex flex-col justify-between space-y-3 transition",
                      is100 ? "ring-2 ring-[var(--accent)]" : ""
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/recipes/${r.id}`}
                          className="font-semibold text-base text-[var(--text-primary)] hover:text-[var(--accent)] transition"
                        >
                          {r.name}
                        </Link>
                        <div
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 font-tabular",
                            is100
                              ? "bg-[var(--accent)] text-[var(--on-accent)]"
                              : match.matchPercentage >= 70
                              ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                              : "bg-[var(--background)] text-[var(--text-secondary)]"
                          )}
                        >
                          {match.matchPercentage}% available
                        </div>
                      </div>

                      {/* Macros */}
                      <div className="flex items-center space-x-2 text-xs mt-2">
                        <MacroBadge
                          label="Cal"
                          value={Math.round(r.caloriesPerServing)}
                          type="calories"
                          size="sm"
                        />
                        <MacroBadge
                          label="Pro"
                          value={Math.round(r.proteinPerServing)}
                          unit="g"
                          type="protein"
                          size="sm"
                        />
                      </div>

                      {/* Available vs Missing Ingredients breakdown */}
                      <div className="mt-3 space-y-1 text-xs">
                        {match.availableIngredients.length > 0 && (
                          <div className="text-[var(--accent)] flex items-start space-x-1.5">
                            <span className="font-medium shrink-0">✓ In pantry:</span>
                            <span className="text-[var(--text-secondary)] truncate">
                              {match.availableIngredients.join(", ")}
                            </span>
                          </div>
                        )}
                        {match.missingIngredients.length > 0 && (
                          <div className="text-[var(--ui-error)] flex items-start space-x-1.5">
                            <span className="font-medium shrink-0">✕ Missing:</span>
                            <span className="text-[var(--text-secondary)] truncate">
                              {match.missingIngredients.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)] font-tabular">
                        {match.totalIngredients} total ingredients
                      </span>
                      <Link
                        href={`/recipes/${r.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        <span>View Recipe</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Food Details Inspector */}
      {selectedFoodDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setSelectedFoodDetails(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--background)] text-[var(--accent)]">
                    {selectedFoodDetails.category}
                  </span>
                  {selectedFoodDetails.brand && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                      {selectedFoodDetails.brand}
                    </span>
                  )}
                  {selectedFoodDetails.source === "SCANNED" && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                      Scanned Label
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)] mt-1.5">
                  {selectedFoodDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFoodDetails(null)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--background)] text-xs text-[var(--text-secondary)] space-y-1">
              <div>
                Serving:{" "}
                <strong className="text-[var(--text-primary)]">
                  {selectedFoodDetails.servingSize || 1} {selectedFoodDetails.servingUnit || selectedFoodDetails.defaultUnit || "serving"}
                </strong>{" "}
                ({selectedFoodDetails.servingWeightGrams || 100}g)
              </div>
              <div>
                State: <strong className="text-[var(--text-primary)] capitalize">{selectedFoodDetails.rawOrCooked || "unspecified"}</strong>
              </div>
            </div>

            {/* Hierarchical Nutrition Facts Table */}
            <div className="rounded-2xl p-4 bg-[var(--background)] space-y-2.5">
              <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Nutrition Facts
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {selectedFoodDetails.nutritionBasis === "PER_100G" ? "Per 100g" : "Per Serving"}
                </span>
              </div>

              {/* Calories */}
              <div className="flex items-baseline justify-between py-1 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Calories</span>
                <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                  {selectedFoodDetails.caloriesPerServing ?? selectedFoodDetails.caloriesPer100g} kcal
                </span>
              </div>

              {/* Protein */}
              <div className="flex items-baseline justify-between py-0.5">
                <span className="text-xs font-medium text-[var(--text-primary)]">Protein</span>
                <span className="text-xs font-bold font-mono text-[var(--macro-protein)]">
                  {selectedFoodDetails.proteinPerServing ?? selectedFoodDetails.proteinPer100g}g
                </span>
              </div>

              {/* Carbohydrates & details */}
              <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">Total Carbohydrate</span>
                  <span className="text-xs font-bold font-mono text-[var(--macro-carbs)]">
                    {selectedFoodDetails.carbsPerServing ?? selectedFoodDetails.carbsPer100g}g
                  </span>
                </div>
                <div className="pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-baseline justify-between">
                    <span>Dietary Fiber</span>
                    <span className="font-mono">
                      {(selectedFoodDetails.fiberPerServing ?? selectedFoodDetails.fiberPer100g) !== null && (selectedFoodDetails.fiberPerServing ?? selectedFoodDetails.fiberPer100g) !== undefined
                        ? `${selectedFoodDetails.fiberPerServing ?? selectedFoodDetails.fiberPer100g}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span>Total Sugars</span>
                    <span className="font-mono">
                      {(selectedFoodDetails.totalSugarsPerServing ?? selectedFoodDetails.totalSugarsPer100g) !== null && (selectedFoodDetails.totalSugarsPerServing ?? selectedFoodDetails.totalSugarsPer100g) !== undefined
                        ? `${selectedFoodDetails.totalSugarsPerServing ?? selectedFoodDetails.totalSugarsPer100g}g`
                        : "—"}
                    </span>
                  </div>
                  {(selectedFoodDetails.addedSugarsPerServing ?? selectedFoodDetails.addedSugarsPer100g) !== null && (selectedFoodDetails.addedSugarsPerServing ?? selectedFoodDetails.addedSugarsPer100g) !== undefined && (
                    <div className="flex items-baseline justify-between pl-3 text-[10px]">
                      <span>Includes Added Sugars</span>
                      <span className="font-mono">
                        {selectedFoodDetails.addedSugarsPerServing ?? selectedFoodDetails.addedSugarsPer100g}g
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fat & details */}
              <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">Total Fat</span>
                  <span className="text-xs font-bold font-mono text-[var(--macro-fat)]">
                    {selectedFoodDetails.fatPerServing ?? selectedFoodDetails.fatPer100g}g
                  </span>
                </div>
                <div className="pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-baseline justify-between">
                    <span>Saturated Fat</span>
                    <span className="font-mono">
                      {(selectedFoodDetails.saturatedFatPerServing ?? selectedFoodDetails.saturatedFatPer100g) !== null && (selectedFoodDetails.saturatedFatPerServing ?? selectedFoodDetails.saturatedFatPer100g) !== undefined
                        ? `${selectedFoodDetails.saturatedFatPerServing ?? selectedFoodDetails.saturatedFatPer100g}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span>Trans Fat</span>
                    <span className="font-mono">
                      {(selectedFoodDetails.transFatPerServing ?? selectedFoodDetails.transFatPer100g) !== null && (selectedFoodDetails.transFatPerServing ?? selectedFoodDetails.transFatPer100g) !== undefined
                        ? `${selectedFoodDetails.transFatPerServing ?? selectedFoodDetails.transFatPer100g}g`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sodium */}
              <div className="flex items-baseline justify-between pt-1 border-t border-[var(--border)]">
                <span className="text-xs font-medium text-[var(--text-primary)]">Sodium</span>
                <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                  {(selectedFoodDetails.sodiumPerServing ?? selectedFoodDetails.sodiumPer100g) !== null && (selectedFoodDetails.sodiumPerServing ?? selectedFoodDetails.sodiumPer100g) !== undefined
                    ? `${selectedFoodDetails.sodiumPerServing ?? selectedFoodDetails.sodiumPer100g} mg`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = selectedFoodDetails;
                  setSelectedFoodDetails(null);
                  setFoodToEdit(target);
                  setIsEditFoodModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 min-h-[44px] rounded-full bg-[var(--background)] hover:bg-[var(--border)] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Edit Food</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFoodDetails(null)}
                className="px-5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Multi-Provider Food Search Modal */}
      <UnifiedFoodSearchModal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        initialQuery={foodSearch}
        onFoodImported={() => {
          fetchFoods();
          fetchPantry();
        }}
        onOpenBarcodeScanner={() => {
          setIsExternalModalOpen(false);
          setScannerMode("food");
          setIsScannerOpen(true);
        }}
        onOpenNutritionScanner={() => {
          setIsExternalModalOpen(false);
          setIsNutritionScannerOpen(true);
        }}
        onOpenManualEntry={() => {
          setIsExternalModalOpen(false);
          setIsAddFoodModalOpen(true);
        }}
      />

      {/* Modal: Add Custom Food */}
      {isAddFoodModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsAddFoodModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[var(--surface)] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add Food
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFoodModalOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Entry Mode Switcher */}
            <div className="flex rounded-full bg-[var(--background)] p-1 text-xs">
              <button
                type="button"
                className="flex-1 py-2 min-h-[40px] rounded-full font-semibold bg-[var(--surface)] text-[var(--text-primary)] transition cursor-pointer"
              >
                Create Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddFoodModalOpen(false);
                  setIsNutritionScannerOpen(true);
                }}
                className="flex-1 py-2 min-h-[40px] rounded-full font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Scan Nutrition Label</span>
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-3.5">
              {/* Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Food Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greek Yogurt 0%"
                    value={newFoodName}
                    onChange={(e) => setNewFoodName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Brand (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fage, Chobani"
                    value={newFoodBrand}
                    onChange={(e) => setNewFoodBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Category & State */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newFoodCategory}
                    onChange={(e) => setNewFoodCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="Meat">Meat</option>
                    <option value="Poultry">Poultry</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Produce">Produce</option>
                    <option value="Grains">Grains</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Raw or Cooked
                  </label>
                  <select
                    value={newFoodRawCooked}
                    onChange={(e) => setNewFoodRawCooked(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="raw">Raw</option>
                    <option value="cooked">Cooked</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              {/* Serving basis & unit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Nutrition Basis
                  </label>
                  <select
                    value={newFoodNutritionBasis}
                    onChange={(e) => setNewFoodNutritionBasis(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="PER_SERVING">Per Serving</option>
                    <option value="PER_100G">Per 100g</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Serving Size
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1"
                    value={newFoodServingSize}
                    onChange={(e) => setNewFoodServingSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Serving Unit
                  </label>
                  <input
                    type="text"
                    placeholder="g, bar, scoop"
                    value={newFoodServingUnit}
                    onChange={(e) => setNewFoodServingUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="100"
                    value={newFoodServingWeight}
                    onChange={(e) => setNewFoodServingWeight(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Core Nutrition */}
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Core Nutrition {newFoodNutritionBasis === "PER_SERVING" ? "(Per Serving)" : "(Per 100g)"}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Calories
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={newFoodCalories}
                        onChange={(e) => setNewFoodCalories(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)]"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">kcal</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Protein
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={newFoodProtein}
                        onChange={(e) => setNewFoodProtein(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-protein)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)]"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Carbs
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={newFoodCarbs}
                        onChange={(e) => setNewFoodCarbs(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-carbs)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)]"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Fat
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={newFoodFat}
                        onChange={(e) => setNewFoodFat(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--macro-fat)] font-mono font-bold focus:outline-hidden focus:border-[var(--accent)]"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Nutrition Toggle */}
              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNewFoodAdditional(!showNewFoodAdditional)}
                  className="w-full flex items-center justify-between py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  <span className="uppercase tracking-wider">Additional Nutrition (Fibers, Sugars, Fats, Sodium)</span>
                  {showNewFoodAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showNewFoodAdditional && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Dietary Fiber
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Not specified"
                          value={newFoodFiber}
                          onChange={(e) => setNewFoodFiber(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Total Sugars
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Not specified"
                          value={newFoodTotalSugars}
                          onChange={(e) => setNewFoodTotalSugars(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Added Sugars
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Not specified"
                          value={newFoodAddedSugars}
                          onChange={(e) => setNewFoodAddedSugars(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Saturated Fat
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Not specified"
                          value={newFoodSaturatedFat}
                          onChange={(e) => setNewFoodSaturatedFat(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Trans Fat
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Not specified"
                          value={newFoodTransFat}
                          onChange={(e) => setNewFoodTransFat(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Sodium
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          placeholder="Not specified"
                          value={newFoodSodium}
                          onChange={(e) => setNewFoodSodium(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[var(--text-secondary)]">mg</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddFoodModalOpen(false)}
                  className="px-5 min-h-[44px] rounded-full bg-[var(--background)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  Save Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add to Pantry */}
      {isAddPantryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsAddPantryModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 sm:p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add Pantry Item
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPantryModalOpen(false)}
                className="p-1.5 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePantryItem} className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice"
                  value={pantryName}
                  onChange={(e) => setPantryName(e.target.value)}
                  className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pantryQuantity}
                    onChange={(e) => setPantryQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Unit
                  </label>
                  <select
                    value={pantryUnit}
                    onChange={(e) => setPantryUnit(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="l">Liters (l)</option>
                    <option value="serving">Serving / Item</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Category
                  </label>
                  <select
                    value={pantryCategory}
                    onChange={(e) => setPantryCategory(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="Pantry">Pantry</option>
                    <option value="Produce">Produce</option>
                    <option value="Meat">Meat</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Spices">Spices</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Fast Food">Fast Food</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Storage Location
                  </label>
                  <select
                    value={pantryStorageLocation}
                    onChange={(e) => setPantryStorageLocation(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="Pantry">Pantry</option>
                    <option value="Fridge">Fridge</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Spice Rack">Spice Rack</option>
                    <option value="Countertop">Countertop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={pantryExpiryDate}
                    onChange={(e) => setPantryExpiryDate(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                    Low Stock Alert ({pantryUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 100"
                    value={pantryLowStockThreshold}
                    onChange={(e) => setPantryLowStockThreshold(e.target.value)}
                    className="w-full px-4 py-2.5 min-h-[44px] text-xs rounded-2xl bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1.5 focus:ring-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPantryModalOpen(false)}
                  className="px-5 min-h-[44px] rounded-full bg-[var(--background)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  Add to Pantry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode={scannerMode}
        onProductSelected={(product: any) => {
          if (scannerMode === "food") {
            setNewFoodName(product.name);
            setNewFoodCalories(String(product.caloriesPer100g || 0));
            setNewFoodProtein(String(product.proteinPer100g || 0));
            setNewFoodCarbs(String(product.carbsPer100g || 0));
            setNewFoodFat(String(product.fatPer100g || 0));
            setIsAddFoodModalOpen(true);
          } else if (scannerMode === "pantry") {
            setPantryName(product.name);
            setIsAddPantryModalOpen(true);
          }
        }}
      />

      {/* Edit Food Modal */}
      <EditFoodModal
        isOpen={isEditFoodModalOpen}
        onClose={() => {
          setIsEditFoodModalOpen(false);
          setFoodToEdit(null);
        }}
        onSuccess={() => {
          fetchFoods();
          fetchPantry();
        }}
        food={foodToEdit}
      />

      {/* Nutrition Label Scanner Modal */}
      <NutritionLabelScannerModal
        isOpen={isNutritionScannerOpen}
        onClose={() => setIsNutritionScannerOpen(false)}
        onFoodSaved={(savedFood) => {
          fetchFoods();
          setSelectedFoodDetails(savedFood);
        }}
      />
    </div>
  );
}
