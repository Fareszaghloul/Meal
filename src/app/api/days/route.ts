import { HttpError, json, parseQuery, withAuth } from "@/lib/api/route";
import { rangeQuery } from "@/lib/validation";
import { getDayStatuses } from "@/lib/services/food-log";
import { diffDays } from "@/lib/dates";

/** Per-day calories and meals-logged count for a date range (calendar + analytics). */
export const GET = withAuth(async (req, user) => {
  const { from, to } = parseQuery(req, rangeQuery);
  const span = diffDays(from, to);
  if (span < 0 || span > 400) throw new HttpError(400, "Range must be 0–400 days.", "validation");
  return json(await getDayStatuses(user.id, from, to));
});
