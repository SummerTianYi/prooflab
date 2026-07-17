import { describe, expect, it } from "vitest";
import { normalizeReproducibilityScore } from "./codex-audit";

describe("normalizeReproducibilityScore", () => {
  it("keeps scores already expressed on a 100-point scale", () => {
    expect(normalizeReproducibilityScore(58)).toBe(58);
  });

  it("converts ratio-shaped scores returned by a model", () => {
    expect(normalizeReproducibilityScore(0.58)).toBe(58);
  });

  it("rejects values outside the supported scale", () => {
    expect(() => normalizeReproducibilityScore(101)).toThrow(
      "Invalid reproducibility score",
    );
  });
});
