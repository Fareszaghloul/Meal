"use client";

import React, { useState, useEffect } from "react";
import { X, Scale, Calendar, Clock, Trash2, Loader2, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { RawWeightEntry } from "@/lib/nutrition/weight-analytics";
import { cn } from "@/lib/utils";

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEntry?: RawWeightEntry | null;
  measurementSystem?: string;
  userHeightCm?: number | null;
  defaultType?: "daily" | "inbody";
}

export function LogWeightModal({
  isOpen,
  onClose,
  onSuccess,
  initialEntry,
  measurementSystem = "metric",
  userHeightCm,
  defaultType = "daily",
}: LogWeightModalProps) {
  const isImperial = measurementSystem === "imperial";
  const unitLabel = isImperial ? "lbs" : "kg";

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getNowTimeStr = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [entryType, setEntryType] = useState<"daily" | "inbody">("daily");
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [time, setTime] = useState<string>(getNowTimeStr());
  const [weightInput, setWeightInput] = useState<string>("");
  const [bodyFatInput, setBodyFatInput] = useState<string>("");
  const [smmInput, setSmmInput] = useState<string>("");
  const [bmiInput, setBmiInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showInBodyInDaily, setShowInBodyInDaily] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (initialEntry) {
        setDate(initialEntry.date);
        setTime(initialEntry.time || getNowTimeStr());
        setEntryType(
          initialEntry.entryType === "inbody" || (!initialEntry.entryType && (initialEntry.bodyFatPct || initialEntry.smmKg))
            ? "inbody"
            : "daily"
        );
        const displayWeight = isImperial
          ? Math.round(initialEntry.weightKg * 2.20462 * 10) / 10
          : Math.round(initialEntry.weightKg * 10) / 10;
        setWeightInput(String(displayWeight));
        setBodyFatInput(initialEntry.bodyFatPct !== undefined && initialEntry.bodyFatPct !== null ? String(initialEntry.bodyFatPct) : "");

        if (initialEntry.smmKg !== undefined && initialEntry.smmKg !== null) {
          const displaySmm = isImperial
            ? Math.round(initialEntry.smmKg * 2.20462 * 10) / 10
            : Math.round(initialEntry.smmKg * 10) / 10;
          setSmmInput(String(displaySmm));
        } else {
          setSmmInput("");
        }

        setBmiInput(initialEntry.bmi !== undefined && initialEntry.bmi !== null ? String(initialEntry.bmi) : "");
        setNotes(initialEntry.notes || "");
        if (initialEntry.bodyFatPct || initialEntry.smmKg) {
          setShowInBodyInDaily(true);
        }
      } else {
        setDate(getTodayDateStr());
        setTime(getNowTimeStr());
        setEntryType(defaultType || "daily");
        setWeightInput("");
        setBodyFatInput("");
        setSmmInput("");
        setBmiInput("");
        setNotes("");
        setShowInBodyInDaily(false);
      }
    }
  }, [isOpen, initialEntry, isImperial, defaultType]);

  // Derived auto-calculated BMI if height and weight are present
  const calculatedBmi = React.useMemo(() => {
    const numericVal = parseFloat(weightInput);
    if (isNaN(numericVal) || numericVal <= 0 || !userHeightCm || userHeightCm <= 0) return null;
    const weightKg = isImperial ? numericVal / 2.20462 : numericVal;
    const heightM = userHeightCm / 100;
    const bmiVal = weightKg / (heightM * heightM);
    return Math.round(bmiVal * 10) / 10;
  }, [weightInput, isImperial, userHeightCm]);

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

    const isDaily = entryType === "daily";
    const parsedBodyFat = !isDaily && bodyFatInput ? parseFloat(bodyFatInput) : null;

    const parsedSmm = !isDaily && smmInput ? parseFloat(smmInput) : null;
    const smmKg = parsedSmm !== null && !isNaN(parsedSmm)
      ? (isImperial ? Math.round((parsedSmm / 2.20462) * 100) / 100 : parsedSmm)
      : null;

    const parsedBmi = !isDaily ? (bmiInput ? parseFloat(bmiInput) : (calculatedBmi ?? null)) : null;
    const bmi = parsedBmi !== null && !isNaN(parsedBmi) ? parsedBmi : null;

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
            time: time || getNowTimeStr(),
            entryType,
            weightKg,
            bodyFatPct: parsedBodyFat,
            smmKg,
            bmi,
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
            time: time || getNowTimeStr(),
            entryType,
            weightKg,
            bodyFatPct: parsedBodyFat,
            smmKg,
            bmi,
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
              {entryType === "inbody" ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                {initialEntry
                  ? "Edit weight entry"
                  : entryType === "inbody"
                  ? "Log InBody Scan"
                  : "Log Everyday Weigh-in"}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {entryType === "inbody"
                  ? "Record body composition, fat %, SMM, and BMI"
                  : "Track daily scale weight and 7-day rolling average"}
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

          {/* Segmented Mode Switcher: Everyday vs InBody */}
          <div className="flex rounded-xl bg-[var(--background)] p-1 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setEntryType("daily")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer",
                entryType === "daily"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Scale className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Everyday Weigh-in</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType("inbody")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer",
                entryType === "inbody"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>InBody Scan</span>
            </button>
          </div>

          {/* Date & Time Row (Auto-filled, editable) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                max={getTodayDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Time</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Weight ({unitLabel}) *
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

          {/* InBody Scan Specific Fields (Visible ONLY when InBody Scan is selected) */}
          {entryType === "inbody" && (
            <div className="pt-2 pb-1 border-t border-[var(--border)] space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  InBody Composition Metrics
                </span>
                {calculatedBmi && (
                  <button
                    type="button"
                    onClick={() => setBmiInput(String(calculatedBmi))}
                    className="text-[11px] text-[var(--accent)] hover:underline font-medium cursor-pointer"
                  >
                    Auto-fill BMI ({calculatedBmi})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Body Fat % */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-primary)] mb-1">
                    Body Fat %
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
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--text-secondary)]">
                      %
                    </span>
                  </div>
                </div>

                {/* SMM */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-primary)] mb-1">
                    SMM ({unitLabel})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      max="200"
                      placeholder={isImperial ? "76.5" : "34.8"}
                      value={smmInput}
                      onChange={(e) => setSmmInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--text-secondary)]">
                      {unitLabel}
                    </span>
                  </div>
                </div>

                {/* BMI */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-primary)] mb-1">
                    BMI
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="60"
                    placeholder={calculatedBmi ? String(calculatedBmi) : "23.5"}
                    value={bmiInput}
                    onChange={(e) => setBmiInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold font-tabular focus:outline-hidden focus:border-[var(--accent)] transition"
                  />
                </div>
              </div>
            </div>
          )}

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
