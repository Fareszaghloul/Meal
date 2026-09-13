"use client";

import React, { useState, useEffect } from "react";
import { X, Scale, Calendar, Trash2, Loader2, Check } from "lucide-react";
import { RawWeightEntry } from "@/lib/nutrition/weight-analytics";
import { cn } from "@/lib/utils";

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEntry?: RawWeightEntry | null;
  measurementSystem?: string;
}

export function LogWeightModal({
  isOpen,
  onClose,
  onSuccess,
  initialEntry,
  measurementSystem = "metric",
}: LogWeightModalProps) {
  const isImperial = measurementSystem === "imperial";
  const unitLabel = isImperial ? "lbs" : "kg";

  const getTodayDateStr = () => new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(getTodayDateStr());
  const [weightInput, setWeightInput] = useState<string>("");
  const [bodyFatInput, setBodyFatInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (initialEntry) {
        setDate(initialEntry.date);
        const displayWeight = isImperial
          ? Math.round(initialEntry.weightKg * 2.20462 * 10) / 10
          : Math.round(initialEntry.weightKg * 10) / 10;
        setWeightInput(String(displayWeight));
        setBodyFatInput(initialEntry.bodyFatPct !== undefined && initialEntry.bodyFatPct !== null ? String(initialEntry.bodyFatPct) : "");
        setNotes(initialEntry.notes || "");
      } else {
        setDate(getTodayDateStr());
        setWeightInput("");
        setBodyFatInput("");
        setNotes("");
      }
    }
  }, [isOpen, initialEntry, isImperial]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericVal = parseFloat(weightInput);
    if (isNaN(numericVal) || numericVal <= 0) {
      setErrorMessage(`Please enter a valid weight in ${unitLabel}`);
      return;
    }

    // Convert to kg if in imperial
    const weightKg = isImperial
      ? Math.round((numericVal / 2.20462) * 100) / 100
      : numericVal;

    const parsedBodyFat = bodyFatInput ? parseFloat(bodyFatInput) : null;

    setIsSubmitting(true);
    try {
      if (initialEntry?.id) {
        // Edit existing entry
        const res = await fetch("/api/weight", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initialEntry.id,
            date,
            weightKg,
            bodyFatPct: parsedBodyFat,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update weight entry");
      } else {
        // Log new entry
        const res = await fetch("/api/weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            weightKg,
            bodyFatPct: parsedBodyFat,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to save weight entry");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEntry?.id) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/weight?id=${initialEntry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                {initialEntry ? "Edit weight entry" : "Log weight"}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Record your body weight to update your 7-day average
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[var(--ui-error-bg)] border border-[var(--ui-error-border)] text-[var(--ui-error)] text-xs">
              {errorMessage}
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                max={getTodayDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-hidden focus:border-[var(--accent)] font-tabular transition"
              />
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Weight ({unitLabel})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="20"
                max="500"
                required
                autoFocus
                placeholder={`e.g. ${isImperial ? "172.5" : "78.2"}`}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-base font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-secondary)]">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* Body Fat Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Body Fat % <span className="font-normal text-[var(--text-secondary)]">(optional, e.g. InBody scan)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="3"
                max="60"
                placeholder="e.g. 15.4"
                value={bodyFatInput}
                onChange={(e) => setBodyFatInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-secondary)]">
                %
              </span>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Notes <span className="font-normal text-[var(--text-secondary)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Morning fasted, post-leg workout, refeed day"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-hidden focus:border-[var(--accent)] transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-[var(--border)]">
            {initialEntry ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="p-2.5 rounded-xl border border-[var(--ui-error-border)] text-[var(--ui-error)] hover:bg-[var(--ui-error-bg)] transition"
                title="Delete entry"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 text-white font-medium text-xs shadow-xs transition"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{initialEntry ? "Save changes" : "Log entry"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
