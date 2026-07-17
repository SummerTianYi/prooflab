import { describe, expect, it } from "vitest";
import { parseSgcAccuracy } from "./sgc-runner";

describe("parseSgcAccuracy", () => {
  it("extracts the measured test accuracy", () => {
    expect(
      parseSgcAccuracy("Validation Accuracy: 0.7940 Test Accuracy: 0.8100"),
    ).toBe(0.81);
  });

  it("rejects output without the metric", () => {
    expect(() => parseSgcAccuracy("training completed")).toThrow(
      "without a parseable test accuracy",
    );
  });
});
