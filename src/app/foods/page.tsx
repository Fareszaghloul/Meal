"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Apple,
  Package,
  Sparkles,
  Plus,
  Search,
  Trash2,
  ChefHat,
  ArrowRight,
  Globe,
  Barcode,
  Database,
  DownloadCloud,
  Check,
  Loader2,
  Info,
} from "lucide-react";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";

type ActiveTab = "foods" | "pantry" | "what-can-i-make";

export default function FoodsAndPantryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("what-can-i-make");

  // Foods DB state
  const [foods, setFoods] = useState<any[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);

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

  const handleDeletePantryItem = async (id: string) => {
    await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    fetchPantry();
    fetchWhatCanIMake();
  };

  const filteredFoods = foods.filter(
    (f) =>
      f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const filteredExternalResults = externalResults.filter((c) => {
    if (externalSourceFilter === "usda") return c.source === "usda";
    if (externalSourceFilter === "openfoodfacts") return c.source === "openfoodfacts";
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Foods &amp; Pantry
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage your personal ingredient database, track kitchen inventory, and see recipe matches
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs overflow-x-auto max-w-full scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab("what-can-i-make")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation",
              activeTab === "what-can-i-make"
                ? "bg-[var(--surface)] text-[var(--accent)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>What Can I Make?</span>
          </button>
          <button
            onClick={() => setActiveTab("pantry")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation",
              activeTab === "pantry"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Pantry ({pantryItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("foods")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap touch-manipulation",
              activeTab === "foods"
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Foods ({foods.length})</span>
          </button>
        </div>
      </div>

      {/* Tab: "What Can I Make?" (Section 19) */}
      {activeTab === "what-can-i-make" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChefHat className="w-5 h-5 text-[var(--accent)] shrink-0" />
              <span>
                Recipes are ranked by how many of their ingredients you already have in your pantry.
              </span>
            </div>
            <button
              onClick={fetchWhatCanIMake}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Refresh
            </button>
          </div>

          {isLoadingMatches ? (
            <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
              Matching pantry against recipes...
            </div>
          ) : recipeMatches.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
              <Package className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">No recipes or pantry items found</h3>
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
                      is100
                        ? "border-[var(--accent)]"
                        : "border-[var(--border)]"
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

      {/* Tab: Pantry Inventory (Section 18) */}
      {activeTab === "pantry" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Pantry Inventory ({pantryItems.length} items)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setScannerMode("pantry");
                  setIsScannerOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition"
              >
                <Barcode className="w-4 h-4 text-[var(--accent)]" />
                <span>Scan Barcode</span>
              </button>
              <button
                onClick={() => setIsAddPantryModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Pantry</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden shadow-xs">
            {pantryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--background)]/40 transition"
              >
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                    {item.name}
                  </h4>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Category: {item.category}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="font-tabular font-semibold text-sm text-[var(--text-primary)]">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => handleDeletePantryItem(item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Foods Database (Section 10, 11, 12, 39) */}
      {activeTab === "foods" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search local food database..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setScannerMode("food");
                  setIsScannerOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition touch-manipulation"
              >
                <Barcode className="w-4 h-4 text-[var(--accent)]" />
                <span>Scan Barcode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExternalModalOpen(true);
                  if (!externalQuery && foodSearch) {
                    setExternalQuery(foodSearch);
                  }
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs shadow-xs transition touch-manipulation"
              >
                <Globe className="w-4 h-4 text-[var(--accent)]" />
                <span>Search Online</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddFoodModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs transition touch-manipulation"
              >
                <Plus className="w-4 h-4" />
                <span>Custom Food</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden shadow-xs">
            {filteredFoods.map((f) => (
              <div
                key={f.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-[var(--background)]/40 transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {f.name}
                    </span>
                    {f.rawOrCooked && f.rawOrCooked !== "unspecified" && (
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {f.rawOrCooked}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Category: {f.category} • Default Unit: {f.defaultUnit}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <MacroBadge
                      label="Cal"
                      value={f.caloriesPer100g}
                      type="calories"
                      size="sm"
                    />
                    <MacroBadge
                      label="Pro"
                      value={f.proteinPer100g}
                      unit="g"
                      type="protein"
                      size="sm"
                    />
                    <MacroBadge
                      label="Carb"
                      value={f.carbsPer100g}
                      unit="g"
                      type="carbs"
                      size="sm"
                    />
                    <MacroBadge
                      label="Fat"
                      value={f.fatPer100g}
                      unit="g"
                      type="fat"
                      size="sm"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteFood(f.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
                  Search whole ingredients via <strong>USDA FoodData Central</strong> and packaged goods or barcodes via <strong>Open Food Facts</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExternalModalOpen(false)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
              >
                ✕
              </button>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchExternal} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Chicken breast raw, brown rice, oats, or barcode (UPC)..."
                  value={externalQuery}
                  onChange={(e) => setExternalQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                  <p>Type an ingredient or barcode above to find nutrition data per 100g.</p>
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
                          {candidate.barcode && (
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                              UPC: {candidate.barcode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                          <span>{candidate.category}</span>
                          <span>•</span>
                          <span className="font-tabular">Serving: {candidate.servingWeightGrams}{candidate.defaultUnit}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {/* Nutrition per 100g */}
                        <div className="grid grid-cols-4 gap-1 text-center">
                          <MacroBadge
                            label="Cal"
                            value={candidate.caloriesPer100g}
                            type="calories"
                            size="sm"
                          />
                          <MacroBadge
                            label="Pro"
                            value={candidate.proteinPer100g}
                            unit="g"
                            type="protein"
                            size="sm"
                          />
                          <MacroBadge
                            label="Carb"
                            value={candidate.carbsPer100g}
                            unit="g"
                            type="carbs"
                            size="sm"
                          />
                          <MacroBadge
                            label="Fat"
                            value={candidate.fatPer100g}
                            unit="g"
                            type="fat"
                            size="sm"
                          />
                        </div>

                        {/* Import Button */}
                        <button
                          type="button"
                          disabled={isImported || isImporting}
                          onClick={() => handleImportCandidate(candidate)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition shadow-xs",
                            isImported
                              ? "bg-[var(--accent-subtle)] text-[var(--accent)] cursor-default"
                              : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
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
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Manual Fallback */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
              <span className="text-[var(--text-secondary)]">
                Selected foods are saved locally in SQLite and work offline.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsExternalModalOpen(false);
                  setIsAddFoodModalOpen(true);
                }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Can&apos;t find it? Enter manually →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Food (Manual Entry) */}
      {isAddFoodModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsAddFoodModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Create New Food (Manual)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFoodModalOpen(false)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateFood} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Food Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Turkey 93/7"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newFoodCategory}
                    onChange={(e) => setNewFoodCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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
                    State (Raw / Cooked)
                  </label>
                  <select
                    value={newFoodRawCooked}
                    onChange={(e) => setNewFoodRawCooked(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="raw">Raw</option>
                    <option value="cooked">Cooked</option>
                    <option value="dry">Dry</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Nutrition per 100g
                </span>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="Calories"
                    value={newFoodCalories}
                    onChange={(e) => setNewFoodCalories(e.target.value)}
                    className="px-2 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Protein"
                    value={newFoodProtein}
                    onChange={(e) => setNewFoodProtein(e.target.value)}
                    className="px-2 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Carbs"
                    value={newFoodCarbs}
                    onChange={(e) => setNewFoodCarbs(e.target.value)}
                    className="px-2 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Fat"
                    value={newFoodFat}
                    onChange={(e) => setNewFoodFat(e.target.value)}
                    className="px-2 py-1.5 text-xs font-tabular rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddFoodModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition"
                >
                  Create Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Pantry Item */}
      {isAddPantryModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsAddPantryModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Add Item to Pantry Inventory
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPantryModalOpen(false)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePantryItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Olive Oil, Rolled Oats"
                  value={pantryName}
                  onChange={(e) => setPantryName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Quantity In Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pantryQuantity}
                    onChange={(e) => setPantryQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold font-tabular rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Unit
                  </label>
                  <select
                    value={pantryUnit}
                    onChange={(e) => setPantryUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="l">Liters (l)</option>
                    <option value="piece">Pieces</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Category
                </label>
                <select
                  value={pantryCategory}
                  onChange={(e) => setPantryCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value="Grains">Grains / Carbs</option>
                  <option value="Pantry">Pantry / Oil / Spices</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Meat">Meat / Poultry</option>
                  <option value="Produce">Produce</option>
                  <option value="Frozen">Frozen</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPantryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition"
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
        onSuccess={() => {
          fetchFoods();
          fetchPantry();
        }}
      />
    </div>
  );
}

