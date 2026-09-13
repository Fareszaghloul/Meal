"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Check,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isChecked: boolean;
  isCustom: boolean;
  pantryQuantity?: number;
  neededBeforePantry?: number;
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [subtractPantry, setSubtractPantry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Add Custom Item modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customUnit, setCustomUnit] = useState("piece");
  const [customCategory, setCustomCategory] = useState("Produce");

  const fetchShoppingList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/shopping-list?subtractPantry=${subtractPantry}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShoppingList();
  }, [subtractPantry]);

  const toggleCheck = async (item: ShoppingItem) => {
    const nextState = !item.isChecked;
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isChecked: nextState } : i))
    );

    try {
      await fetch("/api/shopping-list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isChecked: nextState }),
      });
    } catch {
      // Revert if error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isChecked: item.isChecked } : i))
      );
    }
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/shopping-list?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const clearCompleted = async () => {
    setItems((prev) => prev.filter((i) => !i.isChecked));
    try {
      await fetch("/api/shopping-list?clearCompleted=true", { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName,
          quantity: Number(customQty) || 1,
          unit: customUnit,
          category: customCategory,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setIsAddModalOpen(false);
        setCustomName("");
        setCustomQty("1");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category || "Other"))).sort();

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.isChecked).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Shopping List
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Aggregated automatically from your weekly meal plan
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
          {completedItems > 0 && (
            <button
              onClick={clearCompleted}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--ui-error)] hover:border-[var(--ui-error-border)] transition"
            >
              Clear Checked ({completedItems})
            </button>
          )}
        </div>
      </div>

      {/* Pantry Subtraction Controls & Progress Bar */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pantry Subtraction Toggle (Section 18) */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setSubtractPantry(!subtractPantry)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                subtractPantry ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  subtractPantry ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            <div>
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center">
                <Package className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                Subtract Pantry Inventory
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {subtractPantry
                  ? "Items in your pantry are automatically deducted from required quantities."
                  : "Showing gross required quantities without pantry deduction."}
              </p>
            </div>
          </div>

          <Link
            href="/foods"
            className="text-xs font-medium text-[var(--accent)] hover:underline shrink-0"
          >
            Manage Pantry Stock →
          </Link>
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[var(--text-secondary)]">
                {completedItems} of {totalItems} items checked
              </span>
              <span className="text-[var(--accent)] font-semibold font-tabular">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Shopping Categories & Items */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
          Loading grocery list...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-3">
          <ShoppingCart className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mx-auto" />
          <h3 className="font-semibold text-base text-[var(--text-primary)]">
            Your shopping list is empty
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {subtractPantry
              ? "Either you have no meals planned for the week, or all needed ingredients are already fully covered by your pantry inventory!"
              : "Plan meals in the Weekly Planner to auto-generate your grocery shopping list."}
          </p>
          <div className="pt-2">
            <Link
              href="/meal-plan"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs shadow-xs"
            >
              <span>Go to Meal Planner</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => (i.category || "Other") === cat);
            const isCollapsed = collapsedCategories[cat] || false;

            return (
              <div
                key={cat}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategoryCollapse(cat)}
                  className="w-full flex items-center justify-between p-4 bg-[var(--background)] hover:bg-[var(--background)]/80 transition text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {cat}
                    </span>
                    <span className="text-xs font-tabular text-[var(--text-secondary)]">
                      ({catItems.length})
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>

                {/* Items in Category */}
                {!isCollapsed && (
                  <div className="divide-y divide-[var(--border)]">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-3.5 transition",
                          item.isChecked
                            ? "bg-[var(--background)]/40 opacity-60"
                            : "hover:bg-[var(--background)]/30"
                        )}
                      >
                        <div
                          onClick={() => toggleCheck(item)}
                          className="flex items-center space-x-3 flex-1 cursor-pointer select-none"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition",
                              item.isChecked
                                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                                : "border-[var(--border)] bg-[var(--surface)]"
                            )}
                          >
                            {item.isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div>
                            <span
                              className={cn(
                                "text-sm font-medium text-[var(--text-primary)]",
                                item.isChecked && "line-through text-[var(--text-secondary)]"
                              )}
                            >
                              {item.name}
                            </span>
                            {item.pantryQuantity && item.pantryQuantity > 0 ? (
                              <div className="text-[11px] text-[var(--accent)] font-tabular">
                                Pantry deducted: {item.pantryQuantity} (needed {item.neededBeforePantry})
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span
                            className={cn(
                              "font-tabular font-semibold text-xs text-[var(--text-primary)]",
                              item.isChecked && "line-through text-[var(--text-secondary)]"
                            )}
                          >
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              Add Custom Shopping Item
            </h3>

            <form onSubmit={handleAddCustomItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sparkling water, Aluminum foil"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                    Unit
                  </label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="piece">piece</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="pack">pack</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value="Produce">Produce / Veggies</option>
                  <option value="Meat">Meat</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Carbs">Carbs / Grains</option>
                  <option value="Pantry">Pantry / Oil</option>
                  <option value="Sauces & Spices">Sauces & Spices</option>
                  <option value="Frozen">Frozen</option>
                  <option value="Household">Household</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs transition"
                >
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
