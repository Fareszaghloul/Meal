"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { calculateTDEEAndTarget, MET_TABLE, SIMPLE_ACTIVITY_MULTIPLIERS, type WorkoutRoutineInput } from "@/lib/nutrition/tdee";
import { fmt, NumberField, Segmented } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { Row, SaveError, Section } from "@/components/settings/layout";
import type { SaveSettings, SettingsDto } from "@/components/settings/types";

export interface TargetValues {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary — desk job, little exercise",
  light: "Light — exercise 1–3 days a week",
  moderate: "Moderate — exercise 3–5 days a week",
  very: "Very active — hard exercise 6–7 days",
  extra: "Extremely active — physical job or daily training",
};

const sameWorkouts = (a: WorkoutRoutineInput[], b: WorkoutRoutineInput[]) =>
  JSON.stringify(a.map((w) => [w.id, w.workoutType, w.durationMinutes, w.sessionsPerWeek])) ===
  JSON.stringify(b.map((w) => [w.id, w.workoutType, w.durationMinutes, w.sessionsPerWeek]));

/**
 * Estimates a calorie target from body and activity inputs. The OUTPUT never changes saved targets:
 * "Use as targets" only fills the Nutrition targets form, which the user reviews and saves.
 * Needs a logged weight; there is no stand-in default.
 */
export function CalculatorSection({
  settings,
  save,
  saving,
  onUseTargets,
}: {
  settings: SettingsDto;
  save: SaveSettings;
  saving: string | null;
  onUseTargets: (v: TargetValues) => void;
}) {
  const imperial = settings.measurementSystem === "imperial";
  const totalIn = Math.round(settings.heightCm / 2.54);
  const [sex, setSex] = useState(settings.sex);
  const [age, setAge] = useState(String(settings.age));
  const [heightCm, setHeightCm] = useState(String(settings.heightCm));
  const [feet, setFeet] = useState(String(Math.floor(totalIn / 12)));
  const [inches, setInches] = useState(String(totalIn % 12));
  const [heightEdited, setHeightEdited] = useState(false);
  const [simple, setSimple] = useState(settings.useSimpleActivityMode);
  const [level, setLevel] = useState(settings.simpleActivityLevel ?? "moderate");
  const [steps, setSteps] = useState(String(settings.avgDailySteps));
  const [tef, setTef] = useState(settings.useThermicEffectAdjustment);
  const [workouts, setWorkouts] = useState<WorkoutRoutineInput[]>(settings.workouts);
  const [error, setError] = useState<string | null>(null);

  const ageFromBirthDate = settings.birthDate !== null;
  const draftHeightCm = imperial ? Math.round(((Number(feet) || 0) * 12 + (Number(inches) || 0)) * 2.54 * 10) / 10 : Number(heightCm);
  const weightKg = settings.currentWeightKg;

  const patch: Record<string, unknown> = {};
  if (sex !== settings.sex) patch.sex = sex;
  if (!ageFromBirthDate && Number(age) !== settings.age) patch.age = Number(age);
  if (heightEdited && draftHeightCm !== settings.heightCm) patch.heightCm = draftHeightCm;
  if (simple !== settings.useSimpleActivityMode) patch.useSimpleActivityMode = simple;
  if (level !== (settings.simpleActivityLevel ?? "moderate")) patch.simpleActivityLevel = level;
  if (Number(steps) !== settings.avgDailySteps) patch.avgDailySteps = Number(steps);
  if (tef !== settings.useThermicEffectAdjustment) patch.useThermicEffectAdjustment = tef;
  const workoutsDirty = !sameWorkouts(workouts, settings.workouts);
  const dirty = Object.keys(patch).length > 0 || workoutsDirty;

  const result = useMemo(() => {
    if (weightKg === null) return null;
    return calculateTDEEAndTarget({
      sex,
      age: Number(age) || settings.age,
      heightCm: draftHeightCm || settings.heightCm,
      weightKg,
      goalType: settings.goalType,
      goalWeeklyRateKg: settings.goalWeeklyRateKg,
      avgDailySteps: Number(steps) || 0,
      workouts,
      useSimpleActivityMode: simple,
      simpleActivityLevel: level,
      useThermicEffectAdjustment: tef,
    });
  }, [weightKg, sex, age, draftHeightCm, steps, workouts, simple, level, tef, settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (workoutsDirty) {
        const keep = new Set(workouts.map((w) => w.id).filter(Boolean));
        for (const old of settings.workouts) if (old.id && !keep.has(old.id)) await api(`/api/workouts?id=${old.id}`, { method: "DELETE" });
        for (const w of workouts) {
          const body = { workoutType: w.workoutType, durationMinutes: Number(w.durationMinutes) || 0, sessionsPerWeek: Number(w.sessionsPerWeek) || 0 };
          if (w.id) await api("/api/workouts", { method: "PUT", json: { id: w.id, ...body } });
          else await api("/api/workouts", { method: "POST", json: body });
        }
      }
      const next = await save("calculator", patch);
      if (!next) return;
      setWorkouts(next.workouts);
      setHeightEdited(false);
      toast("Calculator inputs saved", { kind: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Check your connection and try again.");
    }
  };

  const updateWorkout = (i: number, field: keyof WorkoutRoutineInput, value: string | number) =>
    setWorkouts((ws) => ws.map((w, j) => (j === i ? { ...w, [field]: value } : w)));

  return (
    <form onSubmit={submit} noValidate>
      <Section
        id="calculator"
        title="Target calculator"
        description="Estimates daily energy use. It never changes your targets on its own."
        footer={
          dirty || error ? (
            <>
              <SaveError message={error} />
              <button type="submit" className="btn btn-secondary" disabled={!dirty || saving !== null}>
                {saving === "calculator" ? "Saving…" : "Save calculator inputs"}
              </button>
            </>
          ) : undefined
        }
      >
        <Row label="Sex" hint="For the BMR formula.">
          <Segmented ariaLabel="Sex" value={sex} onChange={setSex} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} className="w-full sm:w-auto" />
        </Row>
        <Row label="Age" htmlFor="calc-age" hint={ageFromBirthDate ? <>From your birth date in <Link href="/profile" className="underline">Profile</Link>.</> : undefined}>
          <NumberField id="calc-age" inputMode="numeric" unit="years" value={age} onChange={setAge} readOnly={ageFromBirthDate} />
        </Row>
        <Row label="Height" htmlFor={imperial ? "calc-feet" : "calc-height"}>
          {imperial ? (
            <div className="grid grid-cols-2 gap-2">
              <NumberField id="calc-feet" aria-label="Height, feet" inputMode="numeric" unit="ft" value={feet} onChange={(v) => (setFeet(v), setHeightEdited(true))} />
              <NumberField aria-label="Height, inches" inputMode="numeric" unit="in" value={inches} onChange={(v) => (setInches(v), setHeightEdited(true))} />
            </div>
          ) : (
            <NumberField id="calc-height" unit="cm" value={heightCm} onChange={(v) => (setHeightCm(v), setHeightEdited(true))} />
          )}
        </Row>
        <Row label="Activity model">
          <Segmented
            ariaLabel="Activity model"
            value={simple ? "simple" : "components"}
            onChange={(v) => setSimple(v === "simple")}
            options={[
              { value: "components", label: "Steps + workouts" },
              { value: "simple", label: "Activity level" },
            ]}
            className="w-full sm:w-auto"
          />
        </Row>
        {simple ? (
          <Row label="Activity level" htmlFor="calc-level">
            <select id="calc-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {Object.keys(SIMPLE_ACTIVITY_MULTIPLIERS).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k] ?? k} (×{SIMPLE_ACTIVITY_MULTIPLIERS[k]})
                </option>
              ))}
            </select>
          </Row>
        ) : (
          <>
            <Row label="Average daily steps" htmlFor="calc-steps">
              <NumberField id="calc-steps" inputMode="numeric" unit="steps" value={steps} onChange={setSteps} />
            </Row>
            <Row label="Workouts" hint="Weekly routine.">
              <div className="space-y-2">
                {workouts.map((w, i) => (
                  <div key={w.id ?? `new-${i}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4rem_auto] items-end gap-2">
                    <div className="min-w-0">
                      <label className="label" htmlFor={`wk-type-${i}`}>
                        Activity
                      </label>
                      <select id={`wk-type-${i}`} className="input" value={w.workoutType} onChange={(e) => updateWorkout(i, "workoutType", e.target.value)}>
                        {Object.entries(MET_TABLE).map(([k, m]) => (
                          <option key={k} value={k}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <NumberField label="Min" inputMode="numeric" value={String(w.durationMinutes)} onChange={(v) => updateWorkout(i, "durationMinutes", Number(v) || 0)} />
                    <NumberField label="/ wk" value={String(w.sessionsPerWeek)} onChange={(v) => updateWorkout(i, "sessionsPerWeek", Number(v) || 0)} />
                    <button type="button" className="btn btn-ghost btn-icon" aria-label={`Remove ${MET_TABLE[w.workoutType]?.label ?? "workout"}`} onClick={() => setWorkouts((ws) => ws.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setWorkouts((ws) => [...ws, { workoutType: "weightlifting_moderate", durationMinutes: 45, sessionsPerWeek: 3 }])}
                >
                  <Plus className="h-4 w-4" /> Add workout
                </button>
              </div>
            </Row>
            <Row label="Thermic effect of food" htmlFor="calc-tef" hint="Adds about 8% for digestion.">
              <input id="calc-tef" type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={tef} onChange={(e) => setTef(e.target.checked)} />
            </Row>
          </>
        )}

        <div className="px-4 py-4" aria-live="polite" data-testid="calculator-output">
          {result === null ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-fg">Weight required</p>
                <p className="text-xs text-fg-3">Log a weigh-in to estimate energy use. Your saved targets aren&apos;t affected.</p>
              </div>
              <Link href="/weight" className="btn btn-secondary btn-sm">
                Log weight
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs tabular sm:grid-cols-3">
                <div className="flex justify-between gap-2"><dt className="text-fg-3">BMR</dt><dd className="text-fg">{fmt.int(result.bmr)} kcal</dd></div>
                {!simple && <div className="flex justify-between gap-2"><dt className="text-fg-3">Steps</dt><dd className="text-fg">+{fmt.int(result.stepCalories)} kcal</dd></div>}
                {!simple && <div className="flex justify-between gap-2"><dt className="text-fg-3">Workouts</dt><dd className="text-fg">+{fmt.int(result.dailyExerciseCalories)} kcal</dd></div>}
                {!simple && tef && <div className="flex justify-between gap-2"><dt className="text-fg-3">Digestion</dt><dd className="text-fg">+{fmt.int(result.tefAdjustment)} kcal</dd></div>}
                <div className="flex justify-between gap-2"><dt className="text-fg-3">Maintenance</dt><dd className="font-medium text-fg">{fmt.int(result.tdee)} kcal</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-fg-3">Goal ({settings.goalType})</dt><dd className="text-fg">{result.deficitOrSurplus > 0 ? "+" : ""}{fmt.int(result.deficitOrSurplus)} kcal</dd></div>
              </dl>
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-xs text-fg-3">Estimate</p>
                  <p className="text-lg font-semibold tabular text-fg">
                    {fmt.int(result.targetCalories)} kcal
                    <span className="ml-2 text-xs font-normal text-fg-2">
                      {result.suggestedMacros.protein} g protein · {result.suggestedMacros.carbs} g carbs · {result.suggestedMacros.fat} g fat
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    onUseTargets({
                      dailyCalories: result.targetCalories,
                      dailyProtein: result.suggestedMacros.protein,
                      dailyCarbs: result.suggestedMacros.carbs,
                      dailyFat: result.suggestedMacros.fat,
                    })
                  }
                >
                  Use as targets…
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </form>
  );
}
