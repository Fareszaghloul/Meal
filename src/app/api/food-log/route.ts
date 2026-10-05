import { json, parseBody, parseQuery, withAuth } from "@/lib/api/route";
import { dayQuery, mealItemInput, mealItemPatchWithId } from "@/lib/validation";
import { createEntry, getDay, updateEntry } from "@/lib/services/food-log";

export const GET = withAuth(async (req, user) => {
  const { date } = parseQuery(req, dayQuery);
  const day = await getDay(user.id, date);
  return json({ date, entries: day.entries, totals: day.totals });
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, mealItemInput);
  const { item, created } = await createEntry(user.id, input);
  return json(item, { status: created ? 201 : 200 });
});

export const PATCH = withAuth(async (req, user) => {
  const body = await parseBody(req, mealItemPatchWithId);
  const { id, ...patch } = body;
  const item = await updateEntry(user.id, id, patch);
  return json(item);
});
