"use client";

import React, { useState, useMemo } from "react";
import { Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BodyFatDataPoint {
  id: string;
  date: string;
  bodyFatPct: number;
  weightKg?: number;
  notes?: string | null;
}

interface BodyFatTrendChartProps {
  entries: BodyFatDataPoint[];
  className?: string;
}

type TimeRange = "3m" | "6m" | "1y" | "all";

export function BodyFatTrendChart({ entries, className }: BodyFatTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [hoveredPoint, setHoveredPoint] = useState<BodyFatDataPoint | null>(null);

  // Filter entries having a valid bodyFatPct and according to timeRange
  const validEntries = useMemo(() => {
    return (entries || [])
      .filter((e) => typeof e.bodyFatPct === "number" && !isNaN(e.bodyFatPct) && e.bodyFatPct > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (validEntries.length === 0) return [];
    if (timeRange === "all") return validEntries;

    const now = new Date().getTime();
    const daysMap: Record<TimeRange, number> = {
      "3m": 90,
      "6m": 180,
      "1y": 365,
      all: 99999,
    };
    const cutoff = now - daysMap[timeRange] * 24 * 60 * 60 * 1000;
    const filtered = validEntries.filter((e) => new Date(e.date).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : validEntries;
  }, [validEntries, timeRange]);

  if (validEntries.length === 0) {
    return (
      <div className={cn("p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center shadow-xs", className)}>
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-2.5">
          <Activity className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">No InBody / Body Fat Scans Yet</h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
          When you do your monthly InBody scan, record your Body Fat % to track your body recomposition and lean mass progression over time.
        </p>
      </div>
    );
  }

  const values = filteredEntries.map((p) => p.bodyFatPct);
  const minVal = Math.max(3, Math.floor(Math.min(...values) - 1));
  const maxVal = Math.ceil(Math.max(...values) + 1);
  const valRange = Math.max(1, maxVal - minVal);

  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (filteredEntries.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (filteredEntries.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
  };

  const pathD = filteredEntries.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.bodyFatPct);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Area under path
  const areaD =
    filteredEntries.length > 0
      ? `${pathD} L ${getX(filteredEntries.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`
      : "";

  const latest = validEntries[validEntries.length - 1];
  const first = validEntries[0];
  const totalChange = Math.round((latest.bodyFatPct - first.bodyFatPct) * 10) / 10;

  return (
    <div className={cn("p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs" />
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Body Fat % Trend (InBody Scans)
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Latest: <span className="font-semibold text-[var(--text-primary)] font-tabular">{latest.bodyFatPct}%</span>
            {validEntries.length > 1 && (
              <span className={cn("ml-2 font-medium font-tabular", totalChange <= 0 ? "text-emerald-500" : "text-amber-500")}>
                {totalChange > 0 ? `+${totalChange}%` : `${totalChange}%`} since {first.date}
              </span>
            )}
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center space-x-1 bg-[var(--background)] border border-[var(--border)] p-0.5 rounded-xl text-xs self-start sm:self-auto">
          {(["3m", "6m", "1y", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer uppercase text-[11px]",
                timeRange === r
                  ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="bfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * ratio;
            const val = maxVal - ratio * valRange;
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="monospace"
                >
                  {val.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#bfGradient)" />}

          {/* Trend line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {filteredEntries.map((p, i) => {
            const x = getX(i);
            const y = getY(p.bodyFatPct);
            const isHovered = hoveredPoint?.id === p.id;
            return (
              <g key={p.id || i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  className="fill-[#0ea5e9] stroke-[var(--surface)] transition-all cursor-pointer"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <text
                  x={x}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontFamily="monospace"
                >
                  {p.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg text-xs pointer-events-none transition">
            <p className="text-[10px] text-[var(--text-muted)] font-medium font-tabular">
              {hoveredPoint.date}
            </p>
            <p className="font-bold text-[var(--text-primary)] font-tabular">
              {hoveredPoint.bodyFatPct}% Body Fat
            </p>
            {hoveredPoint.notes && (
              <p className="text-[11px] text-[var(--text-secondary)] italic mt-0.5">
                "{hoveredPoint.notes}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
