"use client";

import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { ApiError } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import { invalidateAll } from "@/lib/client/day-store";
import { invalidateCatalog } from "@/lib/client/catalog";

type Summary = { foods: number; entries: number; water: number; weight: number; templates: number; goals: number; skipped: number };

/** Export everything as JSON/CSV; restore from a previous export with a validating dry run first. */
export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch(`/api/import?dryRun=${dryRun}`, { method: "POST", body: text, headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) throw new ApiError(res.status, data.error ?? "Import failed", data.code);
      if (dryRun) {
        setPreview(data.summary);
      } else {
        toast(`Imported ${data.summary.entries} entries, ${data.summary.foods} foods, ${data.summary.weight} weigh-ins.`, { kind: "success" });
        setPreview(null);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        invalidateAll();
        invalidateCatalog();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[var(--surface)] space-y-4">
      <div className="border-b border-[var(--border)] pb-3">
        <h2 className="font-semibold text-base text-[var(--text-primary)]">Your data</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Export everything, or restore from a previous export. Imports only add; nothing is overwritten or deleted.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="/api/export" download className="btn btn-secondary btn-sm">
          <Download className="h-3.5 w-3.5" /> Export all (JSON)
        </a>
        {(["entries", "foods", "weight", "water"] as const).map((t) => (
          <a key={t} href={`/api/export?format=csv&table=${t}`} download className="btn btn-ghost btn-sm">
            {t} CSV
          </a>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <label className="label" htmlFor="import-file">
          Restore from a MealPrep export (.json)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="import-file"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="text-sm text-fg-2 file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" disabled={!file || busy} onClick={() => void send(true)}>
            <Upload className="h-3.5 w-3.5" /> Check file
          </button>
        </div>
        {preview && (
          <div className="rounded-md border border-line bg-surface-2 p-3 text-sm">
            <p className="text-fg">
              Ready to add <b>{preview.entries}</b> entries, <b>{preview.foods}</b> foods, <b>{preview.weight}</b> weigh-ins, <b>{preview.water}</b> water logs, <b>{preview.templates}</b> saved meals
              {preview.goals ? " and your goals" : ""}.
            </p>
            {preview.skipped > 0 && <p className="mt-1 text-xs text-fg-2">{preview.skipped} rows already exist and will be skipped.</p>}
            <button type="button" className="btn btn-primary btn-sm mt-3" disabled={busy} onClick={() => void send(false)}>
              Import now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
