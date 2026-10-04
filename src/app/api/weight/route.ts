import { HttpError, json, parseBody, parseQuery, withAuth } from "@/lib/api/route";
import { createWeight, deleteWeight, updateWeight, weightPage } from "@/lib/services/weight";
import { weightIdQuery, weightInput, weightListQuery, weightPatch } from "@/lib/validation";

/** Daily readings (optionally from a date), InBody scans, and the all-time summary. */
export const GET = withAuth(async (req, user) => {
  const { from } = parseQuery(req, weightListQuery);
  return json(await weightPage(user.id, from));
});

export const POST = withAuth(async (req, user) => {
  const input = await parseBody(req, weightInput);
  return json(await createWeight(user.id, input), { status: 201 });
});

export const PUT = withAuth(async (req, user) => {
  const { id, ...patch } = await parseBody(req, weightPatch.extend(weightIdQuery.shape));
  const entry = await updateWeight(user.id, id, patch);
  if (!entry) throw new HttpError(404, "Weight entry not found", "not_found");
  return json(entry);
});

export const DELETE = withAuth(async (req, user) => {
  const { id } = parseQuery(req, weightIdQuery);
  if (!(await deleteWeight(user.id, id))) throw new HttpError(404, "Weight entry not found", "not_found");
  return json({ success: true });
});
