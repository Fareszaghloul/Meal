import { json, withAuth } from "@/lib/api/route";
import { getRecentAndFrequentFoods } from "@/lib/services/food-log";
import { prisma } from "@/lib/db";
import { todayFor } from "@/lib/services/settings";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  // Clients send their date; without one, "today" is the user's tracking-timezone date, not the server's.
  const dateParam =
    url.searchParams.get("date") || todayFor(await prisma.userSettings.findUnique({ where: { userId: user.id }, select: { timezone: true } }));
  const data = await getRecentAndFrequentFoods(user.id, dateParam);
  return json(data);
});
