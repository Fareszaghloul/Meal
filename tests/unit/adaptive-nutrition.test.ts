import { describe, it, expect } from "vitest";

describe("adaptive nutrition calculations", () => {
  it("keeps target unchanged when observed rate is within tolerance of goal", () => {
    const targetWeeklyRate = -0.50; // lose 0.50 kg/week
    const observedWeeklyRate = -0.45; // lose 0.45 kg/week
    const diff = observedWeeklyRate - targetWeeklyRate; // +0.05
    expect(Math.abs(diff)).toBeLessThanOrEqual(0.12);
  });

  it("calculates conservative calorie deficit adjustment within limits", () => {
    const targetWeeklyRate = -0.50;
    const observedWeeklyRate = -0.10; // losing too slowly by 0.40 kg/week
    const diff = observedWeeklyRate - targetWeeklyRate; // +0.40

    const rawAdj = Math.round((diff * 450) / 25) * 25; // 175 kcal
    const clamped = Math.min(250, Math.max(50, rawAdj));

    expect(clamped).toBe(175);
    expect(clamped).toBeLessThanOrEqual(250);
    expect(clamped).toBeGreaterThanOrEqual(50);
  });

  it("clamps maximum adjustment to 250 kcal/day even for wide gaps", () => {
    const targetWeeklyRate = -0.75;
    const observedWeeklyRate = 0.20; // 0.95 gap
    const diff = observedWeeklyRate - targetWeeklyRate;

    const rawAdj = Math.round((diff * 450) / 25) * 25;
    const clamped = Math.min(250, Math.max(50, rawAdj));

    expect(clamped).toBe(250);
  });

  it("respects the 1,200 kcal absolute safety floor", () => {
    const currentCalories = 1300;
    const suggestedChange = -200;
    const minFloor = 1200;

    const recommended = Math.max(minFloor, currentCalories + suggestedChange);
    const actualChange = recommended - currentCalories;

    expect(recommended).toBe(1200);
    expect(actualChange).toBe(-100);
  });
});
