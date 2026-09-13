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
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import { McDonaldsCalculator } from "@/components/foods/McDonaldsCalculator";
import { EditFoodModal } from "@/components/foods/EditFoodModal";

type ActiveTab = "foods" | "pantry" | "what-can-i-make";

export default function FoodsAndPantryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("foods");

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

  // External Search State (USDA & Open Food Facts)
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState("");
  const [externalSourceFilter, setExternalSourceFilter] = useState<"all" | "usda" | "openfoodfacts">("all");
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [externalError, setExternalError] = useState<string | null>(null);

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
  const [newFoodCategory, setNewFoodCategory] = useState("Meat");
  const [newFoodRawCooked, setNewFoodRawCooked] = useState("raw");
  const [newFoodCalories, setNewFoodCalories] = useState("");
  const [newFoodProtein, setNewFoodProtein] = useState("");
  const [newFoodCarbs, setNewFoodCarbs] = useState("");
  const [newFoodFat, setNewFoodFat] = useState("");
  const [newFoodDefaultUnit, setNewFoodDefaultUnit] = useState("g");
  const [newFoodServingWeight, setNewFoodServingWeight] = useState("100");

  // New Pantry Form State
  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("500");
  const [pantryUnit, setPantryUnit] = useState("g");
  const [pantryCategory, setPantryCategory] = useState("Pantry");
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

  const handleSearchExternal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = externalQuery.trim();
    if (!query) return;

    setIsSearchingExternal(true);
    setExternalError(null);
    try {
      const res = await fetch(`/api/foods/external/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setExternalResults(data);
        if (data.length === 0) {
          setExternalError("No foods found matching your query in USDA or Open Food Facts.");
        }
      } else {
        setExternalError("Failed to fetch external foods. Please check your network or try manual entry.");
      }
    } catch (err) {
      console.error(err);
      setExternalError("Network error while querying external food databases.");
    } finally {
      setIsSearchingExternal(false);
    }
  };

  const handleImportCandidate = async (candidate: any) => {
    setImportingId(candidate.id);
    try {
      const res = await fetch("/api/foods/external/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });

      if (res.ok) {
        setImportedIds((prev) => new Set([...prev, candidate.id]));
        await fetchFoods();
      } else {
        alert("Failed to import food into local database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error importing food.");
    } finally {
      setImportingId(null);
    }
  };

  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName.trim()) return;

    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFoodName,
          category: newFoodCategory,
          rawOrCooked: newFoodRawCooked,
          caloriesPer100g: Number(newFoodCalories) || 0,
          proteinPer100g: Number(newFoodProtein) || 0,
          carbsPer100g: Number(newFoodCarbs) || 0,
          fatPer100g: Number(newFoodFat) || 0,
          defaultUnit: newFoodDefaultUnit,
          servingWeightGrams: Number(newFoodServingWeight) || 100,
        }),
      });

      if (res.ok) {
        setIsAddFoodModalOpen(false);
        setNewFoodName("");
        setNewFoodCalories("");
        setNewFoodProtein("");
        setNewFoodCarbs("");
        setNewFoodFat("");
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
          foodId: selectedFoodId || null,
        }),
      });

      if (res.ok) {
        setIsAddPantryModalOpen(false);
        setPantryName("");
        setPantryQuantity("500");
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

  const filteredExternalResults = externalResults.filter((c) => {
    if (externalSourceFilter === "usda") return c.source === "usda";
    if (externalSourceFilter === "openfoodfacts") return c.source === "openfoodfacts";
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Header & Main Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <span>Foods &amp; Pantry</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--border)]">
              Jordan Menu Included
            </span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Detailed foods database, category sorting, pantry inventory tracker, recipe matcher, and the official McDonald&apos;s Jordan Nutrition Calculator.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-xs overflow-x-auto max-w-full scrollbar-none shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab("foods")}
            className={cn(
              "px-3.5 py-2 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation cursor-pointer",
              activeTab === "foods"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Apple className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Foods ({foods.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pantry")}
            className={cn(
              "px-3.5 py-2 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation cursor-pointer",
              activeTab === "pantry"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Package className="w-3.5 h-3.5 text-[var(--macro-protein)]" />
            <span>Pantry ({pantryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("what-can-i-make")}
            className={cn(
              "px-3.5 py-2 rounded-xl font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation cursor-pointer",
              activeTab === "what-can-i-make"
                ? "bg-[var(--surface)] text-[var(--accent)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--macro-carbs)]" />
            <span>What Can I Make?</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Foods Database (Detailed with Category Sorting & McDonald's) */}
      {activeTab === "foods" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* McDonald's Category Banner & Customizer Toggle */}
          {foodCategoryFilter === "McDonald's" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center text-xl shrink-0">
                  🍔
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                      McDonald&apos;s Jordan Menu &amp; Customizer
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-bold border border-[var(--border)]">
                      Official Jordan Catalog
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Browse menu items or open the interactive nutrition calculator to customize ingredients and subtract/add patties, cheese, and sauces.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMcdCalculator(!showMcdCalculator)}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition shrink-0 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{showMcdCalculator ? "View Food Cards" : "Open Nutrition Calculator & Tray"}</span>
              </button>
            </div>
          )}

          {/* Interactive McDonald's Calculator when toggled */}
          {foodCategoryFilter === "McDonald's" && showMcdCalculator ? (
            <div className="animate-in fade-in duration-300">
              <McDonaldsCalculator
                onImportSuccess={() => {
                  fetchFoods();
                  fetchPantry();
                }}
              />
            </div>
          ) : (
            <>
          {/* Controls Bar: Search, Category Pills, Sort Selector, Action Buttons */}
          <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search foods by name or category..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
                />
                {foodSearch && (
                  <button
                    onClick={() => setFoodSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort by selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                  <select
                    value={foodSortBy}
                    onChange={(e) => setFoodSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer w-full"
                  >
                    <option value="category">Sort: By Category</option>
                    <option value="name-asc">Sort: Name (A → Z)</option>
                    <option value="name-desc">Sort: Name (Z → A)</option>
                    <option value="protein-desc">Sort: Protein (High → Low)</option>
                    <option value="cal-desc">Sort: Calories (High → Low)</option>
                    <option value="cal-asc">Sort: Calories (Low → High)</option>
                    <option value="carbs-desc">Sort: Carbs (High → Low)</option>
                    <option value="fat-desc">Sort: Fat (High → Low)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode("food");
                    setIsScannerOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--background)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition"
                >
                  <Barcode className="w-4 h-4 text-[var(--accent)]" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExternalModalOpen(true);
                    if (!externalQuery && foodSearch) setExternalQuery(foodSearch);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--background)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition"
                >
                  <Globe className="w-4 h-4 text-[var(--accent)]" />
                  <span className="hidden sm:inline">Online DB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddFoodModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Custom Food</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[var(--border)]">
              <span className="text-[11px] text-[var(--text-secondary)] font-medium mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Category:
              </span>
              {foodCategories.map((cat) => {
                const isSelected = foodCategoryFilter === cat;
                const count =
                  cat === "All"
                    ? foods.length
                    : foods.filter((f) => f.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setFoodCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0",
                      isSelected
                        ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        isSelected
                          ? "bg-black/20 text-white"
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

          {/* Foods Cards Grid / List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span>
                Showing <strong>{filteredFoods.length}</strong> of {foods.length} foods
              </span>
              <span>All nutritional metrics shown per 100g</span>
            </div>

            {filteredFoods.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
                <Apple className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">No foods found</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Try adjusting your search query, selecting another category, or importing items from the McDonald&apos;s Jordan menu.
                </p>
                <button
                  onClick={() => {
                    setFoodSearch("");
                    setFoodCategoryFilter("All");
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--accent)] font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredFoods.map((f) => {
                  // Macro calorie percentages: protein (4 kcal/g), carbs (4 kcal/g), fat (9 kcal/g)
                  const pCal = (f.proteinPer100g || 0) * 4;
                  const cCal = (f.carbsPer100g || 0) * 4;
                  const fCal = (f.fatPer100g || 0) * 9;
                  const totalCalcCal = pCal + cCal + fCal || 1;
                  const pPct = Math.round((pCal / totalCalcCal) * 100);
                  const cPct = Math.round((cCal / totalCalcCal) * 100);
                  const fPct = Math.max(0, 100 - pPct - cPct);

                  // Protein density (grams per 100 calories)
                  const pDensity =
                    f.caloriesPer100g > 0
                      ? Math.round(((f.proteinPer100g || 0) / f.caloriesPer100g) * 100 * 10) / 10
                      : 0;

                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div>
                        {/* Top: Category Tag, Raw/Cooked, Action Buttons */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--accent)]">
                              {f.category}
                            </span>
                            {f.rawOrCooked && f.rawOrCooked !== "unspecified" && (
                              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--text-secondary)]">
                                {f.rawOrCooked}
                              </span>
                            )}
                            {pDensity >= 10 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border)]">
                                High Protein
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setFoodToEdit(f);
                                setIsEditFoodModalOpen(true);
                              }}
                              title="Edit food"
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--background)] transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedFoodDetails(f)}
                              title="View detailed nutrition"
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFood(f.id)}
                              title="Delete food"
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Serving info */}
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
                          {f.name}
                        </h4>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">
                          Serving: {f.servingWeightGrams || 100}g {f.defaultUnit !== "g" ? `(${f.defaultUnit})` : ""}
                        </div>
                      </div>

                      {/* Macro Badges Grid */}
                      <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-[var(--border)]">
                        <div className="bg-[var(--background)] rounded-lg py-1 px-1">
                          <div className="text-[10px] text-[var(--text-secondary)]">Calories</div>
                          <div className="text-xs font-bold text-[var(--text-primary)] font-mono">
                            {f.caloriesPer100g}
                          </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-lg py-1 px-1">
                          <div className="text-[10px] text-[var(--text-secondary)]">Protein</div>
                          <div className="text-xs font-bold text-[var(--macro-protein)] font-mono">
                            {f.proteinPer100g}g
                          </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-lg py-1 px-1">
                          <div className="text-[10px] text-[var(--text-secondary)]">Carbs</div>
                          <div className="text-xs font-bold text-[var(--macro-carbs)] font-mono">
                            {f.carbsPer100g}g
                          </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-lg py-1 px-1">
                          <div className="text-[10px] text-[var(--text-secondary)]">Fat</div>
                          <div className="text-xs font-bold text-[var(--macro-fat)] font-mono">
                            {f.fatPer100g}g
                          </div>
                        </div>
                      </div>

                      {/* Macro Ratio Mini Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full rounded-full bg-[var(--background)] overflow-hidden flex">
                          <div
                            style={{ width: `${pPct}%` }}
                            className="bg-[var(--macro-protein)] h-full"
                            title={`Protein: ${pPct}%`}
                          />
                          <div
                            style={{ width: `${cPct}%` }}
                            className="bg-[var(--macro-carbs)] h-full"
                            title={`Carbs: ${cPct}%`}
                          />
                          <div
                            style={{ width: `${fPct}%` }}
                            className="bg-[var(--macro-fat)] h-full"
                            title={`Fat: ${fPct}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-[var(--text-secondary)] font-mono">
                          <span className="text-[var(--macro-protein)]">{pPct}% P</span>
                          <span className="text-[var(--macro-carbs)]">{cPct}% C</span>
                          <span className="text-[var(--macro-fat)]">{fPct}% F</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* TAB 3: Pantry Inventory (Detailed with Category Sorting & Quick Qty Adjust) */}
      {activeTab === "pantry" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Controls Bar: Search, Category Pills, Sort Selector, Action Buttons */}
          <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search pantry items..."
                  value={pantrySearch}
                  onChange={(e) => setPantrySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] w-full sm:w-auto">
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
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--background)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition"
                >
                  <Barcode className="w-4 h-4 text-[var(--accent)]" />
                  <span>Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPantryModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-xs transition"
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
                        ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        isSelected
                          ? "bg-black/20 text-white"
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
              <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
                <Package className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pantry is empty</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Add items to your pantry manually, scan a barcode, or import a tray from the McDonald&apos;s Jordan menu!
                </p>
                <button
                  onClick={() => setIsAddPantryModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-xs shadow-xs"
                >
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredPantryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--accent)]">
                          {item.category || "Pantry"}
                        </span>
                        <button
                          onClick={() => handleDeletePantryItem(item.id)}
                          title="Delete item"
                          className="p-1 text-[var(--text-secondary)] hover:text-red-400 rounded-md transition"
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
                    </div>

                    {/* Quantity Adjustment Controls */}
                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                      <div className="text-xs text-[var(--text-secondary)]">Stock:</div>
                      <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl p-1">
                        <button
                          onClick={() => handleUpdatePantryQuantity(item, -1)}
                          className="w-6 h-6 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--text-primary)] transition"
                          title="Decrease by 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs text-[var(--text-primary)] px-2">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => handleUpdatePantryQuantity(item, 1)}
                          className="w-6 h-6 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] flex items-center justify-center text-white font-bold transition"
                          title="Increase by 1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
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
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <ChefHat className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <span>
                Recipes are automatically matched and ranked based on the ingredients in your pantry inventory.
              </span>
            </div>
            <button
              onClick={fetchWhatCanIMake}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
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
            <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
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
                      "p-5 rounded-2xl border bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-3 transition",
                      is100 ? "border-[var(--accent)]" : "border-[var(--border)]"
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
                              ? "bg-[var(--accent)] text-white"
                              : match.matchPercentage >= 70
                              ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                              : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedFoodDetails(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--background)] text-[var(--accent)]">
                  {selectedFoodDetails.category}
                </span>
                <h3 className="font-bold text-lg text-[var(--text-primary)] mt-1">
                  {selectedFoodDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFoodDetails(null)}
                className="p-1.5 rounded-full bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--background)] text-xs text-[var(--text-secondary)] space-y-1">
              <div>
                Default Serving: <strong className="text-[var(--text-primary)]">{selectedFoodDetails.servingWeightGrams}g</strong> ({selectedFoodDetails.defaultUnit})
              </div>
              <div>
                State: <strong className="text-[var(--text-primary)] capitalize">{selectedFoodDetails.rawOrCooked || "unspecified"}</strong>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Nutritional Values (Per 100g)
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[var(--background)]">
                  <div className="text-[10px] text-[var(--text-secondary)]">Calories</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {selectedFoodDetails.caloriesPer100g}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--background)]">
                  <div className="text-[10px] text-[var(--text-secondary)]">Protein</div>
                  <div className="text-sm font-bold text-[var(--macro-protein)] font-mono">
                    {selectedFoodDetails.proteinPer100g}g
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--background)]">
                  <div className="text-[10px] text-[var(--text-secondary)]">Carbs</div>
                  <div className="text-sm font-bold text-[var(--macro-carbs)] font-mono">
                    {selectedFoodDetails.carbsPer100g}g
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--background)]">
                  <div className="text-[10px] text-[var(--text-secondary)]">Fat</div>
                  <div className="text-sm font-bold text-[var(--macro-fat)] font-mono">
                    {selectedFoodDetails.fatPer100g}g
                  </div>
                </div>
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
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Edit Food</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFoodDetails(null)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: External Food Lookup (USDA & Open Food Facts) */}
      {isExternalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsExternalModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--accent)]" />
                  <span>External Food Lookup</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Search whole ingredients via <strong>USDA FoodData Central</strong> and packaged goods via <strong>Open Food Facts</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExternalModalOpen(false)}
                className="p-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchExternal} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Chicken breast raw, brown rice, oats..."
                  value={externalQuery}
                  onChange={(e) => setExternalQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingExternal || !externalQuery.trim()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
              >
                {isSearchingExternal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {/* Source Filter Tags */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Source:</span>
              <button
                type="button"
                onClick={() => setExternalSourceFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition font-medium",
                  externalSourceFilter === "all"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                )}
              >
                All Sources
              </button>
              <button
                type="button"
                onClick={() => setExternalSourceFilter("usda")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition font-medium",
                  externalSourceFilter === "usda"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                )}
              >
                USDA (Whole / Raw)
              </button>
              <button
                type="button"
                onClick={() => setExternalSourceFilter("openfoodfacts")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition font-medium",
                  externalSourceFilter === "openfoodfacts"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                )}
              >
                Open Food Facts (Branded)
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl bg-[var(--background)]/30 p-2">
              {isSearchingExternal ? (
                <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
                  <p>Querying USDA FoodData Central and Open Food Facts...</p>
                </div>
              ) : externalError ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <Info className="w-5 h-5 mx-auto text-[var(--text-secondary)]" />
                  <p>{externalError}</p>
                </div>
              ) : filteredExternalResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-1">
                  <p className="font-medium text-[var(--text-primary)]">Ready to search</p>
                  <p>Type an ingredient above to find nutrition data per 100g.</p>
                </div>
              ) : (
                filteredExternalResults.map((candidate) => {
                  const isImported = importedIds.has(candidate.id);
                  const isImporting = importingId === candidate.id;

                  return (
                    <div
                      key={candidate.id}
                      className="pt-2 pb-2 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
                            {candidate.name}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                              candidate.source === "usda"
                                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                                : "bg-[#E6EEF5] text-[#4C6E8C] dark:bg-[#1A2633] dark:text-[#8BB4D9]"
                            )}
                          >
                            {candidate.source === "usda" ? "USDA" : "Open Food Facts"}
                          </span>
                          {candidate.rawOrCooked && candidate.rawOrCooked !== "unspecified" && (
                            <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                              {candidate.rawOrCooked}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)]">
                          <span>{candidate.caloriesPer100g} kcal</span>
                          <span>•</span>
                          <span>{candidate.proteinPer100g}g Pro</span>
                          <span>•</span>
                          <span>{candidate.carbsPer100g}g Carb</span>
                          <span>•</span>
                          <span>{candidate.fatPer100g}g Fat</span>
                          <span>(per 100g)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isImported || isImporting}
                        onClick={() => handleImportCandidate(candidate)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl font-medium text-xs flex items-center justify-center space-x-1 transition shrink-0",
                          isImported
                            ? "bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] cursor-default"
                            : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs"
                        )}
                      >
                        {isImporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isImported ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Imported</span>
                          </>
                        ) : (
                          <>
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span>Import</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Food */}
      {isAddFoodModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsAddFoodModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add Custom Food (Per 100g)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFoodModalOpen(false)}
                className="p-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-2">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Calories / 100g
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newFoodCalories}
                    onChange={(e) => setNewFoodCalories(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Protein / 100g (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newFoodProtein}
                    onChange={(e) => setNewFoodProtein(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Carbs / 100g (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newFoodCarbs}
                    onChange={(e) => setNewFoodCarbs(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Fat / 100g (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newFoodFat}
                    onChange={(e) => setNewFoodFat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddFoodModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--accent-hover)] transition"
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
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add Pantry Item
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPantryModalOpen(false)}
                className="p-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePantryItem} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice"
                  value={pantryName}
                  onChange={(e) => setPantryName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pantryQuantity}
                    onChange={(e) => setPantryQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Unit
                  </label>
                  <select
                    value={pantryUnit}
                    onChange={(e) => setPantryUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="l">Liters (l)</option>
                    <option value="serving">Serving / Item</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={pantryCategory}
                  onChange={(e) => setPantryCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPantryModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--accent-hover)] transition"
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
    </div>
  );
}
