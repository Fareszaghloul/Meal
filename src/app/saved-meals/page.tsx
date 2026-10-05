"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Utensils,
  Plus,
  Trash2,
  Copy,
  Pencil,
  Star,
  Flame,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  ArrowRight,
  Sliders,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import { Sheet } from "@/components/ui/Sheet";
import { TextField, Segmented, fmt } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { todayLocal, type DateString } from "@/lib/dates";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory, type SavedMeal, type SavedMealItem } from "@/lib/domain";

export default function SavedMealsPage() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Log modal state
  const [mealToLog, setMealToLog] = useState<SavedMeal | null>(null);
  const [logDate, setLogDate] = useState<DateString>(todayLocal());
  const [logCategory, setLogCategory] = useState<MealCategory>("lunch");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [loggingBusy, setLoggingBusy] = useState(false);

  // Edit / Create modal state
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<MealCategory | "">("lunch");
  const [draftItems, setDraftItems] = useState<
    Array<{
      id?: string;
      name: string;
      quantity: number;
      servingUnit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      foodId?: string | null;
      recipeId?: string | null;
    }>
  >([]);
  const [saveBusy, setSaveBusy] = useState(false);

  // New item sub-form inside edit modal
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("serving");
  const [newItemCal, setNewItemCal] = useState("");
  const [newItemPro, setNewItemPro] = useState("");
  const [newItemCarb, setNewItemCarb] = useState("");
  const [newItemFat, setNewItemFat] = useState("");

  const loadMeals = async () => {
    try {
      setLoading(true);
      const data = await api<SavedMeal[]>("/api/saved-meals");
      setMeals(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load saved meals", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMeals();
  }, []);

  const filteredMeals = useMemo(() => {
    return meals.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "favorite" && m.isFavorite) ||
        m.mealCategory === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [meals, search, categoryFilter]);

  const handleToggleFavorite = async (meal: SavedMeal) => {
    const next = !meal.isFavorite;
    setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, isFavorite: next } : m)));
    try {
      await api(`/api/saved-meals/${meal.id}`, {
        method: "PATCH",
        json: { isFavorite: next },
      });
    } catch {
      setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, isFavorite: meal.isFavorite } : m)));
      toast("Couldn't update favorite", { kind: "error" });
    }
  };

  const handleDuplicate = async (meal: SavedMeal) => {
    try {
      const duplicated = await api<SavedMeal>(`/api/saved-meals/${meal.id}/duplicate`, {
        method: "POST",
      });
      setMeals((prev) => [duplicated, ...prev]);
      toast(`Duplicated “${meal.name}”`, { kind: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to duplicate", { kind: "error" });
    }
  };

  const handleDelete = async (meal: SavedMeal) => {
    if (!confirm(`Delete saved meal “${meal.name}”?`)) return;
    try {
      await api(`/api/saved-meals/${meal.id}`, { method: "DELETE" });
      setMeals((prev) => prev.filter((m) => m.id !== meal.id));
      toast(`Deleted “${meal.name}”`, { kind: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete", { kind: "error" });
    }
  };

  const openLogModal = (meal: SavedMeal) => {
    setMealToLog(meal);
    setLogDate(todayLocal());
    setLogCategory((meal.mealCategory as MealCategory) || "lunch");
    setMultiplier(1);
  };

  const executeLog = async () => {
    if (!mealToLog) return;
    setLoggingBusy(true);
    try {
      await api(`/api/saved-meals/${mealToLog.id}/log`, {
        method: "POST",
        json: {
          date: logDate,
          mealCategory: logCategory,
          multiplier,
        },
      });
      toast(`Logged “${mealToLog.name}” (${multiplier}x) to ${logDate}`, { kind: "success" });
      setMealToLog(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to log meal", { kind: "error" });
    } finally {
      setLoggingBusy(false);
    }
  };

  const openEditModal = (meal: SavedMeal) => {
    setEditingMeal(meal);
    setDraftName(meal.name);
    setDraftCategory(meal.mealCategory || "lunch");
    setDraftItems(
      meal.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        servingUnit: i.servingUnit,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        foodId: i.foodId,
        recipeId: i.recipeId,
      }))
    );
  };

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setDraftName("");
    setDraftCategory("lunch");
    setDraftItems([]);
  };

  const handleAddItemToDraft = () => {
    if (!newItemName.trim()) return;
    setDraftItems((prev) => [
      ...prev,
      {
        name: newItemName.trim(),
        quantity: Number(newItemQty) || 1,
        servingUnit: newItemUnit.trim() || "serving",
        calories: Number(newItemCal) || 0,
        protein: Number(newItemPro) || 0,
        carbs: Number(newItemCarb) || 0,
        fat: Number(newItemFat) || 0,
      },
    ]);
    setNewItemName("");
    setNewItemQty("1");
    setNewItemUnit("serving");
    setNewItemCal("");
    setNewItemPro("");
    setNewItemCarb("");
    setNewItemFat("");
  };

  const handleSaveDraft = async () => {
    if (!draftName.trim() || draftItems.length === 0) {
      toast("Name and at least one item are required", { kind: "info" });
      return;
    }
    setSaveBusy(true);
    try {
      if (editingMeal) {
        const updated = await api<SavedMeal>(`/api/saved-meals/${editingMeal.id}`, {
          method: "PATCH",
          json: {
            name: draftName.trim(),
            mealCategory: draftCategory || null,
            items: draftItems,
          },
        });
        setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMeal(null);
        toast(`Updated “${updated.name}”`, { kind: "success" });
      } else {
        const created = await api<SavedMeal>("/api/saved-meals", {
          method: "POST",
          json: {
            name: draftName.trim(),
            mealCategory: draftCategory || null,
            items: draftItems,
          },
        });
        setMeals((prev) => [created, ...prev]);
        setIsCreateOpen(false);
        toast(`Created “${created.name}”`, { kind: "success" });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save", { kind: "error" });
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/foods"
              className="p-2 rounded-full hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition mr-1"
              aria-label="Back to foods"
            >
              <Utensils className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-sm text-[var(--text-muted)] font-normal">Reusable combinations</p>
              <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
                Saved Meals
              </h1>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Saved Meal</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved meals or ingredients..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
          {[
            { id: "all", label: "All" },
            { id: "favorite", label: "★ Favorites" },
            { id: "breakfast", label: "Breakfast" },
            { id: "lunch", label: "Lunch" },
            { id: "dinner", label: "Dinner" },
            { id: "snack", label: "Snack" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition cursor-pointer",
                categoryFilter === cat.id
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-sm"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Meals Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)]">Loading saved meals...</div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[var(--surface)] p-8 space-y-3">
          <Utensils className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No saved meals found</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Saved meals are reusable combos of items you log regularly (like usual breakfast or post-workout shakes).
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create your first saved meal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeals.map((meal) => {
            const isExpanded = expandedId === meal.id;
            const totalCals = meal.items.reduce((s, i) => s + i.calories, 0);
            const totalPro = Math.round(meal.items.reduce((s, i) => s + i.protein, 0) * 10) / 10;
            const totalCarb = Math.round(meal.items.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
            const totalFat = Math.round(meal.items.reduce((s, i) => s + i.fat, 0) * 10) / 10;

            return (
              <div
                key={meal.id}
                className="rounded-3xl bg-[var(--surface)] p-5 space-y-4 border border-[var(--border)] transition hover:border-[var(--border-hover)]"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(meal)}
                        className={cn(
                          "transition cursor-pointer",
                          meal.isFavorite
                            ? "text-[var(--accent)] fill-current"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                        title={meal.isFavorite ? "Remove favorite" : "Mark favorite"}
                      >
                        <Star className={cn("w-4 h-4", meal.isFavorite && "fill-current")} />
                      </button>
                      <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                        {meal.name}
                      </h3>
                      {meal.mealCategory && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                          {MEAL_LABELS[meal.mealCategory as MealCategory] || meal.mealCategory}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1 font-tabular">
                      {meal.items.length} item{meal.items.length === 1 ? "" : "s"} · used {meal.useCount} time{meal.useCount === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(meal)}
                      className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(meal)}
                      className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(meal)}
                      className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--background)] transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro Strip */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--background)] text-xs font-tabular">
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Calories</span>
                    <strong className="text-[var(--text-primary)] font-bold">{Math.round(totalCals)} kcal</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Protein</span>
                    <strong className="text-[var(--text-primary)]">{totalPro}g</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Carbs</span>
                    <strong className="text-[var(--text-primary)]">{totalCarb}g</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Fat</span>
                    <strong className="text-[var(--text-primary)]">{totalFat}g</strong>
                  </div>
                </div>

                {/* Items Preview / Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : meal.id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition py-1 cursor-pointer"
                  >
                    <span>{isExpanded ? "Hide items" : `View items (${meal.items.length})`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 divide-y divide-[var(--border)] rounded-2xl bg-[var(--background)] p-3 text-xs">
                      {meal.items.map((it, idx) => (
                        <div key={it.id || idx} className="py-2 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-[var(--text-primary)]">{it.name}</span>
                            <span className="text-[var(--text-muted)] text-[11px] ml-1.5 font-tabular">
                              {it.quantity} {it.servingUnit}
                            </span>
                          </div>
                          <span className="text-[var(--text-muted)] font-tabular shrink-0 text-[11px]">
                            {Math.round(it.calories)} kcal · {Math.round(it.protein)}g P
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Button: Log */}
                <button
                  type="button"
                  onClick={() => openLogModal(meal)}
                  className="w-full py-2.5 rounded-full bg-[var(--lime)] hover:bg-[var(--accent-hover)] text-[var(--on-lime)] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Log this meal</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Log Saved Meal Modal ─── */}
      <Sheet
        open={Boolean(mealToLog)}
        onClose={() => setMealToLog(null)}
        title={mealToLog ? `Log “${mealToLog.name}”` : "Log Saved Meal"}
        description="Choose date, meal category, and serving scale"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => setMealToLog(null)}
              disabled={loggingBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs font-bold"
              onClick={executeLog}
              disabled={loggingBusy}
            >
              {loggingBusy ? "Logging..." : `Log Meal (${multiplier}x)`}
            </button>
          </>
        }
      >
        {mealToLog && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="log-date">
                Date
              </label>
              <input
                id="log-date"
                type="date"
                className="input tabular"
                value={logDate}
                onChange={(e) => e.target.value && setLogDate(e.target.value)}
              />
            </div>

            <div>
              <span className="label">Meal Slot</span>
              <Segmented
                value={logCategory}
                onChange={(v) => setLogCategory(v as MealCategory)}
                options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))}
                size="sm"
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="label mb-0">Serving Multiplier</span>
                <span className="text-xs font-bold font-tabular text-[var(--accent)]">{multiplier}x</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 1.25, 1.5, 2].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMultiplier(m)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition border cursor-pointer",
                      multiplier === m
                        ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--line)] hover:bg-[var(--surface-3)]"
                    )}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scaled Preview Summary */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] space-y-1.5 text-xs font-tabular">
              <span className="text-[11px] text-[var(--text-muted)] font-medium">Scaled Nutrition:</span>
              <div className="grid grid-cols-4 gap-1 text-center pt-1">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Calories</span>
                  <strong className="text-fg">
                    {Math.round(mealToLog.items.reduce((s, i) => s + i.calories, 0) * multiplier)} kcal
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Protein</span>
                  <strong className="text-fg">
                    {Math.round(mealToLog.items.reduce((s, i) => s + i.protein, 0) * multiplier * 10) / 10}g
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Carbs</span>
                  <strong className="text-fg">
                    {Math.round(mealToLog.items.reduce((s, i) => s + i.carbs, 0) * multiplier * 10) / 10}g
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Fat</span>
                  <strong className="text-fg">
                    {Math.round(mealToLog.items.reduce((s, i) => s + i.fat, 0) * multiplier * 10) / 10}g
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* ─── Edit / Create Saved Meal Modal ─── */}
      <Sheet
        open={Boolean(editingMeal || isCreateOpen)}
        onClose={() => {
          setEditingMeal(null);
          setIsCreateOpen(false);
        }}
        title={editingMeal ? `Edit “${editingMeal.name}”` : "New Saved Meal"}
        description="Add items and macro values for this reusable meal"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => {
                setEditingMeal(null);
                setIsCreateOpen(false);
              }}
              disabled={saveBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs font-bold"
              onClick={handleSaveDraft}
              disabled={saveBusy || !draftName.trim() || draftItems.length === 0}
            >
              {saveBusy ? "Saving..." : "Save Meal"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Meal Name"
            placeholder="e.g. Usual Breakfast, Post-Workout Shake"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={100}
            autoFocus
          />

          <div>
            <span className="label">Default Meal Category</span>
            <Segmented
              value={draftCategory || "lunch"}
              onChange={(v) => setDraftCategory(v as MealCategory)}
              options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))}
              size="sm"
              className="w-full"
            />
          </div>

          {/* Current Items List */}
          <div className="space-y-2">
            <span className="label">Items ({draftItems.length})</span>
            {draftItems.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">No items added yet.</p>
            ) : (
              <div className="divide-y divide-[var(--border)] rounded-2xl bg-[var(--surface-2)] p-3 text-xs space-y-2">
                {draftItems.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg truncate">{item.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-tabular">
                        {item.quantity} {item.servingUnit} · {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Item Subform */}
          <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 space-y-3">
            <span className="text-xs font-semibold text-fg block">Add Item</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Item name (e.g. Eggs)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="input text-xs sm:col-span-2"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Qty"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="input text-xs w-16 tabular"
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="input text-xs flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="Calories"
                value={newItemCal}
                onChange={(e) => setNewItemCal(e.target.value)}
                className="input text-xs tabular"
              />
              <input
                type="number"
                placeholder="Protein (g)"
                value={newItemPro}
                onChange={(e) => setNewItemPro(e.target.value)}
                className="input text-xs tabular"
              />
              <input
                type="number"
                placeholder="Carbs (g)"
                value={newItemCarb}
                onChange={(e) => setNewItemCarb(e.target.value)}
                className="input text-xs tabular"
              />
              <input
                type="number"
                placeholder="Fat (g)"
                value={newItemFat}
                onChange={(e) => setNewItemFat(e.target.value)}
                className="input text-xs tabular"
              />
            </div>

            <button
              type="button"
              onClick={handleAddItemToDraft}
              disabled={!newItemName.trim()}
              className="px-4 py-1.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition disabled:opacity-50 cursor-pointer"
            >
              + Add item to meal
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
