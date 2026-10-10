"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  Plus,
  Trash2,
  Package,
  Archive,
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

const COMMON_UNITS = ["piece", "g", "kg", "ml", "L", "cup", "tbsp", "tsp", "oz", "lb"];
const COMMON_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Pantry & Dry Goods",
  "Bakery",
  "Frozen",
  "Canned Goods",
  "Condiments & Spices",
  "Beverages",
  "Other",
];

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [subtractPantry, setSubtractPantry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // One-line add item form state
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [category, setCategory] = useState("Produce");
  const [isAdding, setIsAdding] = useState(false);

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

  const [addingToPantryId, setAddingToPantryId] = useState<string | null>(null);
  const [isAddingAllToPantry, setIsAddingAllToPantry] = useState(false);
  const [pantryNotice, setPantryNotice] = useState<string | null>(null);

  const handleAddToPantry = async (item: ShoppingItem) => {
    setAddingToPantryId(item.id);
    try {
      const res = await fetch("/api/shopping-list/add-to-pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isChecked: true } : i))
        );
        setPantryNotice(`Added "${item.name}" to pantry!`);
        setTimeout(() => setPantryNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToPantryId(null);
    }
  };

  const handleAddCheckedToPantry = async () => {
    const checked = items.filter((i) => i.isChecked);
    if (checked.length === 0) return;
    setIsAddingAllToPantry(true);
    try {
      let count = 0;
      for (const item of checked) {
        const res = await fetch("/api/shopping-list/add-to-pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
          }),
        });
        if (res.ok) count++;
      }
      setPantryNotice(`Added ${count} items to pantry!`);
      setTimeout(() => setPantryNotice(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingAllToPantry(false);
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsAdding(true);

    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: Number(qty) || 1,
          unit: unit.trim() || "piece",
          category: category.trim() || "Produce",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setName("");
        setQty("1");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category || "Other"))).sort();

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.isChecked).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] font-normal">
            Groceries & ingredients
          </p>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
            Shopping List
          </h1>
        </div>

        {/* Pantry subtraction pill & clear checked */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubtractPantry(!subtractPantry)}
            className={cn(
              "tap-target px-4 py-2 min-h-[44px] rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-2",
              subtractPantry
                ? "bg-[var(--surface)] text-[var(--text-primary)]"
                : "bg-[var(--surface)] text-[var(--text-muted)] opacity-70"
            )}
          >
            <Package className="w-4 h-4 text-[var(--accent)]" />
            <span>{subtractPantry ? "Subtract pantry: ON" : "Subtract pantry: OFF"}</span>
          </button>

          {completedItems > 0 && (
            <>
              <button
                type="button"
                onClick={handleAddCheckedToPantry}
                disabled={isAddingAllToPantry}
                className="tap-target px-4 py-2 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isAddingAllToPantry ? "Adding..." : `Add to pantry (${completedItems})`}</span>
              </button>
              <button
                type="button"
                onClick={clearCompleted}
                className="tap-target px-4 py-2 min-h-[44px] rounded-full bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--ui-error)] text-xs font-semibold transition cursor-pointer"
              >
                Clear checked
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Pantry Transfer Notice Banner ─── */}
      {pantryNotice && (
        <div className="px-4 py-3 rounded-2xl bg-[var(--accent-subtle)] text-[var(--text-primary)] text-xs font-medium flex items-center gap-2 border border-[var(--accent)]/30">
          <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>{pantryNotice}</span>
        </div>
      )}

      {/* ─── Lime-subtle Progress Card next to One-Line Add-Item Form ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Lime-Subtle Progress Card */}
        <div className="lg:col-span-4 rounded-3xl bg-[var(--accent-subtle)] p-5 space-y-2.5 shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Gathered items
            </span>
            <span className="font-bold text-[var(--accent)] font-tabular">
              {completedItems} / {totalItems} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[var(--surface)] overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full rounded-full bg-[var(--lime)] transition-all duration-300"
            />
          </div>
        </div>

        {/* One-Line Add-Item Form (name, qty, unit, category, Add) */}
        <form
          onSubmit={handleAddItem}
          className="lg:col-span-8 rounded-3xl bg-[var(--surface)] p-3 sm:p-4 grid grid-cols-3 gap-2 sm:flex sm:flex-row sm:items-center shadow-none"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add grocery item..."
            className="input-field col-span-3 flex-2"
            required
          />

          <input
            type="number"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qty"
            inputMode="decimal"
            className="input-field w-full sm:w-20"
          />

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="input-field w-full sm:w-28 text-xs"
          >
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-full sm:w-36 text-xs"
          >
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isAdding || !name.trim()}
            className="col-span-3 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* ─── Categories as Surface Cards in an Auto-Fill Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48 w-full rounded-3xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl bg-[var(--surface)] p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Your shopping list is clear
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Schedule recipes on your Weekly Meal Plan to automatically generate shopping items, or add items using the form above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => (i.category || "Other") === cat);
            const catCompleted = catItems.filter((i) => i.isChecked).length;

            return (
              <div
                key={cat}
                className="rounded-3xl bg-[var(--surface)] p-5 space-y-3 shadow-none flex flex-col justify-between"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                      {cat}
                    </h3>
                    <span className="text-xs text-[var(--text-muted)] font-tabular">
                      {catCompleted}/{catItems.length}
                    </span>
                  </div>

                  {/* Checkbox Rows divided by 1px var(--border) */}
                  <div className="divide-y divide-[var(--border)]">
                    {/* Unchecked first: what's still to buy stays on top while shopping. */}
                    {[...catItems].sort((a, b) => Number(a.isChecked) - Number(b.isChecked)).map((item) => (
                      <div
                        key={item.id}
                        className="py-1 first:pt-0 last:pb-0 flex items-center justify-between gap-2 group"
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={item.isChecked}
                          onClick={() => toggleCheck(item)}
                          className="flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                        >
                          {/* Round pill checkbox */}
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center transition-colors shrink-0",
                              item.isChecked
                                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                                : "bg-[var(--background)] hover:border-[var(--text-primary)]"
                            )}
                          >
                            {item.isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
                            <span
                              className={cn(
                                "block truncate text-sm transition-all sm:text-xs",
                                item.isChecked
                                  ? "line-through text-[var(--text-muted)]"
                                  : "text-[var(--text-primary)] font-medium"
                              )}
                            >
                              {item.name}
                            </span>

                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 tracking-tight",
                                item.isCustom
                                  ? "bg-[var(--surface-active)] text-[var(--text-muted)]"
                                  : "bg-[var(--accent-subtle)] text-[var(--accent)]"
                              )}
                            >
                              {item.isCustom ? "Manual" : "Meal Plan"}
                            </span>
                            <span className="block font-tabular text-xs text-[var(--text-muted)] sm:hidden">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0 sm:gap-2">
                          <span
                            className={cn(
                              "hidden text-xs font-tabular sm:inline",
                              item.isChecked
                                ? "text-[var(--text-muted)]"
                                : "text-[var(--text-secondary)] font-semibold"
                            )}
                          >
                            {item.quantity} {item.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleAddToPantry(item)}
                            disabled={addingToPantryId === item.id}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[var(--background)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer flex items-center gap-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50 tap-target justify-center"
                            title="Add to Pantry"
                            aria-label={`Add ${item.name} to pantry`}
                          >
                            <Archive className="w-3 h-3 text-[var(--accent)]" />
                            <span className="hidden sm:inline">{addingToPantryId === item.id ? "Adding..." : "Pantry"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="tap-target flex items-center justify-center p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--ui-error)] [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition cursor-pointer"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
