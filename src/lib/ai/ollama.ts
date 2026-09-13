import { ParsedRecipe, ParsedRecipeSchema } from "./types";

export interface OllamaHealthResult {
  isRunning: boolean;
  models: string[];
  error?: string;
}

function getOllamaHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Cloudflare Zero Trust Service Token
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID.trim();
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET.trim();
  }

  // Generic custom API key / Bearer token if configured
  if (process.env.OLLAMA_API_KEY) {
    const key = process.env.OLLAMA_API_KEY.trim();
    headers["Authorization"] = `Bearer ${key}`;
    headers["x-api-key"] = key;
  }

  return headers;
}

export async function checkOllamaHealth(
  baseUrl: string = "http://localhost:11434"
): Promise<OllamaHealthResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
      headers: getOllamaHeaders(),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        isRunning: false,
        models: [],
        error: `Ollama responded with status ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (data.models || []).map((m) => m.name);
    return { isRunning: true, models };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isRunning: false,
      models: [],
      error: `Could not connect to Ollama at ${baseUrl} (${message}). Make sure Ollama is installed and running with 'ollama serve'.`,
    };
  }
}

const SYSTEM_PROMPT = `You are a recipe parser specialized in extracting structured cooking and meal prep data from unstructured text, social media captions, and video transcripts.

Return ONLY a JSON object that adheres to this exact schema with NO markdown code blocks, NO preamble, and NO explanation:
{
  "name": "Recipe title string",
  "description": "Short 1-2 sentence description",
  "servings": 4,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "tags": ["high-protein", "meal-prep", "lunch"],
  "ingredients": [
    {
      "rawName": "Chicken breast",
      "group": null,
      "quantity": 500,
      "unit": "g",
      "notes": "diced",
      "uncertainQuantity": false
    }
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "nutrition": {
    "calories": 500,
    "protein": 45,
    "carbs": 30,
    "fat": 10,
    "fiber": 4
  }
}

RULES:
1. Always parse ingredient quantities into numeric values (e.g. 1/2 -> 0.5, 250g -> quantity 250, unit "g").
2. Standard units: "g", "kg", "ml", "l", "tbsp", "tsp", "cup", "piece", "egg", "slice", "scoop", "clove".
3. If an ingredient has an uncertain, approximate, or unstated quantity (e.g. "a pinch of salt", "1 splash olive oil", "shredded carrots, however much you want"), set "uncertainQuantity": true AND set "quantity": null. Do not invent a numeric estimate for these.
4. NEVER convert a stated unit into a different unit if the stated unit is already in the standard units list (e.g. "3 cups" must stay quantity 3, unit "cup" — do not convert to grams or any other unit). Only assign a unit not explicitly stated if the ingredient is a countable item with no unit given (e.g. "2 salmon fillets" -> quantity 2, unit "piece").
5. You MUST include every single ingredient mentioned in the source text in the ingredients array — including optional ingredients, garnishes, toppings, and anything with vague or "to taste" quantities. Never omit an ingredient because its quantity is unclear; use rule 3 instead. Before producing your final answer, recount the ingredient lines in the source text and verify your ingredients array has a matching or greater count.
6. If ingredients are organized under sub-headings in the source (e.g. "FOR THE SAUCE", "FOR THE BOWLS"), set "group" to that heading (title case, no "FOR THE" prefix, e.g. "Sauce"). If there is no sub-heading structure, set "group": null for all ingredients.
7. If a time or quantity is given as a range (e.g. "15-20 min", "cook time maybe 15-20 min active"), use the upper bound of the range.
8. If an ingredient has an uncertain or approximate quantity (e.g. "a pinch of salt", "1 splash olive oil"), set "uncertainQuantity": true.
9. If nutrition information is not explicitly and reliably stated in the text, omit or set "nutrition" to null. NEVER invent fake nutrition numbers — treat hedged estimates in the source (e.g. "rough estimate don't quote me") as NOT reliably stated.
10. If servings are not stated, default to 4.
11. Instructions should be broken down into clean, sequential, numbered sentences. Do not include the serving count as an instruction step.`;

export async function parseRecipeWithOllama(
  rawText: string,
  baseUrl: string = "http://localhost:11434",
  model: string = "qwen2.5:7b"
): Promise<ParsedRecipe> {
  const health = await checkOllamaHealth(baseUrl);
  if (!health.isRunning) {
    throw new Error(
      `Ollama is not running at ${baseUrl}. Please run 'ollama serve' in your terminal or use Manual Entry.`
    );
  }

  // Use the requested model or fallback to the first available model if the requested isn't present
  let activeModel = model;
  if (health.models.length > 0 && !health.models.includes(model)) {
    // Find closest match or use first
    const matched = health.models.find(
      (m) => m.toLowerCase().includes("qwen") || m.toLowerCase().includes("llama")
    );
    activeModel = matched || health.models[0];
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getOllamaHeaders(),
    },
    body: JSON.stringify({
      model: activeModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract this recipe into the requested JSON schema:\n\n${rawText}`,
        },
      ],
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generation failed with status ${response.status}: ${response.statusText}`);
  }

  const result = (await response.json()) as {
    message?: { content: string };
    response?: string;
  };

  const rawJson = result.message?.content || result.response || "";
  return cleanAndValidateJson(rawJson, rawText);
}

/**
 * Robust JSON extraction and Zod validation
 */
export function cleanAndValidateJson(rawContent: string, originalText: string): ParsedRecipe {
  let cleaned = rawContent.trim();
  // Strip markdown code fences if model returned them
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    const validated = ParsedRecipeSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch {
    // Fallback: try regex search for first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        const sliced = cleaned.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(sliced);
        const validated = ParsedRecipeSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      } catch {
        // Continue to rule-based fallback
      }
    }
  }

  // Fallback rule-based parsing for messy/partial LLM output or when LLM missed fields
  return fallbackTextParser(originalText);
}

/**
 * Deterministic fallback parser to extract basic recipe data if LLM is unavailable or outputs malformed text
 */
export function fallbackTextParser(text: string): ParsedRecipe {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let name = "Imported Recipe";
  const firstMeaningfulLine = lines.find(
    (l) => l.length > 2 && !l.match(/^\d+/) && !l.toLowerCase().includes("ingredient")
  );
  if (firstMeaningfulLine) {
    name = firstMeaningfulLine.replace(/^#+\s*/, "").slice(0, 80);
  }

  const ingredients: ParsedRecipe["ingredients"] = [];
  const instructions: string[] = [];

  let inInstructions = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("method") ||
      lower.includes("instruction") ||
      lower.includes("direction") ||
      lower.includes("steps:")
    ) {
      inInstructions = true;
      continue;
    }

    if (inInstructions) {
      const cleanStep = line.replace(/^\d+[\s.)-]+/, "").trim();
      if (cleanStep.length > 3) {
        instructions.push(cleanStep);
      }
    } else {
      // Try to parse quantity and unit
      const match = line.match(/^(\d+(?:\.\d+)?|\d+\/\d+)?\s*(g|kg|ml|l|tbsp|tsp|cup|cups|piece|pieces|slice|slices|scoop|egg|eggs)?\s+(?:of\s+)?(.+)$/i);
      if (match && match[3] && match[3].length > 1) {
        let qty = 1;
        if (match[1]) {
          if (match[1].includes("/")) {
            const [num, den] = match[1].split("/");
            qty = Number(num) / (Number(den) || 1);
          } else {
            qty = parseFloat(match[1]);
          }
        }
        ingredients.push({
          rawName: match[3].trim(),
          quantity: qty,
          unit: match[2] ? match[2].toLowerCase() : "piece",
          uncertainQuantity: !match[1],
        });
      }
    }
  }

  if (ingredients.length === 0) {
    ingredients.push({
      rawName: "Main ingredient",
      quantity: 1,
      unit: "piece",
      uncertainQuantity: true,
    });
  }

  if (instructions.length === 0) {
    instructions.push("Review instructions from the pasted text and adjust as needed.");
  }

  return {
    name,
    description: "Extracted from recipe notes.",
    servings: 4,
    tags: ["meal-prep"],
    ingredients,
    instructions,
  };
}
