import { describe, expect, it } from "vitest";
import { getReplayAudit, getReplayRun } from "./replay-data";

describe("sealed replay evidence", () => {
  it("replays the verified SGC/Cora CPU result", () => {
    const report = getReplayRun("sgc-cora");

    expect(report).toMatchObject({
      id: "replay-sgc-cora-2026-07-17",
      studyId: "sgc-cora",
      status: "reproduced",
      repositoryCommit: "2c7a2727e82e462d8ef9d6e57f0b08888e16488f",
      evaluation: { expected: 0.81, actual: 0.81, status: "reproduced" },
    });
  });

  it("replays the verified GCN failure, patch, and repaired result", () => {
    const report = getReplayRun("gcn-cora");

    expect(report).toMatchObject({
      id: "replay-gcn-cora-2026-07-17",
      studyId: "gcn-cora",
      workflow: "legacy_repair",
      status: "reproduced",
      repositoryCommit: "39a4089fe72ad9f055ed6fdb9746abdcfebc4d81",
      failure: {
        classification: "scipy_private_api_removed",
        exitCode: 1,
        timedOut: false,
      },
      patch: {
        generator: "OpenAI Codex",
        sourceCommit: "39a4089fe72ad9f055ed6fdb9746abdcfebc4d81",
      },
      evaluation: { expected: 0.815, actual: 0.818, status: "reproduced" },
    });

    expect(new Set(report.evidence.map((item) => item.kind))).toEqual(
      new Set(["paper", "repository", "inferred", "measured"]),
    );
  });

  it("returns the archived six-finding Codex audit without a local thread id", () => {
    const audit = getReplayAudit();

    expect(audit.reproducibilityScore).toBe(58);
    expect(audit.findings).toHaveLength(6);
    expect(audit.findings.every((finding) => finding.evidence.length > 0)).toBe(
      true,
    );
    expect(audit.threadId).toBeNull();
  });

  it("returns defensive copies and contains no workstation paths", () => {
    const first = getReplayRun("gcn-cora");
    first.stdoutTail = "mutated";

    expect(getReplayRun("gcn-cora").stdoutTail).not.toBe("mutated");

    const serialized = JSON.stringify({
      sgc: getReplayRun("sgc-cora"),
      gcn: getReplayRun("gcn-cora"),
      audit: getReplayAudit(),
    });
    expect(serialized).not.toMatch(/[A-Za-z]:\\\\|\\\\Users\\\\|\/Users\/|\/home\//);
  });

  it("rejects unknown studies", () => {
    expect(() => getReplayRun("unknown-study")).toThrow(
      "No sealed replay evidence",
    );
  });
});
