import { HttpError } from "@/lib/api/route";
import { MAX_BACKUP_BYTES, parseBackup } from "@/lib/services/backup";

/** Reads an uploaded backup file (raw JSON body) with a size limit, then parses and validates it. */
export async function readBackupBody(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BACKUP_BYTES) throw new HttpError(413, "Backup file is too large (25 MB max).", "too_large");
  return parseBackup(await req.text());
}
