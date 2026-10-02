import React from "react";
import { cn } from "@/lib/utils";

interface MacroBadgeProps {
  label: string;
  value: number | string;
  unit?: string;
  type: "calories" | "protein" | "carbs" | "fat" | "fiber";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MacroBadge({
  label,
  value,
  unit,
  type,
  size = "md",
  className,
}: MacroBadgeProps) {
  const dotColor: Record<string, string> = {
    calories: "var(--lime)",
    protein: "var(--macro-protein)",
    carbs: "var(--macro-carbs)",
    fat: "var(--macro-fat)",
    fiber: "var(--text-secondary)",
  };

  const sizeStyles = {
    sm: "text-xs py-0.5",
    md: "text-xs py-1",
    lg: "text-sm py-1.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center space-x-1.5 font-normal text-[var(--text-secondary)]",
        sizeStyles[size],
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0 inline-block"
        style={{ backgroundColor: dotColor[type] || "var(--lime)" }}
        aria-hidden="true"
      />
      <span className="text-[var(--text-secondary)] font-normal">{label}:</span>
      <span className="font-semibold text-[var(--text-primary)] font-tabular">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
