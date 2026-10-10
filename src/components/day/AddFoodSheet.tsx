"use client";

import React from "react";
import { AddFoodModal } from "./add-food/AddFoodModal";
import type { MealCategory } from "@/lib/domain";
import type { DateString } from "@/lib/dates";

interface Props {
  open: boolean;
  onClose: () => void;
  date: DateString;
  initialMeal: MealCategory;
  initialView?: "search" | "manual";
}

/**
 * Re-exports the redesigned, fast AddFoodModal while maintaining 100% backward
 * compatibility with the existing dashboard and callers.
 */
export function AddFoodSheet(props: Props) {
  return <AddFoodModal {...props} />;
}
