"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { currentTimeString, todayLocal } from "@/lib/dates";
import type { WeightEntry } from "@/lib/domain";
import { NumberField, Segmented, Spinner, TextField, parseNum } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { WEIGHT_KG_MAX, WEIGHT_KG_MIN, WEIGHT_NOTES_MAX } from "@/lib/validation";
import { fromKg, toKg, weightInputValue, weightUnitFor } from "@/lib/weight-units";

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

export function LogWeightModal({ isOpen, onClose, onSuccess, initialEntry, measurementSystem = "metric", defaultType = "daily" }: LogWeightModalProps) {
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
  const weightRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setInfo(null);
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
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api<{ data: { weightKg?: number; smmKg?: number; bodyFatPct?: number; bmi?: number; date?: string; time?: string } }>("/api/weight/scan", {
        method: "POST",
        body: form,
        timeoutMs: 60_000,
      });
      let found = 0;
      if (data.weightKg) {
        setWeight(weightInputValue(data.weightKg, unit));
        found++;
      }
      if (data.smmKg) {
        setSmm(weightInputValue(data.smmKg, unit));
        found++;
      }
      if (data.bodyFatPct) {
        setBodyFat(String(data.bodyFatPct));
        found++;
      }
      if (data.bmi) {
        setBmi(String(data.bmi));
        found++;
      }
      if (data.date && data.date <= todayLocal()) setDate(data.date);
      if (data.time) setTime(data.time);
      if (found > 0) setInfo(`Read ${found} value${found === 1 ? "" : "s"} from the sheet. Check them before saving.`);
      else setError("Couldn't read the numbers clearly. You can enter them manually.");
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
      description={isDaily ? "Several weigh-ins in a day are all kept; the trend uses the day's average." : "Body composition from an InBody scan."}
      size="sm"
      initialFocusRef={weightRef}
      footer={
        <>
          {editing && (
            <button type="button" className="btn btn-ghost mr-auto text-negative" onClick={remove} disabled={busy !== null}>
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
          <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
            <span className="text-sm text-fg-2">{busy === "scan" ? "Reading the sheet…" : "Have an InBody printout?"}</span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
              {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Scan photo
            </button>
            <input ref={fileRef} type="file" accept={OCR_ACCEPT} className="hidden" onChange={scan} aria-label="InBody sheet photo" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Date" type="date" required value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} className="min-w-0" />
          <TextField label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="min-w-0" />
        </div>

        <NumberField ref={weightRef} label={`Weight (${unit})`} unit={unit} value={weight} onChange={setWeight} placeholder={unit === "lbs" ? "e.g. 181.5" : "e.g. 82.4"} />

        {!isDaily && (
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Body fat" unit="%" value={bodyFat} onChange={setBodyFat} />
            <NumberField label={`SMM (${unit})`} value={smm} onChange={setSmm} />
            <NumberField label="BMI" value={bmi} onChange={setBmi} />
          </div>
        )}

        <TextField label="Notes (optional)" value={notes} maxLength={WEIGHT_NOTES_MAX} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. morning, after workout" />
      </form>
    </Sheet>
  );
}
