import type { MealTemplate } from "@/lib/domain";

export function toTemplate(row: { id: string; name: string; items: unknown; useCount: number; createdAt: Date }): MealTemplate {
  return {
    id: row.id,
    name: row.name,
    items: row.items as unknown as MealTemplate["items"],
    useCount: row.useCount,
    createdAt: row.createdAt.toISOString(),
  };
}
