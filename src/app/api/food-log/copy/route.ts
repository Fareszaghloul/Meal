import { json, parseBody, withAuth } from "@/lib/api/route";
import { copyEntriesInput } from "@/lib/validation";
import { copyEntries } from "@/lib/services/food-log";

/** Copy a day / a meal / selected entries to another date (e.g. "copy yesterday's breakfast"). */
export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, copyEntriesInput);
  return json(await copyEntries(user.id, input), { status: 201 });
});
