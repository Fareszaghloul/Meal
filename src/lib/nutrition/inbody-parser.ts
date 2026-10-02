/**
 * Parser for InBody Body Composition Analysis Sheets (InBody 270, 370, 570, 770, etc.)
 * Extracts Weight, Skeletal Muscle Mass (SMM), Percent Body Fat (PBF), and BMI from OCR text.
 */

export interface ParsedInBodyScan {
  weightKg: number | null;
  smmKg: number | null;
  bodyFatPct: number | null;
  bmi: number | null;
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM"
  rawText: string;
}

export function parseInBodyText(rawText: string): ParsedInBodyScan {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const text = rawText.replace(/\r/g, " ");

  let weightKg: number | null = null;
  let smmKg: number | null = null;
  let bodyFatPct: number | null = null;
  let bmi: number | null = null;
  let date: string | null = null;
  let time: string | null = null;

  // 1. Weight Extraction (e.g., "Weight 78.4", "Body Weight (kg) 78.4", "Weight: 78.4 kg")
  const weightRegexes = [
    /(?:weight|body\s*weight)\s*(?:\([a-z]+\))?\s*[:=]?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/i,
    /([0-9]{2,3}(?:\.[0-9]{1,2})?)\s*(?:kg|lbs?)\s*(?:weight|body\s*weight)/i,
    /(?:weight|wt)\.?\s*[:=]?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/i,
  ];
  for (const re of weightRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val >= 30 && val <= 300) {
        weightKg = val;
        break;
      }
    }
  }

  // 2. Skeletal Muscle Mass (SMM) Extraction
  // (e.g. "SMM 36.2", "Skeletal Muscle Mass 36.2", "S.M.M 36.2")
  const smmRegexes = [
    /(?:skeletal\s*muscle\s*mass|s\.?m\.?m\.?)\s*(?:\([a-z]+\))?\s*[:=]?\s*([0-9]{1,3}(?:\.[0-9]{1,2})?)/i,
    /([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:kg|lbs?)?\s*(?:skeletal\s*muscle\s*mass|smm)/i,
  ];
  for (const re of smmRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val >= 10 && val <= 100) {
        smmKg = val;
        break;
      }
    }
  }

  // 3. Percent Body Fat (PBF / Body Fat %)
  // (e.g. "Percent Body Fat 15.4%", "PBF 15.4", "Body Fat Percent 15.4")
  const pbfRegexes = [
    /(?:percent\s*body\s*fat|p\.?b\.?f\.?|body\s*fat\s*%?)\s*(?:\(%\))?\s*[:=]?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%?/i,
    /([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%\s*(?:body\s*fat|pbf)/i,
  ];
  for (const re of pbfRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val >= 3 && val <= 65) {
        bodyFatPct = val;
        break;
      }
    }
  }

  // 4. BMI Extraction (e.g. "B.M.I 24.1", "BMI: 24.1", "Body Mass Index 24.1")
  const bmiRegexes = [
    /(?:body\s*mass\s*index|b\.?m\.?i\.?)\s*[:=]?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)/i,
    /([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*(?:bmi)/i,
  ];
  for (const re of bmiRegexes) {
    const match = text.match(re);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val >= 10 && val <= 60) {
        bmi = val;
        break;
      }
    }
  }

  // 5. Date Extraction (e.g. "2026.09.15", "2026-09-15", "15/09/2026", "Sep 15, 2026")
  const dateRegex = /(?:test\s*date|date)?\s*[:=]?\s*(20[2-3][0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12][0-9]|3[01])/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  // 6. Time Extraction (e.g. "08:35", "14:20:10")
  const timeRegex = /\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?\b/;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  return {
    weightKg,
    smmKg,
    bodyFatPct,
    bmi,
    date,
    time,
    rawText,
  };
}
