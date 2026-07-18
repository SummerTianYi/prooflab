export type ReproductionStatus =
  | "reproduced"
  | "partially_reproduced"
  | "not_reproduced"
  | "blocked";

export type EvidenceKind = "paper" | "repository" | "inferred" | "measured";

export interface ClaimDefinition {
  metric: string;
  label: string;
  expected: number;
  tolerance: number;
  unit: "ratio" | "bleu";
  sourceUrl: string;
  sourceLocator: string;
}

export interface StudyDefinition {
  id: string;
  shortName: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  repositoryUrl: string;
  repositoryCommit?: string;
  claim: ClaimDefinition;
  mode: "exact" | "ported" | "scaled" | "feasibility_only";
  readiness: "ready" | "queued" | "blocked";
  note: string;
}

export interface MetricEvaluation {
  expected: number;
  actual: number;
  absoluteDelta: number;
  tolerance: number;
  status: Exclude<ReproductionStatus, "blocked">;
}

export interface RunEvidence {
  kind: EvidenceKind;
  label: string;
  value: string;
  locator?: string;
}

export interface SealedReplayMetadata {
  mode: "sealed_replay";
  liveCompute: false;
  recordedAt: string;
  source: string;
  manifestUrl: string;
}

export interface RunReport {
  id: string;
  studyId: string;
  status: ReproductionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  command: string;
  repositoryCommit: string;
  evaluation: MetricEvaluation;
  evidence: RunEvidence[];
  stdoutTail: string;
  stderrTail: string;
  artifactDirectory: string;
  replay?: SealedReplayMetadata;
}

export type LegacyFailureClassification =
  | "unsupported_dependency"
  | "missing_dependency"
  | "scipy_private_api_removed"
  | "tensorflow_api_removed"
  | "numpy_alias_removed"
  | "timeout"
  | "unknown";

export interface LegacyFailureEvidence {
  classification: LegacyFailureClassification;
  summary: string;
  command: string;
  workingDirectory: string;
  exitCode: number | null;
  timedOut: boolean;
  environment: Record<string, string>;
  stdoutTail: string;
  stderrTail: string;
}

export interface RepairPatchFile {
  path: string;
  changes: string[];
}

export interface RepairPatchMetadata {
  id: string;
  generator: "OpenAI Codex";
  sourceCommit: string;
  sha256: string;
  summary: string;
  rationale: string[];
  files: RepairPatchFile[];
  artifact: string;
}

export interface LegacyRepairReport extends RunReport {
  workflow: "legacy_repair";
  failure: LegacyFailureEvidence;
  patch: RepairPatchMetadata;
  repairedCommand: string;
}

export interface AuditFinding {
  category: "environment" | "data" | "implementation" | "evaluation";
  evidence: string;
  impact: "low" | "medium" | "high";
}

export interface RepositoryAudit {
  summary: string;
  reproducibilityScore: number;
  findings: AuditFinding[];
  recommendedActions: string[];
  threadId: string | null;
  replay?: SealedReplayMetadata;
}
