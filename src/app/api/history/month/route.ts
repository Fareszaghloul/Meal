import { HttpError, json, withAuth } from "@/lib/api/route";
import { getMonthHistory } from "@/lib/services/food-log";

const MONTH_RE = /^\d{4}-\d{2}$/;

/** Compact monthly summary payload for calendar navigation and daily preview. */
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  if (!month || !MONTH_RE.test(month)) {
    throw new HttpError(400, "Query parameter 'month' must be formatted as YYYY-MM (e.g. 2026-10).", "validation");
  }

  const [y, m] = month.split("-").map(Number);
  if (y < 1970 || y > 2150 || m < 1 || m > 12) {
    throw new HttpError(400, "Query parameter 'month' contains out-of-range year or month.", "validation");
  }

  const data = await getMonthHistory(user.id, month);
  return json(data);
});
