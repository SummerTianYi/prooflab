"use client";

import { useState } from "react";
import type {
  LegacyRepairReport,
  RepositoryAudit,
  RunReport,
  StudyDefinition,
} from "@/lib/prooflab/types";

type RequestState = "idle" | "loading" | "complete" | "error";
type ExperimentReport = RunReport | LegacyRepairReport;

interface DashboardProps {
  studies: StudyDefinition[];
}

async function postJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "POST" });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}.`);
  }

  return payload;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function statusLabel(status: RunReport["status"]): string {
  return status.replaceAll("_", " ");
}

function isLegacyRepairReport(
  report: ExperimentReport | null,
): report is LegacyRepairReport {
  return report !== null && "workflow" in report && report.workflow === "legacy_repair";
}

export default function Dashboard({ studies }: DashboardProps) {
  const [activeStudyId, setActiveStudyId] = useState(studies[0].id);
  const [runState, setRunState] = useState<RequestState>("idle");
  const [auditState, setAuditState] = useState<RequestState>("idle");
  const [reports, setReports] = useState<Record<string, ExperimentReport>>({});
  const [audit, setAudit] = useState<RepositoryAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const primary = studies.find((study) => study.id === activeStudyId) ?? studies[0];
  const report = reports[primary.id] ?? null;
  const repairReport = isLegacyRepairReport(report) ? report : null;
  const isGcn = primary.id === "gcn-cora";
  const activeIndex = studies.findIndex((study) => study.id === primary.id);

  async function runExperiment() {
    setRunState("loading");
    setError(null);
    try {
      const endpoint = isGcn ? "/api/runs/gcn" : "/api/runs/sgc";
      const nextReport = await postJson<ExperimentReport>(endpoint);
      setReports((current) => ({ ...current, [primary.id]: nextReport }));
      setRunState("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Run failed.");
      setRunState("error");
    }
  }

  function selectStudy(studyId: string) {
    setActiveStudyId(studyId);
    setRunState("idle");
    setError(null);
  }

  async function runAudit() {
    setAuditState("loading");
    setError(null);
    try {
      const nextAudit = await postJson<RepositoryAudit>("/api/audits/sgc");
      setAudit(nextAudit);
      setAuditState("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Audit failed.");
      setAuditState("error");
    }
  }

  const expected = primary.claim.expected;
  const actual = report?.evaluation.actual;
  const pipelineSteps = isGcn
    ? [
        {
          title: "Legacy failure captured",
          detail: repairReport
            ? repairReport.failure.classification
            : "Pinned source / modern runtime",
          complete: Boolean(repairReport),
        },
        {
          title: "Codex patch applied",
          detail: repairReport
            ? `${repairReport.patch.files.length} compatibility files`
            : "Minimal audited diff",
          complete: Boolean(repairReport),
        },
        {
          title: "CPU rerun completed",
          detail: repairReport
            ? `${formatPercent(repairReport.evaluation.actual)} measured`
            : "Same split, seed, and hyperparameters",
          complete: Boolean(repairReport),
        },
        {
          title: "Evidence sealed",
          detail: repairReport?.artifactDirectory ?? "Before, patch, after, verdict",
          complete: Boolean(repairReport),
        },
      ]
    : [
        {
          title: "Claim extracted",
          detail: "Metric and tolerance grounded",
          complete: true,
        },
        {
          title: "Repository audited",
          detail: audit ? `${audit.findings.length} findings recorded` : "Awaiting Codex",
          complete: Boolean(audit),
        },
        {
          title: "Experiment executed",
          detail: report
            ? `${report.durationMs} ms / CPU`
            : "Pinned source / isolated workspace",
          complete: Boolean(report),
        },
        {
          title: "Evidence sealed",
          detail: report?.artifactDirectory ?? "Logs, metric, commit, verdict",
          complete: Boolean(report),
        },
      ];

  return (
    <main className="shell">
      <nav className="topbar reveal reveal-1" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="ProofLab home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>ProofLab</span>
        </a>
        <div className="topbar-center">
          Reproducibility workspace / 00{activeIndex + 1}
        </div>
        <div className="system-status"><span className="status-dot" /> Local runner</div>
      </nav>

      <section className="hero reveal reveal-2" id="top">
        <div>
          <p className="eyebrow">Paper claims, put on trial</p>
          <h1>Claims are cheap.<br /><em>Evidence runs.</em></h1>
        </div>
        <p className="hero-copy">
          ProofLab turns papers, repositories, and datasets into auditable
          reproduction attempts. Every verdict links back to source, code, and
          measured artifacts.
        </p>
      </section>

      <div className="case-switcher reveal reveal-3" aria-label="Select a reproduction dossier">
        {studies.filter((study) => study.readiness === "ready").map((study, index) => (
          <button
            className={study.id === primary.id ? "is-active" : ""}
            type="button"
            onClick={() => selectStudy(study.id)}
            disabled={runState === "loading"}
            aria-pressed={study.id === primary.id}
            key={study.id}
          >
            <span>0{index + 1}</span>
            <strong>{study.shortName}</strong>
            <small>{study.id === "gcn-cora" ? "Legacy repair" : "Golden path"}</small>
          </button>
        ))}
      </div>

      <section className="workspace-grid reveal reveal-3">
        <article className="dossier-card">
          <header className="card-header">
            <div>
              <span className="folio">ACTIVE DOSSIER 0{activeIndex + 1}</span>
              <h2>{primary.title}</h2>
              <p>{primary.authors} / {primary.venue} {primary.year}</p>
            </div>
            <span className="mode-badge">{isGcn ? "legacy repair" : `${primary.mode} run`}</span>
          </header>

          <div className="claim-grid">
            <div className="claim-main">
              <span className="field-label">Claim under test</span>
              <strong>{primary.claim.label}</strong>
              <a href={primary.claim.sourceUrl} target="_blank" rel="noreferrer">
                {primary.claim.sourceLocator} / Open paper
              </a>
            </div>
            <div className="metric-cell">
              <span className="field-label">Published</span>
              <strong>{formatPercent(expected)}</strong>
            </div>
            <div className="metric-cell observed">
              <span className="field-label">Observed</span>
              <strong>{actual === undefined ? "--" : formatPercent(actual)}</strong>
            </div>
          </div>

          <div className="pipeline" aria-label="Reproduction pipeline">
            {pipelineSteps.map((step, index) => (
              <div
                className={`pipeline-step ${step.complete ? "is-complete" : ""}`}
                key={step.title}
              >
                <span>0{index + 1}</span>
                <div><strong>{step.title}</strong><small>{step.detail}</small></div>
              </div>
            ))}
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="action-row">
            <button className="button button-primary" type="button" onClick={runExperiment} disabled={runState === "loading"}>
              {runState === "loading"
                ? (isGcn ? "Repair loop running..." : "Running experiment...")
                : (isGcn ? "Run legacy repair" : "Run reproduction")}
              <span aria-hidden="true">-&gt;</span>
            </button>
            {!isGcn && (
              <button className="button button-secondary" type="button" onClick={runAudit} disabled={auditState === "loading"}>
                {auditState === "loading" ? "Codex is auditing..." : "Audit with Codex"}
              </button>
            )}
          </div>
        </article>

        <aside className="verdict-card">
          <div className="verdict-heading">
            <span className="field-label">Verdict</span>
            <span className={`verdict-seal ${report ? "is-stamped" : ""}`}>
              {report ? statusLabel(report.status) : "pending"}
            </span>
          </div>

          <div className="comparison-chart" aria-label="Claim versus observed result">
            <div className="chart-scale"><span>0%</span><span>50%</span><span>100%</span></div>
            <div className="chart-row">
              <span>Paper</span><div className="bar-track"><div className="bar bar-paper" style={{ width: `${expected * 100}%` }} /></div><strong>{formatPercent(expected)}</strong>
            </div>
            <div className="chart-row">
              <span>Run</span><div className="bar-track"><div className="bar bar-run" style={{ width: `${(actual ?? 0) * 100}%` }} /></div><strong>{actual === undefined ? "--" : formatPercent(actual)}</strong>
            </div>
          </div>

          <div className="evidence-list">
            {(report?.evidence ?? [
              { kind: "paper" as const, label: "Paper claim", value: formatPercent(expected) },
              { kind: "repository" as const, label: "Source pinned", value: primary.repositoryCommit?.slice(0, 12) ?? "pending" },
              { kind: "measured" as const, label: "Runtime evidence", value: "Awaiting run" },
            ]).map((item) => (
              <div className="evidence-row" key={`${item.kind}-${item.label}`}>
                <span className={`evidence-kind kind-${item.kind}`}>{item.kind}</span>
                <span>{item.label}</span><strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {repairReport && (
            <div className="repair-chain" aria-label="Legacy repair evidence chain">
              <div className="repair-stage stage-failure">
                <span>BEFORE / MEASURED</span>
                <strong>{repairReport.failure.classification.replaceAll("_", " ")}</strong>
                <p>{repairReport.failure.summary}</p>
                <details>
                  <summary>Original failure log</summary>
                  <pre>{repairReport.failure.stderrTail}</pre>
                </details>
              </div>
              <div className="repair-stage stage-patch">
                <span>PATCH / INFERRED BY CODEX</span>
                <strong>{repairReport.patch.files.length} files changed</strong>
                <p>{repairReport.patch.rationale[2]}</p>
                <code>sha256 {repairReport.patch.sha256.slice(0, 16)}</code>
              </div>
              <div className="repair-stage stage-after">
                <span>AFTER / MEASURED</span>
                <strong>{formatPercent(repairReport.evaluation.actual)}</strong>
                <p>{statusLabel(repairReport.status)} against the paper claim.</p>
              </div>
            </div>
          )}

          {!isGcn && audit && (
            <div className="audit-note">
              <div><span>CODEX AUDIT</span><strong>{audit.reproducibilityScore}/100</strong></div>
              <p>{audit.summary}</p>
            </div>
          )}
        </aside>
      </section>

      <section className="study-queue reveal reveal-4">
        <header>
          <div><span className="folio">RESEARCH QUEUE</span><h2>One dataset. Three levels of proof.</h2></div>
          <p>The queue deliberately includes a golden path, a legacy repair, and an honest resource constraint.</p>
        </header>
        <div className="queue-grid">
          {studies.map((study, index) => (
            <article className={`queue-card queue-${study.readiness}`} key={study.id}>
              <div className="queue-index">0{index + 1}</div><span className="readiness">{study.readiness}</span>
              <h3>{study.shortName}</h3><p>{study.note}</p>
              <div className="queue-meta"><span>{study.claim.label}</span><strong>{study.claim.unit === "ratio" ? formatPercent(study.claim.expected) : study.claim.expected.toFixed(1)}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer reveal reveal-4">
        <span>PROOFLAB / BUILD WEEK 2026</span><span>Every conclusion should leave a trail.</span>
      </footer>
    </main>
  );
}
