"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/client/api";
import { invalidateAll as invalidateDays } from "@/lib/client/day-store";
import { invalidateAnalyticsCache } from "@/lib/client/analytics-store";
import { formatDate, todayInTimezone } from "@/lib/dates";
import { formatWeight, toKg, weightInputValue, weightUnitFor, type WeightUnit } from "@/lib/weight-units";
import { fmt, NumberField, Segmented, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { Row, SaveError, Section } from "@/components/settings/layout";
import { CalculatorSection, type TargetValues } from "@/components/settings/CalculatorSection";
import { AdminSection } from "@/components/settings/AdminSection";
import { DataSection } from "@/components/settings/DataSection";
import type { GoalRevisionDto, SaveSettings, SettingsDto } from "@/components/settings/types";

// One in-flight settings read shared by every caller (and React's dev double effects): never two GETs at once.
let pendingLoad: Promise<SettingsDto> | null = null;
const loadSettings = () => (pendingLoad ??= api<SettingsDto>("/api/settings").finally(() => (pendingLoad = null)));

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't save. Check your connection and try again.");
const longDate = (d: string) => formatDate(d, { month: "short", day: "numeric", year: "numeric" });

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [prefill, setPrefill] = useState<{ values: TargetValues; at: number } | null>(null);

  /**
   * One save at a time: a second click while a save is running is ignored, so racing PATCHes
   * can't land out of order. Throws on failure so the section can show the error; nothing looks saved.
   */
  const save: SaveSettings = useCallback(async (section, patch) => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaving(section);
    try {
      // An empty patch (e.g. only workouts changed elsewhere) just refreshes.
      const next = Object.keys(patch).length
        ? await api<SettingsDto>("/api/settings", { method: "PATCH", json: patch })
        : await api<SettingsDto>("/api/settings");
      setSettings(next);
      return next;
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then(async (s) => {
        if (cancelled) return;
        setSettings(s);
        // First visit only: adopt this device's timezone. Once stored it is the user's choice and never changes silently.
        if (s.timezone === null) {
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (detected) await save("timezone", { timezone: detected }).catch(() => undefined);
        }
      })
      .catch((e) => !cancelled && setLoadError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [save]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-fg-2" role="alert">
        {loadError}
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Spinner />
        <span className="sr-only">Loading settings</span>
      </div>
    );
  }

  const unit = weightUnitFor(settings.measurementSystem);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      <header className="pb-1">
        <h1 className="text-xl font-bold tracking-tight text-fg">Settings</h1>
        <p className="text-xs text-fg-3">Units, targets, goals and your data</p>
      </header>

      <GeneralSection settings={settings} save={save} saving={saving} />
      <TargetsSection settings={settings} save={save} saving={saving} prefill={prefill} />
      {/* Remount on unit change so drafts are re-derived from canonical kg in the new unit. */}
      <WeightGoalSection key={`goal-${unit}`} settings={settings} unit={unit} save={save} saving={saving} />
      <CalculatorSection
        key={`calc-${unit}`}
        settings={settings}
        save={save}
        saving={saving}
        onUseTargets={(values) => {
          setPrefill({ values, at: Date.now() });
          document.getElementById("targets")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
      <DataSection />
      {user?.role === "admin" && <AdminSection settings={settings} save={save} saving={saving} />}
    </div>
  );
}

interface SectionProps {
  settings: SettingsDto;
  save: SaveSettings;
  saving: string | null;
}

/* ───────── General ───────── */

function GeneralSection({ settings, save, saving }: SectionProps) {
  const { theme, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const zones = useMemo(() => {
    const all = ["UTC", ...Intl.supportedValuesOf("timeZone")];
    return settings.timezone && !all.includes(settings.timezone) ? [settings.timezone, ...all] : all;
  }, [settings.timezone]);
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const apply = async (section: string, patch: Record<string, unknown>, message: string) => {
    setError(null);
    try {
      if (await save(section, patch)) toast(message, { kind: "success" });
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Section id="general" title="General" footer={error ? <SaveError message={error} /> : undefined}>
      <Row label="Units" hint="Display only. Stored measurements never change.">
        <Segmented
          ariaLabel="Units"
          value={settings.measurementSystem}
          onChange={(v) => v !== settings.measurementSystem && apply("units", { measurementSystem: v }, v === "imperial" ? "Showing pounds and inches" : "Showing kilograms and centimetres")}
          options={[
            { value: "metric", label: "Metric (kg, cm)" },
            { value: "imperial", label: "Imperial (lb, in)" },
          ]}
          // One save at a time: show it, rather than silently ignoring a click during a save.
          className={cn("w-full sm:w-auto", saving !== null && "pointer-events-none opacity-60")}
        />
      </Row>
      <Row
        label="Timezone"
        htmlFor="timezone"
        hint="Decides what “today” is for weigh-ins and goals. Changing it never moves logged days."
      >
        <div className="flex flex-col gap-1.5">
          <select
            id="timezone"
            className="input"
            value={settings.timezone ?? ""}
            disabled={saving !== null}
            onChange={(e) => apply("timezone", { timezone: e.target.value }, `Timezone set to ${e.target.value}`)}
          >
            {settings.timezone === null && <option value="">Not set</option>}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {deviceZone && deviceZone !== settings.timezone && (
            <button type="button" className="self-start text-xs font-medium text-accent hover:underline" onClick={() => apply("timezone", { timezone: deviceZone }, `Timezone set to ${deviceZone}`)}>
              Use this device&apos;s timezone ({deviceZone.replace(/_/g, " ")})
            </button>
          )}
        </div>
      </Row>
      <Row label="Appearance" hint="Saved on this device.">
        <Segmented
          ariaLabel="Appearance"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "Auto" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          className="w-full sm:w-auto"
        />
      </Row>
      <Row label="Pantry Deductions" hint="How recipe ingredients are deducted from your pantry when you log a planned meal.">
        <Segmented
          ariaLabel="Pantry Deductions"
          value={settings.pantryUsageBehavior ?? "ask"}
          onChange={(v) => v !== settings.pantryUsageBehavior && apply("pantryUsageBehavior", { pantryUsageBehavior: v }, `Pantry deduction behavior set to ${v}`)}
          options={[
            { value: "ask", label: "Ask each time" },
            { value: "auto", label: "Auto deduct" },
            { value: "manual", label: "Manual only" },
          ]}
          className={cn("w-full sm:w-auto", saving !== null && "pointer-events-none opacity-60")}
        />
      </Row>
      <Row label="Default Meal Slot" hint="Default category pre-selected when creating meals or templates.">
        <Segmented
          ariaLabel="Default Meal Slot"
          value={settings.defaultMealCategory ?? "lunch"}
          onChange={(v) => v !== settings.defaultMealCategory && apply("defaultMealCategory", { defaultMealCategory: v }, `Default meal category set to ${v}`)}
          options={[
            { value: "breakfast", label: "Breakfast" },
            { value: "lunch", label: "Lunch" },
            { value: "dinner", label: "Dinner" },
            { value: "snack", label: "Snack" },
          ]}
          className={cn("w-full sm:w-auto", saving !== null && "pointer-events-none opacity-60")}
        />
      </Row>
      <Row label="Default Copy Mode" hint="Default behavior when copying days or meals to a day with existing items.">
        <Segmented
          ariaLabel="Default Copy Mode"
          value={settings.defaultCopyMode ?? "append"}
          onChange={(v) => v !== settings.defaultCopyMode && apply("defaultCopyMode", { defaultCopyMode: v }, `Default copy mode set to ${v}`)}
          options={[
            { value: "append", label: "Append" },
            { value: "replace", label: "Replace" },
          ]}
          className={cn("w-full sm:w-auto", saving !== null && "pointer-events-none opacity-60")}
        />
      </Row>
    </Section>
  );
}

/* ───────── Nutrition targets ───────── */

const TARGET_FIELDS = [
  { key: "dailyCalories", label: "Calories", unit: "kcal", optional: false, goal: true },
  { key: "dailyProtein", label: "Protein", unit: "g", optional: false, goal: true },
  { key: "dailyCarbs", label: "Carbs", unit: "g", optional: false, goal: true },
  { key: "dailyFat", label: "Fat", unit: "g", optional: false, goal: true },
  { key: "dailyFiber", label: "Fiber", unit: "g", optional: true, goal: true },
  { key: "dailySodium", label: "Sodium limit", unit: "mg", optional: true, goal: false },
  { key: "dailyWaterGoalMl", label: "Water", unit: "ml", optional: false, goal: false },
] as const;
type TargetKey = (typeof TARGET_FIELDS)[number]["key"];
type TargetDraft = Record<TargetKey, string>;

const draftFrom = (s: SettingsDto): TargetDraft =>
  Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, s[f.key] === null ? "" : String(s[f.key])])) as TargetDraft;

function TargetsSection({ settings, save, saving, prefill }: SectionProps & { prefill: { values: TargetValues; at: number } | null }) {
  const [draft, setDraft] = useState<TargetDraft>(() => draftFrom(settings));
  const [error, setError] = useState<string | null>(null);
  const [fromCalculator, setFromCalculator] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(prefill.values).map(([k, v]) => [k, String(v)])) }));
    setFromCalculator(true);
  }, [prefill]);

  const parsed = (key: TargetKey): number | null | undefined => {
    const raw = draft[key].trim();
    if (raw === "") return TARGET_FIELDS.find((f) => f.key === key)!.optional ? null : undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const changes = TARGET_FIELDS.filter((f) => parsed(f.key) !== settings[f.key]);
  const missing = TARGET_FIELDS.filter((f) => parsed(f.key) === undefined);
  const dirty = changes.length > 0;
  const goalChange = changes.some((f) => f.goal);
  const today = todayInTimezone(settings.timezone);
  const show = (v: number | null, u: string) => (v === null || v === undefined ? "none" : `${fmt.int(v)} ${u}`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (missing.length) return setError(`Enter a value for ${missing.map((f) => f.label.toLowerCase()).join(", ")}.`);
    const patch = Object.fromEntries(changes.map((f) => [f.key, parsed(f.key)]));
    try {
      const next = await save("targets", patch);
      if (!next) return;
      setDraft(draftFrom(next));
      setFromCalculator(false);
      // Today and Analytics compare against targets: drop their caches.
      invalidateDays();
      invalidateAnalyticsCache();
      toast(goalChange ? `Targets saved, effective ${longDate(today)}` : "Saved", { kind: "success" });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="targets"
        title="Nutrition targets"
        description="Used by Today and Analytics. A change applies from today; earlier days keep the targets they had."
        footer={
          dirty || error ? (
            <>
              <SaveError message={error} />
              <button type="button" className="btn btn-ghost" onClick={() => (setDraft(draftFrom(settings)), setError(null), setFromCalculator(false))} disabled={saving === "targets"}>
                Discard
              </button>
              <button type="submit" className="btn btn-primary" disabled={!dirty || saving !== null}>
                {saving === "targets" ? "Saving…" : "Save targets"}
              </button>
            </>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4">
          {TARGET_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.optional ? `${f.label} (optional)` : f.label}
              unit={f.unit}
              value={draft[f.key]}
              placeholder={f.optional ? "None" : undefined}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
              aria-invalid={missing.includes(f) ? true : undefined}
            />
          ))}
        </div>
        {dirty && (
          <div className="px-4 py-3 text-xs text-fg-2" aria-live="polite" data-testid="targets-pending">
            <p className="font-medium text-fg">
              {fromCalculator ? "From the calculator — review, then save:" : "Will save:"}
            </p>
            <ul className="mt-1 space-y-0.5 tabular">
              {changes.map((f) => (
                <li key={f.key}>
                  {f.label}: {show(settings[f.key], f.unit)} → <span className="font-medium text-fg">{show(parsed(f.key) ?? null, f.unit)}</span>
                </li>
              ))}
            </ul>
            {goalChange && <p className="mt-1.5 text-fg-3">Effective {longDate(today)}. Goal comparisons from then on use these targets; logged food doesn&apos;t change.</p>}
          </div>
        )}
        <GoalHistory history={settings.goalHistory} />
      </Section>
    </form>
  );
}

function GoalHistory({ history }: { history: GoalRevisionDto[] }) {
  if (history.length === 0) return null;
  const first = history[history.length - 1];
  return (
    <details className="group px-4 py-3" data-testid="goal-history">
      <summary className="cursor-pointer select-none text-xs font-medium text-fg-2 hover:text-fg">
        Goal history · tracked since {longDate(first.effectiveDate)}
      </summary>
      <ol className="mt-2 divide-y divide-line text-xs tabular">
        {history.map((r) => (
          <li key={r.effectiveDate} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5">
            <span className="font-medium text-fg">{longDate(r.effectiveDate)}</span>
            <span className="text-fg-2">
              {fmt.int(r.dailyCalories)} kcal · {fmt.g(r.dailyProtein)} g protein · {fmt.g(r.dailyCarbs)} g carbs · {fmt.g(r.dailyFat)} g fat
              {r.dailyFiber !== null ? ` · ${fmt.g(r.dailyFiber)} g fiber` : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-fg-3">Targets before {longDate(first.effectiveDate)} weren&apos;t recorded, so Analytics doesn&apos;t score those days.</p>
    </details>
  );
}

/* ───────── Weight goal ───────── */

const PACES_KG = [0.25, 0.5, 0.75, 1];

function WeightGoalSection({ settings, unit, save, saving }: SectionProps & { unit: WeightUnit }) {
  const initialGoal = settings.goalWeightKg === null ? "" : weightInputValue(settings.goalWeightKg, unit);
  const [goalWeight, setGoalWeight] = useState(initialGoal);
  const [goalType, setGoalType] = useState(settings.goalType);
  const [pace, setPace] = useState(settings.goalWeeklyRateKg);
  const [error, setError] = useState<string | null>(null);

  // Only send the goal weight if the user edited it: re-converting an untouched display value could drift.
  const goalEdited = goalWeight.trim() !== initialGoal;
  const dirty = goalEdited || goalType !== settings.goalType || pace !== settings.goalWeeklyRateKg;
  const paces = PACES_KG.includes(settings.goalWeeklyRateKg) ? PACES_KG : [...PACES_KG, settings.goalWeeklyRateKg].sort((a, b) => a - b);
  const paceLabel = (kg: number) => (unit === "lbs" ? `${formatWeight(kg, "lbs", 2)} lb / week` : `${kg.toFixed(2)} kg / week`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const patch: Record<string, unknown> = {};
    if (goalEdited) {
      const v = goalWeight.trim();
      if (v !== "" && !(Number(v) > 0)) return setError("Enter a goal weight, or leave it empty for none.");
      patch.goalWeightKg = v === "" ? null : toKg(Number(v), unit);
    }
    if (goalType !== settings.goalType) patch.goalType = goalType;
    if (pace !== settings.goalWeeklyRateKg) patch.goalWeeklyRateKg = pace;
    try {
      if (await save("weight-goal", patch)) toast("Weight goal saved", { kind: "success" });
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="weight-goal"
        title="Weight goal"
        footer={
          dirty || error ? (
            <>
              <SaveError message={error} />
              <button type="submit" className="btn btn-primary" disabled={!dirty || saving !== null}>
                {saving === "weight-goal" ? "Saving…" : "Save weight goal"}
              </button>
            </>
          ) : undefined
        }
      >
        <Row label="Current weight" hint="From your latest daily weigh-in.">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold tabular text-fg" data-testid="current-weight">
              {settings.currentWeightKg === null ? <span className="font-normal text-fg-3">No weigh-in yet</span> : `${formatWeight(settings.currentWeightKg, unit)} ${unit}`}
            </span>
            <Link href="/weight" className="btn btn-secondary btn-sm">
              {settings.currentWeightKg === null ? "Log weight" : "Manage weight history"}
            </Link>
          </div>
        </Row>
        <Row label="Goal weight" htmlFor="goal-weight" hint="Leave empty for no goal.">
          <NumberField id="goal-weight" unit={unit} value={goalWeight} onChange={setGoalWeight} placeholder="None" />
        </Row>
        <Row label="Direction">
          <Segmented
            ariaLabel="Goal direction"
            value={goalType}
            onChange={setGoalType}
            options={[
              { value: "lose", label: "Lose" },
              { value: "maintain", label: "Maintain" },
              { value: "gain", label: "Gain" },
            ]}
            className="w-full sm:w-auto"
          />
        </Row>
        <Row label="Weekly pace" htmlFor="pace" hint="Used by the target calculator.">
          <select id="pace" className="input" value={pace} disabled={goalType === "maintain"} onChange={(e) => setPace(Number(e.target.value))}>
            {paces.map((kg) => (
              <option key={kg} value={kg}>
                {paceLabel(kg)}
              </option>
            ))}
          </select>
        </Row>
      </Section>
    </form>
  );
}
