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
  ChevronRight,
  Sparkles,
  Flame,
  Dna,
  Wheat,
  Droplet,
  Layers,
  ArrowUpDown,
  ExternalLink,
  PackagePlus,
  X,
} from "lucide-react";
import menuData from "@/data/mcdonalds-jordan-menu.json";
import { cn } from "@/lib/utils";

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
}

interface SelectedItem {
  item: MenuItem;
  quantity: number;
}

interface McDonaldsCalculatorProps {
  onImportSuccess?: () => void;
}

export function McDonaldsCalculator({ onImportSuccess }: McDonaldsCalculatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "cal-desc" | "cal-asc" | "protein-desc">("name");

  // Selected tray items map: itemId -> quantity
  const [tray, setTray] = useState<Map<string, SelectedItem>>(new Map());

  // Modal for single item detail view
  const [inspectingItem, setInspectingItem] = useState<MenuItem | null>(null);

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

  // Tray management
  const addItem = (item: MenuItem) => {
    setTray((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { item, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, { item, quantity: 1 });
      }
      return next;
    });
  };

  const removeItem = (itemId: string) => {
    setTray((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing && existing.quantity > 1) {
        next.set(itemId, { item: existing.item, quantity: existing.quantity - 1 });
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const deleteFromTray = (itemId: string) => {
    setTray((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const clearTray = () => {
    setTray(new Map());
  };

  // Live cumulative nutrition calculations
  const trayList = useMemo(() => Array.from(tray.values()), [tray]);

  const totals = useMemo(() => {
    return trayList.reduce(
      (acc, { item, quantity }) => {
        acc.calories += (item.calories || 0) * quantity;
        acc.protein += (item.protein || 0) * quantity;
        acc.carbs += (item.carbs || 0) * quantity;
        acc.fat += (item.fat || 0) * quantity;
        acc.saturatedFat += (item.saturatedFat || 0) * quantity;
        acc.transFat += (item.transFat || 0) * quantity;
        acc.cholesterolMg += (item.cholesterolMg || 0) * quantity;
        acc.sodiumMg += (item.sodiumMg || 0) * quantity;
        acc.fiber += (item.fiber || 0) * quantity;
        acc.sugar += (item.sugar || 0) * quantity;
        acc.totalWeight += (item.servingSize || 100) * quantity;
        acc.itemCount += quantity;
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
  }, [trayList]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Bulk import selected items into user's Foods DB
  const importSelectedToFoods = async () => {
    if (trayList.length === 0) return;
    setIsImportingSelected(true);
    try {
      const itemsToImport = trayList.map(({ item }) => ({
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
    if (trayList.length === 0) return;
    setIsAddingToPantry(true);
    try {
      const itemsToPantry = trayList.map(({ item, quantity }) => ({
        name: item.name,
        quantity,
        unit: "serving",
        category: "Fast Food",
      }));

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
              Official McDonald&apos;s Jordan Nutrition Calculator
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              McDonald&apos;s Jordan Menu & Live Tray
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Select and deselect items to calculate real-time cumulative nutrition totals — just like the official McDonald&apos;s Jordan calculator. Import any single item, your custom meal tray, or the entire 79-item Jordanian catalog directly into your Foods DB.
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
        <div className="lg:col-span-8 space-y-6">
          {/* Controls: Search, Sort, Category Pills */}
          <div className="space-y-4 bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Big Mac, McChicken, Fries, Latte, Nuggets..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const inTray = tray.get(item.id);
              const qty = inTray ? inTray.quantity : 0;

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
                      onClick={() => setInspectingItem(item)}
                      title="View Ingredients & Nutrition Details"
                      className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center: Image & Title */}
                  <div
                    onClick={() => addItem(item)}
                    className="cursor-pointer flex flex-col items-center text-center group-hover:scale-[1.02] transition-transform duration-200"
                  >
                    <div className="relative w-32 h-28 my-1 flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
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

                  {/* Bottom: Select / Deselect Quantity Controls */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem(item)}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-white/5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Tray</span>
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-1">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-amber-400 px-2 font-mono">
                          {qty} in tray
                        </span>
                        <button
                          onClick={() => addItem(item)}
                          className="p-1 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-colors"
                          title="Add another"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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

        {/* Right Column: Live Nutrition Tray Calculator (Sticky) */}
        <div className="lg:col-span-4 sticky top-6 space-y-5">
          <div className="rounded-3xl border border-amber-500/20 bg-zinc-900/90 backdrop-blur-xl shadow-2xl p-5 sm:p-6 space-y-6">
            {/* Tray Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Nutrition Tray</h3>
                  <p className="text-xs text-zinc-400">
                    {totals.itemCount === 1 ? "1 item" : `${totals.itemCount} items`} selected
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
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Big Cumulative Calories Display */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-red-500/10 to-zinc-900 border border-amber-500/20 p-4 text-center relative overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Total Calories
              </div>
              <div className="text-4xl font-extrabold text-zinc-100 font-mono tracking-tight my-1">
                {Math.round(totals.calories)}
                <span className="text-sm font-normal text-zinc-400 ml-1.5 font-sans">kcal</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Total serving weight: <span className="font-mono text-zinc-300">{Math.round(totals.totalWeight)}g</span>
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

            {/* Extended Nutritional Details (Sodium, Sugar, Fiber, Cholesterol, Saturated Fat) */}
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
              <div className="flex justify-between py-1 text-zinc-400">
                <span>Cholesterol</span>
                <span className="text-zinc-200 font-mono">{Math.round(totals.cholesterolMg)}mg</span>
              </div>
            </div>

            {/* Selected Items List in Tray */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-semibold text-zinc-300">Selected Items:</div>

              {trayList.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic bg-zinc-800/30 rounded-2xl border border-dashed border-white/5">
                  No items in tray yet. Click &ldquo;+ Add to Tray&rdquo; on any item to calculate live totals!
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                  {trayList.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-800/60 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 object-contain shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {item.calories * quantity} kcal ({item.calories} ea)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-5 h-5 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold font-mono text-zinc-100">
                          {quantity}
                        </span>
                        <button
                          onClick={() => addItem(item)}
                          className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-zinc-950 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteFromTray(item.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 ml-1 transition-colors"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons: Import Selected */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <button
                onClick={importSelectedToFoods}
                disabled={trayList.length === 0 || isImportingSelected}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isImportingSelected
                    ? "Importing..."
                    : `Import Tray to My Foods (${trayList.length} unique)`}
                </span>
              </button>

              <button
                onClick={addSelectedToPantry}
                disabled={trayList.length === 0 || isAddingToPantry}
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

      {/* Item Nutrition Details Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setInspectingItem(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80"
            >
              <X className="w-4 h-4" />
            </button>

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
                  Serving Size: {inspectingItem.servingSize}g
                </p>
              </div>
            </div>

            {inspectingItem.brief && (
              <p className="text-xs text-zinc-300 bg-zinc-800/50 p-3 rounded-xl border border-white/5 leading-relaxed">
                {inspectingItem.brief}
              </p>
            )}

            {/* Complete Nutrition Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Nutrition Facts
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-zinc-800/60 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Calories</div>
                  <div className="font-bold text-amber-400 font-mono text-sm">
                    {inspectingItem.calories} kcal
                  </div>
                </div>
                <div className="p-2 bg-zinc-800/60 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Protein</div>
                  <div className="font-bold text-emerald-400 font-mono text-sm">
                    {inspectingItem.protein}g
                  </div>
                </div>
                <div className="p-2 bg-zinc-800/60 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Carbohydrates</div>
                  <div className="font-bold text-sky-400 font-mono text-sm">
                    {inspectingItem.carbs}g
                  </div>
                </div>
                <div className="p-2 bg-zinc-800/60 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Total Fat</div>
                  <div className="font-bold text-rose-400 font-mono text-sm">
                    {inspectingItem.fat}g
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Sat Fat</span>
                  <span className="font-mono">{inspectingItem.saturatedFat || 0}g</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Sugar</span>
                  <span className="font-mono">{inspectingItem.sugar || 0}g</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Fiber</span>
                  <span className="font-mono">{inspectingItem.fiber || 0}g</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Sodium</span>
                  <span className="font-mono">{inspectingItem.sodiumMg || 0}mg</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Cholesterol</span>
                  <span className="font-mono">{inspectingItem.cholesterolMg || 0}mg</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/40 rounded-lg text-zinc-300">
                  <span className="text-zinc-500">Trans Fat</span>
                  <span className="font-mono">{inspectingItem.transFat || 0}g</span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {inspectingItem.ingredients && inspectingItem.ingredients.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Official Ingredients
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {inspectingItem.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-white/5"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  addItem(inspectingItem);
                  setInspectingItem(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Nutrition Tray</span>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/foods/bulk-import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      items: [
                        {
                          name: inspectingItem.name,
                          category: `McDonald's: ${inspectingItem.category}`,
                          rawOrCooked: "cooked",
                          calories: inspectingItem.calories,
                          protein: inspectingItem.protein,
                          carbs: inspectingItem.carbs,
                          fat: inspectingItem.fat,
                          fiber: inspectingItem.fiber || 0,
                          servingSize: inspectingItem.servingSize,
                        },
                      ],
                    }),
                  });
                  showToast(`Imported ${inspectingItem.name} to My Foods!`);
                  onImportSuccess?.();
                  setInspectingItem(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Import to Foods DB</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
