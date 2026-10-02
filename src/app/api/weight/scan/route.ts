import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parseInBodyText } from "@/lib/nutrition/inbody-parser";

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
    await requireAuth(request);

    let imageInput: string | Buffer | null = null;
    const contentType = request.headers.get("content-type") || "";

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

      if (base64Data.startsWith("data:")) {
        const parts = base64Data.split(",");
        if (parts.length === 2) {
          imageInput = Buffer.from(parts[1], "base64");
        } else {
          imageInput = base64Data;
        }
      } else {
        imageInput = base64Data;
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type. Use multipart/form-data or application/json." },
        { status: 415 }
      );
    }

    if (!imageInput) {
      return NextResponse.json(
        { error: "Could not process image payload." },
        { status: 400 }
      );
    }

    // Run OCR using Tesseract engine
    const rawText = await extractTextFromImage(imageInput);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          error: "No text detected in the uploaded image. Please ensure the InBody sheet is clear and well-lit.",
        },
        { status: 422 }
      );
    }

    // Parse extracted InBody text
    const parsedData = parseInBodyText(rawText);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    if (error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/weight/scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan InBody sheet: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
