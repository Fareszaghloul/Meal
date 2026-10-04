import { describe, expect, it } from "vitest";
import { KG_TO_LB, formatWeight, fromKg, kgToLb, lbToKg, toKg, weightInputValue, weightUnitFor } from "@/lib/weight-units";

describe("weight units", () => {
  it("uses the full-precision factor", () => {
    expect(KG_TO_LB).toBe(2.2046226218);
    expect(kgToLb(1)).toBeCloseTo(2.2046226218, 10);
    expect(kgToLb(82.4)).toBeCloseTo(181.66, 2);
    expect(lbToKg(220.46226218)).toBeCloseTo(100, 8);
  });

  it("maps the measurement preference to a unit", () => {
    expect(weightUnitFor("imperial")).toBe("lbs");
    expect(weightUnitFor("metric")).toBe("kg");
    expect(weightUnitFor(undefined)).toBe("kg");
  });

  it("kg display is the identity; lb display converts", () => {
    expect(fromKg(82.4, "kg")).toBe(82.4);
    expect(fromKg(82.4, "lbs")).toBeCloseTo(181.66, 2);
    expect(formatWeight(82.4, "lbs")).toBe("181.7");
    expect(weightInputValue(82.4, "kg")).toBe("82.4");
    expect(weightInputValue(80, "kg")).toBe("80");
  });

  it("typing a 1-decimal lb value survives lb → kg → lb for every value a person could enter", () => {
    let bad = 0;
    for (let tenths = 440; tenths <= 11000; tenths++) {
      const lb = tenths / 10;
      if (Number(weightInputValue(toKg(lb, "lbs"), "lbs")) !== lb) bad++;
    }
    expect(bad).toBe(0);
  });

  it("kg typed in kg is stored exactly (no conversion drift)", () => {
    expect(toKg(82.4, "kg")).toBe(82.4);
    // Switching the display preference never rewrites stored kg: kg → lb → show → back to kg display is unchanged.
    const stored = 82.4;
    expect(weightInputValue(stored, "lbs")).toBe("181.7");
    expect(weightInputValue(stored, "kg")).toBe("82.4");
  });

  it("converting a stored kg to lb and back is within 0.03 kg", () => {
    for (const kg of [20, 45.5, 61.234, 82.4, 100, 160.9, 500]) {
      const back = toKg(Number(weightInputValue(kg, "lbs")), "lbs");
      expect(Math.abs(back - kg)).toBeLessThan(0.03);
    }
  });
});
