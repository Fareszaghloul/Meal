import { json, withAuth } from "@/lib/api/route";
import { readBackupBody } from "@/lib/api/backup-body";
import { previewBackup } from "@/lib/services/backup";

/** Validates an uploaded backup and summarises it. Read-only: nothing is written. */
export const POST = withAuth(async (req) => json(await previewBackup(await readBackupBody(req))));
