import { describe, expect, it } from "vitest";
import { getReplayRun } from "./replay-data";
import { buildReplayProcess } from "./replay-process";
import { getStudy } from "./studies";

describe("evidence-driven replay process", () => {
  it("reconstructs the complete GCN failure-repair-rerun trace", () => {
    const process = buildReplayProcess(
      getStudy("gcn-cora"),
      getReplayRun("gcn-cora"),
    );

    expect(process).toMatchObject({
      mode: "sealed_replay",
      recordedAt: "2026-07-17",
      liveCompute: false,
    });
    expect(process.events.map((event) => event.phase)).toEqual([
      "claim",
      "source",
      "environment",
      "baseline",
      "patch",
      "rerun",
      "verdict",
    ]);
    expect(process.events.map((event) => event.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(process.events.every((event) => event.status === "recorded")).toBe(
      true,
    );

    const environment = process.events.find(
      (event) => event.phase === "environment",
    );
    expect(environment?.facts).toEqual(
      expect.arrayContaining([
        { label: "Python", value: "3.10.4" },
        { label: "TensorFlow", value: "2.15.1" },
        { label: "SciPy", value: "1.11.4" },
      ]),
    );

    const baseline = process.events.find((event) => event.phase === "baseline");
    expect(baseline).toMatchObject({
      evidenceKind: "measured",
      command: "<python> train.py --dataset cora --epochs 200",
    });
    expect(baseline?.excerpt).toContain("ModuleNotFoundError");
    expect(baseline?.artifacts).toContainEqual({
      label: "Original failure log",
      href: "/evidence/gcn-cora/before-stderr.log",
    });

    const patch = process.events.find((event) => event.phase === "patch");
    expect(patch).toMatchObject({ evidenceKind: "inferred" });
    expect(patch?.facts).toEqual(
      expect.arrayContaining([
        { label: "Generator", value: "OpenAI Codex" },
        { label: "Files changed", value: "5" },
        { label: "Patch SHA-256", value: getReplayRun("gcn-cora").patch.sha256 },
      ]),
    );
    expect(patch?.artifacts).toContainEqual({
      label: "Codex compatibility patch",
      href: "/evidence/gcn-cora/repair.patch",
    });

    const rerun = process.events.find((event) => event.phase === "rerun");
    expect(rerun?.excerpt).toContain("accuracy= 0.81800");

    const verdict = process.events.find((event) => event.phase === "verdict");
    expect(verdict?.facts).toEqual(
      expect.arrayContaining([
        { label: "Paper target", value: "81.50%" },
        { label: "Measured", value: "81.80%" },
        { label: "Verdict", value: "reproduced" },
      ]),
    );
  });

  it("uses only available SGC evidence instead of inventing missing stages", () => {
    const process = buildReplayProcess(
      getStudy("sgc-cora"),
      getReplayRun("sgc-cora"),
    );

    expect(process.events.map((event) => event.phase)).toEqual([
      "claim",
      "source",
      "rerun",
      "verdict",
    ]);
    expect(process.source).toContain("original timing is unavailable");
    expect(process.events.some((event) => event.phase === "environment")).toBe(
      false,
    );
    expect(process.events.some((event) => event.phase === "patch")).toBe(false);
  });

  it("publishes only inspectable artifact links", () => {
    for (const studyId of ["sgc-cora", "gcn-cora"] as const) {
      const process = buildReplayProcess(
        getStudy(studyId),
        getReplayRun(studyId),
      );

      for (const event of process.events) {
        for (const artifact of event.artifacts) {
          expect(
            artifact.href.startsWith("/") || artifact.href.startsWith("https://"),
          ).toBe(true);
        }
      }
    }
  });
});
