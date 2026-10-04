"use client";

import React, { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { TextField } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { Row, SaveError, Section } from "@/components/settings/layout";
import type { SaveSettings, SettingsDto } from "@/components/settings/types";

const METHODS = [
  { value: "ocr_local", label: "OCR + local model" },
  { value: "vision_local", label: "Local vision model" },
  { value: "cloud_vision", label: "Cloud vision (API key)" },
];

/** Admin-only server configuration. Keys are write-only: the server only says whether one is set. */
export function AdminSection({ settings, save, saving }: { settings: SettingsDto; save: SaveSettings; saving: string | null }) {
  const [url, setUrl] = useState(settings.ollamaUrl ?? "");
  const [model, setModel] = useState(settings.ollamaModel ?? "");
  const [method, setMethod] = useState(settings.screenshotMethod ?? "ocr_local");
  const [cloudKey, setCloudKey] = useState("");
  const [usdaKey, setUsdaKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<string | null>(null);

  const patch: Record<string, unknown> = {};
  if (url.trim() !== (settings.ollamaUrl ?? "")) patch.ollamaUrl = url.trim();
  if (model.trim() !== (settings.ollamaModel ?? "")) patch.ollamaModel = model.trim();
  if (method !== settings.screenshotMethod) patch.screenshotMethod = method;
  if (cloudKey.trim()) patch.cloudApiKey = cloudKey.trim();
  if (usdaKey.trim()) patch.usdaApiKey = usdaKey.trim();
  const dirty = Object.keys(patch).length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (await save("admin", patch)) {
        setCloudKey("");
        setUsdaKey("");
        toast("Server settings saved", { kind: "success" });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save.");
    }
  };

  const test = async () => {
    setHealth("Checking…");
    try {
      const r = await api<{ isRunning: boolean; models: string[]; error?: string }>("/api/ai/health");
      setHealth(r.isRunning ? `Connected. Models: ${r.models.join(", ") || "none pulled yet"}` : `Not reachable${r.error ? `: ${r.error}` : ""}`);
    } catch {
      setHealth("Not reachable");
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="server"
        title="Server (admin)"
        description="Local AI engine and food database keys. Not part of backups."
        footer={
          dirty || error ? (
            <>
              <SaveError message={error} />
              <button type="submit" className="btn btn-primary" disabled={!dirty || saving !== null}>
                {saving === "admin" ? "Saving…" : "Save server settings"}
              </button>
            </>
          ) : undefined
        }
      >
        <Row label="Ollama URL" htmlFor="ollama-url">
          <div className="flex gap-2">
            <TextField id="ollama-url" className="flex-1" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={test}>
              Test
            </button>
          </div>
          {health && (
            <p className="mt-1 text-xs text-fg-3" aria-live="polite">
              {health}
            </p>
          )}
        </Row>
        <Row label="Model" htmlFor="ollama-model">
          <TextField id="ollama-model" value={model} onChange={(e) => setModel(e.target.value)} />
        </Row>
        <Row label="Label scanning" htmlFor="scan-method">
          <select id="scan-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Cloud vision key" htmlFor="cloud-key" hint={settings.hasCloudApiKey ? "A key is saved. Type to replace it." : "Not set."}>
          <TextField id="cloud-key" type="password" autoComplete="off" value={cloudKey} onChange={(e) => setCloudKey(e.target.value)} />
        </Row>
        <Row label="USDA API key" htmlFor="usda-key" hint={settings.hasUsdaApiKey ? "A key is saved. Type to replace it." : "Using the public demo key."}>
          <TextField id="usda-key" type="password" autoComplete="off" value={usdaKey} onChange={(e) => setUsdaKey(e.target.value)} />
        </Row>
      </Section>
    </form>
  );
}
