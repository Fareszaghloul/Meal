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
  // Exact data/nutrition color palette mapping
  const badgeStyles: Record<string, { style: React.CSSProperties }> = {
    calories: {
      style: {
        color: "var(--text-primary)",
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      },
    },
    protein: {
      style: {
        color: "var(--macro-protein)",
        backgroundColor: "var(--macro-protein-bg)",
        borderColor: "var(--macro-protein-border)",
      },
    },
    carbs: {
      style: {
        color: "var(--macro-carbs)",
        backgroundColor: "var(--macro-carbs-bg)",
        borderColor: "var(--macro-carbs-border)",
      },
    },
    fat: {
      style: {
        color: "var(--macro-fat)",
        backgroundColor: "var(--macro-fat-bg)",
        borderColor: "var(--macro-fat-border)",
      },
    },
    fiber: {
      style: {
        color: "var(--text-secondary)",
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      },
    },
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3.5 py-1.5",
  };

  return (
    <div
      style={badgeStyles[type]?.style}
      className={cn(
        "inline-flex items-center space-x-1 rounded-lg border font-medium",
        sizeStyles[size],
        className
      )}
    >
      <span className="opacity-80 font-normal">{label}:</span>
      <span className="font-semibold font-tabular">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
