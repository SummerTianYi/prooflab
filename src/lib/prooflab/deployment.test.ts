import { describe, expect, it, vi } from "vitest";
import { resolveDeploymentMode, runForDeployment } from "./deployment";

describe("resolveDeploymentMode", () => {
  it("defaults production deployments to replay mode", () => {
    expect(resolveDeploymentMode({ NODE_ENV: "production" })).toBe("replay");
  });

  it("cannot enable the local runner in production", () => {
    expect(
      resolveDeploymentMode({
        NODE_ENV: "production",
        PROOFLAB_DEPLOYMENT_MODE: "local",
      }),
    ).toBe("replay");
  });

  it("keeps development local unless replay is explicitly requested", () => {
    expect(resolveDeploymentMode({ NODE_ENV: "development" })).toBe("local");
    expect(
      resolveDeploymentMode({
        NODE_ENV: "development",
        PROOFLAB_DEPLOYMENT_MODE: "replay",
      }),
    ).toBe("replay");
  });

  it("rejects invalid non-production modes", () => {
    expect(() =>
      resolveDeploymentMode({
        NODE_ENV: "test",
        PROOFLAB_DEPLOYMENT_MODE: "unsafe",
      }),
    ).toThrow("Unsupported ProofLab deployment mode");
  });
});

describe("runForDeployment", () => {
  it("never invokes local compute in replay mode", async () => {
    const local = vi.fn(async () => "local result");
    const replay = vi.fn(() => "sealed result");

    await expect(
      runForDeployment("replay", { local, replay }),
    ).resolves.toBe("sealed result");
    expect(replay).toHaveBeenCalledOnce();
    expect(local).not.toHaveBeenCalled();
  });
});
