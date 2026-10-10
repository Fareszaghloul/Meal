import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { preprocessImage } from "@/lib/ai/ocr";
import { parseInBodyText } from "@/lib/nutrition/inbody-parser";

/** Checks file magic bytes, exactly matching the scan route implementation */
function looksLikeImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return jpeg || png || webp;
}

describe("Weight Scan Pipeline Validation & Image Preprocessing", () => {
  it("accepts valid JPEG, PNG, and WebP byte signatures", async () => {
    // Generate valid PNG buffer
    const pngBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).png().toBuffer();
    expect(looksLikeImage(pngBuffer)).toBe(true);

    // Generate valid JPEG buffer
    const jpegBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).jpeg().toBuffer();
    expect(looksLikeImage(jpegBuffer)).toBe(true);

    // Generate valid WebP buffer
    const webpBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).webp().toBuffer();
    expect(looksLikeImage(webpBuffer)).toBe(true);
  });

  it("rejects fake image bytes and corrupted payloads", () => {
    const fakeBytes = Buffer.from("THIS IS NOT AN IMAGE FILE AT ALL");
    expect(looksLikeImage(fakeBytes)).toBe(false);

    const emptyBytes = Buffer.alloc(0);
    expect(looksLikeImage(emptyBytes)).toBe(false);

    const randomBytes = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]);
    expect(looksLikeImage(randomBytes)).toBe(false);
  });

  it("preprocesses input images with sharp: resizes, normalizes, and grayscales safely", async () => {
    // Create an oversized test image (3000x2000)
    const largeBuffer = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 240, g: 240, b: 240 } },
    }).png().toBuffer();

    const { processed } = await preprocessImage(largeBuffer);
    expect(processed).toBeDefined();

    // Verify processed image properties
    const processedMeta = await sharp(processed).metadata();
    expect(processedMeta.width).toBeLessThanOrEqual(2400);
    expect(processedMeta.height).toBeLessThanOrEqual(2400);
    expect(processedMeta.format).toBe("png");
  });

  it("correctly produces structured scan result without persisting to database", () => {
    const mockInBodyOcr = `
Muscle-Fat Analysis
Weight 81.2 kg
SMM 37.4 kg
Obesity Analysis
BMI 24.8
Percent Body Fat 17.2%
Test Date: 2026-09-20 09:15
`;
    const result = parseInBodyText(mockInBodyOcr, { heightCm: 181 });

    expect(result.weightKg.value).toBe(81.2);
    expect(result.weightKg.confidence).toBe("high");
    expect(result.smmKg.value).toBe(37.4);
    expect(result.smmKg.confidence).toBe("high");
    expect(result.bmi.value).toBe(24.8);
    expect(result.bmi.confidence).toBe("high");
    expect(result.bodyFatPct.value).toBe(17.2);
    expect(result.bodyFatPct.confidence).toBe("high");
    expect(result.date.value).toBe("2026-09-20");
    expect(result.time.value).toBe("09:15");

    // Scan result is purely an in-memory DTO, no id or database entity
    expect((result as any).id).toBeUndefined();
  });
});
