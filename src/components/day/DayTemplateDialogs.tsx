"use client";

import React, { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { TextField, fmt } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { fetchDay } from "@/lib/client/day-store";
import { toast } from "@/components/ui/Toast";
import type { DayData, DayTemplate } from "@/lib/domain";
import type { DateString } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Calendar, Check, Copy, Flame, Layers } from "lucide-react";

export function SaveDayTemplateSheet({
  open,
  day,
  onClose,
}: {
  open: boolean;
  day: DayData | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!day || !name.trim()) return;
    if (day.entries.length === 0) {
      toast("No entries to save in this day", { kind: "info" });
      return;
    }
    setBusy(true);
    try {
      await api("/api/day-templates", {
        method: "POST",
        json: {
          name: name.trim(),
          description: description.trim() || null,
          items: day.entries.map((e, idx) => ({
            mealCategory: e.mealCategory,
            foodId: e.foodId,
            recipeId: e.recipeId,
            customName: e.name,
            servings: e.servings,
            calories: e.calories,
            protein: e.protein,
            carbs: e.carbs,
            fat: e.fat,
            fiber: e.fiber,
            sortOrder: idx,
          })),
        },
      });
      toast(`Saved day template “${name.trim()}”`, { kind: "success" });
      setName("");
      setDescription("");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save day template", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save Day as Reusable Template"
      description={day ? `Includes ${day.entries.length} items across all meals` : undefined}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs font-bold"
            onClick={save}
            disabled={busy || !name.trim() || !day?.entries.length}
          >
            {busy ? "Saving…" : "Save Template"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-3"
      >
        <TextField
          label="Template Name"
          placeholder="e.g. High Protein Training Day, Rest Day"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
        />
        <TextField
          label="Description (Optional)"
          placeholder="e.g. 2,400 kcal cutting day"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <div className="rounded-xl bg-surface-2 p-3 text-xs text-fg-2 font-tabular">
          <p className="font-semibold text-fg">Summary:</p>
          <p className="mt-1">
            {fmt.int(day?.totals.calories ?? 0)} kcal · {fmt.g(day?.totals.protein ?? 0)}g P · {fmt.g(day?.totals.carbs ?? 0)}g C · {fmt.g(day?.totals.fat ?? 0)}g F
          </p>
        </div>
      </form>
    </Sheet>
  );
}

export function ApplyDayTemplateSheet({
  open,
  date,
  existingCount,
  onClose,
}: {
  open: boolean;
  date: DateString;
  existingCount: number;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<DayTemplate[]>("/api/day-templates")
      .then((data) => {
        setTemplates(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open, selectedId]);

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const apply = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await api<{ count: number }>(`/api/day-templates/${selectedId}/apply`, {
        method: "POST",
        json: {
          date,
          targetType: "food-log",
          mode,
        },
      });
      await fetchDay(date, true);
      toast(
        mode === "replace"
          ? `Applied “${selectedTemplate?.name}” (Replaced day with ${res.count} items)`
          : `Applied “${selectedTemplate?.name}” (${res.count} items appended)`,
        { kind: "success" }
      );
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't apply template", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Apply Day Template"
      description={`Populate ${date} from a saved whole-day plan`}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={cn("btn text-xs font-bold", mode === "replace" ? "btn-warning" : "btn-primary")}
            onClick={apply}
            disabled={busy || !selectedId || templates.length === 0}
          >
            {busy ? "Applying…" : mode === "replace" ? "Replace Day" : "Append to Day"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="py-6 text-center text-xs text-fg-3">Loading day templates…</p>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-xs text-fg-3 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-fg-3 opacity-50" />
            <p className="font-semibold text-fg">No day templates found</p>
            <p>Log a full day and tap “Save day as template” to create one.</p>
          </div>
        ) : (
          <>
            <div>
              <span className="label">Choose Template</span>
              <div className="divide-y divide-line max-h-56 overflow-y-auto rounded-xl border border-line bg-surface-2/40">
                {templates.map((t) => {
                  const isSel = selectedId === t.id;
                  const cals = t.items.reduce((s, i) => s + i.calories, 0);
                  const pro = Math.round(t.items.reduce((s, i) => s + i.protein, 0) * 10) / 10;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "p-3 flex items-center justify-between gap-2 cursor-pointer transition",
                        isSel ? "bg-[var(--accent-subtle)]" : "hover:bg-surface-2"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-fg truncate">{t.name}</p>
                        {t.description && <p className="text-[11px] text-fg-3 truncate">{t.description}</p>}
                        <p className="text-[10px] text-fg-3 font-tabular mt-0.5">
                          {Math.round(cals)} kcal · {pro}g P · {t.items.length} items
                        </p>
                      </div>
                      {isSel && (
                        <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {existingCount > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs space-y-2">
                <div>
                  <p className="font-semibold text-warning">Notice</p>
                  <p className="text-fg-2">
                    This day currently has <strong>{existingCount}</strong> item{existingCount === 1 ? "" : "s"} logged.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-fg block mb-1">Apply mode:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("append")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left cursor-pointer",
                        mode === "append"
                          ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
                          : "bg-surface-2 text-fg-2 border-line hover:bg-surface-3"
                      )}
                    >
                      Append items
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("replace")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left cursor-pointer",
                        mode === "replace"
                          ? "bg-warning text-white border-transparent"
                          : "bg-surface-2 text-fg-2 border-line hover:bg-surface-3"
                      )}
                    >
                      Replace existing
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
