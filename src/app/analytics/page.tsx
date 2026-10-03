"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { addDays, formatDate, todayLocal } from "@/lib/dates";
import type { NutritionGoals } from "@/lib/domain";
import { EmptyState, Segmented, fmt } from "@/components/ui/primitives";
import { withTrend } from "@/lib/nutrition/weight-trend";
import { cn } from "@/lib/utils";

interface PeriodStats {
  days: number;
  daysLogged: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  calorieAdherence: number | null;
  proteinAdherence: number | null;
}
interface Analytics {
  from: string;
  to: string;
  goals: NutritionGoals & { measurementSystem: string; goalWeightKg: number | null };
  week: PeriodStats;
  period: PeriodStats;
  daily: { date: string; calories: number; protein: number }[];
  topFoods: { name: string; count: number; calories: number }[];
  weight: { latestKg: number | null; avg7Kg: number | null; change7Kg: number | null; change30Kg: number | null; startKg: number | null; points: { date: string; weightKg: number }[] };
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

function PeriodBlock({ title, s, goals }: { title: string; s: PeriodStats; goals: NutritionGoals }) {
  if (s.daysLogged === 0) {
    return (
      <section className="card">
        <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{title}</h2>
        <EmptyState title="No days logged in this period" compact />
      </section>
    );
  }
  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-sm font-semibold">
        {title}
        <span className="text-xs font-normal tabular text-fg-3">
          {s.daysLogged} of {s.days} days logged
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 [&>*]:bg-surface">
        <Stat label="Calories / day" value={s.avgCalories !== null ? fmt.int(s.avgCalories) : "—"} sub={`target ${fmt.int(goals.calories)}`} />
        <Stat label="Protein / day" value={s.avgProtein !== null ? `${fmt.g(s.avgProtein)} g` : "—"} sub={`target ${fmt.g(goals.protein)} g`} />
        <Stat label="Carbs / day" value={s.avgCarbs !== null ? `${fmt.g(s.avgCarbs)} g` : "—"} sub={`target ${fmt.g(goals.carbs)} g`} />
        <Stat label="Fat / day" value={s.avgFat !== null ? `${fmt.g(s.avgFat)} g` : "—"} sub={`target ${fmt.g(goals.fat)} g`} />
        <Stat label="Calorie adherence" value={s.calorieAdherence !== null ? `${s.calorieAdherence}%` : "—"} sub="days within ±10% of target" />
        <Stat label="Protein target hit" value={s.proteinAdherence !== null ? `${s.proteinAdherence}%` : "—"} sub="days at or above target" />
        <Stat label="Fiber / day" value={s.avgFiber !== null ? `${fmt.g(s.avgFiber)} g` : "—"} sub={goals.fiber ? `target ${fmt.g(goals.fiber)} g` : undefined} />
        <Stat label="Logged days" value={s.daysLogged} sub={`${Math.round((s.daysLogged / s.days) * 100)}% of period`} />
      </div>
    </section>
  );
}

/** Daily calories as thin bars with the target as a hairline. */
function CalorieChart({ daily, from, to, target }: { daily: Analytics["daily"]; from: string; to: string; target: number }) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  const max = Math.max(target * 1.2, ...daily.map((d) => d.calories)) || 1;
  const W = 600;
  const H = 140;
  const pad = { l: 0, r: 0, t: 8, b: 18 };
  const bw = (W - pad.l - pad.r) / dates.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" role="img" aria-label="Daily calories">
      {dates.map((d, i) => {
        const v = byDate.get(d)?.calories ?? 0;
        const over = v > target * 1.1;
        return <rect key={d} x={pad.l + i * bw + bw * 0.2} y={v ? y(v) : H - pad.b} width={bw * 0.6} height={v ? H - pad.b - y(v) : 0} rx={1} fill={over ? "var(--negative)" : "var(--fg-2)"} opacity={0.9} />;
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--fg)" strokeDasharray="3 3" strokeWidth={1} />
      <text x={W - pad.r} y={y(target) - 3} textAnchor="end" fontSize={10} fill="var(--fg-3)">
        {fmt.int(target)} kcal
      </text>
      {dates.map((d, i) =>
        i === 0 || i === dates.length - 1 || (dates.length > 14 && i % Math.ceil(dates.length / 6) === 0) || (dates.length <= 14 && i % 2 === 0) ? (
          <text key={`t${d}`} x={pad.l + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--fg-3)">
            {formatDate(d, { month: "short", day: "numeric" })}
          </text>
        ) : null
      )}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const to = todayLocal();

  useEffect(() => {
    setError(null);
    api<Analytics>(`/api/analytics?to=${to}&days=${days}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [days, to]);

  const trend = useMemo(() => (data ? withTrend(data.weight.points) : []), [data]);
  const unit = data?.goals.measurementSystem === "imperial" ? "lbs" : "kg";
  const cv = (kg: number | null) => (kg === null ? null : unit === "lbs" ? kg * 2.20462 : kg);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <Segmented
          value={String(days) as "7" | "30" | "90"}
          onChange={(v) => setDays(Number(v) as 7 | 30 | 90)}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
          size="sm"
        />
      </header>

      {error && (
        <div className="card px-4 py-3 text-sm text-fg-2" role="alert">
          Couldn't load analytics: {error}
        </div>
      )}
      {!data && !error && (
        <div className="space-y-4" aria-busy="true">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      )}

      {data && (
        <>
          <section className="card">
            <h2 className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-sm font-semibold">
              Calories per day
              <span className="text-xs font-normal text-fg-3">
                {formatDate(data.from, { month: "short", day: "numeric" })} – {formatDate(data.to, { month: "short", day: "numeric" })}
              </span>
            </h2>
            <div className="px-3 pt-2">
              {data.daily.length === 0 ? <EmptyState title="Nothing logged in this period" compact /> : <CalorieChart daily={data.daily} from={data.from} to={data.to} target={data.goals.calories} />}
            </div>
          </section>

          {days !== 7 && <PeriodBlock title="Last 7 days" s={data.week} goals={data.goals} />}
          <PeriodBlock title={`Last ${days} days`} s={data.period} goals={data.goals} />

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card overflow-hidden">
              <h2 className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-sm font-semibold">
                Weight
                <Link href="/weight" className="text-xs font-normal text-fg-2 hover:text-fg hover:underline">
                  Details
                </Link>
              </h2>
              {data.weight.latestKg === null ? (
                <EmptyState title="No weigh-ins yet" compact />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-px bg-line [&>*]:bg-surface">
                    <Stat label="7-day avg" value={cv(data.weight.avg7Kg) !== null ? `${cv(data.weight.avg7Kg)!.toFixed(1)}` : "—"} sub={unit} />
                    <Stat label="Change · 7d" value={data.weight.change7Kg !== null ? fmt.signed(cv(data.weight.change7Kg)!) : "—"} sub={unit} />
                    <Stat label="Change · 30d" value={data.weight.change30Kg !== null ? fmt.signed(cv(data.weight.change30Kg)!) : "—"} sub={unit} />
                  </div>
                  {trend.length >= 2 && <Sparkline points={trend} />}
                </>
              )}
            </section>

            <section className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">Most logged foods</h2>
              {data.topFoods.length === 0 ? (
                <EmptyState title="Nothing logged yet" compact />
              ) : (
                <ol className="divide-y divide-line">
                  {data.topFoods.map((f, i) => (
                    <li key={f.name + i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="w-4 shrink-0 text-xs tabular text-fg-3">{i + 1}</span>
                        <span className="truncate text-fg">{f.name}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular text-fg-2">
                        {f.count}× · {fmt.int(f.calories)} kcal
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Sparkline({ points }: { points: { date: string; weightKg: number; trendKg: number }[] }) {
  const W = 300;
  const H = 64;
  const xs = points.map((p) => new Date(p.date).getTime());
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) || minX + 1;
  const ys = points.flatMap((p) => [p.weightKg, p.trendKg]);
  const minY = Math.min(...ys) - 0.3;
  const maxY = Math.max(...ys) + 0.3;
  const x = (t: number) => 4 + ((t - minX) / (maxX - minX || 1)) * (W - 8);
  const y = (v: number) => 4 + (1 - (v - minY) / (maxY - minY || 1)) * (H - 8);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(p.trendKg).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-16 w-full px-3 pb-2")} role="img" aria-label="Weight trend">
      {points.map((p, i) => (
        <circle key={p.date} cx={x(xs[i])} cy={y(p.weightKg)} r={1.8} fill="var(--fg-3)" opacity={0.6} />
      ))}
      <path d={line} fill="none" stroke="var(--fg)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
