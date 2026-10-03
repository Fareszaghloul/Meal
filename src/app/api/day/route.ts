import { json, parseQuery, withAuth } from "@/lib/api/route";
import { dayQuery } from "@/lib/validation";
import { getDay } from "@/lib/services/food-log";

/** Everything the dashboard needs for one local calendar date. */
export const GET = withAuth(async (req, user) => {
  const { date } = parseQuery(req, dayQuery);
  return json(await getDay(user.id, date));
});
