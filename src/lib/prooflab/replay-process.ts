import type {
  EvidenceKind,
  LegacyRepairReport,
  RunReport,
  StudyDefinition,
} from "./types";

export type ReplayProcessPhase =
  | "claim"
  | "source"
  | "environment"
  | "baseline"
  | "patch"
  | "rerun"
  | "verdict";

export interface ReplayProcessFact {
  label: string;
  value: string;
}

export interface ReplayProcessArtifact {
  label: string;
  href: string;
}

export interface ReplayProcessEvent {
  id: string;
  sequence: number;
  phase: ReplayProcessPhase;
  evidenceKind: EvidenceKind;
  status: "recorded";
  summary: string;
  facts: ReplayProcessFact[];
  artifacts: ReplayProcessArtifact[];
  command?: string;
  excerpt?: string;
  details?: string[];
}

export interface ReplayProcess {
  mode: "sealed_replay" | "completed_run";
  recordedAt: string | null;
  liveCompute: boolean;
  source: string;
  events: ReplayProcessEvent[];
}

function isLegacyRepairReport(report: RunReport): report is LegacyRepairReport {
  return "workflow" in report && report.workflow === "legacy_repair";
}

function formatMetric(value: number, study: StudyDefinition): string {
  return study.claim.unit === "ratio"
    ? `${(value * 100).toFixed(2)}%`
    : value.toFixed(1);
}

function safeArtifact(label: string, href?: string): ReplayProcessArtifact[] {
  if (
    href &&
    ((href.startsWith("/") && !href.startsWith("//")) ||
      href.startsWith("https://"))
  ) {
    return [{ label, href }];
  }
  return [];
}

function evidenceArtifact(
  report: RunReport,
  label: string,
  predicate: (item: RunReport["evidence"][number]) => boolean,
): ReplayProcessArtifact[] {
  return safeArtifact(label, report.evidence.find(predicate)?.locator);
}

function manifestSiblingArtifact(
  report: RunReport,
  label: string,
  filename: string,
): ReplayProcessArtifact[] {
  const manifestUrl = report.replay?.manifestUrl;
  if (!manifestUrl) return [];
  const separator = manifestUrl.lastIndexOf("/");
  return safeArtifact(label, `${manifestUrl.slice(0, separator + 1)}${filename}`);
}

function event(
  phase: ReplayProcessPhase,
  evidenceKind: EvidenceKind,
  summary: string,
  facts: ReplayProcessFact[],
  artifacts: ReplayProcessArtifact[],
  extra: Pick<ReplayProcessEvent, "command" | "excerpt" | "details"> = {},
): Omit<ReplayProcessEvent, "id" | "sequence"> {
  return {
    phase,
    evidenceKind,
    status: "recorded",
    summary,
    facts,
    artifacts,
    ...extra,
  };
}

export function buildReplayProcess(
  study: StudyDefinition,
  report: RunReport,
): ReplayProcess {
  const target = formatMetric(report.evaluation.expected, study);
  const measured = formatMetric(report.evaluation.actual, study);
  const delta = formatMetric(report.evaluation.absoluteDelta, study);
  const tolerance = formatMetric(report.evaluation.tolerance, study);
  const events: Array<Omit<ReplayProcessEvent, "id" | "sequence">> = [
    event(
      "claim",
      "paper",
      `${study.claim.label}: ${target}`,
      [
        { label: "Paper target", value: target },
        { label: "Metric", value: study.claim.metric },
        { label: "Tolerance", value: tolerance },
        { label: "Source locator", value: study.claim.sourceLocator },
      ],
      safeArtifact("Paper source", study.claim.sourceUrl),
    ),
    event(
      "source",
      "repository",
      `Official source pinned before execution at ${report.repositoryCommit}.`,
      [
        { label: "Repository", value: study.repositoryUrl },
        { label: "Commit", value: report.repositoryCommit },
        { label: "Experiment mode", value: study.mode },
      ],
      safeArtifact("Pinned repository", study.repositoryUrl),
    ),
  ];

  if (isLegacyRepairReport(report)) {
    events.push(
      event(
        "environment",
        "measured",
        "The compatibility failure was reproduced in this recorded runtime.",
        Object.entries(report.failure.environment).map(([label, value]) => ({
          label: label === "python"
            ? "Python"
            : label === "tensorflow"
              ? "TensorFlow"
              : label === "numpy"
                ? "NumPy"
                : label === "scipy"
                  ? "SciPy"
                  : label === "networkx"
                    ? "NetworkX"
                    : "Platform",
          value,
        })),
        manifestSiblingArtifact(
          report,
          "Environment manifest",
          "environment.json",
        ),
      ),
      event(
        "baseline",
        "measured",
        report.failure.summary,
        [
          { label: "Classification", value: report.failure.classification },
          {
            label: "Exit code",
            value: report.failure.exitCode === null
              ? "unavailable"
              : String(report.failure.exitCode),
          },
          { label: "Timed out", value: String(report.failure.timedOut) },
          { label: "Working directory", value: report.failure.workingDirectory },
        ],
        evidenceArtifact(
          report,
          "Original failure log",
          (item) => item.kind === "measured" && item.label === "Original failure",
        ),
        {
          command: report.failure.command,
          excerpt: report.failure.stderrTail || report.failure.stdoutTail,
        },
      ),
      event(
        "patch",
        "inferred",
        report.patch.summary,
        [
          { label: "Generator", value: report.patch.generator },
          { label: "Files changed", value: String(report.patch.files.length) },
          { label: "Patch SHA-256", value: report.patch.sha256 },
          { label: "Source commit", value: report.patch.sourceCommit },
        ],
        evidenceArtifact(
          report,
          "Codex compatibility patch",
          (item) => item.kind === "inferred",
        ),
        {
          details: [
            ...report.patch.rationale,
            ...report.patch.files.map(
              (file) => `${file.path}: ${file.changes.join(" ")}`,
            ),
          ],
        },
      ),
    );
  }

  events.push(
    event(
      "rerun",
      "measured",
      `The recorded run measured ${measured}.`,
      [
        { label: "Measured", value: measured },
        {
          label: "Duration",
          value: report.durationMs === null
            ? "unavailable in sealed evidence"
            : `${report.durationMs} ms`,
        },
        { label: "Command", value: report.command },
      ],
      evidenceArtifact(
        report,
        "Recorded experiment output",
        (item) =>
          item.kind === "measured" &&
          item.label !== "Original failure" &&
          item.locator !== undefined,
      ),
      { command: report.command, excerpt: report.stdoutTail || report.stderrTail },
    ),
    event(
      "verdict",
      "measured",
      `Measured evidence was compared with the paper target under the declared tolerance.`,
      [
        { label: "Paper target", value: target },
        { label: "Measured", value: measured },
        { label: "Absolute delta", value: delta },
        { label: "Tolerance", value: tolerance },
        { label: "Verdict", value: report.status },
      ],
      safeArtifact("Evidence manifest", report.replay?.manifestUrl ?? report.artifactDirectory),
    ),
  );

  return {
    mode: report.replay?.mode ?? "completed_run",
    recordedAt: report.replay?.recordedAt ?? report.finishedAt,
    liveCompute: report.replay?.liveCompute ?? true,
    source:
      report.replay?.source ??
      "Evidence assembled from the completed experiment report.",
    events: events.map((item, index) => ({
      ...item,
      id: `${report.id}-${item.phase}`,
      sequence: index + 1,
    })),
  };
}
