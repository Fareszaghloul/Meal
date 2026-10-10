import { describe, it, expect } from "vitest";
import { parseInBodyText } from "@/lib/nutrition/inbody-parser";

describe("InBody Report Extraction Pipeline", () => {
  const CLEAN_INBODY_270 = `
InBody 270
Personal Information
ID: Fares
Age: 28  Gender: Male  Height: 180cm
Test Date: 2026.09.15 08:30:00

Body Composition Analysis
Total Body Water (L) 48.2 (39.0 ~ 47.6)
Dry Lean Mass (kg) 14.2 (10.5 ~ 12.9)
Body Fat Mass (kg) 14.4 (10.5 ~ 16.8)
Weight (kg) 78.4 (58.8 ~ 79.6)

Muscle-Fat Analysis
Weight (kg) 78.4 (58.8 ~ 79.6)
SMM (kg) 36.2 (30.1 ~ 36.7)
Body Fat Mass (kg) 14.4 (10.5 ~ 16.8)

Obesity Analysis
BMI (kg/m2) 24.2 (18.5 ~ 25.0)
Percent Body Fat (%) 18.4 (10.0 ~ 20.0)

Segmental Lean Analysis
Right Arm 3.42 kg
Left Arm 3.38 kg
Trunk 27.5 kg
Right Leg 9.12 kg
Left Leg 9.08 kg

Weight Control
Target Weight 75.0 kg
Weight Control -3.4 kg
Fat Control -3.4 kg
Muscle Control 0.0 kg
`;

  it("extracts clean InBody 270 metrics accurately with high confidence", () => {
    const res = parseInBodyText(CLEAN_INBODY_270, { heightCm: 180 });

    expect(res.weightKg.value).toBe(78.4);
    expect(res.weightKg.confidence).toBe("high");

    expect(res.smmKg.value).toBe(36.2);
    expect(res.smmKg.confidence).toBe("high");

    expect(res.bodyFatPct.value).toBe(18.4);
    expect(res.bodyFatPct.confidence).toBe("high");

    expect(res.bmi.value).toBe(24.2);
    expect(res.bmi.confidence).toBe("high");

    expect(res.date.value).toBe("2026-09-15");
    expect(res.date.confidence).toBe("high");

    expect(res.time.value).toBe("08:30");
    expect(res.time.confidence).toBe("high");
  });

  it("never selects Target Weight or Weight Control instead of actual Weight", () => {
    const textWithTargetFirst = `
Weight Control
Target Weight 72.0 kg
Weight Control -10.4 kg
Fat Control -10.4 kg
Muscle-Fat Analysis
Weight 82.4 kg (58.0 ~ 78.0)
Skeletal Muscle Mass 38.6 kg (30.0 ~ 36.0)
Obesity Analysis
Percent Body Fat 21.5%
BMI 25.4
`;
    const res = parseInBodyText(textWithTargetFirst);

    // Actual weight is 82.4, target weight 72.0 MUST NOT be chosen
    expect(res.weightKg.value).toBe(82.4);
    expect(res.weightKg.confidence).toBe("high");
    expect(res.weightKg.value).not.toBe(72.0);
  });

  it("does not confuse whole-body SMM with segmental trunk muscle", () => {
    const textWithSegmental = `
Muscle-Fat Analysis
Weight (kg) 80.0
SMM (kg) 37.5
Segmental Lean Analysis
Right Arm 3.5 kg
Left Arm 3.5 kg
Trunk 28.0 kg
Right Leg 9.5 kg
`;
    const res = parseInBodyText(textWithSegmental);

    expect(res.smmKg.value).toBe(37.5);
    expect(res.smmKg.value).not.toBe(28.0);
  });

  it("does not select normal range boundaries as the measured value", () => {
    const textWithRanges = `
Obesity Analysis
BMI 24.6 (18.5 ~ 25.0)
Percent Body Fat 17.5% (10.0 ~ 20.0)
`;
    const res = parseInBodyText(textWithRanges);

    expect(res.bmi.value).toBe(24.6);
    expect(res.bmi.value).not.toBe(18.5);
    expect(res.bmi.value).not.toBe(25.0);

    expect(res.bodyFatPct.value).toBe(17.5);
    expect(res.bodyFatPct.value).not.toBe(10.0);
    expect(res.bodyFatPct.value).not.toBe(20.0);
  });

  it("handles dropped decimals cautiously with medium confidence", () => {
    const textMissingDecimals = `
Muscle-Fat Analysis
Weight (kg) 824
SMM (kg) 387
Obesity Analysis
BMI 246
Percent Body Fat (%) 175
`;
    const res = parseInBodyText(textMissingDecimals);

    expect(res.weightKg.value).toBe(82.4);
    expect(res.weightKg.isDecimalCorrected).toBe(true);
    expect(res.weightKg.confidence).toBe("medium");

    expect(res.smmKg.value).toBe(38.7);
    expect(res.smmKg.isDecimalCorrected).toBe(true);
    expect(res.smmKg.confidence).toBe("medium");

    expect(res.bmi.value).toBe(24.6);
    expect(res.bmi.isDecimalCorrected).toBe(true);

    expect(res.bodyFatPct.value).toBe(17.5);
    expect(res.bodyFatPct.isDecimalCorrected).toBe(true);
  });

  it("detects and converts imperial lb reports into kg", () => {
    const imperialReport = `
InBody 570
Muscle-Fat Analysis
Weight 181.5 lbs
SMM 84.6 lbs
Obesity Analysis
BMI 25.2
Percent Body Fat 19.5%
`;
    const res = parseInBodyText(imperialReport);

    // 181.5 lbs ≈ 82.3 kg
    expect(res.weightKg.value).toBeCloseTo(82.3, 1);
    expect(res.weightKg.rawUnit).toBe("lb");
    expect(res.weightKg.rawValue).toBe(181.5);

    // 84.6 lbs ≈ 38.4 kg
    expect(res.smmKg.value).toBeCloseTo(38.4, 1);
    expect(res.smmKg.rawUnit).toBe("lb");
  });

  it("supports label on one line and value on the next line", () => {
    const multiLineLayout = `
Muscle-Fat Analysis
Weight
79.5 kg
Skeletal Muscle Mass
37.2 kg
Obesity Analysis
Body Mass Index
24.1
Percent Body Fat
18.0 %
`;
    const res = parseInBodyText(multiLineLayout);

    expect(res.weightKg.value).toBe(79.5);
    expect(res.smmKg.value).toBe(37.2);
    expect(res.bmi.value).toBe(24.1);
    expect(res.bodyFatPct.value).toBe(18.0);
  });

  it("lowers BMI confidence when height-calculated BMI differs significantly", () => {
    const textMismatchedBmi = `
Muscle-Fat Analysis
Weight (kg) 95.0
Obesity Analysis
BMI 18.2
`;
    // Height 180cm with Weight 95kg has expected BMI ≈ 29.3. Extracted 18.2 is wildly discordant.
    const res = parseInBodyText(textMismatchedBmi, { heightCm: 180 });

    expect(res.bmi.value).toBe(18.2);
    expect(res.bmi.confidence).toBe("low");
    expect(res.bmi.warnings?.[0]).toContain("differs from calculated BMI");
  });

  it("boosts BMI confidence when extracted BMI matches calculated BMI from height", () => {
    const textMatchedBmi = `
Muscle-Fat Analysis
Weight (kg) 81.0
Obesity Analysis
BMI 25.0
`;
    // Height 180cm: 81 / (1.80^2) = 25.0
    const res = parseInBodyText(textMatchedBmi, { heightCm: 180 });

    expect(res.bmi.value).toBe(25.0);
    expect(res.bmi.confidence).toBe("high");
  });

  it("rejects physically impossible SMM where SMM >= total weight", () => {
    const impossibleSmm = `
Muscle-Fat Analysis
Weight (kg) 50.0
SMM (kg) 65.0
`;
    const res = parseInBodyText(impossibleSmm);

    expect(res.weightKg.value).toBe(50.0);
    // SMM >= weight is discarded
    expect(res.smmKg.value).toBeNull();
    expect(res.smmKg.confidence).toBe("low");
    expect(res.smmKg.warnings?.[0]).toContain("cannot equal or exceed total weight");
  });

  it("rejects ambiguous date (e.g. 05/06/2026) to prevent storing the wrong day/month", () => {
    const ambiguousDate = `
Test Date: 05/06/2026
Weight 75.0 kg
`;
    const res = parseInBodyText(ambiguousDate);

    expect(res.date.value).toBeNull();
    expect(res.date.confidence).toBe("low");
    expect(res.date.warnings?.[0]).toContain("ambiguous");
  });

  it("correctly extracts unambiguous DD/MM/YYYY date when day > 12", () => {
    const unambiguousDate = `
Test Date: 25/08/2026
Weight 75.0 kg
`;
    const res = parseInBodyText(unambiguousDate);

    expect(res.date.value).toBe("2026-08-25");
    expect(res.date.confidence).toBe("high");
  });

  it("does not extract random times from unrelated text or opening hours", () => {
    const unrelatedTime = `
Welcome to Gym Fitness Center
Hours: 06:00 - 23:00
Weight 75.0 kg
`;
    const res = parseInBodyText(unrelatedTime);

    // Opening hours are not near Test Date / Test Time
    expect(res.time.value).toBeNull();
    expect(res.time.confidence).toBe("missing");
  });

  it("safely handles garbage / non-InBody text without hallucinating values", () => {
    const garbageText = `
SPECIAL OFFER!
Buy 2 protein tubs get 1 free!
Phone: 555-0199
Expires December 2026
`;
    const res = parseInBodyText(garbageText);

    expect(res.weightKg.value).toBeNull();
    expect(res.weightKg.confidence).toBe("missing");
    expect(res.smmKg.value).toBeNull();
    expect(res.smmKg.confidence).toBe("missing");
    expect(res.bodyFatPct.value).toBeNull();
    expect(res.bodyFatPct.confidence).toBe("missing");
    expect(res.bmi.value).toBeNull();
    expect(res.bmi.confidence).toBe("missing");
  });
});
