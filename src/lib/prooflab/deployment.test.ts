import { describe, expect, it, vi } from "vitest";
import {
  assertLocalComputeRequest,
  LocalComputeBusyError,
  resolveDeploymentMode,
  runExclusiveLocalCompute,
  runForDeployment,
} from "./deployment";

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

  it("forces Vercel deployments into replay even if the runtime is misconfigured", () => {
    expect(
      resolveDeploymentMode({
        NODE_ENV: "development",
        PROOFLAB_DEPLOYMENT_MODE: "local",
        VERCEL: "1",
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

describe("local compute request boundary", () => {
  it("allows same-origin browser requests and loopback CLI requests", () => {
    expect(() =>
      assertLocalComputeRequest(
        "local",
        new Request("http://localhost:3000/api/runs/sgc", {
          headers: { Origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalComputeRequest(
        "local",
        new Request("http://127.0.0.1:3000/api/runs/sgc"),
      ),
    ).not.toThrow();
  });

  it("rejects cross-site and non-loopback local compute requests", () => {
    expect(() =>
      assertLocalComputeRequest(
        "local",
        new Request("http://localhost:3000/api/runs/sgc", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    ).toThrow("same-origin loopback");
    expect(() =>
      assertLocalComputeRequest(
        "local",
        new Request("http://192.0.2.10:3000/api/runs/sgc"),
      ),
    ).toThrow("same-origin loopback");
  });

  it("does not apply the local request boundary to replay", () => {
    expect(() =>
      assertLocalComputeRequest(
        "replay",
        new Request("https://preview.example/api/runs/sgc", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    ).not.toThrow();
  });
});

describe("runExclusiveLocalCompute", () => {
  it("rejects concurrent live work and releases the lock afterwards", async () => {
    let finishFirst: ((value: string) => void) | undefined;
    const first = runExclusiveLocalCompute(
      () => new Promise<string>((resolve) => { finishFirst = resolve; }),
    );

    await expect(
      runExclusiveLocalCompute(async () => "second"),
    ).rejects.toBeInstanceOf(LocalComputeBusyError);

    finishFirst?.("first");
    await expect(first).resolves.toBe("first");
    await expect(
      runExclusiveLocalCompute(async () => "third"),
    ).resolves.toBe("third");
  });

  it("shares the lock across separately loaded route chunks", async () => {
    let finishFirst: ((value: string) => void) | undefined;
    const first = runExclusiveLocalCompute(
      () => new Promise<string>((resolve) => { finishFirst = resolve; }),
    );

    try {
      vi.resetModules();
      const isolatedModule = await import("./deployment");
      await expect(
        isolatedModule.runExclusiveLocalCompute(async () => "parallel"),
      ).rejects.toBeInstanceOf(isolatedModule.LocalComputeBusyError);
    } finally {
      finishFirst?.("first");
      await first;
    }
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
