import { NormalizedFood } from "./types";

/**
 * Normalizes text for lenient comparison:
 * strips accents, punctuation, common filler words (0%, percent, etc.), and collapses whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents: é -> e, ñ -> n
    .replace(/\b(0%|0 percent|zero percent|no fat|fat free|nonfat)\b/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Token overlap similarity (Jaccard-like score)
 */
function tokenSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(normalizeText(b).split(" ").filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Evaluates whether two food candidates are likely the exact same product.
 */
export function areLikelyDuplicates(a: NormalizedFood, b: NormalizedFood): boolean {
  // 1. Strongest signal: Barcode match
  if (a.barcode && b.barcode) {
    const cleanA = a.barcode.replace(/^0+/, "");
    const cleanB = b.barcode.replace(/^0+/, "");
    if (cleanA === cleanB) return true;
    // Explicitly different barcodes mean different items
    return false;
  }

  // 2. Exact same provider and providerId
  if (a.provider === b.provider && a.providerId === b.providerId) {
    return true;
  }

  // 3. Name similarity check
  const sim = tokenSimilarity(a.name, b.name);
  if (sim < 0.72) return false;

  // 4. Brand comparison: if both specify a brand, they must match or overlap
  if (a.brand && b.brand) {
    const brandA = normalizeText(a.brand);
    const brandB = normalizeText(b.brand);
    if (!brandA.includes(brandB) && !brandB.includes(brandA)) {
      return false; // Different brands
    }
  } else if ((a.brand && !b.brand) || (!a.brand && b.brand)) {
    // If one has an explicit brand and the other doesn't have a barcode,
    // do not merge generic food with branded food unless brand appears in unbranded food's name
    const specifiedBrand = normalizeText(a.brand || b.brand || "");
    const unbrandedName = normalizeText(!a.brand ? a.name : b.name);
    if (!unbrandedName.includes(specifiedBrand)) {
      return false;
    }
  }

  // 5. Nutritional coherence check: calories & macros should be close
  const calDiff = Math.abs(a.calories - b.calories);
  const proDiff = Math.abs(a.protein - b.protein);
  const carbDiff = Math.abs(a.carbohydrates - b.carbohydrates);
  const fatDiff = Math.abs(a.fat - b.fat);

  const calClose = calDiff <= 30 || calDiff / Math.max(1, a.calories, b.calories) <= 0.15;
  const proClose = proDiff <= 4;
  const carbClose = carbDiff <= 5;
  const fatClose = fatDiff <= 4;

  return calClose && proClose && carbClose && fatClose;
}

/**
 * Calculates a nutrition completeness score based on how many detailed nutrients are present.
 */
export function getCompletenessScore(food: NormalizedFood): number {
  let score = 0;
  if (food.dietaryFiber !== null) score += 10;
  if (food.totalSugars !== null) score += 10;
  if (food.addedSugars !== null) score += 5;
  if (food.saturatedFat !== null) score += 10;
  if (food.transFat !== null) score += 5;
  if (food.sodium !== null) score += 10;
  if (food.brand) score += 10;
  if (food.barcode) score += 15;
  return score;
}

/**
 * Merges two duplicate foods, preserving the higher quality entry while filling gaps from the secondary.
 */
export function mergeDuplicates(primary: NormalizedFood, secondary: NormalizedFood): NormalizedFood {
  // If one is local, local is always chosen as primary base
  const base = primary.isLocal ? primary : secondary.isLocal ? secondary : getCompletenessScore(primary) >= getCompletenessScore(secondary) ? primary : secondary;
  const other = base === primary ? secondary : primary;

  const mergedSources = Array.from(
    new Set([
      ...(base.availableSources || [base.provider]),
      ...(other.availableSources || [other.provider]),
    ])
  );

  return {
    ...base,
    brand: base.brand || other.brand,
    barcode: base.barcode || other.barcode,
    sourceUrl: base.sourceUrl || other.sourceUrl,
    imageUrl: base.imageUrl || other.imageUrl,
    dietaryFiber: base.dietaryFiber !== null ? base.dietaryFiber : other.dietaryFiber,
    totalSugars: base.totalSugars !== null ? base.totalSugars : other.totalSugars,
    addedSugars: base.addedSugars !== null ? base.addedSugars : other.addedSugars,
    saturatedFat: base.saturatedFat !== null ? base.saturatedFat : other.saturatedFat,
    transFat: base.transFat !== null ? base.transFat : other.transFat,
    sodium: base.sodium !== null ? base.sodium : other.sodium,
    availableSources: mergedSources,
  };
}

/**
 * Assigns a search relevance score to a food against a search query.
 */
export function scoreFoodRelevance(food: NormalizedFood, query: string): number {
  const cleanQ = normalizeText(query);
  const cleanName = normalizeText(food.name);
  const cleanBrand = food.brand ? normalizeText(food.brand) : "";

  let score = 0;

  // Barcode exact match
  if (food.barcode && food.barcode === query.trim()) {
    return 10000;
  }

  // Exact full title match
  if (cleanName === cleanQ) {
    score += 1000;
  }
  // Name starts with query
  else if (cleanName.startsWith(cleanQ)) {
    score += 600;
  }
  // Word boundary match
  else if (new RegExp(`\\b${cleanQ}\\b`).test(cleanName)) {
    score += 400;
  }
  // Query substring match in name
  else if (cleanName.includes(cleanQ)) {
    score += 250;
  }
  // Brand match
  else if (cleanBrand && cleanBrand.includes(cleanQ)) {
    score += 200;
  } else {
    // Individual word overlap
    const qWords = cleanQ.split(" ").filter((w) => w.length > 1);
    let matchedWords = 0;
    for (const w of qWords) {
      if (cleanName.includes(w) || cleanBrand.includes(w)) matchedWords++;
    }
    if (matchedWords === qWords.length && qWords.length > 0) {
      score += 180;
    } else {
      score += matchedWords * 40;
    }
  }

  // Local food preference
  if (food.isLocal) {
    score += 150;
  }

  // Completeness bonus
  score += getCompletenessScore(food);

  return score;
}

/**
 * Deduplicates and ranks a collection of foods from multiple providers.
 */
export function deduplicateAndRank(foods: NormalizedFood[], query: string): NormalizedFood[] {
  const mergedList: NormalizedFood[] = [];

  for (const item of foods) {
    let duplicateIndex = -1;
    for (let i = 0; i < mergedList.length; i++) {
      if (areLikelyDuplicates(mergedList[i], item)) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex >= 0) {
      mergedList[duplicateIndex] = mergeDuplicates(mergedList[duplicateIndex], item);
    } else {
      mergedList.push({
        ...item,
        availableSources: item.availableSources || [item.provider],
      });
    }
  }

  // Score each item for ranking
  const scored = mergedList.map((f) => ({
    ...f,
    score: scoreFoodRelevance(f, query),
  }));

  // Sort descending by score
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  return scored;
}
