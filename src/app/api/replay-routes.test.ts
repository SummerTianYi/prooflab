import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runners = vi.hoisted(() => ({
  audit: vi.fn(async () => {
    throw new Error("live audit must not run");
  }),
  gcn: vi.fn(async () => {
    throw new Error("live GCN runner must not run");
  }),
  sgc: vi.fn(async () => {
    throw new Error("live SGC runner must not run");
  }),
}));

vi.mock("@/lib/prooflab/codex-audit", () => ({
  auditSgcRepository: runners.audit,
}));
vi.mock("@/lib/prooflab/gcn-runner", () => ({
  runGcnLegacyRepair: runners.gcn,
}));
vi.mock("@/lib/prooflab/sgc-runner", () => ({
  runSgcReproduction: runners.sgc,
}));

import { POST as auditSgc } from "./audits/sgc/route";
import { POST as runGcn } from "./runs/gcn/route";
import { POST as runSgc } from "./runs/sgc/route";

describe("replay API routes", () => {
  beforeEach(() => {
    vi.stubEnv("PROOFLAB_DEPLOYMENT_MODE", "replay");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["SGC", runSgc, "sgc-cora"],
    ["GCN", runGcn, "gcn-cora"],
  ])("returns sealed %s evidence without running compute", async (_, route, studyId) => {
    const response = await route();
    const body = (await response.json()) as { studyId: string };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-prooflab-mode")).toBe("replay");
    expect(body.studyId).toBe(studyId);
    expect(runners.sgc).not.toHaveBeenCalled();
    expect(runners.gcn).not.toHaveBeenCalled();
    expect(runners.audit).not.toHaveBeenCalled();
  });

  it("returns the sealed audit without invoking Codex", async () => {
    const response = await auditSgc();
    const body = (await response.json()) as { findings: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-prooflab-mode")).toBe("replay");
    expect(body.findings).toHaveLength(6);
    expect(runners.sgc).not.toHaveBeenCalled();
    expect(runners.gcn).not.toHaveBeenCalled();
    expect(runners.audit).not.toHaveBeenCalled();
  });
});
