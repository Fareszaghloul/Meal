import { json, parseQuery, withAuth } from "@/lib/api/route";
import { dayQuery } from "@/lib/validation";
import { getRecentAndFrequentFoods } from "@/lib/services/food-log";
import { todayLocal } from "@/lib/dates";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date") || todayLocal();
  const data = await getRecentAndFrequentFoods(user.id, dateParam);
  return json(data);
});
