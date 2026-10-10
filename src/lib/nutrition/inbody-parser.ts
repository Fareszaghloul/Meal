/**
 * Structured InBody Report Extraction Pipeline
 * Supports InBody 270, 370, 570, 770 and compatible body composition analysis sheets.
 *
 * Designed to be conservative, explainable, layout-aware, and confidence-driven.
 * Never silently associates numbers from target weights, reference ranges,
 * segmental analysis, or history rows with current body metrics.
 */

export type FieldConfidence = "high" | "medium" | "low" | "missing";

export interface InBodyFieldResult {
  value: number | null;
  confidence: FieldConfidence;
  source?: string;
  sourceLine?: string;
  rawUnit?: "kg" | "lb" | "%" | null;
  rawValue?: number | null;
  isDecimalCorrected?: boolean;
  warnings?: string[];
  reasons?: string[];
}

export interface InBodyTemporalResult {
  value: string | null;
  confidence: FieldConfidence;
  source?: string;
  warnings?: string[];
}

export interface InBodyDiagnostics {
  sectionsDetected: string[];
  candidatesEvaluated: Record<string, Array<{
    value: number;
    score: number;
    source: string;
    reasons: string[];
  }>>;
  expectedBmi?: number | null;
  heightCm?: number | null;
}

export interface ParsedInBodyScan {
  weightKg: InBodyFieldResult;
  smmKg: InBodyFieldResult;
  bodyFatPct: InBodyFieldResult;
  bmi: InBodyFieldResult;
  date: InBodyTemporalResult;
  time: InBodyTemporalResult;
  expectedBmi?: number | null;
  heightCm?: number | null;
  rawText: string;
  diagnostics?: InBodyDiagnostics;
}

export interface InBodyParserOptions {
  heightCm?: number | null;
  unitHint?: "metric" | "imperial";
}

export interface NormalizedLine {
  index: number;
  raw: string;
  clean: string;
  lower: string;
  section: string;
  tokens: string[];
  numbers: ExtractedNumber[];
  hasRange: boolean;
  hasTargetOrControl: boolean;
  hasSegmental: boolean;
}

export interface ExtractedNumber {
  rawStr: string;
  value: number;
  hasDecimal: boolean;
  unit?: "kg" | "lb" | "%";
  isRangeBoundary?: boolean;
  wasDecimalCorrected?: boolean;
  originalRawValue?: number;
}

export type SectionType =
  | "UNKNOWN"
  | "HEADER"
  | "BODY_COMPOSITION"
  | "MUSCLE_FAT_ANALYSIS"
  | "OBESITY_ANALYSIS"
  | "SEGMENTAL"
  | "WEIGHT_CONTROL"
  | "HISTORY";

/**
 * Normalizes raw OCR text lines, standardizes punctuation, and tokenizes.
 */
export function normalizeOcrText(rawText: string): NormalizedLine[] {
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let currentSection: SectionType = "UNKNOWN";

  const lines: NormalizedLine[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const raw = rawLines[idx];
    
    // Clean up commas between digits (e.g., "78,4" -> "78.4") and middle dots
    let clean = raw
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/[·•]/g, ".")
      .replace(/[\t\f\v]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const lower = clean.toLowerCase();

    // Section detection
    if (lower.includes("muscle-fat analysis") || lower.includes("muscle - fat") || lower.includes("muscle & fat") || lower.includes("muscle fat analysis")) {
      currentSection = "MUSCLE_FAT_ANALYSIS";
    } else if (lower.includes("body composition analysis")) {
      currentSection = "BODY_COMPOSITION";
    } else if (lower.includes("obesity analysis") || lower.includes("obesity evaluation")) {
      currentSection = "OBESITY_ANALYSIS";
    } else if (lower.includes("weight control") || lower.includes("body composition control")) {
      currentSection = "WEIGHT_CONTROL";
    } else if (lower.includes("segmental lean") || lower.includes("segmental fat") || lower.includes("segmental analysis")) {
      currentSection = "SEGMENTAL";
    } else if (lower.includes("body composition history") || lower.includes("history")) {
      currentSection = "HISTORY";
    } else if (lower.includes("test date") || lower.includes("personal information") || lower.includes("inbody")) {
      if (currentSection === "UNKNOWN") currentSection = "HEADER";
    }

    const hasTargetOrControl =
      /\b(target\s*weight|ideal\s*weight|weight\s*control|fat\s*control|muscle\s*control|recommended)\b/i.test(lower);

    const hasSegmental =
      /\b(right\s*arm|left\s*arm|trunk|right\s*leg|left\s*leg)\b/i.test(lower);

    // Range detection: e.g. "29.1 ~ 35.5", "18.5 - 24.9", "(10.0 - 20.0)"
    const rangeRegex = /(?:\(|\[)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:~|–|-|to)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\)|\])?/g;
    const rangeBoundaries = new Set<string>();
    let rMatch: RegExpExecArray | null;
    while ((rMatch = rangeRegex.exec(clean)) !== null) {
      if (rMatch[1]) rangeBoundaries.add(rMatch[1]);
      if (rMatch[2]) rangeBoundaries.add(rMatch[2]);
    }
    const hasRange = rangeBoundaries.size > 0;

    // Extract numbers on this line
    const numbers: ExtractedNumber[] = [];
    const numRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(kg|lbs?|%)?/gi;
    let nMatch: RegExpExecArray | null;
    while ((nMatch = numRegex.exec(clean)) !== null) {
      const rawStr = nMatch[1];
      const val = parseFloat(rawStr);
      if (isNaN(val)) continue;

      let unitStr = nMatch[2]?.toLowerCase();
      let unit: "kg" | "lb" | "%" | undefined;
      if (unitStr?.startsWith("lb")) unit = "lb";
      else if (unitStr === "kg") unit = "kg";
      else if (unitStr === "%") unit = "%";
      else {
        // Look ahead in line for trailing unit
        if (/\b(?:kg)\b/i.test(clean)) unit = "kg";
        else if (/\b(?:lbs?)\b/i.test(clean)) unit = "lb";
        else if (/%/.test(clean)) unit = "%";
      }

      const isRangeBoundary = rangeBoundaries.has(rawStr);
      const hasDecimal = rawStr.includes(".");

      numbers.push({
        rawStr,
        value: val,
        hasDecimal,
        unit,
        isRangeBoundary,
        wasDecimalCorrected: false,
      });

      // Decimal OCR correction candidate:
      // If integer like 824, 387, 175 and no explicit decimal, create candidate divided by 10
      if (!hasDecimal && val >= 50 && val <= 3500 && rawStr.length >= 3) {
        const correctedVal = Math.round((val / 10) * 10) / 10;
        numbers.push({
          rawStr,
          value: correctedVal,
          hasDecimal: false,
          unit,
          isRangeBoundary,
          wasDecimalCorrected: true,
          originalRawValue: val,
        });
      }
    }

    lines.push({
      index: idx,
      raw,
      clean,
      lower,
      section: currentSection,
      tokens: lower.split(/\s+/),
      numbers,
      hasRange,
      hasTargetOrControl,
      hasSegmental,
    });
  }

  return lines;
}

interface ScoredCandidate {
  value: number;
  score: number;
  sourceLine: string;
  sourceIndex: number;
  rawUnit?: "kg" | "lb" | "%" | null;
  rawValue?: number | null;
  isDecimalCorrected?: boolean;
  reasons: string[];
}

/**
 * Searches for label matches and scores candidate numbers in local proximity.
 */
function extractMetricCandidates(
  lines: NormalizedLine[],
  labelRegexes: RegExp[],
  preferredSections: SectionType[],
  plausibilityValidator: (val: number, unit?: "kg" | "lb" | "%") => boolean,
  field: "weight" | "smm" | "pbf" | "bmi"
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains label
    const hasLabel = labelRegexes.some((re) => re.test(line.lower));
    if (!hasLabel) continue;

    // Check lines in proximity: line i (distance 0), line i+1 (distance 1), line i-1 (distance -1)
    const proximityOffsets = [0, 1, -1, 2];

    for (const offset of proximityOffsets) {
      const targetIdx = i + offset;
      if (targetIdx < 0 || targetIdx >= lines.length) continue;

      const targetLine = lines[targetIdx];

      for (const numObj of targetLine.numbers) {
        // LB to KG conversion
        let effectiveVal = numObj.value;
        const originalVal = numObj.value;
        let effectiveUnit = numObj.unit;

        if (numObj.unit === "lb" && (field === "weight" || field === "smm")) {
          effectiveVal = Math.round((numObj.value * 0.45359237) * 10) / 10;
        }

        // Must pass plausibility filter
        if (!plausibilityValidator(effectiveVal, effectiveUnit)) continue;

        let score = 0;
        const reasons: string[] = [];

        // 1. Proximity score
        if (offset === 0) {
          score += 50;
          reasons.push("Label on same line (+50)");
        } else if (offset === 1) {
          score += 25;
          reasons.push("Value on line below label (+25)");
        } else if (offset === -1) {
          score += 10;
          reasons.push("Value on line above label (+10)");
        } else if (offset === 2) {
          score += 5;
          reasons.push("Value 2 lines below label (+5)");
        }

        // 2. Section scoring
        if (preferredSections.includes(targetLine.section as SectionType)) {
          score += 40;
          reasons.push(`In preferred section: ${targetLine.section} (+40)`);
        } else if (targetLine.section === "WEIGHT_CONTROL" || targetLine.section === "HISTORY") {
          score -= 70;
          reasons.push(`In non-current section: ${targetLine.section} (-70)`);
        } else if (targetLine.section === "SEGMENTAL" && field !== "pbf") {
          score -= 80;
          reasons.push("In segmental section (-80)");
        }

        // 3. Target / Control / Recommended penalty
        if (targetLine.hasTargetOrControl || line.hasTargetOrControl) {
          score -= 100;
          reasons.push("Near target or control label (-100)");
        }

        // 4. Segmental muscle penalty for SMM / Weight
        if ((targetLine.hasSegmental || line.hasSegmental) && (field === "smm" || field === "weight")) {
          score -= 90;
          reasons.push("Near segmental limb label (-90)");
        }

        // 5. Range boundary penalty
        if (numObj.isRangeBoundary) {
          score -= 90;
          reasons.push("Matches normal range boundary (-90)");
        }

        // 6. Unit match bonus / penalty
        if (field === "weight" || field === "smm") {
          if (numObj.unit === "kg" || numObj.unit === "lb") {
            score += 20;
            reasons.push(`Explicit mass unit ${numObj.unit} (+20)`);
          } else if (numObj.unit === "%") {
            score -= 60;
            reasons.push("Percentage unit on mass field (-60)");
          }
        } else if (field === "pbf") {
          if (numObj.unit === "%") {
            score += 25;
            reasons.push("Explicit % unit (+25)");
          } else if (numObj.unit === "kg" || numObj.unit === "lb") {
            score -= 60;
            reasons.push("Mass unit on percentage field (-60)");
          }
        } else if (field === "bmi") {
          if (numObj.unit === "%") {
            score -= 50;
            reasons.push("Percentage unit on BMI field (-50)");
          } else if (!numObj.unit) {
            score += 15;
            reasons.push("Unitless index as expected for BMI (+15)");
          }
        }

        // 7. Decimal correction penalty
        if (numObj.wasDecimalCorrected) {
          score -= 20;
          reasons.push("Decimal point was inferred from integer (-20)");
        } else if (numObj.hasDecimal) {
          score += 15;
          reasons.push("Explicit decimal in source (+15)");
        }

        candidates.push({
          value: effectiveVal,
          score,
          sourceLine: targetLine.clean,
          sourceIndex: targetIdx,
          rawUnit: numObj.unit || null,
          rawValue: originalVal,
          isDecimalCorrected: numObj.wasDecimalCorrected,
          reasons,
        });
      }
    }
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Validates Weight (25 - 350 kg)
 */
export function validateWeight(val: number, unit?: "kg" | "lb" | "%"): boolean {
  if (unit === "lb") {
    const kg = val * 0.45359237;
    return kg >= 25 && kg <= 350;
  }
  return val >= 25 && val <= 350;
}

/**
 * Validates SMM (5 - 100 kg)
 */
export function validateSmm(val: number, unit?: "kg" | "lb" | "%"): boolean {
  if (unit === "lb") {
    const kg = val * 0.45359237;
    return kg >= 5 && kg <= 100;
  }
  return val >= 5 && val <= 100;
}

/**
 * Validates PBF (2 - 70 %)
 */
export function validatePbf(val: number): boolean {
  return val >= 2 && val <= 70;
}

/**
 * Validates BMI (10 - 70)
 */
export function validateBmi(val: number): boolean {
  return val >= 10 && val <= 70;
}

/**
 * Parses Test Date conservatively.
 * Rejects ambiguous dates (e.g. 05/06/2026 where both day and month <= 12 and format unknown).
 */
export function parseInBodyDate(lines: NormalizedLine[]): InBodyTemporalResult {
  const dateLabels = [/\b(test\s*date|date|measurement\s*date)\b/i];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isNearby = dateLabels.some((re) => re.test(line.lower)) || line.section === "HEADER";
    if (!isNearby) continue;

    // 1. ISO or dot format: YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD
    const isoMatch = line.clean.match(/\b(20[2-3][0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12][0-9]|3[01])\b/);
    if (isoMatch) {
      const formatted = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      return {
        value: formatted,
        confidence: "high",
        source: line.clean,
      };
    }

    // 2. Format: DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = line.clean.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|[12][0-9]|3[01])[-/.](20[2-3][0-9])\b/);
    if (slashMatch) {
      const p1 = parseInt(slashMatch[1], 10);
      const p2 = parseInt(slashMatch[2], 10);
      const year = slashMatch[3];

      // If one part > 12, it must be DD/MM/YYYY
      if (p1 > 12 && p2 <= 12) {
        const formatted = `${year}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
        return {
          value: formatted,
          confidence: "high",
          source: line.clean,
        };
      }
      // If second part > 12, it must be MM/DD/YYYY
      if (p2 > 12 && p1 <= 12) {
        const formatted = `${year}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
        return {
          value: formatted,
          confidence: "high",
          source: line.clean,
        };
      }
      // Ambiguous (both <= 12 and p1 !== p2): do not guess!
      if (p1 <= 12 && p2 <= 12 && p1 !== p2) {
        return {
          value: null,
          confidence: "low",
          source: line.clean,
          warnings: ["Date format is ambiguous (cannot distinguish day from month). Enter manually."],
        };
      }
      // If p1 === p2 (e.g. 05/05/2026)
      const formatted = `${year}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
      return {
        value: formatted,
        confidence: "medium",
        source: line.clean,
      };
    }
  }

  return { value: null, confidence: "missing" };
}

/**
 * Parses Test Time near test date or test time labels.
 */
export function parseInBodyTime(lines: NormalizedLine[]): InBodyTemporalResult {
  const timeLabels = [/\b(test\s*time|time|test\s*date)\b/i];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isNearby = timeLabels.some((re) => re.test(line.lower)) || line.section === "HEADER";
    if (!isNearby) continue;

    const timeMatch = line.clean.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?\b/);
    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, "0");
      const mm = timeMatch[2];
      return {
        value: `${hh}:${mm}`,
        confidence: "high",
        source: line.clean,
      };
    }
  }

  return { value: null, confidence: "missing" };
}

/**
 * Main parser entry point.
 */
export function parseInBodyText(rawText: string, options: InBodyParserOptions = {}): ParsedInBodyScan {
  const lines = normalizeOcrText(rawText);

  // 1. Extract Weight
  const weightLabels = [
    /\b(weight|body\s*weight)\b/i,
    /\b(wt\.?)\b/i,
  ];
  const weightCandidates = extractMetricCandidates(
    lines,
    weightLabels,
    ["MUSCLE_FAT_ANALYSIS", "BODY_COMPOSITION"],
    validateWeight,
    "weight"
  );

  // 2. Extract SMM
  const smmLabels = [
    /\b(skeletal\s*muscle\s*mass)\b/i,
    /\b(s\.?m\.?m\.?)\b/i,
    /\b(skeletal\s*muscle)\b/i,
  ];
  const smmCandidates = extractMetricCandidates(
    lines,
    smmLabels,
    ["MUSCLE_FAT_ANALYSIS"],
    validateSmm,
    "smm"
  );

  // 3. Extract PBF
  const pbfLabels = [
    /\b(percent\s*body\s*fat)\b/i,
    /\b(body\s*fat\s*percentage)\b/i,
    /\b(body\s*fat\s*%)\b/i,
    /\b(p\.?b\.?f\.?)\b/i,
  ];
  const pbfCandidates = extractMetricCandidates(
    lines,
    pbfLabels,
    ["OBESITY_ANALYSIS", "BODY_COMPOSITION"],
    validatePbf,
    "pbf"
  );

  // 4. Extract BMI
  const bmiLabels = [
    /\b(body\s*mass\s*index)\b/i,
    /\b(b\.?m\.?i\.?)\b/i,
  ];
  const bmiCandidates = extractMetricCandidates(
    lines,
    bmiLabels,
    ["OBESITY_ANALYSIS"],
    validateBmi,
    "bmi"
  );

  // Initial candidate selection
  const bestWeight = weightCandidates[0];
  const bestSmm = smmCandidates[0];
  const bestPbf = pbfCandidates[0];
  const bestBmi = bmiCandidates[0];

  function buildFieldResult(cand: ScoredCandidate | undefined, minScore = 40): InBodyFieldResult {
    if (!cand || cand.score < 20) {
      return {
        value: null,
        confidence: "missing",
      };
    }

    let confidence: FieldConfidence = "low";
    if (cand.score >= 65) confidence = "high";
    else if (cand.score >= minScore) confidence = "medium";

    if (cand.isDecimalCorrected && confidence === "high") {
      confidence = "medium";
    }

    const warnings: string[] = [];
    if (cand.isDecimalCorrected) {
      warnings.push(`Decimal point inferred from reading "${cand.rawValue}". Check against sheet.`);
    }

    return {
      value: cand.value,
      confidence,
      source: cand.sourceLine,
      sourceLine: cand.sourceLine,
      rawUnit: cand.rawUnit,
      rawValue: cand.rawValue,
      isDecimalCorrected: cand.isDecimalCorrected,
      warnings,
      reasons: cand.reasons,
    };
  }

  const weightResult = buildFieldResult(bestWeight, 45);
  const smmResult = buildFieldResult(bestSmm, 45);
  const pbfResult = buildFieldResult(bestPbf, 45);
  const bmiResult = buildFieldResult(bestBmi, 45);

  // Cross-Validation 1: SMM vs Weight
  if (weightResult.value !== null && smmResult.value !== null) {
    if (smmResult.value >= weightResult.value) {
      smmResult.confidence = "low";
      smmResult.warnings = smmResult.warnings || [];
      smmResult.warnings.push(
        `SMM (${smmResult.value} kg) cannot equal or exceed total weight (${weightResult.value} kg). Value discarded as candidate.`
      );
      smmResult.value = null;
    } else if (smmResult.value > weightResult.value * 0.75) {
      smmResult.confidence = "low";
      smmResult.warnings = smmResult.warnings || [];
      smmResult.warnings.push(
        `SMM (${smmResult.value} kg) is unusually high relative to weight (${weightResult.value} kg). Please verify.`
      );
    }
  }

  // Cross-Validation 2: BMI vs Height
  let expectedBmi: number | null = null;
  if (options.heightCm && weightResult.value !== null && options.heightCm > 50 && options.heightCm < 250) {
    const heightM = options.heightCm / 100;
    expectedBmi = Math.round((weightResult.value / (heightM * heightM)) * 10) / 10;

    if (bmiResult.value !== null) {
      const diff = Math.abs(bmiResult.value - expectedBmi);
      if (diff > 1.5) {
        bmiResult.confidence = "low";
        bmiResult.warnings = bmiResult.warnings || [];
        bmiResult.warnings.push(
          `Extracted BMI (${bmiResult.value}) differs from calculated BMI (${expectedBmi} for ${options.heightCm} cm).`
        );
      } else if (diff <= 0.8 && bmiResult.confidence === "medium") {
        bmiResult.confidence = "high";
        bmiResult.reasons = bmiResult.reasons || [];
        bmiResult.reasons.push("Matches calculated BMI from height (+boosted to high)");
      }
    }
  }

  // Cross-Validation 3: PBF realism
  if (pbfResult.value !== null) {
    if (pbfResult.value < 3 || pbfResult.value > 65) {
      pbfResult.confidence = "low";
      pbfResult.warnings = pbfResult.warnings || [];
      pbfResult.warnings.push(`PBF (${pbfResult.value}%) is outside typical physiological limits.`);
    }
  }

  const dateResult = parseInBodyDate(lines);
  const timeResult = parseInBodyTime(lines);

  // Collect sections detected for diagnostics
  const sectionsDetected = Array.from(new Set(lines.map((l) => l.section))).filter((s) => s !== "UNKNOWN");

  return {
    weightKg: weightResult,
    smmKg: smmResult,
    bodyFatPct: pbfResult,
    bmi: bmiResult,
    date: dateResult,
    time: timeResult,
    expectedBmi,
    heightCm: options.heightCm,
    rawText,
    diagnostics: {
      sectionsDetected,
      candidatesEvaluated: {
        weight: weightCandidates.slice(0, 3).map((c) => ({
          value: c.value,
          score: c.score,
          source: c.sourceLine,
          reasons: c.reasons,
        })),
        smm: smmCandidates.slice(0, 3).map((c) => ({
          value: c.value,
          score: c.score,
          source: c.sourceLine,
          reasons: c.reasons,
        })),
        pbf: pbfCandidates.slice(0, 3).map((c) => ({
          value: c.value,
          score: c.score,
          source: c.sourceLine,
          reasons: c.reasons,
        })),
        bmi: bmiCandidates.slice(0, 3).map((c) => ({
          value: c.value,
          score: c.score,
          source: c.sourceLine,
          reasons: c.reasons,
        })),
      },
      expectedBmi,
      heightCm: options.heightCm,
    },
  };
}
