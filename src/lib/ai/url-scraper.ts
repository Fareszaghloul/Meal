import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/ssrf";

export interface ScrapedUrlResult {
  title?: string;
  description?: string;
  extractedText: string;
  imageUrl?: string;
  platform: string;
  sourceUrl: string;
}

export function detectPlatform(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("pinterest.com")) return "Pinterest";
    return "Web";
  } catch {
    return "Web";
  }
}

/**
 * Extracts content, captions, and Recipe JSON-LD from a given URL
 */
export async function scrapeRecipeUrl(targetUrl: string): Promise<ScrapedUrlResult> {
  const platform = detectPlatform(targetUrl);

  const response = await safeFetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}: ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. Check for Schema.org Recipe JSON-LD
  let jsonLdRecipeText = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
          const name = item.name || "";
          const desc = item.description || "";
          const ingredients = Array.isArray(item.recipeIngredient) ? item.recipeIngredient.join("\n") : "";
          const instructions = Array.isArray(item.recipeInstructions)
            ? item.recipeInstructions.map((s: unknown) => (typeof s === "string" ? s : (s as { text?: string })?.text || "")).join("\n")
            : "";
          jsonLdRecipeText = `${name}\n\n${desc}\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
          break;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  });

  // 2. OpenGraph / Twitter metadata
  const ogTitle = $('meta[property="og:title"]').attr("content") || $("title").text() || "";
  const ogDesc =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";
  const ogImage =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    undefined;

  // 3. Main textual content if JSON-LD wasn't found
  let extractedText = jsonLdRecipeText;
  if (!extractedText) {
    // For Instagram/TikTok, the og:description often has the full caption!
    const captionText = `${ogTitle}\n\n${ogDesc}`;
    
    // Also extract visible paragraphs or recipe blocks
    const pageBodyText = $("article, main, .recipe-content, .entry-content")
      .text()
      .replace(/\s+/g, " ")
      .slice(0, 3000);

    extractedText = captionText.length > 50 ? captionText : `${captionText}\n\n${pageBodyText}`;
  }

  return {
    title: ogTitle.trim(),
    description: ogDesc.trim(),
    extractedText: extractedText.trim(),
    imageUrl: ogImage,
    platform,
    sourceUrl: targetUrl,
  };
}
