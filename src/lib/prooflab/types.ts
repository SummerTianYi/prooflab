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

export interface RunReport {
  id: string;
  studyId: string;
  status: ReproductionStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  command: string;
  repositoryCommit: string;
  evaluation: MetricEvaluation;
  evidence: RunEvidence[];
  stdoutTail: string;
  stderrTail: string;
  artifactDirectory: string;
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
}
