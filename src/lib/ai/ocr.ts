import { createWorker } from "tesseract.js";

/**
 * Extracts raw text from an image (base64 data URL, Buffer, or file path) using Tesseract.js
 */
export async function extractTextFromImage(imageInput: string | Buffer): Promise<string> {
  let worker;
  try {
    worker = await createWorker("eng");
    const ret = await worker.recognize(imageInput);
    return ret.data.text || "";
  } catch (error) {
    console.error("OCR Extraction failed:", error);
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
