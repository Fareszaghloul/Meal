"use client";

import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/dates";
import type { WeightEntry } from "@/lib/domain";
import { compareReadings } from "@/lib/nutrition/weight-trend";
import { EmptyState, Menu, fmt, useConfirm } from "@/components/ui/primitives";
import { WeightChart } from "@/components/weight/WeightChart";
import { LogWeightModal } from "@/components/weight/LogWeightModal";
import { invalidateAll } from "@/lib/client/day-store";
import { api } from "@/lib/client/api";
import { toast } from "@/components/ui/Toast";
import { rangeFrom, useWeightData, type WeightRange } from "@/lib/client/weight-store";
import { fromKg, weightUnitFor } from "@/lib/weight-units";

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
  const [range, setRange] = useState<WeightRange>("90");
  const { data, error, reload } = useWeightData(range);
  const [modal, setModal] = useState<{ open: boolean; entry: WeightEntry | null; type: "daily" | "inbody" }>({ open: false, entry: null, type: "daily" });
  const [showAll, setShowAll] = useState(false);
  const confirm = useConfirm();

  const unit = weightUnitFor(data?.measurementSystem);
  const conv = (kg: number | null) => (kg === null ? null : fromKg(kg, unit));
  const from = rangeFrom(range);
  const s = data?.summary;

  // Newest first, only the readings inside the chosen range (the payload also carries a 6-day trend lead-in).
  const readings = useMemo(
    () => (data?.entries ?? []).filter((e) => !from || e.date >= from).sort((a, b) => compareReadings(b, a)),
    [data, from]
  );
  const visible = showAll ? readings : readings.slice(0, 14);
  const goal = s?.goalKg ?? null;
  const sinceStart = s && s.latestKg !== null && s.startKg !== null ? s.latestKg - s.startKg : null;
  const fromGoal = goal !== null && s?.avg7Kg != null ? s.avg7Kg - goal : null;

  const remove = async (e: WeightEntry) => {
    if (!confirm(`Delete the ${fromKg(e.weightKg, unit).toFixed(1)} ${unit} entry from ${e.date}?`)) return;
    try {
      await api(`/api/weight?id=${e.id}`, { method: "DELETE" });
      invalidateAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't delete", { kind: "error" });
    }
  };

  const openLog = (type: "daily" | "inbody" = "daily") => setModal({ open: true, entry: null, type });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-fg">Weight</h1>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openLog("inbody")}>
            Add InBody scan
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openLog()}>
            <Plus className="h-4 w-4" /> Log weight
          </button>
        </div>
      </header>

      {error && (
        <div className="card flex items-center justify-between px-4 py-3 text-sm text-fg-2" role="alert">
          Couldn&apos;t load: {error}
          <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {!data && !error && <div className="skeleton h-72" aria-busy="true" />}

      {data && s && (
        <>
          <section className="card overflow-hidden" aria-label="Weight summary">
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6 [&>*]:bg-surface">
              <Stat label="Latest" value={s.latestKg !== null ? conv(s.latestKg)!.toFixed(1) : "—"} sub={s.latestDate ? `${unit} · ${formatDate(s.latestDate)}` : unit} />
              <Stat label="7-day average" value={s.avg7Kg !== null ? conv(s.avg7Kg)!.toFixed(1) : "—"} sub={unit} />
              <Stat label="Change · 7 days" value={s.change7Kg !== null ? fmt.signed(conv(s.change7Kg)!) : "—"} sub={unit} />
              <Stat label="Change · 30 days" value={s.change30Kg !== null ? fmt.signed(conv(s.change30Kg)!) : "—"} sub={unit} />
              <Stat label="Since first entry" value={sinceStart !== null ? fmt.signed(conv(sinceStart)!) : "—"} sub={s.startKg !== null ? `from ${conv(s.startKg)!.toFixed(1)} ${unit}` : unit} />
              <Stat label="Goal" value={goal !== null ? conv(goal)!.toFixed(1) : "—"} sub={fromGoal !== null ? `${Math.abs(conv(fromGoal)!).toFixed(1)} ${unit} from goal` : goal === null ? "set in Settings" : unit} />
            </div>
            <div className="border-t border-line">
              <WeightChart entries={data.entries} from={from} goalKg={goal} unit={unit} range={range} onRangeChange={setRange} />
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Weigh-ins</h2>
            {readings.length === 0 ? (
              <EmptyState
                title={s.latestKg === null ? "No weigh-ins yet" : "No weigh-ins in this range"}
                description="Weigh yourself at the same time each day; the 7-day average smooths the noise."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openLog()}>
                    Log weight
                  </button>
                }
              />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {visible.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2 pl-4 pr-1" data-testid="weigh-in-row">
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
                        label={`Actions for ${e.date}${e.time ? ` ${e.time}` : ""}`}
                      />
                    </li>
                  ))}
                </ul>
                {readings.length > 14 && (
                  <button type="button" className="min-h-[44px] w-full border-t border-line py-2.5 text-xs text-fg-2 hover:bg-surface-2" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show fewer" : `Show all ${readings.length}`}
                  </button>
                )}
              </>
            )}
          </section>

          {data.inbody.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">InBody scans</h2>
              <ul className="divide-y divide-line">
                {data.inbody.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 pl-4 pr-1" data-testid="inbody-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-fg">{formatDate(e.date, { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span className="font-medium tabular text-fg">
                          {conv(e.weightKg)!.toFixed(1)} {unit}
                        </span>
                      </div>
                      <div className="text-xs tabular text-fg-3">
                        {[
                          e.bodyFatPct != null && `Body fat ${e.bodyFatPct}%`,
                          e.smmKg != null && `SMM ${conv(e.smmKg)!.toFixed(1)} ${unit}`,
                          e.bmi != null && `BMI ${e.bmi}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
        onSuccess={invalidateAll}
        initialEntry={modal.entry}
        defaultType={modal.type}
        measurementSystem={data?.measurementSystem}
      />
    </div>
  );
}
