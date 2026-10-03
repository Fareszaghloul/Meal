"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/dates";
import type { WeightEntry } from "@/lib/domain";
import { summarize } from "@/lib/nutrition/weight-trend";
import { EmptyState, Menu, fmt } from "@/components/ui/primitives";
import { WeightChart } from "@/components/weight/WeightChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { invalidateAll } from "@/lib/client/day-store";
import { toast } from "@/components/ui/Toast";
import type { RawWeightEntry } from "@/lib/nutrition/weight-analytics";

interface WeightResponse {
  dailyEntries: WeightEntry[];
  inbodyEntries: WeightEntry[];
  analytics: { goalWeightKg: number | null };
  measurementSystem: string;
  userHeightCm: number | null;
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-fg-3">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular text-fg">{value}</div>
      {sub && <div className="text-xs tabular text-fg-2">{sub}</div>}
    </div>
  );
}

export default function WeightPage() {
  const [data, setData] = useState<WeightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; entry: RawWeightEntry | null; type: "daily" | "inbody" }>({ open: false, entry: null, type: "daily" });
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api<WeightResponse>("/api/weight")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);
  useEffect(load, [load]);

  const unit: "kg" | "lbs" = data?.measurementSystem === "imperial" ? "lbs" : "kg";
  const conv = (kg: number | null) => (kg === null ? null : unit === "lbs" ? kg * 2.20462 : kg);
  const daily = useMemo(() => [...(data?.dailyEntries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "")), [data]);
  const s = useMemo(() => summarize(daily), [daily]);
  const goal = data?.analytics.goalWeightKg ?? null;
  const total = s.latestKg !== null && s.startKg !== null ? s.latestKg - s.startKg : null;
  const toGoal = goal !== null && s.avg7Kg !== null ? s.avg7Kg - goal : null;

  const remove = async (e: WeightEntry) => {
    if (!window.confirm(`Delete the ${e.weightKg} kg entry from ${e.date}?`)) return;
    try {
      await api(`/api/weight?id=${e.id}`, { method: "DELETE" });
      invalidateAll();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't delete", { kind: "error" });
    }
  };

  const visible = showAll ? daily : daily.slice(0, 14);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Weight</h1>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ open: true, entry: null, type: "inbody" })}>
            Add InBody scan
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, entry: null, type: "daily" })}>
            <Plus className="h-4 w-4" /> Log weight
          </button>
        </div>
      </header>

      {error && (
        <div className="card flex items-center justify-between px-4 py-3 text-sm text-fg-2" role="alert">
          Couldn't load: {error}
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {!data && !error && <div className="skeleton h-72" aria-busy="true" />}

      {data && (
        <>
          <section className="card overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-5 [&>*]:bg-surface">
              <Stat label="Current (7-day avg)" value={s.avg7Kg !== null ? conv(s.avg7Kg)!.toFixed(1) : "—"} sub={s.latestKg !== null ? `latest ${conv(s.latestKg)!.toFixed(1)} ${unit} · ${formatDate(s.latestDate!)}` : unit} />
              <Stat label="Change · 7 days" value={s.change7Kg !== null ? fmt.signed(conv(s.change7Kg)!) : "—"} sub={unit} />
              <Stat label="Change · 30 days" value={s.change30Kg !== null ? fmt.signed(conv(s.change30Kg)!) : "—"} sub={unit} />
              <Stat label="Since start" value={total !== null ? fmt.signed(conv(total)!) : "—"} sub={s.startKg !== null ? `from ${conv(s.startKg)!.toFixed(1)} ${unit}` : unit} />
              <Stat label="Goal" value={goal !== null ? conv(goal)!.toFixed(1) : "—"} sub={toGoal !== null ? `${Math.abs(conv(toGoal)!).toFixed(1)} ${unit} to go` : "set in Settings"} />
            </div>
            <div className="border-t border-line">
              <WeightChart points={daily} goalKg={goal} unit={unit} />
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Weigh-ins</h2>
            {daily.length === 0 ? (
              <EmptyState title="No weigh-ins yet" description="Weigh yourself at the same time each day; the 7-day average smooths the noise." action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ open: true, entry: null, type: "daily" })}>Log weight</button>} />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {visible.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2 pl-4 pr-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-fg">{formatDate(e.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                          <span className="text-sm font-medium tabular text-fg">
                            {conv(e.weightKg)!.toFixed(1)} {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-fg-3">
                          <span>{e.time ?? ""}</span>
                          {e.notes && <span className="truncate pl-3">{e.notes}</span>}
                        </div>
                      </div>
                      <Menu
                        items={[
                          { label: "Edit", onClick: () => setModal({ open: true, entry: e, type: "daily" }) },
                          { label: "Delete", danger: true, onClick: () => void remove(e) },
                        ]}
                        label={`Actions for ${e.date}`}
                      />
                    </li>
                  ))}
                </ul>
                {daily.length > 14 && (
                  <button type="button" className="w-full border-t border-line py-2 text-xs text-fg-2 hover:bg-surface-2" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show fewer" : `Show all ${daily.length}`}
                  </button>
                )}
              </>
            )}
          </section>

          {data.inbodyEntries.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">InBody scans</h2>
              <ul className="divide-y divide-line">
                {[...data.inbodyEntries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2 pl-4 pr-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-fg">{formatDate(e.date, { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span className="font-medium tabular text-fg">
                            {conv(e.weightKg)!.toFixed(1)} {unit}
                          </span>
                        </div>
                        <div className="text-xs tabular text-fg-3">
                          {e.bodyFatPct !== null && <>Body fat {e.bodyFatPct}% · </>}
                          {e.smmKg !== null && <>SMM {conv(e.smmKg)!.toFixed(1)} {unit} · </>}
                          {e.bmi !== null && <>BMI {e.bmi}</>}
                        </div>
                      </div>
                      <Menu
                        items={[
                          { label: "Edit", onClick: () => setModal({ open: true, entry: e, type: "inbody" }) },
                          { label: "Delete", danger: true, onClick: () => void remove(e) },
                        ]}
                        label={`Actions for scan ${e.date}`}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </>
      )}

      <LogWeightModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSuccess={() => {
          invalidateAll();
          load();
        }}
        initialEntry={modal.entry}
        defaultType={modal.type}
        measurementSystem={data?.measurementSystem}
        userHeightCm={data?.userHeightCm}
      />
    </div>
  );
}
