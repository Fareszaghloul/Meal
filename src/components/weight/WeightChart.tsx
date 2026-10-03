"use client";

import React, { useMemo, useState } from "react";
import { withTrend, type WeightPoint } from "@/lib/nutrition/weight-trend";
import { addDays, formatDate, todayLocal } from "@/lib/dates";
import { Segmented } from "@/components/ui/primitives";

type Range = "30" | "90" | "365" | "all";

/**
 * Raw readings as faint dots, 7-day average as the line, goal as a hairline.
 * X is proportional to date so gaps look like gaps.
 */
export function WeightChart({ points, goalKg, unit }: { points: WeightPoint[]; goalKg: number | null; unit: "kg" | "lbs" }) {
  const [range, setRange] = useState<Range>("90");
  const [hover, setHover] = useState<number | null>(null);
  const conv = (kg: number) => (unit === "lbs" ? kg * 2.20462 : kg);

  const data = useMemo(() => {
    const all = withTrend(points);
    if (range === "all") return all;
    const cutoff = addDays(todayLocal(), -Number(range));
    return all.filter((p) => p.date >= cutoff);
  }, [points, range]);

  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  const xs = data.map((p) => new Date(p.date + "T12:00:00").getTime());
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const ys = data.flatMap((p) => [p.weightKg, p.trendKg]).concat(goalKg ? [goalKg] : []);
  const minY = ys.length ? Math.floor(Math.min(...ys) - 0.5) : 0;
  const maxY = ys.length ? Math.ceil(Math.max(...ys) + 0.5) : 1;
  const x = (t: number) => pad.l + ((t - minX) / (maxX - minX || 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY || 1)) * (H - pad.t - pad.b);
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(p.trendKg).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: 4 }, (_, i) => minY + ((maxY - minY) * i) / 3);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="text-xs text-fg-2">
          {h ? (
            <span className="tabular">
              {formatDate(h.date)} · <span className="text-fg">{conv(h.weightKg).toFixed(1)} {unit}</span> · 7-day avg {conv(h.trendKg).toFixed(1)}
            </span>
          ) : (
            <span>
              <span className="mr-3 inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-fg" /> 7-day average
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-3" /> readings
              </span>
            </span>
          )}
        </div>
        <Segmented
          value={range}
          onChange={setRange}
          size="sm"
          options={[
            { value: "30", label: "1M" },
            { value: "90", label: "3M" },
            { value: "365", label: "1Y" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      {data.length < 2 ? (
        <p className="px-4 py-10 text-center text-sm text-fg-3">Log a few more weigh-ins to see a trend.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Weight over time" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--fg-3)">
                {conv(t).toFixed(unit === "lbs" ? 0 : 1)}
              </text>
            </g>
          ))}
          {goalKg && goalKg >= minY && goalKg <= maxY && (
            <>
              <line x1={pad.l} x2={W - pad.r} y1={y(goalKg)} y2={y(goalKg)} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1} />
              <text x={W - pad.r} y={y(goalKg) - 4} textAnchor="end" fontSize={10} fill="var(--accent)">
                goal {conv(goalKg).toFixed(1)}
              </text>
            </>
          )}
          {data.map((p, i) => (
            <circle key={p.date} cx={x(xs[i])} cy={y(p.weightKg)} r={hover === i ? 3.5 : 2.2} fill={hover === i ? "var(--fg)" : "var(--fg-3)"} opacity={hover === i ? 1 : 0.55} />
          ))}
          <path d={line} fill="none" stroke="var(--fg)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p, i) => (
            <rect
              key={`h${p.date}`}
              x={i === 0 ? pad.l : (x(xs[i - 1]) + x(xs[i])) / 2}
              width={i === data.length - 1 ? W - pad.r - (i === 0 ? pad.l : (x(xs[i - 1]) + x(xs[i])) / 2) : (x(xs[i + 1]) - (i === 0 ? pad.l : x(xs[i - 1]))) / 2}
              y={pad.t}
              height={H - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
          <text x={pad.l} y={H - 6} fontSize={10} fill="var(--fg-3)">
            {formatDate(data[0].date, { month: "short", day: "numeric" })}
          </text>
          <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize={10} fill="var(--fg-3)">
            {formatDate(data[data.length - 1].date, { month: "short", day: "numeric" })}
          </text>
        </svg>
      )}
    </div>
  );
}
