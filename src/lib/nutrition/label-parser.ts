/**
 * Nutrition Label Parser
 * Extracts structured nutrition values from OCR text.
 * Resilient to US, EU, UK, and international packaging conventions.
 */

export interface ParsedNutritionLabel {
  foodName?: string;
  brand?: string;
  servingSize?: number;
  servingUnit?: string;
  servingWeightGrams?: number;
  nutritionBasis: "PER_SERVING" | "PER_100G" | "PER_100ML" | "PER_CONTAINER";
  
  // Core nutrients
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;

  // Carbohydrate details (null = not listed, 0 = explicitly zero)
  fiber?: number | null;
  totalSugars?: number | null;
  addedSugars?: number | null;

  // Fat details
  saturatedFat?: number | null;
  transFat?: number | null;

  // Other (Sodium in mg)
  sodium?: number | null;

  // Salt vs Sodium tracking
  saltDetected?: boolean;
  detectedSaltGrams?: number | null;

  // Confidence & Verification
  confidence: {
    foodName?: number;
    servingSize?: number;
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    totalSugars?: number;
    addedSugars?: number;
    saturatedFat?: number;
    transFat?: number;
    sodium?: number;
  };
  uncertainFields: string[];
  warnings: string[];
  rawText: string;
  isReadable: boolean;
}

// Clean and normalize text line for pattern matching
function cleanLine(line: string): string {
  return line
    .replace(/[—–]/g, "-")
    .replace(/[,](?=\d{1,2}(?:g|mg|ml|%|\s|$))/gi, ".") // convert European comma decimal separator: "1,5g" -> "1.5g"
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract a numeric value following a keyword pattern from text lines
 */
function extractNutrient(
  lines: string[],
  regex: RegExp,
  options?: { unitMultiplier?: number; isZeroAllowed?: boolean }
): { value: number | null; rawMatched?: string; isZero: boolean } | null {
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      // Find captured numeric group
      const numStr = match[1] ?? match[2] ?? match[3];
      if (numStr !== undefined) {
        const parsed = parseFloat(numStr.replace(",", "."));
        if (!isNaN(parsed)) {
          const multiplier = options?.unitMultiplier ?? 1;
          const val = parsed * multiplier;
          return {
            value: Math.round(val * 10) / 10,
            rawMatched: match[0],
            isZero: parsed === 0,
          };
        }
      }
      // Check for zero representations like "0g", "0 mg", "less than 1g"
      if (/\b0\s*(g|mg|kcal)?\b/i.test(match[0]) || /\bzero\b/i.test(match[0])) {
        return { value: 0, rawMatched: match[0], isZero: true };
      }
      if (/<(\s*0\.[1-9]|\s*1)\s*g/i.test(match[0])) {
        return { value: 0.5, rawMatched: match[0], isZero: false };
      }
    }
  }
  return null;
}

/**
 * Parses raw OCR text into structured nutrition data
 */
export function parseNutritionLabelText(rawText: string): ParsedNutritionLabel {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => l.length > 0);

  const confidence: ParsedNutritionLabel["confidence"] = {};
  const uncertainFields: string[] = [];
  const warnings: string[] = [];

  // 1. Detect Nutrition Basis
  let nutritionBasis: ParsedNutritionLabel["nutritionBasis"] = "PER_SERVING";
  const fullText = lines.join(" ").toLowerCase();

  if (/(?:\b(?:per|pro|pour|\/)\s*100\s*ml\b|\b100\s*ml\b)/i.test(fullText)) {
    nutritionBasis = "PER_100ML";
  } else if (/(?:\b(?:per|pro|pour|\/)\s*100\s*g\b|\b100\s*g\b)/i.test(fullText)) {
    nutritionBasis = "PER_100G";
  } else if (/\bper\s*(?:container|package|bottle|can|pack)\b/i.test(fullText)) {
    nutritionBasis = "PER_CONTAINER";
  }

  // 2. Detect Serving Size & Unit
  let servingSize: number | undefined = undefined;
  let servingUnit: string | undefined = undefined;
  let servingWeightGrams: number | undefined = undefined;

  for (const line of lines) {
    // Pattern: "Serving size: 1 bar (40g)" or "Serving size: 40g" or "Portion: 30 g"
    const servingMatch = line.match(
      /(?:serving\s*size|portion|serving|portion\s*size)[:\s]*([0-9.]+)?\s*([a-zA-Z\s]+)?(?:\(([0-9.]+)\s*g\))?/i
    );
    if (servingMatch) {
      if (servingMatch[1]) {
        servingSize = parseFloat(servingMatch[1]);
      }
      if (servingMatch[2]) {
        const u = servingMatch[2].trim().toLowerCase();
        if (!u.includes("size") && u.length > 0) {
          servingUnit = u;
        }
      }
      if (servingMatch[3]) {
        servingWeightGrams = parseFloat(servingMatch[3]);
      } else if (servingUnit === "g" && servingSize) {
        servingWeightGrams = servingSize;
      }
      if (servingSize !== undefined) {
        confidence.servingSize = 0.85;
        break;
      }
    }

    // Direct gram match in serving line e.g. "30g"
    const gramMatch = line.match(/(?:serving|portion).*?([0-9.]+)\s*g\b/i);
    if (gramMatch && !servingSize) {
      const g = parseFloat(gramMatch[1]);
      if (!isNaN(g)) {
        servingSize = g;
        servingUnit = "g";
        servingWeightGrams = g;
        confidence.servingSize = 0.8;
        break;
      }
    }
  }

  if (nutritionBasis === "PER_100G" && !servingSize) {
    servingSize = 100;
    servingUnit = "g";
    servingWeightGrams = 100;
  } else if (nutritionBasis === "PER_100ML" && !servingSize) {
    servingSize = 100;
    servingUnit = "ml";
    servingWeightGrams = 100;
  }

  // 3. Detect Calories
  let calories: number | undefined = undefined;
  for (const line of lines) {
    // Check "Calories 250" or "Energy 1050 kJ / 250 kcal" or "Energy: 250 kcal"
    const calMatch = line.match(
      /(?:calories|energy|energie|valeur\s*énergétique|brennwert)(?:\s*(?:from\s*fat)?)?[:\s]+(?:[0-9.]+\s*kJ\s*(?:\/|\s)\s*)?([0-9.]+)\s*(?:kcal|cal)?/i
    );
    if (calMatch && calMatch[1]) {
      const val = parseFloat(calMatch[1]);
      if (!isNaN(val) && val > 0 && val < 5000) {
        calories = Math.round(val);
        confidence.calories = 0.9;
        break;
      }
    }
    // Simple fallback: "250 kcal"
    const kcalOnly = line.match(/\b([0-9]{2,4})\s*kcal\b/i);
    if (kcalOnly && kcalOnly[1] && calories === undefined) {
      calories = parseInt(kcalOnly[1], 10);
      confidence.calories = 0.8;
      break;
    }
  }

  // 4. Detect Protein
  let protein: number | undefined = undefined;
  const proRes = extractNutrient(
    lines,
    /(?:protein|protéines|eiweiß|eiweiss|prot)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (proRes !== null) {
    protein = proRes.value ?? 0;
    confidence.protein = 0.9;
  }

  // 5. Detect Total Fat
  let fat: number | undefined = undefined;
  const fatRes = extractNutrient(
    lines,
    /(?:total\s*fat|fat|lipides|fett|matières\s*grasses)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (fatRes !== null) {
    fat = fatRes.value ?? 0;
    confidence.fat = 0.9;
  }

  // 6. Saturated Fat
  let saturatedFat: number | null = null;
  const satRes = extractNutrient(
    lines,
    /(?:saturated\s*fat|sat\s*fat|saturated|of\s*which\s*saturates|dont\s*acides\s*gras\s*saturés|gesättigte\s*fettsäuren)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (satRes !== null) {
    saturatedFat = satRes.value;
    confidence.saturatedFat = 0.85;
  }

  // 7. Trans Fat
  let transFat: number | null = null;
  const transRes = extractNutrient(
    lines,
    /(?:trans\s*fat|trans\s*fatty\s*acids|acides\s*gras\s*trans|transfettsäuren)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (transRes !== null) {
    transFat = transRes.value;
    confidence.transFat = 0.85;
  }

  // 8. Total Carbohydrate
  let carbohydrates: number | undefined = undefined;
  const carbRes = extractNutrient(
    lines,
    /(?:total\s*carbohydrate|total\s*carbs|carbohydrates|carbohydrate|carbs|glucides|kohlenhydrate)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (carbRes !== null) {
    carbohydrates = carbRes.value ?? 0;
    confidence.carbohydrates = 0.9;
  }

  // 9. Dietary Fiber
  let fiber: number | null = null;
  const fiberRes = extractNutrient(
    lines,
    /(?:dietary\s*fiber|fiber|fibres\s*alimentaires|fibres|ballaststoffe)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (fiberRes !== null) {
    fiber = fiberRes.value;
    confidence.fiber = 0.85;
  }

  // 10. Total Sugars
  let totalSugars: number | null = null;
  const sugarRes = extractNutrient(
    lines,
    /(?:total\s*sugars|sugars|dont\s*sucres|davon\s*zucker|sucres)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (sugarRes !== null) {
    totalSugars = sugarRes.value;
    confidence.totalSugars = 0.85;
  }

  // 11. Added Sugars
  let addedSugars: number | null = null;
  const addedSugarRes = extractNutrient(
    lines,
    /(?:includes|including|dont)?\s*([0-9.]+)\s*g\s*(?:added\s*sugars|sucres\s*ajoutés)/i
  ) ?? extractNutrient(
    lines,
    /(?:added\s*sugars|sucres\s*ajoutés)[:\s]*([0-9.]+)\s*g\b/i
  );
  if (addedSugarRes !== null) {
    addedSugars = addedSugarRes.value;
    confidence.addedSugars = 0.85;
  }

  // 12. Sodium vs Salt
  let sodium: number | null = null;
  let saltDetected = false;
  let detectedSaltGrams: number | null = null;

  // First check for explicit Sodium (mg or g)
  const sodiumMgRes = extractNutrient(
    lines,
    /(?:sodium|natrium)[:\s]*([0-9.]+)\s*mg\b/i
  );
  if (sodiumMgRes !== null) {
    sodium = Math.round(sodiumMgRes.value ?? 0);
    confidence.sodium = 0.9;
  } else {
    // Check if Sodium was given in grams (e.g. 0.4g sodium = 400mg)
    const sodiumGRes = extractNutrient(
      lines,
      /(?:sodium|natrium)[:\s]*([0-9.]+)\s*g\b/i
    );
    if (sodiumGRes !== null && sodiumGRes.value !== null) {
      sodium = Math.round(sodiumGRes.value * 1000);
      confidence.sodium = 0.85;
    }
  }

  // Check for Salt (European labels typically list "Salt / Sel / Salz" in grams)
  if (sodium === null) {
    const saltRes = extractNutrient(
      lines,
      /(?:salt|sel|salz)[:\s]*([0-9.]+)\s*g\b/i
    );
    if (saltRes !== null && saltRes.value !== null) {
      saltDetected = true;
      detectedSaltGrams = saltRes.value;
      // 1g salt ≈ 400mg sodium
      sodium = Math.round(saltRes.value * 400);
      confidence.sodium = 0.7; // Lower confidence because of conversion
      warnings.push(
        `Salt was detected (${saltRes.value}g). Converted to approx. ${sodium}mg sodium. Please verify against label.`
      );
      uncertainFields.push("sodium");
    }
  }

  // 13. Brand & Food Name Detection from Header Lines
  let foodName: string | undefined = undefined;
  let brand: string | undefined = undefined;

  const candidateHeaderLines: string[] = [];
  for (const line of lines.slice(0, 8)) {
    // Skip nutrition table markers
    if (/nutrition|facts|valeur|information|ingredients|serving|portion|daily value|per 100|pour 100/i.test(line)) {
      continue;
    }
    // Skip energy lines
    if (/\b(?:calories|energy|énergie)\b/i.test(line)) {
      continue;
    }
    // Skip lines with nutrient quantities (e.g. "Total Fat 15g", "Sodium 140mg")
    if (/\b\d+(?:\.\d+)?\s*(?:g|mg|kcal|kj|cal|%)\b/i.test(line)) {
      continue;
    }
    // Skip lines that start with nutrient names
    if (
      /^(?:total\s+fat|saturated\s+fat|trans\s+fat|fat|matières\s+grasses|lipides|cholesterol|sodium|sel|salz|total\s+carbohydrate|carbs|glucides|dietary\s+fiber|fiber|fibres|total\s+sugars|sugars|sucres|added\s+sugars|protein|protéines|eiweiß)\b/i.test(
        line
      )
    ) {
      continue;
    }
    // Skip short noise or purely numeric
    if (line.length >= 3 && !/^\d+$/.test(line)) {
      candidateHeaderLines.push(line);
    }
  }

  if (candidateHeaderLines.length > 0) {
    if (candidateHeaderLines.length >= 2) {
      brand = candidateHeaderLines[0];
      foodName = candidateHeaderLines[1];
    } else {
      foodName = candidateHeaderLines[0];
    }
  }

  // Uncertainty tracking: if key values are missing or zero without explicit 0% line
  if (calories === undefined) uncertainFields.push("calories");
  if (protein === undefined) uncertainFields.push("protein");
  if (carbohydrates === undefined) uncertainFields.push("carbohydrates");
  if (fat === undefined) uncertainFields.push("fat");

  // Readability validation: require at least 2 core nutrients to consider the label successfully read
  const detectedCoreNutrientCount = [calories, protein, carbohydrates, fat].filter(
    (v) => v !== undefined
  ).length;
  const isReadable = detectedCoreNutrientCount >= 2;

  return {
    foodName,
    brand,
    servingSize,
    servingUnit: servingUnit || "g",
    servingWeightGrams: servingWeightGrams || (servingUnit === "g" ? servingSize : 100),
    nutritionBasis,
    calories,
    protein,
    carbohydrates,
    fat,
    fiber,
    totalSugars,
    addedSugars,
    saturatedFat,
    transFat,
    sodium,
    saltDetected,
    detectedSaltGrams,
    confidence,
    uncertainFields,
    warnings,
    rawText,
    isReadable,
  };
}
