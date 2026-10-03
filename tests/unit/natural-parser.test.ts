import { describe, expect, it } from "vitest";
import { parseNaturalSearch } from "@/lib/nutrition/natural-parser";

describe("parseNaturalSearch", () => {
  it("detects count without unit: '4 sunny side up eggs'", () => {
    const res = parseNaturalSearch("4 sunny side up eggs");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(4);
    expect(res.unit).toBe(null);
    expect(res.foodQuery).toBe("sunny side up eggs");
  });

  it("detects metric weight with attached unit: '250g chicken breast'", () => {
    const res = parseNaturalSearch("250g chicken breast");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(250);
    expect(res.unit).toBe("g");
    expect(res.foodQuery).toBe("chicken breast");
  });

  it("detects volume unit: '1.5 cups white rice'", () => {
    const res = parseNaturalSearch("1.5 cups white rice");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(1.5);
    expect(res.unit).toBe("cup");
    expect(res.foodQuery).toBe("white rice");
  });

  it("detects fraction without unit: '1/2 avocado'", () => {
    const res = parseNaturalSearch("1/2 avocado");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(0.5);
    expect(res.unit).toBe(null);
    expect(res.foodQuery).toBe("avocado");
  });

  it("detects scoops: '2 scoops whey protein'", () => {
    const res = parseNaturalSearch("2 scoops whey protein");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(2);
    expect(res.unit).toBe("scoop");
    expect(res.foodQuery).toBe("whey protein");
  });

  it("leaves standard food searches untouched", () => {
    const res = parseNaturalSearch("chicken breast");
    expect(res.hasNaturalQuantity).toBe(false);
    expect(res.quantity).toBe(null);
    expect(res.unit).toBe(null);
    expect(res.foodQuery).toBe("chicken breast");
  });

  it("detects detached metric weight: '250 g chicken breast'", () => {
    const res = parseNaturalSearch("250 g chicken breast");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(250);
    expect(res.unit).toBe("g");
    expect(res.foodQuery).toBe("chicken breast");
  });

  it("detects volume: '100ml milk' and '100 ml milk'", () => {
    const res1 = parseNaturalSearch("100ml milk");
    expect(res1.hasNaturalQuantity).toBe(true);
    expect(res1.quantity).toBe(100);
    expect(res1.unit).toBe("ml");
    expect(res1.foodQuery).toBe("milk");

    const res2 = parseNaturalSearch("100 ml milk");
    expect(res2.hasNaturalQuantity).toBe(true);
    expect(res2.quantity).toBe(100);
    expect(res2.unit).toBe("ml");
    expect(res2.foodQuery).toBe("milk");
  });

  it("detects count without unit: '4 eggs' and '2 bananas'", () => {
    const r1 = parseNaturalSearch("4 eggs");
    expect(r1.hasNaturalQuantity).toBe(true);
    expect(r1.quantity).toBe(4);
    expect(r1.foodQuery).toBe("eggs");

    const r2 = parseNaturalSearch("2 bananas");
    expect(r2.hasNaturalQuantity).toBe(true);
    expect(r2.quantity).toBe(2);
    expect(r2.foodQuery).toBe("bananas");
  });

  it("detects leading decimal without unit: '0.5 avocado'", () => {
    const res = parseNaturalSearch("0.5 avocado");
    expect(res.hasNaturalQuantity).toBe(true);
    expect(res.quantity).toBe(0.5);
    expect(res.foodQuery).toBe("avocado");
  });

  it("fails safely on malformed or out-of-bounds inputs", () => {
    // 0 quantity should not be treated as a valid log quantity
    expect(parseNaturalSearch("0 eggs").hasNaturalQuantity).toBe(false);

    // Negative quantities
    expect(parseNaturalSearch("-2 eggs").hasNaturalQuantity).toBe(false);

    // Ridiculous bounds (> 10000)
    expect(parseNaturalSearch("999999 eggs").hasNaturalQuantity).toBe(false);

    // Text leading
    expect(parseNaturalSearch("abc eggs").hasNaturalQuantity).toBe(false);

    // Invalid decimal dots
    expect(parseNaturalSearch("2.5.3 eggs").hasNaturalQuantity).toBe(false);
  });

  it("handles empty input", () => {
    const res = parseNaturalSearch("");
    expect(res.hasNaturalQuantity).toBe(false);
    expect(res.foodQuery).toBe("");
  });
});
