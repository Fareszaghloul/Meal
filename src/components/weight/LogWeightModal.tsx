"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { currentTimeString, todayLocal } from "@/lib/dates";
import type { WeightEntry } from "@/lib/domain";
import { NumberField, Segmented, Spinner, TextField, parseNum } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { WEIGHT_KG_MAX, WEIGHT_KG_MIN, WEIGHT_NOTES_MAX } from "@/lib/validation";
import { fromKg, toKg, weightInputValue, weightUnitFor } from "@/lib/weight-units";
import type { ParsedInBodyScan, InBodyFieldResult } from "@/lib/nutrition/inbody-parser";

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialEntry?: WeightEntry | null;
  measurementSystem?: string;
  defaultType?: "daily" | "inbody";
}

type EntryType = "daily" | "inbody";

const OCR_ACCEPT = "image/jpeg,image/png,image/webp";

interface ReviewItemProps {
  label: string;
  result: InBodyFieldResult;
  displayValue: string | null;
  onAccept: () => void;
  isCurrentApplied: boolean;
}

function ReviewItem({ label, result, displayValue, onAccept, isCurrentApplied }: ReviewItemProps) {
  const { confidence, warnings } = result;

  return (
    <div className="rounded-md border border-line bg-surface p-2 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-medium text-fg-1">{label}</span>
        {confidence === "high" && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-positive-soft text-positive">
            <CheckCircle2 className="h-2.5 w-2.5" /> High confidence
          </span>
        )}
        {confidence === "medium" && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-carbs">
            <AlertCircle className="h-2.5 w-2.5" /> Check this value
          </span>
        )}
        {confidence === "low" && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-line text-fg-muted">
            <HelpCircle className="h-2.5 w-2.5" /> Low confidence
          </span>
        )}
        {confidence === "missing" && (
          <span className="text-[10px] text-fg-muted">Not detected</span>
        )}
      </div>

      <div className="text-sm">
        {displayValue ? (
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-semibold text-fg-1">{displayValue}</span>
            {confidence === "low" && !isCurrentApplied && (
              <button
                type="button"
                onClick={onAccept}
                className="tap-target px-2 text-[11px] text-primary hover:underline font-medium"
              >
                Accept
              </button>
            )}
            {isCurrentApplied && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-fg-muted">
                <Check className="h-3 w-3 text-positive" /> In form
              </span>
            )}
          </div>
        ) : (
          <span className="text-fg-muted italic">—</span>
        )}
      </div>

      {warnings && warnings.length > 0 && (
        <p className="mt-1 text-[10px] text-amber-600 dark:text-carbs leading-tight">
          {warnings[0]}
        </p>
      )}
    </div>
  );
}

export function LogWeightModal({
  isOpen,
  onClose,
  onSuccess,
  initialEntry,
  measurementSystem = "metric",
  defaultType = "daily",
}: LogWeightModalProps) {
  const unit = weightUnitFor(measurementSystem);
  const editing = !!initialEntry;

  const [entryType, setEntryType] = useState<EntryType>("daily");
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(currentTimeString());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [smm, setSmm] = useState("");
  const [bmi, setBmi] = useState("");
  const [notes, setNotes] = useState("");
  // Values as first shown. An untouched weight is never re-sent, so a kg value can't drift through a lb round trip.
  const [shown, setShown] = useState({ weight: "", smm: "" });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | "scan" | null>(null);
  const [scanReview, setScanReview] = useState<ParsedInBodyScan | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setInfo(null);
    setScanReview(null);
    if (initialEntry) {
      const w = weightInputValue(initialEntry.weightKg, unit);
      const s = initialEntry.smmKg != null ? weightInputValue(initialEntry.smmKg, unit) : "";
      setEntryType(initialEntry.entryType);
      setDate(initialEntry.date);
      setTime(initialEntry.time ?? "");
      setWeight(w);
      setBodyFat(initialEntry.bodyFatPct != null ? String(initialEntry.bodyFatPct) : "");
      setSmm(s);
      setBmi(initialEntry.bmi != null ? String(initialEntry.bmi) : "");
      setNotes(initialEntry.notes ?? "");
      setShown({ weight: w, smm: s });
    } else {
      setEntryType(defaultType);
      setDate(todayLocal());
      setTime(currentTimeString());
      setWeight("");
      setBodyFat("");
      setSmm("");
      setBmi("");
      setNotes("");
      setShown({ weight: "", smm: "" });
    }
  }, [isOpen, initialEntry, unit, defaultType]);

  const isDaily = entryType === "daily";
  const minShown = Math.ceil(fromKg(WEIGHT_KG_MIN, unit));
  const maxShown = Math.floor(fromKg(WEIGHT_KG_MAX, unit));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const w = parseNum(weight);
    if (!weight || w < minShown || w > maxShown) {
      setError(`Enter a weight between ${minShown} and ${maxShown} ${unit}.`);
      weightRef.current?.focus();
      return;
    }
    const body: Record<string, unknown> = {
      date,
      time: time || null,
      notes: notes.trim() || null,
    };
    // Send the weight only when it was changed (or is new); kg input is exact, lb input is converted once.
    if (!editing || weight !== shown.weight) body.weightKg = toKg(w, unit);
    if (!editing) body.entryType = entryType;
    if (!isDaily) {
      body.bodyFatPct = bodyFat;
      body.bmi = bmi;
      if (!editing || smm !== shown.smm) body.smmKg = smm === "" ? null : toKg(parseNum(smm), unit);
    }
    setBusy("save");
    try {
      if (initialEntry) await api("/api/weight", { method: "PUT", json: { id: initialEntry.id, ...body } });
      else await api("/api/weight", { method: "POST", json: body });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!initialEntry) return;
    setBusy("delete");
    setError(null);
    try {
      await api(`/api/weight?id=${initialEntry.id}`, { method: "DELETE" });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    } finally {
      setBusy(null);
    }
  };

  const scan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("scan");
    setError(null);
    setInfo(null);
    setScanReview(null);

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await api<{ success: boolean; data: ParsedInBodyScan }>("/api/weight/scan", {
        method: "POST",
        body: form,
        timeoutMs: 60_000,
      });

      const parsed = res.data;
      setScanReview(parsed);

      let found = 0;

      // 1. Weight: auto-fill HIGH or MEDIUM confidence; never LOW
      if (parsed.weightKg.value != null) {
        if (parsed.weightKg.confidence === "high" || parsed.weightKg.confidence === "medium") {
          setWeight(weightInputValue(parsed.weightKg.value, unit));
          found++;
        }
      }

      // 2. SMM: auto-fill HIGH or MEDIUM confidence; never LOW
      if (parsed.smmKg.value != null) {
        if (parsed.smmKg.confidence === "high" || parsed.smmKg.confidence === "medium") {
          setSmm(weightInputValue(parsed.smmKg.value, unit));
          found++;
        }
      }

      // 3. Body Fat: auto-fill HIGH or MEDIUM confidence; never LOW
      if (parsed.bodyFatPct.value != null) {
        if (parsed.bodyFatPct.confidence === "high" || parsed.bodyFatPct.confidence === "medium") {
          setBodyFat(String(parsed.bodyFatPct.value));
          found++;
        }
      }

      // 4. BMI: auto-fill HIGH or MEDIUM confidence; never LOW
      if (parsed.bmi.value != null) {
        if (parsed.bmi.confidence === "high" || parsed.bmi.confidence === "medium") {
          setBmi(String(parsed.bmi.value));
          found++;
        }
      }

      // 5. Date & Time
      if (parsed.date.value && parsed.date.value <= todayLocal() && parsed.date.confidence !== "low") {
        setDate(parsed.date.value);
      }
      if (parsed.time.value && parsed.time.confidence !== "low") {
        setTime(parsed.time.value);
      }

      if (found > 0) {
        setInfo(`Extracted ${found} metric${found === 1 ? "" : "s"}. Review values against your sheet before saving.`);
      } else {
        setError("Couldn't confidently detect measurements. You can enter them manually.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image");
    } finally {
      setBusy(null);
    }
  };

  const title = editing ? (isDaily ? "Edit weigh-in" : "Edit InBody scan") : isDaily ? "Log weight" : "Log InBody scan";

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={title}
      description={
        isDaily
          ? "Several weigh-ins in a day are all kept; the trend uses the day's average."
          : "Body composition from an InBody scan."
      }
      size="sm"
      initialFocusRef={weightRef}
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost mr-auto text-negative"
              onClick={remove}
              disabled={busy !== null}
            >
              {busy === "delete" ? <Spinner /> : "Delete"}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy === "save"}>
            Cancel
          </button>
          <button type="submit" form="log-weight-form" className="btn btn-primary" disabled={busy !== null}>
            {busy === "save" ? <Spinner /> : editing ? "Save changes" : "Save"}
          </button>
        </>
      }
    >
      <form id="log-weight-form" onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-2">
            {info}
          </p>
        )}

        {!editing && (
          <Segmented<EntryType>
            ariaLabel="Entry type"
            className="w-full"
            value={entryType}
            onChange={setEntryType}
            options={[
              { value: "daily", label: "Weigh-in" },
              { value: "inbody", label: "InBody scan" },
            ]}
          />
        )}

        {!isDaily && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
            <span className="text-sm text-fg-2">
              {busy === "scan" ? "Reading the sheet…" : "Have an InBody printout?"}
            </span>
            {/* Phones: open the rear camera directly, or pick an existing photo. Both feed the same upload. */}
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className="btn btn-secondary btn-sm sm:hidden" disabled={busy !== null} onClick={() => cameraRef.current?.click()}>
                {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Take photo
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                <Camera className="hidden h-4 w-4 sm:inline" />
                <span className="sm:hidden">Choose</span>
                <span className="hidden sm:inline">Scan photo</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept={OCR_ACCEPT} capture="environment" className="hidden" onChange={scan} aria-label="Take InBody sheet photo" />
            <input ref={fileRef} type="file" accept={OCR_ACCEPT} className="hidden" onChange={scan} aria-label="Choose InBody sheet photo" />
          </div>
        )}

        {/* Structured InBody Review UI */}
        {!isDaily && scanReview && (
          <div className="rounded-lg border border-line bg-surface-2 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-2">
                InBody Scan Result
              </span>
              <button
                type="button"
                className="tap-target px-2 text-[11px] text-fg-muted hover:text-fg-1 underline"
                onClick={() => setScanReview(null)}
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <ReviewItem
                label="Weight"
                result={scanReview.weightKg}
                displayValue={
                  scanReview.weightKg.value != null
                    ? `${weightInputValue(scanReview.weightKg.value, unit)} ${unit}`
                    : null
                }
                onAccept={() =>
                  scanReview.weightKg.value != null &&
                  setWeight(weightInputValue(scanReview.weightKg.value, unit))
                }
                isCurrentApplied={
                  scanReview.weightKg.value != null &&
                  weight === weightInputValue(scanReview.weightKg.value, unit)
                }
              />

              <ReviewItem
                label="Body Fat"
                result={scanReview.bodyFatPct}
                displayValue={
                  scanReview.bodyFatPct.value != null ? `${scanReview.bodyFatPct.value}%` : null
                }
                onAccept={() =>
                  scanReview.bodyFatPct.value != null &&
                  setBodyFat(String(scanReview.bodyFatPct.value))
                }
                isCurrentApplied={
                  scanReview.bodyFatPct.value != null &&
                  bodyFat === String(scanReview.bodyFatPct.value)
                }
              />

              <ReviewItem
                label="SMM"
                result={scanReview.smmKg}
                displayValue={
                  scanReview.smmKg.value != null
                    ? `${weightInputValue(scanReview.smmKg.value, unit)} ${unit}`
                    : null
                }
                onAccept={() =>
                  scanReview.smmKg.value != null &&
                  setSmm(weightInputValue(scanReview.smmKg.value, unit))
                }
                isCurrentApplied={
                  scanReview.smmKg.value != null &&
                  smm === weightInputValue(scanReview.smmKg.value, unit)
                }
              />

              <ReviewItem
                label="BMI"
                result={scanReview.bmi}
                displayValue={scanReview.bmi.value != null ? String(scanReview.bmi.value) : null}
                onAccept={() =>
                  scanReview.bmi.value != null && setBmi(String(scanReview.bmi.value))
                }
                isCurrentApplied={
                  scanReview.bmi.value != null && bmi === String(scanReview.bmi.value)
                }
              />
            </div>

            <p className="text-[11px] text-fg-muted">
              Verify values against the InBody sheet before saving.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Date"
            type="date"
            required
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0"
          />
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-w-0"
          />
        </div>

        <NumberField
          ref={weightRef}
          label={`Weight (${unit})`}
          unit={unit}
          value={weight}
          onChange={setWeight}
          placeholder={unit === "lbs" ? "e.g. 181.5" : "e.g. 82.4"}
        />

        {!isDaily && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField label="Body fat" unit="%" value={bodyFat} onChange={setBodyFat} />
            <NumberField label={`SMM (${unit})`} value={smm} onChange={setSmm} />
            <NumberField label="BMI" value={bmi} onChange={setBmi} />
          </div>
        )}

        <TextField
          label="Notes (optional)"
          value={notes}
          maxLength={WEIGHT_NOTES_MAX}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. morning, after workout"
        />
      </form>
    </Sheet>
  );
}
