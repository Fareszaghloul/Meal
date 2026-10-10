import { HttpError, json, withAuth } from "@/lib/api/route";
import { extractInBodyOcr } from "@/lib/ai/ocr";
import { parseInBodyText } from "@/lib/nutrition/inbody-parser";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { prisma } from "@/lib/db";

/** Phone photos of a printout; larger files are almost certainly the wrong thing. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Checks the file's own bytes, since the client-supplied MIME type is only a claim. */
function looksLikeImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return jpeg || png || webp;
}

/**
 * OCR extraction of an InBody printout.
 * Multipart `image` only.
 * IMPORTANT: This endpoint is strictly read-only and NEVER creates or saves a WeightEntry to the database.
 */
export const POST = withAuth(async (req, user) => {
  const limited = enforceRateLimit(req, "OCR", `ocr:${user.id}`);
  if (limited) return limited;

  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw new HttpError(415, "Upload the photo as multipart form data.", "unsupported_media");
  }

  // Reject oversize bodies before buffering them.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    throw new HttpError(413, "That image is too large. Use a photo under 8 MB.", "too_large");
  }

  const formData = await req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    throw new HttpError(400, "No image was provided.", "validation");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "That image is too large. Use a photo under 8 MB.", "too_large");
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new HttpError(415, "Use a JPEG, PNG or WebP image.", "unsupported_media");
  }

  const image = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(image)) {
    throw new HttpError(415, "That file isn't a valid JPEG, PNG or WebP image.", "unsupported_media");
  }

  // Fetch user profile settings (height and measurement system) for BMI cross-checking
  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    select: { heightCm: true, measurementSystem: true },
  });

  let ocrResult;
  try {
    ocrResult = await extractInBodyOcr(image);
  } catch (err) {
    console.error("[InBody Scan] OCR failed:", err);
    throw new HttpError(
      502,
      "Couldn't read that image. Try a clearer, well-lit photo or enter the numbers manually.",
      "ocr_failed"
    );
  }

  if (!ocrResult.text.trim()) {
    throw new HttpError(
      422,
      "No text was found. Make sure the InBody sheet is clear and well lit.",
      "no_text"
    );
  }

  const parsed = parseInBodyText(ocrResult.text, {
    heightCm: settings?.heightCm,
    unitHint: settings?.measurementSystem === "imperial" ? "imperial" : "metric",
  });

  return json({
    success: true,
    data: parsed,
  });
});
