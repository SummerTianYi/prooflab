import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      replay: {
        mode: "sealed_replay",
        liveCompute: false,
        manifestUrl: "/evidence/sgc-cora/manifest.json",
      },
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
      replay: {
        mode: "sealed_replay",
        liveCompute: false,
        manifestUrl: "/evidence/gcn-cora/manifest.json",
      },
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
    expect(audit.replay).toMatchObject({
      mode: "sealed_replay",
      liveCompute: false,
      manifestUrl: "/evidence/sgc-cora/manifest.json",
    });
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

  it("resolves every replay artifact locator to a deployed public file", () => {
    const reports = [getReplayRun("sgc-cora"), getReplayRun("gcn-cora")];
    const publicRoot = path.join(process.cwd(), "public");

    for (const report of reports) {
      expect(
        existsSync(path.join(publicRoot, report.replay?.manifestUrl ?? "missing")),
      ).toBe(true);

      for (const item of report.evidence) {
        if (item.locator?.startsWith("/")) {
          expect(existsSync(path.join(publicRoot, item.locator))).toBe(true);
        }
      }
    }
  });

  it("verifies every file hash in the public evidence manifests", () => {
    for (const studyId of ["sgc-cora", "gcn-cora"]) {
      const directory = path.join(process.cwd(), "public", "evidence", studyId);
      const manifest = JSON.parse(
        readFileSync(path.join(directory, "manifest.json"), "utf8"),
      ) as { files: Array<{ path: string; sha256: string }> };

      for (const file of manifest.files) {
        const digest = createHash("sha256")
          .update(readFileSync(path.join(directory, file.path)))
          .digest("hex");
        expect(digest).toBe(file.sha256);
      }
    }
  });
});
