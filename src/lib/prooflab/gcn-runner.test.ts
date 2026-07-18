import { describe, expect, it } from "vitest";
import { evaluateMetric } from "./evaluation";
import {
  buildGcnPatchMetadata,
  classifyGcnFailure,
  parseGcnAccuracy,
} from "./gcn-runner";
import { GCN_COMMIT } from "./studies";

describe("classifyGcnFailure", () => {
  it("classifies the measured modern SciPy import failure", () => {
    expect(
      classifyGcnFailure(
        "ModuleNotFoundError: No module named 'scipy.sparse.linalg.eigen.arpack'",
      ),
    ).toBe("scipy_private_api_removed");
  });

  it("classifies an unsupported upstream dependency pin", () => {
    expect(
      classifyGcnFailure(
        "ERROR: No matching distribution found for tensorflow==1.15.4",
      ),
    ).toBe("unsupported_dependency");
  });

  it("distinguishes TensorFlow, NumPy, missing-module, and timeout failures", () => {
    expect(
      classifyGcnFailure(
        "AttributeError: module 'tensorflow' has no attribute 'set_random_seed'",
      ),
    ).toBe("tensorflow_api_removed");
    expect(
      classifyGcnFailure("AttributeError: module 'numpy' has no attribute 'bool'"),
    ).toBe("numpy_alias_removed");
    expect(classifyGcnFailure("ModuleNotFoundError: No module named 'gcn'"))
      .toBe("missing_dependency");
    expect(classifyGcnFailure("", true)).toBe("timeout");
  });
});

describe("parseGcnAccuracy", () => {
  it("extracts the final repaired test accuracy", () => {
    expect(
      parseGcnAccuracy(
        "Optimization Finished!\nTest set results: cost= 1.01652 accuracy= 0.81800 time= 0.01300",
      ),
    ).toBe(0.818);
  });

  it("rejects missing and out-of-range metrics", () => {
    expect(() => parseGcnAccuracy("Optimization Finished!")).toThrow(
      "without a parseable test accuracy",
    );
    expect(() =>
      parseGcnAccuracy("Test set results: cost= 1 accuracy= 1.2 time= 0.1"),
    ).toThrow("invalid test accuracy");
  });
});

describe("buildGcnPatchMetadata", () => {
  const patch = [
    "diff --git a/gcn/inits.py b/gcn/inits.py",
    "diff --git a/gcn/layers.py b/gcn/layers.py",
    "diff --git a/gcn/metrics.py b/gcn/metrics.py",
    "diff --git a/gcn/train.py b/gcn/train.py",
    "diff --git a/gcn/utils.py b/gcn/utils.py",
    "",
  ].join("\n");

  it("seals generator, source, changed files, and a content hash", () => {
    const metadata = buildGcnPatchMetadata(patch);

    expect(metadata.generator).toBe("OpenAI Codex");
    expect(metadata.sourceCommit).toBe(GCN_COMMIT);
    expect(metadata.files.map((file) => file.path)).toEqual([
      "gcn/inits.py",
      "gcn/layers.py",
      "gcn/metrics.py",
      "gcn/train.py",
      "gcn/utils.py",
    ]);
    expect(metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a patch whose file manifest has drifted", () => {
    expect(() =>
      buildGcnPatchMetadata("diff --git a/gcn/train.py b/gcn/train.py\n"),
    ).toThrow("does not match its audited file manifest");
  });
});

describe("GCN verdict", () => {
  it("reproduces the paper claim at the measured repaired accuracy", () => {
    const result = evaluateMetric(0.815, 0.818, 0.02);

    expect(result.status).toBe("reproduced");
    expect(result.absoluteDelta).toBeCloseTo(0.003);
  });
});
