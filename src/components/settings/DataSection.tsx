"use client";

import React, { useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { fmt } from "@/components/ui/primitives";
import { getSyncState } from "@/lib/client/day-store";
import { afterFullRestore } from "@/lib/client/restore";
import { Row, Section } from "@/components/settings/layout";

interface Preview {
  version: number;
  supported: boolean;
  problem: string | null;
  createdAt: string;
  appVersion: string;
  timezone: string | null;
  counts: Record<string, number>;
  unlinkedFoodRefs: number;
}

const COUNT_LABELS: Array<[string, string]> = [
  ["foodLog", "food log entries"],
  ["foods", "custom foods"],
  ["recipes", "recipes"],
  ["weight", "weight entries"],
  ["water", "water entries"],
  ["goalRevisions", "goal revisions"],
  ["savedMeals", "saved meals"],
  ["dayTemplates", "day templates"],
  ["mealTemplates", "meal templates"],
  ["mealPlans", "meal plan weeks"],
  ["prepSessions", "prep weeks"],
  ["pantry", "pantry items"],
  ["shoppingList", "shopping list items"],
  ["workouts", "workouts"],
];

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function readError(res: Response) {
  try {
    return ((await res.json()) as { error?: string }).error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Downloads a server-generated file, keeping the server's filename. Errors surface instead of saving an error page. */
async function download(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download";
  const href = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

/**
 * Backup = complete and restorable (JSON). Export = readable CSV.
 * Restore: choose file → server validates → preview → explicit confirmation → replace → full reload.
 */
export function DataSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  };

  const choose = (f: File | undefined) => {
    setPreview(null);
    setFile(null);
    if (!f) return;
    void run("preview", async () => {
      const text = await f.text();
      const res = await fetch("/api/backup/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: text });
      if (!res.ok) throw new Error(await readError(res));
      setFile({ name: f.name, text });
      setPreview(await res.json());
    });
  };

  const restore = () =>
    run("restore", async () => {
      if (!file) return;
      const res = await fetch("/api/backup/restore?confirm=replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: file.text });
      if (!res.ok) {
        setConfirming(false);
        throw new Error(`Restore failed, nothing was changed. ${await readError(res)}`);
      }
      setMessage({ kind: "info", text: "Backup restored. Reloading…" });
      afterFullRestore();
    });

  const reset = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pendingWrites = typeof window === "undefined" ? 0 : getSyncState().pending;

  return (
    <Section id="data" title="Your data" description="Files are generated on request and downloaded to this device. Nothing is stored on the server.">
      <Row label="Backup" hint="A complete, restorable copy of your data (JSON).">
        <button type="button" className="btn btn-secondary w-full sm:w-auto" disabled={busy !== null} onClick={() => run("backup", () => download("/api/backup"))}>
          {busy === "backup" ? "Preparing…" : "Download backup"}
        </button>
      </Row>
      <Row label="Export" hint="Readable spreadsheets (CSV).">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => run("food-log", () => download("/api/export?format=csv&table=food-log"))}>
            {busy === "food-log" ? "Preparing…" : "Food log CSV"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => run("weight", () => download("/api/export?format=csv&table=weight"))}>
            {busy === "weight" ? "Preparing…" : "Weight CSV"}
          </button>
        </div>
      </Row>
      <Row label="Restore" htmlFor="restore-file" hint="Replace your current app data with a backup file.">
        <input
          ref={inputRef}
          id="restore-file"
          type="file"
          accept=".json,application/json"
          disabled={busy !== null}
          onChange={(e) => choose(e.target.files?.[0])}
          className="block w-full text-sm text-fg-2 file:mr-3 file:min-h-[36px] file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-fg hover:file:bg-surface-2"
        />
        {busy === "preview" && <p className="mt-1 text-xs text-fg-3">Checking file…</p>}
      </Row>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`px-4 py-3 text-sm ${message.kind === "error" ? "text-negative" : "text-fg-2"}`}>
          {message.text}
        </p>
      )}

      {preview && file && (
        <div className="space-y-3 px-4 py-4" data-testid="restore-preview" aria-live="polite">
          <div className="text-sm">
            <p className="font-medium text-fg">{file.name}</p>
            <p className="text-xs text-fg-3">
              Created {when(preview.createdAt)} · format version {preview.version} · {preview.supported ? "supported" : "can't be restored"}
            </p>
          </div>
          {preview.problem && (
            <p role="alert" className="text-sm text-negative">
              {preview.problem}
            </p>
          )}
          <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs tabular text-fg-2 sm:grid-cols-2">
            {COUNT_LABELS.filter(([k]) => preview.counts[k] > 0).map(([k, label]) => (
              <li key={k}>
                <span className="font-medium text-fg">{fmt.int(preview.counts[k])}</span> {label}
              </li>
            ))}
            {COUNT_LABELS.every(([k]) => !preview.counts[k]) && <li>No records (settings only)</li>}
          </ul>
          {preview.unlinkedFoodRefs > 0 && (
            <p className="text-xs text-fg-3">
              {preview.unlinkedFoodRefs} item{preview.unlinkedFoodRefs === 1 ? "" : "s"} refer to library foods that don&apos;t exist here; they&apos;ll keep their saved nutrition without the link.
            </p>
          )}
          <p className="text-xs text-fg-2">
            Restoring replaces your current meals, weights, recipes, foods, plans and settings with this backup. Your account and sign-in stay the same.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => run("backup", () => download("/api/backup"))}>
              {busy === "backup" ? "Preparing…" : "Download current backup first"}
            </button>
            <button type="button" className="btn btn-primary" disabled={!preview.supported || busy !== null} onClick={() => setConfirming(true)}>
              Restore backup…
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={reset}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <Sheet
        open={confirming}
        onClose={() => busy !== "restore" && setConfirming(false)}
        title={preview ? `Restore backup from ${day(preview.createdAt)}?` : "Restore backup?"}
        size="sm"
        initialFocusRef={cancelRef}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={busy === "restore"} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={busy === "restore"} onClick={restore}>
              {busy === "restore" ? "Restoring…" : "Restore backup"}
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-fg-2">
          <p>This will replace your current meal, weight, recipe and settings data with the backup. It can&apos;t be undone.</p>
          <p>Your account, password and sign-in are not changed.</p>
          {pendingWrites > 0 && (
            <p className="text-negative">
              {pendingWrites} change{pendingWrites === 1 ? "" : "s"} on this device haven&apos;t synced yet and will be discarded.
            </p>
          )}
        </div>
      </Sheet>
    </Section>
  );
}
