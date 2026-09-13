"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Download,
  ShoppingBag,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Dna,
  Wheat,
  Droplet,
  ArrowUpDown,
  ExternalLink,
  PackagePlus,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import menuData from "@/data/mcdonalds-jordan-menu.json";
import { cn } from "@/lib/utils";

interface IngredientNutrient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodiumMg: number;
}

interface MenuItem {
  id: string;
  name: string;
  cleanName: string;
  category: string;
  image: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterolMg?: number;
  sodiumMg?: number;
  fiber?: number;
  sugar?: number;
  brief: string;
  ingredients: string[];
  customizableIngredients?: IngredientNutrient[];
}

interface TrayItem {
  instanceId: string;
  item: MenuItem;
  quantity: number;
  removedIngredients: string[];
}

interface McDonaldsCalculatorProps {
  onImportSuccess?: () => void;
}

// Helper to compute individual customized item nutrition based on removed ingredients
function getCustomItemNutrition(item: MenuItem, removedIngredients: string[]) {
  const customizable = item.customizableIngredients || [];
  let subCal = 0;
  let subPro = 0;
  let subCarb = 0;
  let subFat = 0;
  let subSodium = 0;

  for (const rem of removedIngredients) {
    const ing = customizable.find((i) => i.name === rem);
    if (ing) {
      subCal += ing.calories || 0;
      subPro += ing.protein || 0;
      subCarb += ing.carbs || 0;
      subFat += ing.fat || 0;
      subSodium += ing.sodiumMg || 0;
    }
  }

  return {
    calories: Math.max(0, Math.round(item.calories - subCal)),
    protein: Math.max(0, Math.round((item.protein - subPro) * 10) / 10),
    carbs: Math.max(0, Math.round((item.carbs - subCarb) * 10) / 10),
    fat: Math.max(0, Math.round((item.fat - subFat) * 10) / 10),
    saturatedFat: Math.max(0, Math.round(((item.saturatedFat || 0) - subFat * 0.4) * 10) / 10),
    sodiumMg: Math.max(0, Math.round((item.sodiumMg || 0) - subSodium)),
    cholesterolMg: item.cholesterolMg || 0,
    fiber: item.fiber || 0,
    sugar: item.sugar || 0,
    servingSize: item.servingSize || 100,
  };
}

export function McDonaldsCalculator({ onImportSuccess }: McDonaldsCalculatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "cal-desc" | "cal-asc" | "protein-desc">("name");

  // Tray items list
  const [trayItems, setTrayItems] = useState<TrayItem[]>([]);

  // Expanded items in the tray to view/modify ingredients
  const [expandedTrayInstances, setExpandedTrayInstances] = useState<Set<string>>(new Set());

  // Modal for single item detail & customization
  const [inspectingItem, setInspectingItem] = useState<MenuItem | null>(null);
  const [modalRemovedIngredients, setModalRemovedIngredients] = useState<string[]>([]);

  // Loading & toast states
  const [isImportingSelected, setIsImportingSelected] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [isAddingToPantry, setIsAddingToPantry] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    return ["All", ...menuData.categories.map((c) => c.name)];
  }, []);

  const filteredItems = useMemo(() => {
    let items = (menuData.items as MenuItem[]);

    if (selectedCategory !== "All") {
      items = items.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.cleanName.toLowerCase().includes(q) ||
          i.brief.toLowerCase().includes(q) ||
          i.ingredients.some((ing) => ing.toLowerCase().includes(q))
      );
    }

    return [...items].sort((a, b) => {
      if (sortBy === "name") return a.cleanName.localeCompare(b.cleanName);
      if (sortBy === "cal-desc") return b.calories - a.calories;
      if (sortBy === "cal-asc") return a.calories - b.calories;
      if (sortBy === "protein-desc") return b.protein - a.protein;
      return 0;
    });
  }, [selectedCategory, searchQuery, sortBy]);

  // Add standard item to tray (default all ingredients included)
  const addItemToTray = (item: MenuItem, removed: string[] = []) => {
    // Generate signature to group identical items with identical ingredient customizations
    const signature = `${item.id}-${[...removed].sort().join("|")}`;

    setTrayItems((prev) => {
      const existingIdx = prev.findIndex((ti) => ti.instanceId === signature);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          instanceId: signature,
          item,
          quantity: 1,
          removedIngredients: [...removed],
        },
      ];
    });

    // Auto-expand ingredient customizer for first item
    setExpandedTrayInstances((prev) => new Set([...prev, signature]));
  };

  // Adjust quantity
  const updateQuantity = (instanceId: string, delta: number) => {
    setTrayItems((prev) => {
      return prev
        .map((ti) => {
          if (ti.instanceId === instanceId) {
            const newQty = ti.quantity + delta;
            return newQty > 0 ? { ...ti, quantity: newQty } : null;
          }
          return ti;
        })
        .filter(Boolean) as TrayItem[];
    });
  };

  const removeTrayItem = (instanceId: string) => {
    setTrayItems((prev) => prev.filter((ti) => ti.instanceId !== instanceId));
  };

  const clearTray = () => {
    setTrayItems([]);
  };

  // Toggle ingredient removal within a tray item
  const toggleTrayIngredient = (instanceId: string, ingredientName: string) => {
    setTrayItems((prev) => {
      return prev.map((ti) => {
        if (ti.instanceId !== instanceId) return ti;

        const isCurrentlyRemoved = ti.removedIngredients.includes(ingredientName);
        const nextRemoved = isCurrentlyRemoved
          ? ti.removedIngredients.filter((n) => n !== ingredientName)
          : [...ti.removedIngredients, ingredientName];

        return {
          ...ti,
          removedIngredients: nextRemoved,
        };
      });
    });
  };

  // Toggle accordion expand
  const toggleExpand = (instanceId: string) => {
    setExpandedTrayInstances((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  };

  // Compute live cumulative totals across the entire tray
  const totals = useMemo(() => {
    return trayItems.reduce(
      (acc, ti) => {
        const customNut = getCustomItemNutrition(ti.item, ti.removedIngredients);
        acc.calories += customNut.calories * ti.quantity;
        acc.protein += customNut.protein * ti.quantity;
        acc.carbs += customNut.carbs * ti.quantity;
        acc.fat += customNut.fat * ti.quantity;
        acc.saturatedFat += customNut.saturatedFat * ti.quantity;
        acc.transFat += (ti.item.transFat || 0) * ti.quantity;
        acc.cholesterolMg += customNut.cholesterolMg * ti.quantity;
        acc.sodiumMg += customNut.sodiumMg * ti.quantity;
        acc.fiber += customNut.fiber * ti.quantity;
        acc.sugar += customNut.sugar * ti.quantity;
        acc.totalWeight += customNut.servingSize * ti.quantity;
        acc.itemCount += ti.quantity;
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        saturatedFat: 0,
        transFat: 0,
        cholesterolMg: 0,
        sodiumMg: 0,
        fiber: 0,
        sugar: 0,
        totalWeight: 0,
        itemCount: 0,
      }
    );
  }, [trayItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Format custom item name if ingredients were subtracted
  const formatItemDisplayName = (item: MenuItem, removed: string[]) => {
    if (!removed || removed.length === 0) return item.name;
    const cleanRemoved = removed.map((r) => r.replace(/\s*\([^)]*\)/g, "").trim());
    return `${item.name} (No ${cleanRemoved.join(", No ")})`;
  };

  // Bulk import selected items into user's Foods DB with custom nutrition
  const importSelectedToFoods = async () => {
    if (trayItems.length === 0) return;
    setIsImportingSelected(true);
    try {
      const itemsToImport = trayItems.map((ti) => {
        const nut = getCustomItemNutrition(ti.item, ti.removedIngredients);
        const displayName = formatItemDisplayName(ti.item, ti.removedIngredients);
        return {
          name: displayName,
          category: `McDonald's: ${ti.item.category}`,
          rawOrCooked: "cooked",
          calories: nut.calories,
          protein: nut.protein,
          carbs: nut.carbs,
          fat: nut.fat,
          fiber: nut.fiber,
          servingSize: nut.servingSize,
          servingUnit: ti.item.servingUnit || "g",
        };
      });

      const res = await fetch("/api/foods/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToImport }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Imported ${data.importedCount} items into your Foods DB! (${data.skippedCount} already existed)`);
        onImportSuccess?.();
      } else {
        showToast(data.error || "Failed to import items");
      }
    } catch (e) {
      console.error(e);
      showToast("Error importing items");
    } finally {
      setIsImportingSelected(false);
    }
  };

  // Add selected items to active Pantry Inventory
  const addSelectedToPantry = async () => {
    if (trayItems.length === 0) return;
    setIsAddingToPantry(true);
    try {
      const itemsToPantry = trayItems.map((ti) => {
        const displayName = formatItemDisplayName(ti.item, ti.removedIngredients);
        return {
          name: displayName,
          quantity: ti.quantity,
          unit: "serving",
          category: "Fast Food",
        };
      });

      const res = await fetch("/api/pantry/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToPantry }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Added ${data.addedCount} items to your Pantry inventory!`);
        onImportSuccess?.();
      } else {
        showToast(data.error || "Failed to add items to pantry");
      }
    } catch (e) {
      console.error(e);
      showToast("Error adding items to pantry");
    } finally {
      setIsAddingToPantry(false);
    }
  };

  // Bulk import ENTIRE Jordanian McDonald's Catalog (all 79 items)
  const importAllMenu = async () => {
    if (!confirm(`Import all ${menuData.items.length} McDonald's Jordan menu items into your personal Foods database?`)) {
      return;
    }
    setIsImportingAll(true);
    try {
      const itemsToImport = (menuData.items as MenuItem[]).map((item) => ({
        name: item.name,
        category: `McDonald's: ${item.category}`,
        rawOrCooked: "cooked",
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber || 0,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit || "g",
      }));

      const res = await fetch("/api/foods/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToImport }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Imported ${data.importedCount} McDonald's items into your Foods DB! (${data.skippedCount} already existed)`);
        onImportSuccess?.();
      } else {
        showToast(data.error || "Failed to import all menu items");
      }
    } catch (e) {
      console.error(e);
      showToast("Error importing menu catalog");
    } finally {
      setIsImportingAll(false);
    }
  };

  // Open inspection modal with fresh removed ingredients set
  const handleOpenInspectModal = (item: MenuItem) => {
    setInspectingItem(item);
    setModalRemovedIngredients([]);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-red-500/5 to-zinc-900/50 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Official McDonald&apos;s Jordan Interactive Nutrition Calculator
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              Live Meal Tray &amp; Ingredient Customizer
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Select or deselect items, and <strong>add or remove specific ingredients</strong> (cheese, pickles, sauce, patties, buns) to watch calories, protein, carbs, and fat automatically recalculate and subtract in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={importAllMenu}
              disabled={isImportingAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-medium text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isImportingAll ? "Importing All 79..." : "Import Entire Menu (79 items)"}
            </button>
            <a
              href="https://www.mcdonalds.com.jo/En/NutritionCalculator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
            >
              <span>Original Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Products List & Live Tray Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Menu Items & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Controls: Search, Sort, Category Pills */}
          <div className="space-y-4 bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Big Mac, Grand Chicken, Fries, Latte, McFlurry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="relative min-w-[170px]">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-sm text-zinc-200">
                  <ArrowUpDown className="w-4 h-4 text-zinc-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="name" className="bg-zinc-900 text-zinc-200">Sort: Name (A-Z)</option>
                    <option value="cal-desc" className="bg-zinc-900 text-zinc-200">Calories: High to Low</option>
                    <option value="cal-asc" className="bg-zinc-900 text-zinc-200">Calories: Low to High</option>
                    <option value="protein-desc" className="bg-zinc-900 text-zinc-200">Protein: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category horizontal scrolling pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
              {categories.map((cat) => {
                const count =
                  cat === "All"
                    ? menuData.items.length
                    : menuData.categories.find((c) => c.name === cat)?.itemCount || 0;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                      isSelected
                        ? "bg-amber-500 text-zinc-950 font-semibold shadow-md shadow-amber-500/20"
                        : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        isSelected
                          ? "bg-zinc-950/20 text-zinc-950 font-bold"
                          : "bg-zinc-700/50 text-zinc-400"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const trayMatch = trayItems.find((ti) => ti.item.id === item.id);
              const qty = trayMatch ? trayMatch.quantity : 0;
              const ingCount = item.customizableIngredients?.length || item.ingredients?.length || 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4",
                    qty > 0
                      ? "bg-zinc-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                      : "bg-zinc-900/50 hover:bg-zinc-900/80 border-white/5 hover:border-white/15"
                  )}
                >
                  {/* Top: Category Tag & Inspection Button */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold tracking-wider text-amber-400/90 uppercase bg-amber-400/10 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <button
                      onClick={() => handleOpenInspectModal(item)}
                      title="View Ingredients & Nutrition Details"
                      className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{ingCount} Ingr.</span>
                    </button>
                  </div>

                  {/* Center: Image & Title */}
                  <div
                    onClick={() => addItemToTray(item)}
                    className="cursor-pointer flex flex-col items-center text-center group-hover:scale-[1.02] transition-transform duration-200"
                  >
                    <div className="relative w-28 h-24 my-1 flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                          🍔
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-zinc-100 line-clamp-1 mt-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {item.servingSize}g serving
                    </p>
                  </div>

                  {/* Macro Highlights */}
                  <div className="grid grid-cols-4 gap-1.5 my-3 pt-2.5 border-t border-white/5 text-center">
                    <div className="bg-zinc-800/50 rounded-lg py-1 px-1">
                      <div className="text-[10px] text-zinc-500">Cal</div>
                      <div className="text-xs font-semibold text-amber-400 font-mono">
                        {item.calories}
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg py-1 px-1">
                      <div className="text-[10px] text-zinc-500">Protein</div>
                      <div className="text-xs font-semibold text-emerald-400 font-mono">
                        {item.protein}g
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg py-1 px-1">
                      <div className="text-[10px] text-zinc-500">Carbs</div>
                      <div className="text-xs font-semibold text-sky-400 font-mono">
                        {item.carbs}g
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg py-1 px-1">
                      <div className="text-[10px] text-zinc-500">Fat</div>
                      <div className="text-xs font-semibold text-rose-400 font-mono">
                        {item.fat}g
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Select / Deselect Controls & Customize Trigger */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => addItemToTray(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-white/5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{qty > 0 ? `Add Another (${qty})` : "Add to Tray"}</span>
                    </button>
                    <button
                      onClick={() => handleOpenInspectModal(item)}
                      title="Customize ingredients before adding"
                      className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-white/5 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-white/5">
              <p className="text-zinc-400 text-sm">No items found matching your filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="mt-3 text-xs text-amber-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Nutrition Tray Calculator with Ingredient Subtraction */}
        <div className="lg:col-span-5 sticky top-6 space-y-5">
          <div className="rounded-3xl border border-amber-500/20 bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-5 sm:p-6 space-y-6">
            {/* Tray Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Live Nutrition Tray</h3>
                  <p className="text-xs text-zinc-400">
                    {totals.itemCount === 1 ? "1 item" : `${totals.itemCount} items`} • With auto-subtract
                  </p>
                </div>
              </div>

              {totals.itemCount > 0 && (
                <button
                  onClick={clearTray}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  title="Clear all selected items"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Tray</span>
                </button>
              )}
            </div>

            {/* Big Cumulative Calories Display */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-red-500/10 to-zinc-900 border border-amber-500/20 p-4 text-center relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Total Tray Calories
              </div>
              <div className="text-4xl font-extrabold text-zinc-100 font-mono tracking-tight my-1">
                {Math.round(totals.calories)}
                <span className="text-sm font-normal text-zinc-400 ml-1.5 font-sans">kcal</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Total weight: <span className="font-mono text-zinc-300">{Math.round(totals.totalWeight)}g</span>
              </div>
            </div>

            {/* Macro Summary Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-white/5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-medium mb-0.5">
                  <Dna className="w-3 h-3" />
                  <span>Protein</span>
                </div>
                <div className="text-lg font-bold text-zinc-100 font-mono">
                  {Math.round(totals.protein * 10) / 10}g
                </div>
              </div>

              <div className="bg-zinc-800/60 rounded-xl p-3 border border-white/5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-sky-400 font-medium mb-0.5">
                  <Wheat className="w-3 h-3" />
                  <span>Carbs</span>
                </div>
                <div className="text-lg font-bold text-zinc-100 font-mono">
                  {Math.round(totals.carbs * 10) / 10}g
                </div>
              </div>

              <div className="bg-zinc-800/60 rounded-xl p-3 border border-white/5 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium mb-0.5">
                  <Droplet className="w-3 h-3" />
                  <span>Fat</span>
                </div>
                <div className="text-lg font-bold text-zinc-100 font-mono">
                  {Math.round(totals.fat * 10) / 10}g
                </div>
              </div>
            </div>

            {/* Micro Details (Saturated Fat, Sugar, Fiber, Sodium, Cholesterol) */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Saturated Fat</span>
                <span className="text-zinc-200 font-mono">{Math.round(totals.saturatedFat * 10) / 10}g</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Sugars</span>
                <span className="text-zinc-200 font-mono">{Math.round(totals.sugar * 10) / 10}g</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Dietary Fiber</span>
                <span className="text-zinc-200 font-mono">{Math.round(totals.fiber * 10) / 10}g</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-400">
                <span>Sodium</span>
                <span className="text-zinc-200 font-mono">{Math.round(totals.sodiumMg)}mg</span>
              </div>
            </div>

            {/* Selected Items List with Interactive Ingredient Subtraction */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span>Tray Items &amp; Ingredients:</span>
                <span className="text-[11px] text-amber-400 font-normal">Click ✕ to subtract ingredient</span>
              </div>

              {trayItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic bg-zinc-800/30 rounded-2xl border border-dashed border-white/5">
                  No items in tray yet. Click &ldquo;+ Add to Tray&rdquo; on any item to calculate live totals!
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                  {trayItems.map((ti) => {
                    const customNut = getCustomItemNutrition(ti.item, ti.removedIngredients);
                    const isExpanded = expandedTrayInstances.has(ti.instanceId);
                    const ingredientsList = ti.item.customizableIngredients || [];
                    const hasRemoved = ti.removedIngredients.length > 0;

                    return (
                      <div
                        key={ti.instanceId}
                        className={cn(
                          "rounded-2xl border transition-all p-3 space-y-2.5",
                          hasRemoved
                            ? "bg-zinc-800/70 border-amber-500/30 ring-1 ring-amber-500/20"
                            : "bg-zinc-800/50 border-white/5"
                        )}
                      >
                        {/* Top: Item Title, Qty, & Macros */}
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {ti.item.image && (
                              <img
                                src={ti.item.image}
                                alt={ti.item.name}
                                className="w-8 h-8 object-contain shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-zinc-100 truncate flex items-center gap-1.5">
                                <span>{ti.item.name}</span>
                                {hasRemoved && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                                    Customized
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-amber-400 font-mono">
                                <strong>{customNut.calories * ti.quantity} kcal</strong>
                                <span className="text-zinc-500 text-[10px] ml-1">
                                  ({customNut.calories} kcal ea • P: {customNut.protein}g • C: {customNut.carbs}g • F: {customNut.fat}g)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Controls: Quantity & Remove */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(ti.instanceId, -1)}
                              className="w-5 h-5 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 text-xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-bold font-mono text-xs text-zinc-100">
                              {ti.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(ti.instanceId, 1)}
                              className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-zinc-950 font-bold text-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeTrayItem(ti.instanceId)}
                              className="p-1 text-zinc-500 hover:text-red-400 ml-1 transition-colors"
                              title="Delete from tray"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Ingredients Breakdown & Removal Chips */}
                        {ingredientsList.length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleExpand(ti.instanceId)}
                                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium"
                              >
                                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                                <span>Customize Ingredients ({ingredientsList.length})</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {hasRemoved && (
                                <button
                                  onClick={() => {
                                    setTrayItems((prev) =>
                                      prev.map((t) => (t.instanceId === ti.instanceId ? { ...t, removedIngredients: [] } : t))
                                    );
                                  }}
                                  className="text-[10px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
                                  title="Restore all ingredients"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>

                            {/* Ingredient pills: Click to subtract/add */}
                            {isExpanded && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {ingredientsList.map((ing) => {
                                  const isRemoved = ti.removedIngredients.includes(ing.name);

                                  return (
                                    <button
                                      key={ing.name}
                                      onClick={() => toggleTrayIngredient(ti.instanceId, ing.name)}
                                      className={cn(
                                        "px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 border",
                                        isRemoved
                                          ? "bg-red-500/10 border-red-500/30 text-red-400 line-through hover:bg-red-500/20"
                                          : "bg-zinc-800/80 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white"
                                      )}
                                      title={isRemoved ? `Click to add ${ing.name} back (+${ing.calories} kcal)` : `Click to remove ${ing.name} (-${ing.calories} kcal)`}
                                    >
                                      {isRemoved ? (
                                        <>
                                          <Plus className="w-3 h-3 text-emerald-400 shrink-0" />
                                          <span>No {ing.name}</span>
                                          <span className="text-[9px] text-red-400 font-mono">(-{ing.calories})</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                          <span>{ing.name}</span>
                                          <span className="text-[9px] text-zinc-500 font-mono">({ing.calories} kcal)</span>
                                          <span className="w-3.5 h-3.5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-400 hover:text-red-400 ml-0.5">
                                            ✕
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons: Import Selected */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <button
                onClick={importSelectedToFoods}
                disabled={trayItems.length === 0 || isImportingSelected}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isImportingSelected
                    ? "Importing..."
                    : `Import Tray to My Foods (${trayItems.length} items)`}
                </span>
              </button>

              <button
                onClick={addSelectedToPantry}
                disabled={trayItems.length === 0 || isAddingToPantry}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-98 disabled:opacity-40"
              >
                <PackagePlus className="w-4 h-4 text-amber-400" />
                <span>
                  {isAddingToPantry ? "Adding..." : "Add Tray to Active Pantry"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Nutrition Details & Pre-Customization Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectingItem(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center p-2 shrink-0">
                {inspectingItem.image ? (
                  <img
                    src={inspectingItem.image}
                    alt={inspectingItem.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span>🍔</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  {inspectingItem.category}
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1">
                  {inspectingItem.name}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Base Serving Size: {inspectingItem.servingSize}g
                </p>
              </div>
            </div>

            {/* Live Adjusted Nutrition Preview based on Modal Removed Ingredients */}
            {(() => {
              const modalNut = getCustomItemNutrition(inspectingItem, modalRemovedIngredients);
              const hasModalRemoved = modalRemovedIngredients.length > 0;

              return (
                <div className="space-y-4">
                  {/* Macros Preview */}
                  <div className="rounded-2xl bg-zinc-800/60 p-4 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Calculated Nutrition:</span>
                      {hasModalRemoved && (
                        <span className="text-amber-400 font-medium">
                          ({modalRemovedIngredients.length} ingredient{modalRemovedIngredients.length > 1 ? "s" : ""} subtracted)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-zinc-900/60 rounded-xl">
                        <div className="text-[10px] text-zinc-400">Calories</div>
                        <div className="font-bold text-amber-400 font-mono text-sm">
                          {modalNut.calories} kcal
                        </div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 rounded-xl">
                        <div className="text-[10px] text-zinc-400">Protein</div>
                        <div className="font-bold text-emerald-400 font-mono text-sm">
                          {modalNut.protein}g
                        </div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 rounded-xl">
                        <div className="text-[10px] text-zinc-400">Carbs</div>
                        <div className="font-bold text-sky-400 font-mono text-sm">
                          {modalNut.carbs}g
                        </div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 rounded-xl">
                        <div className="text-[10px] text-zinc-400">Fat</div>
                        <div className="font-bold text-rose-400 font-mono text-sm">
                          {modalNut.fat}g
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Checklist with Instant Subtraction */}
                  {inspectingItem.customizableIngredients && inspectingItem.customizableIngredients.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Ingredients (Click to remove/add):
                        </h4>
                        {hasModalRemoved && (
                          <button
                            onClick={() => setModalRemovedIngredients([])}
                            className="text-[11px] text-amber-400 hover:underline"
                          >
                            Reset All
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {inspectingItem.customizableIngredients.map((ing) => {
                          const isRemoved = modalRemovedIngredients.includes(ing.name);

                          return (
                            <button
                              key={ing.name}
                              onClick={() => {
                                setModalRemovedIngredients((prev) =>
                                  isRemoved ? prev.filter((n) => n !== ing.name) : [...prev, ing.name]
                                );
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all text-left",
                                isRemoved
                                  ? "bg-red-500/10 border-red-500/30 text-red-400 line-through"
                                  : "bg-zinc-800/80 hover:bg-zinc-800 border-white/5 text-zinc-200"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold",
                                    isRemoved ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                  )}
                                >
                                  {isRemoved ? "✕" : "✓"}
                                </span>
                                <span>{ing.name}</span>
                              </div>

                              <span className="text-[11px] font-mono text-zinc-400">
                                {isRemoved ? `-${ing.calories} kcal` : `${ing.calories} kcal`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product Description */}
                  {inspectingItem.brief && (
                    <p className="text-xs text-zinc-300 bg-zinc-800/40 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {inspectingItem.brief}
                    </p>
                  )}

                  {/* Modal Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => {
                        addItemToTray(inspectingItem, modalRemovedIngredients);
                        setInspectingItem(null);
                        showToast(`Added ${formatItemDisplayName(inspectingItem, modalRemovedIngredients)} to your tray!`);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Tray ({modalNut.calories} kcal)</span>
                    </button>
                    <button
                      onClick={async () => {
                        const displayName = formatItemDisplayName(inspectingItem, modalRemovedIngredients);
                        await fetch("/api/foods/bulk-import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: [
                              {
                                name: displayName,
                                category: `McDonald's: ${inspectingItem.category}`,
                                rawOrCooked: "cooked",
                                calories: modalNut.calories,
                                protein: modalNut.protein,
                                carbs: modalNut.carbs,
                                fat: modalNut.fat,
                                fiber: modalNut.fiber,
                                servingSize: modalNut.servingSize,
                              },
                            ],
                          }),
                        });
                        showToast(`Imported "${displayName}" to My Foods!`);
                        onImportSuccess?.();
                        setInspectingItem(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Direct Import</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
