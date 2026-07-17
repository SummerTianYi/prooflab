import { describe, expect, it } from "vitest";
import { evaluateMetric } from "./evaluation";

describe("evaluateMetric", () => {
  it("marks a result inside tolerance as reproduced", () => {
    expect(evaluateMetric(0.81, 0.802, 0.02).status).toBe("reproduced");
  });

  it("marks a near miss as partially reproduced", () => {
    expect(evaluateMetric(0.81, 0.77, 0.02).status).toBe(
      "partially_reproduced",
    );
  });

  it("marks a large deviation as not reproduced", () => {
    expect(evaluateMetric(0.81, 0.7, 0.02).status).toBe("not_reproduced");
  });

  it("rejects invalid input", () => {
    expect(() => evaluateMetric(0.81, Number.NaN, 0.02)).toThrow(
      "finite numbers",
    );
    expect(() => evaluateMetric(0.81, 0.8, 0)).toThrow(
      "greater than zero",
    );
  });
});
