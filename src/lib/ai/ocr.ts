import path from "path";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";

export interface OcrPass {
  psm: string;
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  rawText: string;
  passes: OcrPass[];
}

/**
 * Preprocesses InBody photograph buffers using Sharp:
 * - Auto-orients image using EXIF metadata (essential for smartphone photos)
 * - Constrains dimensions (max 2400px) to balance speed and character sharpness
 * - Upscales low-res photos (<1000px) to clarify small text and decimal points
 * - Applies grayscale and contrast normalization
 * - Applies gentle sharpening without destroying faint decimal points
 */
export async function preprocessImage(imageInput: Buffer): Promise<{ processed: Buffer }> {
  try {
    const meta = await sharp(imageInput).metadata();
    let pipeline = sharp(imageInput).rotate();

    const maxDim = 2400;
    if ((meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim)) {
      pipeline = pipeline.resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true,
      });
    } else if (meta.width && meta.width < 1000) {
      pipeline = pipeline.resize({
        width: 1600,
        fit: "inside",
      });
    }

    const processed = await pipeline
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
      .png()
      .toBuffer();

    return { processed };
  } catch (err) {
    console.warn("[OCR] Sharp preprocessing warning, using raw buffer:", err);
    return { processed: imageInput };
  }
}

/**
 * Multi-pass OCR tailored for structured InBody report sheets.
 * Executes primary pass (PSM.AUTO) and secondary pass (PSM.SPARSE_TEXT) if needed.
 */
export async function extractInBodyOcr(imageInput: string | Buffer): Promise<OcrResult> {
  let worker;
  const passes: OcrPass[] = [];

  try {
    const workerPath = path.join(
      process.cwd(),
      "node_modules",
      "tesseract.js",
      "src",
      "worker-script",
      "node",
      "index.js"
    );

    // Preprocess buffer if image is passed as buffer
    let inputToOcr: string | Buffer = imageInput;
    if (Buffer.isBuffer(imageInput)) {
      const { processed } = await preprocessImage(imageInput);
      inputToOcr = processed;
    }

    worker = await createWorker("eng", 1, { workerPath });

    // Pass 1: Automatic page segmentation
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const res1 = await worker.recognize(inputToOcr);
    const text1 = res1.data.text || "";
    const conf1 = res1.data.confidence || 0;
    passes.push({ psm: "AUTO", text: text1, confidence: conf1 });

    let finalCombinedText = text1;
    let finalConfidence = conf1;

    // Check if Pass 1 result is sparse or missing key InBody markers
    const hasCoreMarkers =
      /\b(weight|smm|pbf|bmi|inbody)\b/i.test(text1);

    if (!hasCoreMarkers || conf1 < 60 || text1.length < 150) {
      try {
        // Pass 2: Sparse text mode to catch standalone column data and charts
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });
        const res2 = await worker.recognize(inputToOcr);
        const text2 = res2.data.text || "";
        const conf2 = res2.data.confidence || 0;
        passes.push({ psm: "SPARSE_TEXT", text: text2, confidence: conf2 });

        // Merge lines from pass 2 that contain recognizable labels or numbers not seen in pass 1
        const lines1 = text1.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const lines1Lower = new Set(lines1.map((l) => l.toLowerCase()));
        const lines2 = text2.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        const newLines: string[] = [];
        for (const l2 of lines2) {
          const l2Lower = l2.toLowerCase();
          if (!lines1Lower.has(l2Lower) && /\b(weight|smm|pbf|bmi|muscle|fat)\b/i.test(l2)) {
            newLines.push(l2);
          }
        }

        if (newLines.length > 0) {
          finalCombinedText = `${text1}\n${newLines.join("\n")}`;
          finalConfidence = Math.max(conf1, conf2);
        } else if (conf2 > conf1 && /\b(weight|smm|pbf|bmi)\b/i.test(text2)) {
          finalCombinedText = text2;
          finalConfidence = conf2;
        }
      } catch (pass2Err) {
        console.warn("[OCR] Secondary pass warning:", pass2Err);
      }
    }

    return {
      text: finalCombinedText,
      confidence: finalConfidence,
      rawText: text1,
      passes,
    };
  } catch (error) {
    console.error("[OCR] Extraction failed:", error);
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Extracts raw text from an image (backward compatibility wrapper)
 */
export async function extractTextFromImage(imageInput: string | Buffer): Promise<string> {
  const ocr = await extractInBodyOcr(imageInput);
  return ocr.text;
}
