"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented, TextField } from "@/components/ui/primitives";
import { MEAL_CATEGORIES, MEAL_LABELS, type MealCategory, type MealItem } from "@/lib/domain";
import { api } from "@/lib/client/api";
import { copyEntries } from "@/lib/client/day-store";
import { invalidateCatalog } from "@/lib/client/catalog";
import { toast } from "@/components/ui/Toast";
import { addDays, type DateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function SaveTemplateSheet({ entries, category, onClose }: { entries: MealItem[] | null; category: MealCategory; onClose: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const open = !!entries;
  const save = async () => {
    if (!entries || !name.trim()) return;
    setBusy(true);
    try {
      await api("/api/templates", {
        method: "POST",
        json: {
          name: name.trim(),
          items: entries.map(({ name, servings, servingUnit, foodId, recipeId, calories, protein, carbs, fat, fiber, totalSugars, addedSugars, saturatedFat, transFat, sodium }) => ({
            name, servings, servingUnit, foodId, recipeId, calories, protein, carbs, fat, fiber, totalSugars, addedSugars, saturatedFat, transFat, sodium,
          })),
        },
      });
      invalidateCatalog();
      toast(`Saved “${name.trim()}”. Find it under Saved meals when adding food.`, { kind: "success" });
      setName("");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save meal", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save as meal"
      description={entries ? `${entries.length} item${entries.length === 1 ? "" : "s"} from ${MEAL_LABELS[category]}` : undefined}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !name.trim()}>
            Save
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField label="Name" placeholder="e.g. Usual breakfast" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        <ul className="mt-3 space-y-1 text-xs text-fg-2">{entries?.map((e) => <li key={e.id}>• {e.name}</li>)}</ul>
      </form>
    </Sheet>
  );
}

export function CopyToSheet({ entries, category, fromDate, onClose }: { entries: MealItem[] | null; category: MealCategory; fromDate: DateString; onClose: () => void }) {
  const [date, setDate] = useState<DateString>(addDays(fromDate, 1));
  const [target, setTarget] = useState<MealCategory>(category);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!entries) return;
    setBusy(true);
    try {
      const created = await copyEntries({ fromDate, toDate: date, fromMealCategory: category, toMealCategory: target, entryIds: entries.map((e) => e.id) });
      toast(`Copied ${created.length} item${created.length === 1 ? "" : "s"} to ${MEAL_LABELS[target]} on ${date}`, { kind: "success" });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't copy", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={!!entries}
      onClose={onClose}
      title={`Copy ${MEAL_LABELS[category]}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={go} disabled={busy}>
            Copy {entries?.length ?? 0} item{entries?.length === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="copy-date">
            To date
          </label>
          <input id="copy-date" type="date" className="input tabular" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div>
          <span className="label">Meal</span>
          <Segmented value={target} onChange={setTarget} options={MEAL_CATEGORIES.map((c) => ({ value: c, label: MEAL_LABELS[c] }))} size="sm" className="w-full" />
        </div>
      </div>
    </Sheet>
  );
}

export function CopyDaySheet({
  open,
  toDate,
  existingCount,
  onClose,
}: {
  open: boolean;
  toDate: DateString;
  existingCount: number;
  onClose: () => void;
}) {
  const [fromDate, setFromDate] = useState<DateString>(addDays(toDate, -1));
  const [copyMode, setCopyMode] = useState<"append" | "replace">("append");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const needsConfirm = existingCount > 0 && !confirmed;

  const handleCopy = async () => {
    if (needsConfirm) {
      setConfirmed(true);
      return;
    }
    setBusy(true);
    try {
      const created = await copyEntries({ fromDate, toDate, mode: copyMode });
      if (created.length > 0) {
        toast(
          copyMode === "replace"
            ? `Replaced day with ${created.length} item${created.length === 1 ? "" : "s"} from ${fromDate}`
            : `Copied ${created.length} item${created.length === 1 ? "" : "s"} from ${fromDate}`,
          { kind: "success" }
        );
        onClose();
      } else {
        toast(`No logged items found on ${fromDate}`, { kind: "info" });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't copy day", { kind: "error" });
    } finally {
      setBusy(false);
      setConfirmed(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Copy Day"
      description={`Copy all meals and food entries from another day to ${toDate}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={cn("btn", copyMode === "replace" ? "btn-warning" : "btn-primary")}
            onClick={handleCopy}
            disabled={busy}
          >
            {busy ? "Copying…" : needsConfirm ? `Confirm & ${copyMode === "replace" ? "Replace" : "Append"} on ${toDate}` : "Copy entire day"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="copy-from-date">
            Copy from date
          </label>
          <input
            id="copy-from-date"
            type="date"
            className="input tabular"
            value={fromDate}
            onChange={(e) => {
              if (e.target.value) {
                setFromDate(e.target.value);
                setConfirmed(false);
              }
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm text-xs"
            onClick={() => {
              setFromDate(addDays(toDate, -1));
              setConfirmed(false);
            }}
          >
            Yesterday
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm text-xs"
            onClick={() => {
              setFromDate(addDays(toDate, -7));
              setConfirmed(false);
            }}
          >
            Same day last week
          </button>
        </div>

        {existingCount > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-fg space-y-2">
            <div>
              <p className="font-semibold text-warning">Notice</p>
              <p className="mt-0.5 text-fg-2">
                This day already has <strong>{existingCount}</strong> item{existingCount === 1 ? "" : "s"} logged.
              </p>
            </div>
            <div>
              <span className="font-medium text-fg block mb-1">Choose copy action:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCopyMode("append");
                    setConfirmed(false);
                  }}
                  className={cn(
                    "tap-target px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left",
                    copyMode === "append"
                      ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
                      : "bg-surface-2 text-fg-2 border-line hover:bg-surface-3"
                  )}
                >
                  Append (Keep {existingCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopyMode("replace");
                    setConfirmed(false);
                  }}
                  className={cn(
                    "tap-target px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left",
                    copyMode === "replace"
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
      </div>
    </Sheet>
  );
}
