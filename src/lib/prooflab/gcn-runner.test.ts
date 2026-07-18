import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateMetric } from "./evaluation";
import {
  GCN_PATCH_SHA256,
  buildGcnPatchMetadata,
  classifyGcnFailure,
  parseGcnAccuracy,
  redactGcnOutput,
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
  async function readCheckedInPatch(): Promise<string> {
    return readFile(
      path.join(process.cwd(), "experiments", "patches", "gcn-tf2-compat.patch"),
      "utf8",
    );
  }

  it("seals the checked-in patch with its pinned canonical hash", async () => {
    const patch = await readCheckedInPatch();
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
    expect(metadata.sha256).toBe(GCN_PATCH_SHA256);
  });

  it("rejects a patch whose file manifest has drifted", () => {
    expect(() =>
      buildGcnPatchMetadata("diff --git a/gcn/train.py b/gcn/train.py\n"),
    ).toThrow("does not match its audited file manifest");
  });

  it("rejects changed patch content even when the file manifest is unchanged", async () => {
    const patch = await readCheckedInPatch();
    const changedPatch = patch.replace(
      "import tensorflow.compat.v1 as tf",
      "import tensorflow as tf",
    );

    expect(() => buildGcnPatchMetadata(changedPatch)).toThrow(
      "does not match its audited content hash",
    );
  });
});

describe("redactGcnOutput", () => {
  it("removes host paths while preserving useful traceback context", () => {
    const runDirectory = "C:\\Users\\alice\\prooflab\\.prooflab\\runs\\123";
    const homeDirectory = "C:\\Users\\alice";
    const output = [
      `File "${runDirectory}\\repository\\gcn\\train.py", line 7`,
      `${homeDirectory}\\.prooflab-runtime\\gcn-legacy-venv\\Lib\\site-packages`,
      "ModuleNotFoundError: No module named 'scipy.sparse.linalg.eigen.arpack'",
    ].join("\n");

    const redacted = redactGcnOutput(output, [
      { path: runDirectory, replacement: "<run>" },
      { path: homeDirectory, replacement: "<home>" },
    ]);

    expect(redacted).not.toContain("alice");
    expect(redacted).not.toContain("C:\\Users");
    expect(redacted).toContain("<run>\\repository\\gcn\\train.py");
    expect(redacted).toContain("ModuleNotFoundError");
  });
});

describe("GCN verdict", () => {
  it("reproduces the paper claim at the measured repaired accuracy", () => {
    const result = evaluateMetric(0.815, 0.818, 0.02);

    expect(result.status).toBe("reproduced");
    expect(result.absoluteDelta).toBeCloseTo(0.003);
  });
});
