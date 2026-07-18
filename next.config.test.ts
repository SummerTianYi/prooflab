import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "./package.json";
import nextConfig from "./next.config";

describe("production output tracing", () => {
  it("excludes the unused Codex native binary from the replay audit function", () => {
    expect(
      nextConfig.outputFileTracingExcludes?.["/api/audits/sgc"],
    ).toContain("./node_modules/@openai/codex-*/**/*");
  });
});

describe("local development boundary", () => {
  it("binds the live-compute development server to loopback only", () => {
    expect(packageJson.scripts.dev).toContain("--hostname 127.0.0.1");
  });
});

describe("sealed evidence bytes", () => {
  it("disables Git line-ending conversion for hashed public artifacts", () => {
    const attributes = readFileSync(".gitattributes", "utf8");
    expect(attributes).toContain("public/evidence/** -text");
    expect(attributes).toContain("public/evidence/**/*.patch -whitespace");
  });
});
