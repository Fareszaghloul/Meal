import { HttpError, json, withAuth } from "@/lib/api/route";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parseInBodyText } from "@/lib/nutrition/inbody-parser";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

/** Phone photos of a printout; larger files are almost certainly the wrong thing. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Checks the file's own bytes, since the client-supplied MIME type is only a claim. */
function looksLikeImage(b: Buffer): boolean {
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return jpeg || png || webp;
}

/** OCR of an InBody printout. Multipart `image` only; never a path or URL (the OCR engine would fetch/read those). */
export const POST = withAuth(async (req, user) => {
  const limited = enforceRateLimit(req, "OCR", `ocr:${user.id}`);
  if (limited) return limited;

  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw new HttpError(415, "Upload the photo as multipart form data.", "unsupported_media");
  }
  // Reject oversize bodies before buffering them.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, "That image is too large. Use a photo under 8 MB.", "too_large");

  const file = (await req.formData()).get("image");
  if (!(file instanceof File)) throw new HttpError(400, "No image was provided.", "validation");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That image is too large. Use a photo under 8 MB.", "too_large");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new HttpError(415, "Use a JPEG, PNG or WebP image.", "unsupported_media");

  const image = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(image)) throw new HttpError(415, "That file isn't a valid JPEG, PNG or WebP image.", "unsupported_media");

  let text: string;
  try {
    text = await extractTextFromImage(image);
  } catch {
    // Details are already logged server-side; don't leak engine internals to the client.
    throw new HttpError(502, "Couldn't read that image. Try a clearer, well-lit photo or enter the numbers manually.", "ocr_failed");
  }
  if (!text.trim()) throw new HttpError(422, "No text was found. Make sure the InBody sheet is clear and well lit.", "no_text");

  return json({ success: true, data: parseInBodyText(text) });
});
