import { AIProvider, ParsedRecipe } from "./types";
import { parseRecipeWithOllama, checkOllamaHealth, fallbackTextParser } from "./ollama";
import { extractTextFromImage } from "./ocr";
import { scrapeRecipeUrl } from "./url-scraper";

export class LocalAIProvider implements AIProvider {
  async parseRecipeText(
    text: string,
    options?: { model?: string; baseUrl?: string }
  ): Promise<ParsedRecipe> {
    const baseUrl = options?.baseUrl || "http://localhost:11434";
    const model = options?.model || "qwen2.5:7b";

    try {
      return await parseRecipeWithOllama(text, baseUrl, model);
    } catch (err) {
      console.warn("Ollama parsing failed, using rule-based text fallback:", err);
      // If Ollama is down, fallback parser still generates a structured recipe draft
      // so the user can immediately review and save without being blocked
      const fallback = fallbackTextParser(text);
      return fallback;
    }
  }

  async parseRecipeImage(
    imageDataBase64: string,
    options?: { model?: string; baseUrl?: string }
  ): Promise<ParsedRecipe> {
    // Option B: Run local OCR first, then parse the extracted text
    const extractedText = await extractTextFromImage(imageDataBase64);
    if (!extractedText.trim()) {
      throw new Error("Could not extract any readable text from this screenshot. Please try pasting the text or typing manually.");
    }
    return this.parseRecipeText(extractedText, options);
  }

  async parseRecipeUrl(
    url: string,
    options?: { model?: string; baseUrl?: string }
  ): Promise<ParsedRecipe & { imageUrl?: string; platform: string; sourceUrl: string }> {
    const scraped = await scrapeRecipeUrl(url);
    if (!scraped.extractedText.trim()) {
      throw new Error("Could not extract recipe text from this link. Try copying and pasting the caption or recipe text directly.");
    }
    const parsed = await this.parseRecipeText(scraped.extractedText, options);

    return {
      ...parsed,
      name: parsed.name && parsed.name !== "Imported Recipe" ? parsed.name : scraped.title || "Imported Recipe",
      imageUrl: scraped.imageUrl,
      platform: scraped.platform,
      sourceUrl: scraped.sourceUrl,
    };
  }

  async checkHealth(baseUrl: string = "http://localhost:11434") {
    return checkOllamaHealth(baseUrl);
  }
}

export const aiProvider = new LocalAIProvider();
