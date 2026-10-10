"use client";

import React, { useState, useMemo } from "react";
import { Activity, Dumbbell, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { fromKg } from "@/lib/weight-units";

export interface BodyFatDataPoint {
  id: string;
  date: string;
  bodyFatPct?: number | null;
  smmKg?: number | null;
  bmi?: number | null;
  weightKg?: number;
  notes?: string | null;
}

interface BodyFatTrendChartProps {
  entries: BodyFatDataPoint[];
  measurementSystem?: string;
  className?: string;
}

type MetricType = "bodyFat" | "smm" | "bmi";
type TimeRange = "3m" | "6m" | "1y" | "all";

interface ValidChartPoint {
  id: string;
  date: string;
  val: number;
  notes?: string | null;
}

export function BodyFatTrendChart({
  entries,
  measurementSystem = "metric",
  className,
}: BodyFatTrendChartProps) {
  const isImperial = measurementSystem === "imperial";
  const [activeMetric, setActiveMetric] = useState<MetricType>("bodyFat");
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [hoveredPoint, setHoveredPoint] = useState<ValidChartPoint | null>(null);

  const metricConfig = useMemo(() => {
    switch (activeMetric) {
      case "bodyFat":
        return {
          label: "Body Fat %",
          title: "Body Fat % Trend",
          color: "var(--macro-protein)",
          unit: "%",
          icon: Activity,
          gradientId: "bfGradient",
          defaultMin: 5,
        };
      case "smm":
        return {
          label: `SMM (${isImperial ? "lbs" : "kg"})`,
          title: "Skeletal Muscle Mass (SMM) Trend",
          color: "var(--accent)",
          unit: isImperial ? " lbs" : " kg",
          icon: Dumbbell,
          gradientId: "smmGradient",
          defaultMin: 15,
        };
      case "bmi":
        return {
          label: "BMI",
          title: "Body Mass Index (BMI) Trend",
          color: "var(--macro-carbs)",
          unit: "",
          icon: Gauge,
          gradientId: "bmiGradient",
          defaultMin: 15,
        };
    }
  }, [activeMetric, isImperial]);

  // Extract points for the active metric
  const validEntries = useMemo(() => {
    const list: ValidChartPoint[] = [];
    for (const e of entries || []) {
      let val: number | null = null;
      if (activeMetric === "bodyFat") {
        val = typeof e.bodyFatPct === "number" && !isNaN(e.bodyFatPct) && e.bodyFatPct > 0 ? e.bodyFatPct : null;
      } else if (activeMetric === "smm") {
        if (typeof e.smmKg === "number" && !isNaN(e.smmKg) && e.smmKg > 0) {
          val = Math.round(fromKg(e.smmKg, isImperial ? "lbs" : "kg") * 10) / 10;
        }
      } else if (activeMetric === "bmi") {
        val = typeof e.bmi === "number" && !isNaN(e.bmi) && e.bmi > 0 ? Math.round(e.bmi * 10) / 10 : null;
      }

      if (val !== null) {
        list.push({
          id: e.id,
          date: e.date,
          val,
          notes: e.notes || null,
        });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, activeMetric, isImperial]);

  // Filter according to timeRange
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

  const hasAnyInBody = (entries || []).some(
    (e) => (e.bodyFatPct && e.bodyFatPct > 0) || (e.smmKg && e.smmKg > 0) || (e.bmi && e.bmi > 0)
  );

  if (!hasAnyInBody) {
    return (
      <div className={cn("p-8 rounded-3xl bg-[var(--surface)] text-center", className)}>
        <div className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto mb-2.5">
          <Activity className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">No InBody Scans Recorded Yet</h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
          When you receive your monthly InBody report, log your Body Fat %, SMM (Skeletal Muscle Mass), and BMI to track your monthly recomposition and body progress over time.
        </p>
      </div>
    );
  }

  const values = filteredEntries.map((p) => p.val);
  const minVal = values.length > 0 ? Math.max(1, Math.floor(Math.min(...values) - 1)) : metricConfig.defaultMin;
  const maxVal = values.length > 0 ? Math.ceil(Math.max(...values) + 1) : metricConfig.defaultMin + 10;
  const valRange = Math.max(1, maxVal - minVal);

  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 48;
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
    const y = getY(p.val);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Area under path
  const areaD =
    filteredEntries.length > 0
      ? `${pathD} L ${getX(filteredEntries.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`
      : "";

  const latest = validEntries.length > 0 ? validEntries[validEntries.length - 1] : null;
  const first = validEntries.length > 0 ? validEntries[0] : null;
  const totalChange = latest && first ? Math.round((latest.val - first.val) * 10) / 10 : 0;

  return (
    <div className={cn("p-6 rounded-3xl bg-[var(--surface)] space-y-4", className)}>
      {/* Top Controls: Metric Tabs & Time Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Metric Selector Pills */}
        <div className="flex items-center space-x-1 bg-[var(--background)] p-1 rounded-full text-xs">
          <button
            type="button"
            onClick={() => setActiveMetric("bodyFat")}
            className={cn(
              "tap-target px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 min-h-[32px]",
              activeMetric === "bodyFat"
                ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Body Fat %</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric("smm")}
            className={cn(
              "tap-target px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 min-h-[32px]",
              activeMetric === "smm"
                ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>SMM (Muscle)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric("bmi")}
            className={cn(
              "tap-target px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 min-h-[32px]",
              activeMetric === "bmi"
                ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>BMI</span>
          </button>
        </div>

        {/* Time filters */}
        <div className="flex items-center space-x-1 bg-[var(--background)] border border-[var(--border)] p-0.5 rounded-xl text-xs self-start sm:self-auto">
          {(["3m", "6m", "1y", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={cn(
                "tap-target px-2.5 py-1 rounded-lg font-medium transition cursor-pointer uppercase text-[11px]",
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

      {/* Metric Header Sub-Bar */}
      <div>
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-xs"
            style={{ backgroundColor: metricConfig.color }}
          />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            {metricConfig.title} (Monthly InBody)
          </h3>
        </div>
        {latest ? (
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Latest:{" "}
            <span className="font-semibold text-[var(--text-primary)] font-tabular">
              {latest.val}
              {metricConfig.unit}
            </span>
            {validEntries.length > 1 && (
              <span
                className={cn(
                  "ml-2 font-medium font-tabular",
                  activeMetric === "smm"
                    ? totalChange >= 0
                      ? "text-[var(--accent)]"
                      : "text-[var(--macro-carbs)]"
                    : totalChange <= 0
                    ? "text-[var(--accent)]"
                    : "text-[var(--macro-carbs)]"
                )}
              >
                {totalChange > 0 ? `+${totalChange}` : `${totalChange}`}
                {metricConfig.unit} since {first?.date}
              </span>
            )}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            No {metricConfig.label} data logged yet. Add from your monthly InBody scan sheet.
          </p>
        )}
      </div>

      {/* SVG Chart or Empty Notice */}
      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)]">
            No entries for {metricConfig.label} in this time frame. Log a weigh-in with InBody values to see the trend!
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricConfig.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={metricConfig.color} stopOpacity="0.0" />
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
                    {val.toFixed(1)}
                    {activeMetric === "bodyFat" ? "%" : ""}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaD && <path d={areaD} fill={`url(#${metricConfig.gradientId})`} />}

            {/* Trend line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={metricConfig.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {filteredEntries.map((p, i) => {
              const x = getX(i);
              const y = getY(p.val);
              const isHovered = hoveredPoint?.id === p.id;
              return (
                <g key={p.id || i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    fill={metricConfig.color}
                    stroke="var(--surface)"
                    className="transition-all cursor-pointer"
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
                {hoveredPoint.val}
                {metricConfig.unit} ({metricConfig.label})
              </p>
              {hoveredPoint.notes && (
                <p className="text-[11px] text-[var(--text-secondary)] italic mt-0.5">
                  "{hoveredPoint.notes}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
