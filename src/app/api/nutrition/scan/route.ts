import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parseNutritionLabelText } from "@/lib/nutrition/label-parser";

// Maximum image payload: 10MB
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function POST(request: Request) {
  try {
    // 1. Enforce authentication
    await requireAuth(request);

    let imageInput: string | Buffer | null = null;
    const contentType = request.headers.get("content-type") || "";

    // 2. Parse image from multipart/form-data or JSON base64
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No image file provided in request." },
          { status: 400 }
        );
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image is too large. Please upload an image under 10MB." },
          { status: 413 }
        );
      }

      if (!ALLOWED_MIME_TYPES.some((type) => file.type.toLowerCase().includes(type.split("/")[1]))) {
        return NextResponse.json(
          { error: "Unsupported image format. Please use JPEG, PNG, or WebP." },
          { status: 415 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageInput = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const base64Data = body.image;
      if (!base64Data || typeof base64Data !== "string") {
        return NextResponse.json(
          { error: "Missing 'image' base64 data URL in request body." },
          { status: 400 }
        );
      }

      // Check base64 size roughly
      if (base64Data.length > MAX_IMAGE_SIZE_BYTES * 1.4) {
        return NextResponse.json(
          { error: "Image is too large. Please upload an image under 10MB." },
          { status: 413 }
        );
      }

      imageInput = base64Data;
    } else {
      return NextResponse.json(
        { error: "Unsupported content type. Expected multipart/form-data or application/json." },
        { status: 400 }
      );
    }

    if (!imageInput) {
      return NextResponse.json(
        { error: "Could not read image data." },
        { status: 400 }
      );
    }

    // 3. Run In-Memory OCR
    let rawOcrText = "";
    try {
      rawOcrText = await extractTextFromImage(imageInput);
    } catch (ocrErr: any) {
      console.error("OCR Extraction Error:", ocrErr);
      return NextResponse.json(
        {
          error: "Failed to process image.",
          details: "Could not extract text from the provided image. Please check image quality and try again.",
        },
        { status: 422 }
      );
    }

    if (!rawOcrText || !rawOcrText.trim()) {
      return NextResponse.json(
        {
          error: "We couldn't clearly read any text on the label.",
          guidance: [
            "Move closer to the label",
            "Use brighter or more even lighting",
            "Keep the packaging as flat as possible to avoid reflection",
            "Make sure the 'Nutrition Facts' table is clearly framed",
          ],
          isReadable: false,
        },
        { status: 422 }
      );
    }

    // 4. Parse OCR text into structured nutrition schema
    const parsed = parseNutritionLabelText(rawOcrText);

    if (!parsed.isReadable) {
      return NextResponse.json(
        {
          error: "We couldn't clearly detect a nutrition label in this image.",
          guidance: [
            "Position the nutrition label inside the frame",
            "Ensure calories, protein, carbs, and fat lines are visible",
            "Avoid extreme angles, glare, or motion blur",
            "You can also enter values manually if the label is damaged",
          ],
          parsed,
          isReadable: false,
        },
        { status: 422 }
      );
    }

    // 5. Return structured result (image is discarded immediately)
    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/nutrition/scan error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while scanning the label. Please try again." },
      { status: 500 }
    );
  }
}
