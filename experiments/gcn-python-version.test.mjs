import { describe, expect, it } from "vitest";
import {
  assertSupportedGcnPython,
  parsePythonVersion,
} from "./gcn-python-version.mjs";

describe("parsePythonVersion", () => {
  it("parses the Python version reported by the interpreter", () => {
    expect(parsePythonVersion("3.10.4\n")).toEqual({
      major: 3,
      minor: 10,
      patch: 4,
    });
  });

  it("rejects malformed interpreter output", () => {
    expect(() => parsePythonVersion("Python 3.10.4")).toThrow(
      "Unable to parse Python version",
    );
  });
});

describe("assertSupportedGcnPython", () => {
  it.each(["3.10.0", "3.11.9"])("accepts supported Python %s", (version) => {
    expect(() => assertSupportedGcnPython(version)).not.toThrow();
  });

  it.each(["3.9.18", "3.12.0", "4.0.0"])(
    "rejects unsupported Python %s before environment setup",
    (version) => {
      expect(() => assertSupportedGcnPython(version)).toThrow(
        "GCN requires Python 3.10 or 3.11",
      );
    },
  );
});
