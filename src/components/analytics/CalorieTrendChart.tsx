"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { formatDate, todayLocal, type DateString } from "@/lib/dates";
import { fmt } from "@/components/ui/primitives";
import type { DailyIntakePoint } from "@/lib/nutrition/analytics";
import { cn } from "@/lib/utils";

interface CalorieTrendChartProps {
  daily: DailyIntakePoint[];
  from: DateString;
  to: DateString;
  target: number | null;
}

export function CalorieTrendChart({ daily, from, to, target }: CalorieTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const today = todayLocal();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loggedDays = useMemo(() => daily.filter((d) => d.logged && d.calories !== null), [daily]);
  const maxCalories = useMemo(() => {
    const vals = loggedDays.map((d) => d.calories as number);
    const top = vals.length > 0 ? Math.max(...vals) : 2000;
    const ceiling = target ? Math.max(target * 1.25, top * 1.1) : top * 1.1;
    return Math.max(1000, Math.ceil(ceiling / 200) * 200);
  }, [loggedDays, target]);

  const W = width;
  const H = 200;
  const pad = { l: 48, r: 16, t: 24, b: 32 };
  const plotW = Math.max(10, W - pad.l - pad.r);
  const plotH = Math.max(10, H - pad.t - pad.b);

  const count = daily.length;
  const barSlot = plotW / (count || 1);
  const barW = Math.max(2, Math.min(24, barSlot * 0.65));

  const yOf = (val: number) => pad.t + (1 - val / maxCalories) * plotH;
  const baseY = pad.t + plotH;

  // Generate 4-5 neat horizontal grid ticks
  const yTicks = useMemo(() => {
    const step = maxCalories > 3000 ? 1000 : maxCalories > 1500 ? 500 : 250;
    const ticks: number[] = [];
    for (let v = 0; v <= maxCalories; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [maxCalories]);

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - pad.l;
    if (x < 0 || x > plotW) {
      setHoverIndex(null);
      return;
    }
    const idx = Math.floor(x / barSlot);
    if (idx >= 0 && idx < daily.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const hoveredPoint = hoverIndex !== null ? daily[hoverIndex] : null;

  return (
    <div ref={containerRef} className="w-full select-none" data-testid="calorie-trend-container">
      {/* Header status / hover details */}
      <div className="flex min-h-[1.75rem] items-center justify-between px-1 text-xs text-fg-2">
        {hoveredPoint ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{formatDate(hoveredPoint.date)}</span>
            {hoveredPoint.logged ? (
              <span className="tabular">
                <span className="font-semibold text-fg">{fmt.int(hoveredPoint.calories ?? 0)} kcal</span>
                {hoveredPoint.protein !== null && (
                  <span className="ml-2 text-fg-3">· {hoveredPoint.protein}g protein</span>
                )}
                {target && hoveredPoint.calories !== null && (
                  <span className="ml-2 text-fg-3">
                    ({hoveredPoint.calories >= target ? "+" : ""}
                    {fmt.int(hoveredPoint.calories - target)} vs target)
                  </span>
                )}
                {hoveredPoint.date === today && <span className="ml-2 text-primary font-medium">(Today)</span>}
              </span>
            ) : (
              <span className="text-fg-3 italic">No meals logged</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-xs bg-fg-2" /> Logged intake
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-xs border border-dashed border-line bg-surface-2" /> Unlogged day
            </span>
            {target && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 bg-fg-3 border-t border-dashed border-fg-3" /> Target
              </span>
            )}
          </div>
        )}
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y"
        role="img"
        aria-label={`Daily calories from ${formatDate(from)} to ${formatDate(to)}. Average on logged days is derived from entries.`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "2 3"}
            />
            <text
              x={pad.l - 8}
              y={yOf(tick) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-3)"
              className="tabular select-none"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Hairline target dashed line */}
        {target && target > 0 && target <= maxCalories && (
          <g>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={yOf(target)}
              y2={yOf(target)}
              stroke="var(--fg-3)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text
              x={W - pad.r}
              y={yOf(target) - 5}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-3)"
              className="tabular select-none"
            >
              Target {fmt.int(target)}
            </text>
          </g>
        )}

        {/* Daily Columns */}
        {daily.map((d, i) => {
          const xCenter = pad.l + i * barSlot + barSlot / 2;
          const isToday = d.date === today;
          const isHovered = hoverIndex === i;

          if (!d.logged) {
            // Unlogged gap: subtle dashed pillar marker in baseline
            return (
              <g key={d.date}>
                <line
                  x1={xCenter}
                  x2={xCenter}
                  y1={baseY - 4}
                  y2={baseY}
                  stroke="var(--line-strong)"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              </g>
            );
          }

          const cal = d.calories ?? 0;
          if (cal === 0) {
            // Legitimate 0 kcal logged day
            return (
              <g key={d.date}>
                <rect
                  x={xCenter - barW / 2}
                  y={baseY - 2}
                  width={barW}
                  height={2}
                  fill="var(--fg-3)"
                  rx={1}
                />
              </g>
            );
          }

          const barH = Math.max(2, baseY - yOf(cal));
          const y = baseY - barH;

          return (
            <g key={d.date}>
              <rect
                x={xCenter - barW / 2}
                y={y}
                width={barW}
                height={barH}
                rx={Math.min(2, barW / 2)}
                fill={isToday ? "var(--primary)" : isHovered ? "var(--fg)" : "var(--fg-2)"}
                opacity={isHovered ? 1 : 0.85}
              />
              {/* Highlight line for Today */}
              {isToday && (
                <circle
                  cx={xCenter}
                  cy={baseY + 8}
                  r={2}
                  fill="var(--primary)"
                />
              )}
            </g>
          );
        })}

        {/* X-axis date labels */}
        {daily.map((d, i) => {
          const xCenter = pad.l + i * barSlot + barSlot / 2;
          const showLabel =
            count <= 14
              ? true
              : count <= 35
              ? i === 0 || i === count - 1 || i % Math.ceil(count / 6) === 0
              : i === 0 || i === count - 1 || i % Math.ceil(count / 8) === 0;

          if (!showLabel) return null;

          return (
            <text
              key={`x-${d.date}`}
              x={xCenter}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--fg-3)"
              className="select-none"
            >
              {formatDate(d.date, { month: "short", day: "numeric" })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
