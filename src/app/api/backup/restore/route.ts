import { HttpError, json, withAuth } from "@/lib/api/route";
import { readBackupBody } from "@/lib/api/backup-body";
import { restoreBackup } from "@/lib/services/backup";

/**
 * Replaces the signed-in user's domain data with an uploaded backup, in one transaction.
 * Requires ?confirm=replace so a stray request can't wipe data. Account and sessions are untouched.
 */
export const POST = withAuth(async (req, user) => {
  if (new URL(req.url).searchParams.get("confirm") !== "replace") {
    throw new HttpError(400, "Restore must be confirmed.", "confirmation_required");
  }
  const file = await readBackupBody(req);
  return json(await restoreBackup(user.id, file));
});
