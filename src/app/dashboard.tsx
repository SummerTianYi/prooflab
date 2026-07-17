"use client";

import { useState } from "react";
import type {
  RepositoryAudit,
  RunReport,
  StudyDefinition,
} from "@/lib/prooflab/types";

type RequestState = "idle" | "loading" | "complete" | "error";

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

export default function Dashboard({ studies }: DashboardProps) {
  const primary = studies[0];
  const [runState, setRunState] = useState<RequestState>("idle");
  const [auditState, setAuditState] = useState<RequestState>("idle");
  const [report, setReport] = useState<RunReport | null>(null);
  const [audit, setAudit] = useState<RepositoryAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runExperiment() {
    setRunState("loading");
    setError(null);
    try {
      const nextReport = await postJson<RunReport>("/api/runs/sgc");
      setReport(nextReport);
      setRunState("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Run failed.");
      setRunState("error");
    }
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

  return (
    <main className="shell">
      <nav className="topbar reveal reveal-1" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="ProofLab home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>ProofLab</span>
        </a>
        <div className="topbar-center">Reproducibility workspace / 001</div>
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

      <section className="workspace-grid reveal reveal-3">
        <article className="dossier-card">
          <header className="card-header">
            <div>
              <span className="folio">ACTIVE DOSSIER 01</span>
              <h2>{primary.title}</h2>
              <p>{primary.authors} / {primary.venue} {primary.year}</p>
            </div>
            <span className="mode-badge">{primary.mode} run</span>
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
            <div className="pipeline-step is-complete">
              <span>01</span><div><strong>Claim extracted</strong><small>Metric and tolerance grounded</small></div>
            </div>
            <div className={`pipeline-step ${audit ? "is-complete" : ""}`}>
              <span>02</span><div><strong>Repository audited</strong><small>{audit ? `${audit.findings.length} findings recorded` : "Awaiting Codex"}</small></div>
            </div>
            <div className={`pipeline-step ${report ? "is-complete" : ""}`}>
              <span>03</span><div><strong>Experiment executed</strong><small>{report ? `${report.durationMs} ms / CPU` : "Pinned source / isolated workspace"}</small></div>
            </div>
            <div className={`pipeline-step ${report ? "is-complete" : ""}`}>
              <span>04</span><div><strong>Evidence sealed</strong><small>{report ? report.artifactDirectory : "Logs, metric, commit, verdict"}</small></div>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="action-row">
            <button className="button button-primary" type="button" onClick={runExperiment} disabled={runState === "loading"}>
              {runState === "loading" ? "Running experiment..." : "Run reproduction"}<span aria-hidden="true">-&gt;</span>
            </button>
            <button className="button button-secondary" type="button" onClick={runAudit} disabled={auditState === "loading"}>
              {auditState === "loading" ? "Codex is auditing..." : "Audit with Codex"}
            </button>
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
              { kind: "paper" as const, label: "Paper claim", value: "81.0%" },
              { kind: "repository" as const, label: "Source pinned", value: "2c7a2727e82e" },
              { kind: "measured" as const, label: "Runtime evidence", value: "Awaiting run" },
            ]).map((item) => (
              <div className="evidence-row" key={`${item.kind}-${item.label}`}>
                <span className={`evidence-kind kind-${item.kind}`}>{item.kind}</span>
                <span>{item.label}</span><strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {audit && (
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
