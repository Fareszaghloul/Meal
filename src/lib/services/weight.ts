import { prisma } from "@/lib/db";
import { summarize } from "@/lib/nutrition/weight-trend";

export { summarize, trailingAverage } from "@/lib/nutrition/weight-trend";

export async function weightSummary(userId: string) {
  // Only everyday weigh-ins; InBody scans are sporadic and would skew averages.
  const rows = await prisma.weightEntry.findMany({
    where: { userId, entryType: "daily" },
    select: { date: true, weightKg: true },
    orderBy: { date: "asc" },
  });
  return summarize(rows);
}
