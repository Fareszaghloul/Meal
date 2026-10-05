import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, parseQuery, withAuth } from "@/lib/api/route";
import { dayQuery, waterInput } from "@/lib/validation";
import { z } from "zod";

async function totalFor(userId: string, date: string) {
  const agg = await prisma.waterLogEntry.aggregate({ where: { userId, date }, _sum: { amountMl: true } });
  return agg._sum.amountMl ?? 0;
}

export const GET = withAuth(async (req, user) => {
  const { date } = parseQuery(req, dayQuery);
  const [entries, settings] = await Promise.all([
    prisma.waterLogEntry.findMany({ where: { userId: user.id, date }, orderBy: { loggedAt: "asc" } }),
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { dailyWaterGoalMl: true } }),
  ]);
  const totalMl = entries.reduce((s, e) => s + e.amountMl, 0);
  return json({ date, totalMl, goalMl: settings?.dailyWaterGoalMl ?? 2500, entries });
});

export const POST = withAuth(async (req, user) => {
  const { date, amountMl } = await parseBody(req, waterInput);
  const entry = await prisma.waterLogEntry.create({ data: { userId: user.id, date, amountMl } });
  return json({ entry, totalMl: await totalFor(user.id, date) }, { status: 201 });
});

const deleteQuery = z.object({
  id: z.string().optional(),
  date: dayQuery.shape.date.optional(),
  reset: z.union([z.literal("true"), z.literal("false"), z.boolean()]).optional(),
});

/** `?id=` removes one entry; `?date=&reset=true` removes all entries of that day; `?date=` removes the most recent entry of that day (undo). */
export const DELETE = withAuth(async (req, user) => {
  const { id, date, reset } = parseQuery(req, deleteQuery);
  if (id) {
    const { count } = await prisma.waterLogEntry.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) throw new HttpError(404, "Entry not found.", "not_found");
    return json({ success: true });
  }
  if (date) {
    if (reset === true || reset === "true") {
      await prisma.waterLogEntry.deleteMany({ where: { userId: user.id, date } });
      return json({ success: true, totalMl: 0 });
    }
    const last = await prisma.waterLogEntry.findFirst({
      where: { userId: user.id, date },
      orderBy: { loggedAt: "desc" },
    });
    if (last) await prisma.waterLogEntry.delete({ where: { id: last.id } });
    return json({ success: true, totalMl: await totalFor(user.id, date) });
  }
  throw new HttpError(400, "id or date is required.", "validation");
});
