"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Loader2,
  Database,
  Plus,
  Check,
  Globe,
  Apple,
  ExternalLink,
  Barcode,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { NormalizedFood, FoodProviderName } from "@/lib/nutrition/providers/types";
import { MacroBadge } from "@/components/ui/MacroBadge";
import { cn } from "@/lib/utils";

interface UnifiedFoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected?: (food: NormalizedFood) => void;
  onFoodImported?: (food: any) => void;
  onOpenBarcodeScanner?: () => void;
  onOpenNutritionScanner?: () => void;
  onOpenManualEntry?: () => void;
  mode?: "search" | "log"; // "log" enables instant "Save & Log"
  onSaveAndLog?: (food: NormalizedFood, grams: number) => Promise<void>;
  initialQuery?: string;
}

export function UnifiedFoodSearchModal({
  isOpen,
  onClose,
  onFoodSelected,
  onFoodImported,
  onOpenBarcodeScanner,
  onOpenNutritionScanner,
  onOpenManualEntry,
  mode = "search",
  onSaveAndLog,
  initialQuery = "",
}: UnifiedFoodSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sourceFilter, setSourceFilter] = useState<"all" | FoodProviderName>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "packaged" | "generic">("all");
  const [results, setResults] = useState<NormalizedFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected food detail drawer
  const [activeFood, setActiveFood] = useState<NormalizedFood | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Logging portion adjustment in detail drawer
  const [logPortionGrams, setLogPortionGrams] = useState("100");
  const [isLogging, setIsLogging] = useState(false);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute search when debounced query or source filter changes
  useEffect(() => {
    if (!isOpen) return;
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    const executeSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/foods/search?q=${encodeURIComponent(debouncedQuery)}&source=${sourceFilter}`;
        const res = await fetch(url);
        if (!isSubscribed) return;

        if (res.ok) {
          const data: NormalizedFood[] = await res.json();
          setResults(data);
          if (data.length === 0) {
            setError("No foods found matching your query across the databases.");
          }
        } else {
          setError("Failed to search food databases.");
        }
      } catch (err) {
        if (!isSubscribed) return;
        console.error("Unified search error:", err);
        setError("Network error while searching online databases.");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    executeSearch();

    return () => {
      isSubscribed = false;
    };
  }, [debouncedQuery, sourceFilter, isOpen]);

  // Filter by packaged vs generic
  const filteredResults = React.useMemo(() => {
    if (typeFilter === "all") return results;
    if (typeFilter === "packaged") {
      return results.filter((r) => Boolean(r.barcode || r.brand || r.provider === "openfoodfacts"));
    }
    if (typeFilter === "generic") {
      return results.filter((r) => !r.barcode && (!r.brand || r.provider === "usda"));
    }
    return results;
  }, [results, typeFilter]);

  if (!isOpen) return null;

  const handleSelectFood = (food: NormalizedFood) => {
    setActiveFood(food);
    setLogPortionGrams(String(food.servingWeightGrams || 100));
    setImportSuccess(false);
  };

  const handleImportFood = async () => {
    if (!activeFood) return;
    setIsImporting(true);

    try {
      const res = await fetch("/api/foods/external/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeFood),
      });

      if (res.ok) {
        const saved = await res.json();
        setImportSuccess(true);
        if (onFoodImported) onFoodImported(saved);
        if (onFoodSelected) onFoodSelected({ ...activeFood, isLocal: true, id: `local-${saved.id}` });
      } else {
        alert("Failed to import food.");
      }
    } catch (e) {
      console.error(e);
      alert("Error importing food.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveAndLog = async () => {
    if (!activeFood) return;
    setIsLogging(true);

    try {
      const grams = parseFloat(logPortionGrams) || activeFood.servingWeightGrams || 100;
      if (onSaveAndLog) {
        await onSaveAndLog(activeFood, grams);
      } else {
        // Fallback: import to local food then call onFoodSelected
        const res = await fetch("/api/foods/external/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeFood),
        });
        if (res.ok) {
          const saved = await res.json();
          if (onFoodImported) onFoodImported(saved);
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving and logging food.");
    } finally {
      setIsLogging(false);
    }
  };

  const getSourceBadge = (provider: FoodProviderName, availableSources?: FoodProviderName[]) => {
    const sources = availableSources && availableSources.length > 0 ? availableSources : [provider];

    return (
      <div className="flex items-center gap-1">
        {sources.map((src) => {
          switch (src) {
            case "local":
              return (
                <span
                  key={src}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border)]"
                >
                  MealPrep
                </span>
              );
            case "openfoodfacts":
              return (
                <span
                  key={src}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                >
                  Open Food Facts
                </span>
              );
            case "usda":
              return (
                <span
                  key={src}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                >
                  USDA
                </span>
              );
            case "fatsecret":
              return (
                <span
                  key={src}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                >
                  FatSecret
                </span>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[var(--surface)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Search Food Databases
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                MealPrep Local · Open Food Facts · USDA FoodData · FatSecret
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 space-y-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by food name, brand, or barcode..."
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {/* Database source filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {(
                [
                  { id: "all", label: "All Databases" },
                  { id: "local", label: "MealPrep" },
                  { id: "openfoodfacts", label: "Open Food Facts" },
                  { id: "usda", label: "USDA" },
                  { id: "fatsecret", label: "FatSecret" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSourceFilter(tab.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer whitespace-nowrap",
                    sourceFilter === tab.id
                      ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Packaged vs Generic pills */}
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "all", label: "All Types" },
                  { id: "packaged", label: "Packaged" },
                  { id: "generic", label: "Generic" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer",
                    typeFilter === t.id
                      ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[var(--background)]/40 min-h-[300px]">
          {isLoading ? (
            <div className="py-16 space-y-3 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                Searching MealPrep, Open Food Facts, USDA, and FatSecret...
              </p>
            </div>
          ) : error && results.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                <Search className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {error}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Can&apos;t find this food online? Try scanning packaging or entering values manually.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onOpenNutritionScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNutritionScanner();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Scan Label</span>
                  </button>
                )}
                {onOpenBarcodeScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBarcodeScanner();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--background)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <Barcode className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>Scan Barcode</span>
                  </button>
                )}
                {onOpenManualEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManualEntry();
                    }}
                    className="flex items-center space-x-1.5 px-5 min-h-[44px] rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer hover:bg-[var(--accent-hover)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enter Manually</span>
                  </button>
                )}
              </div>
            </div>
          ) : !debouncedQuery ? (
            <div className="py-16 text-center space-y-2 text-xs text-[var(--text-secondary)]">
              <Database className="w-8 h-8 mx-auto text-[var(--accent)]/40 stroke-1" />
              <p className="font-semibold text-[var(--text-primary)]">
                Ready to Search
              </p>
              <p className="max-w-xs mx-auto text-[11px]">
                Type a food, brand, or barcode to search across our local database and global nutrition catalogs.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
              No results matching the selected filters.
            </div>
          ) : (
            filteredResults.map((food) => {
              const isSelected = activeFood?.id === food.id;

              return (
                <div
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left",
                    isSelected
                      ? "bg-[var(--accent-subtle)]/40 border-[var(--accent)] shadow-xs"
                      : "bg-[var(--surface)] hover:bg-[var(--background)] border-[var(--border)]"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate max-w-[280px] sm:max-w-[360px]">
                        {food.name}
                      </span>
                      {getSourceBadge(food.provider, food.availableSources)}
                    </div>

                    {food.brand && (
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Brand: <span className="font-medium text-[var(--text-primary)]">{food.brand}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] flex-wrap">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {food.calories} kcal
                      </span>
                      <span>•</span>
                      <span>{food.protein}g Pro</span>
                      <span>•</span>
                      <span>{food.carbohydrates}g Carb</span>
                      <span>•</span>
                      <span>{food.fat}g Fat</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        ({food.servingSize || food.servingWeightGrams} {food.servingUnit || "g"})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFood(food);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)] text-xs font-medium text-[var(--text-primary)] transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Food Detail Drawer / Footer Panel */}
        {activeFood && (
          <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface)] space-y-4 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {activeFood.name}
                  </h3>
                  {getSourceBadge(activeFood.provider, activeFood.availableSources)}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Serving: {activeFood.servingSize || activeFood.servingWeightGrams} {activeFood.servingUnit || "g"}
                  {activeFood.barcode && ` • Barcode: ${activeFood.barcode}`}
                </p>
              </div>

              <button
                onClick={() => setActiveFood(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hierarchical Nutrition Facts Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Calories</span>
                <p className="font-bold text-sm text-[var(--text-primary)]">{activeFood.calories} kcal</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--macro-protein)] uppercase font-semibold">Protein</span>
                <p className="font-bold text-sm text-[var(--text-primary)]">{activeFood.protein} g</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--macro-carbs)] uppercase font-semibold">Carbs</span>
                <p className="font-bold text-sm text-[var(--text-primary)]">{activeFood.carbohydrates} g</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--macro-fat)] uppercase font-semibold">Fat</span>
                <p className="font-bold text-sm text-[var(--text-primary)]">{activeFood.fat} g</p>
              </div>
            </div>

            {/* Additional details row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-2">
              {activeFood.dietaryFiber !== null && (
                <span>Fiber: <strong className="text-[var(--text-primary)]">{activeFood.dietaryFiber}g</strong></span>
              )}
              {activeFood.totalSugars !== null && (
                <span>Sugars: <strong className="text-[var(--text-primary)]">{activeFood.totalSugars}g</strong></span>
              )}
              {activeFood.addedSugars !== null && (
                <span>Added Sugars: <strong className="text-[var(--text-primary)]">{activeFood.addedSugars}g</strong></span>
              )}
              {activeFood.saturatedFat !== null && (
                <span>Sat. Fat: <strong className="text-[var(--text-primary)]">{activeFood.saturatedFat}g</strong></span>
              )}
              {activeFood.transFat !== null && (
                <span>Trans Fat: <strong className="text-[var(--text-primary)]">{activeFood.transFat}g</strong></span>
              )}
              {activeFood.sodium !== null && (
                <span>Sodium: <strong className="text-[var(--text-primary)]">{activeFood.sodium}mg</strong></span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {/* Portion input for log mode */}
              {mode === "log" && (
                <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                  <span className="text-[var(--text-secondary)] shrink-0 font-medium">Log Portion:</span>
                  <input
                    type="number"
                    value={logPortionGrams}
                    onChange={(e) => setLogPortionGrams(e.target.value)}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                  />
                  <span className="text-[var(--text-secondary)]">{activeFood.servingUnit || "g"}</span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {activeFood.sourceUrl && (
                  <a
                    href={activeFood.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--background)] text-xs transition"
                    title="View original entry"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {!activeFood.isLocal && (
                  <button
                    type="button"
                    disabled={isImporting || importSuccess}
                    onClick={handleImportFood}
                    className={cn(
                      "px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5",
                      importSuccess
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--border)]"
                        : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--background)]"
                    )}
                  >
                    {isImporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : importSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{importSuccess ? "Saved to My Foods" : "Import to My Foods"}</span>
                  </button>
                )}

                {mode === "log" ? (
                  <button
                    type="button"
                    disabled={isLogging}
                    onClick={handleSaveAndLog}
                    className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
                  >
                    {isLogging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save &amp; Log</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onFoodSelected) onFoodSelected(activeFood);
                      onClose();
                    }}
                    className="px-6 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Use Food</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
