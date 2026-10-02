"use client";

import React, { useState, useEffect } from "react";
import { X, Scale, Calendar, Clock, Trash2, Loader2, Check, Sparkles, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { RawWeightEntry } from "@/lib/nutrition/weight-analytics";
import { cn } from "@/lib/utils";

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onWeightLogged?: () => void;
  initialEntry?: RawWeightEntry | null;
  measurementSystem?: string;
  userHeightCm?: number | null;
  defaultType?: "daily" | "inbody";
}

export function LogWeightModal({
  isOpen,
  onClose,
  onSuccess,
  onWeightLogged,
  initialEntry,
  measurementSystem = "metric",
  userHeightCm,
  defaultType = "daily",
}: LogWeightModalProps) {
  const triggerSuccess = () => {
    if (onSuccess) onSuccess();
    if (onWeightLogged) onWeightLogged();
  };
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
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningOcr(true);
    setErrorMessage(null);
    setOcrSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/weight/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to parse scan");
      }

      const { data } = await res.json();
      let detectedCount = 0;

      if (data.weightKg) {
        const displayW = isImperial ? Math.round(data.weightKg * 2.20462 * 10) / 10 : Math.round(data.weightKg * 10) / 10;
        setWeightInput(String(displayW));
        detectedCount++;
      }
      if (data.smmKg) {
        const displaySmm = isImperial ? Math.round(data.smmKg * 2.20462 * 10) / 10 : Math.round(data.smmKg * 10) / 10;
        setSmmInput(String(displaySmm));
        detectedCount++;
      }
      if (data.bodyFatPct) {
        setBodyFatInput(String(data.bodyFatPct));
        detectedCount++;
      }
      if (data.bmi) {
        setBmiInput(String(data.bmi));
        detectedCount++;
      }
      if (data.date) {
        setDate(data.date);
      }
      if (data.time) {
        setTime(data.time);
      }

      setEntryType("inbody");
      setShowInBodyInDaily(true);

      if (detectedCount > 0) {
        setOcrSuccessMsg(`Extracted ${detectedCount} InBody metrics successfully!`);
      } else {
        setErrorMessage("Could not detect numbers clearly. You can enter them manually.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to scan sheet");
    } finally {
      setIsScanningOcr(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

      triggerSuccess();
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
      triggerSuccess();
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
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              {entryType === "inbody" ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                {initialEntry
                  ? "Edit weight entry"
                  : entryType === "inbody"
                  ? "Log InBody scan"
                  : "Log weigh-in"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {entryType === "inbody"
                  ? "Body composition, fat %, SMM, and BMI"
                  : "Scale weight and 7-day rolling average"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[var(--status-over-target)]/10 text-[var(--status-over-target)] text-xs">
              {errorMessage}
            </div>
          )}

          {/* Segmented Mode Switcher: Everyday vs InBody */}
          <div className="flex rounded-full bg-[var(--background)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setEntryType("daily")}
              className={cn(
                "flex-1 py-2 px-3 rounded-full font-medium transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]",
                entryType === "daily"
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Weigh-in</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType("inbody")}
              className={cn(
                "flex-1 py-2 px-3 rounded-full font-medium transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]",
                entryType === "inbody"
                  ? "bg-[var(--accent)] text-[var(--on-accent)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>InBody scan</span>
            </button>
          </div>

          {/* InBody OCR Photo Scan Action */}
          {entryType === "inbody" && (
            <div className="p-3.5 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {isScanningOcr ? "Scanning InBody sheet with OCR..." : "Have an InBody sheet printout?"}
                </span>
              </div>
              <button
                type="button"
                disabled={isScanningOcr}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold transition cursor-pointer flex items-center space-x-1 shrink-0"
              >
                {isScanningOcr ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Scan photo</span>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleOcrFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          )}

          {ocrSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{ocrSuccessMsg}</span>
            </div>
          )}

          {/* Date & Time Row (Auto-filled, editable) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                max={getTodayDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs font-medium font-tabular min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Time</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs font-medium font-tabular min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
            </div>
          </div>

          {/* Weight Input */}
          <div>
            <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-lg font-semibold font-tabular min-h-[48px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-muted)]">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* InBody Scan Specific Fields (Visible ONLY when InBody Scan is selected) */}
          {entryType === "inbody" && (
            <div className="pt-3 pb-1 border-t border-[var(--border)] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  InBody composition metrics
                </span>
                {calculatedBmi && (
                  <button
                    type="button"
                    onClick={() => setBmiInput(String(calculatedBmi))}
                    className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
                  >
                    Auto-fill BMI ({calculatedBmi})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Body Fat % */}
                <div>
                  <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1">
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
                      className="w-full px-3 py-2 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs font-semibold font-tabular min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-muted)]">
                      %
                    </span>
                  </div>
                </div>

                {/* SMM */}
                <div>
                  <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1">
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
                      className="w-full px-3 py-2 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs font-semibold font-tabular min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-muted)]">
                      {unitLabel}
                    </span>
                  </div>
                </div>

                {/* BMI */}
                <div>
                  <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1">
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
                    className="w-full px-3 py-2 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs font-semibold font-tabular min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-normal text-[var(--text-secondary)] mb-1.5">
              Notes <span className="text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Morning fasted, post-leg workout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--background)] text-[var(--text-primary)] text-xs min-h-[44px] focus:outline-hidden focus:ring-1.5 focus:ring-[var(--text-primary)] transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-[var(--border)]">
            {initialEntry ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="p-3 rounded-full text-[var(--status-over-target)] hover:bg-[var(--status-over-target)]/10 transition cursor-pointer"
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
                className="px-5 py-2.5 rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] font-semibold text-xs transition cursor-pointer min-h-[44px]"
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
