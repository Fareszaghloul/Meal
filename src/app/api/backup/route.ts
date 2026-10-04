import { withAuth } from "@/lib/api/route";
import { createBackup } from "@/lib/services/backup";

/** Full, restorable backup of the signed-in user's own data. Built only when requested. */
export const GET = withAuth(async (_req, user) => {
  const { file, filename } = await createBackup(user.id);
  return new Response(JSON.stringify(file), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
