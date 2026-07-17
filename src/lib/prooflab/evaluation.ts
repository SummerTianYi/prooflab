import type { MetricEvaluation } from "./types";

export function evaluateMetric(
  expected: number,
  actual: number,
  tolerance: number,
): MetricEvaluation {
  if (![expected, actual, tolerance].every(Number.isFinite)) {
    throw new Error("Metric values must be finite numbers.");
  }

  if (tolerance <= 0) {
    throw new Error("Tolerance must be greater than zero.");
  }

  const absoluteDelta = Math.abs(actual - expected);
  const status =
    absoluteDelta <= tolerance
      ? "reproduced"
      : absoluteDelta <= tolerance * 2.5
        ? "partially_reproduced"
        : "not_reproduced";

  return {
    expected,
    actual,
    absoluteDelta,
    tolerance,
    status,
  };
}
