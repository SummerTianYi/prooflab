"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeOptions,
  LOCALE_STORAGE_KEY,
  resolvePreferredLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import type { DeploymentMode } from "@/lib/prooflab/deployment";
import { buildReplayProcess } from "@/lib/prooflab/replay-process";
import type {
  LegacyRepairReport,
  RepositoryAudit,
  RunReport,
  StudyDefinition,
} from "@/lib/prooflab/types";
import ReplayProcessView from "./replay-process-view";

type RequestState = "idle" | "loading" | "complete" | "error";
type ExperimentReport = RunReport | LegacyRepairReport;

interface DashboardProps {
  deploymentMode: DeploymentMode;
  studies: StudyDefinition[];
  initialLocale?: Locale;
}

async function postJson<T>(
  url: string,
  requestFailure: (status: number) => string,
): Promise<T> {
  const response = await fetch(url, { method: "POST" });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? requestFailure(response.status));
  }

  return payload;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

const statusMessageKeys: Record<RunReport["status"], MessageKey> = {
  reproduced: "verdict.reproduced",
  partially_reproduced: "verdict.inconclusive",
  not_reproduced: "verdict.notReproduced",
  blocked: "verdict.inconclusive",
};

const evidenceMessageKeys = {
  paper: "evidence.paper",
  repository: "evidence.repository",
  inferred: "evidence.inferred",
  measured: "evidence.measured",
} as const satisfies Record<string, MessageKey>;

function locatorHref(locator?: string): string | null {
  if (
    (locator?.startsWith("/") && !locator.startsWith("//")) ||
    locator?.startsWith("https://")
  ) {
    return locator;
  }
  return null;
}

function isLegacyRepairReport(
  report: ExperimentReport | null,
): report is LegacyRepairReport {
  return report !== null && "workflow" in report && report.workflow === "legacy_repair";
}

export default function Dashboard({
  deploymentMode,
  studies,
  initialLocale = DEFAULT_LOCALE,
}: DashboardProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [activeStudyId, setActiveStudyId] = useState(studies[0].id);
  const [runState, setRunState] = useState<RequestState>("idle");
  const [auditState, setAuditState] = useState<RequestState>("idle");
  const [reports, setReports] = useState<Record<string, ExperimentReport>>({});
  const [audit, setAudit] = useState<RepositoryAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processViewRef = useRef<HTMLDivElement>(null);
  const primary = studies.find((study) => study.id === activeStudyId) ?? studies[0];
  const report = reports[primary.id] ?? null;
  const replayProcess = report ? buildReplayProcess(primary, report) : null;
  const repairReport = isLegacyRepairReport(report) ? report : null;
  const isGcn = primary.id === "gcn-cora";
  const isReplay = deploymentMode === "replay";
  const activeIndex = studies.findIndex((study) => study.id === primary.id);
  const t = (
    key: MessageKey,
    values: Record<string, string | number> = {},
  ) => translate(locale, key, values);
  const localizedStatus = (status: RunReport["status"]) =>
    t(statusMessageKeys[status]);

  useEffect(() => {
    let preferredLocale = resolvePreferredLocale(
      window.navigator.languages.length > 0
        ? window.navigator.languages
        : [window.navigator.language],
    );

    try {
      const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(storedLocale)) preferredLocale = storedLocale;
    } catch {
      // Browser privacy settings may disable storage; locale detection still works.
    }

    const update = window.setTimeout(() => setLocale(preferredLocale), 0);
    return () => window.clearTimeout(update);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function selectLocale(nextLocale: string) {
    if (!isLocale(nextLocale)) return;
    setLocale(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The selected language remains active for this session without persistence.
    }
  }

  async function runExperiment() {
    setRunState("loading");
    setError(null);
    try {
      const endpoint = isGcn ? "/api/runs/gcn" : "/api/runs/sgc";
      const nextReport = await postJson<ExperimentReport>(
        endpoint,
        (status) => t("errors.requestFailed", { status }),
      );
      setReports((current) => ({ ...current, [primary.id]: nextReport }));
      setRunState("complete");
      window.requestAnimationFrame(() => {
        processViewRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t("errors.runFailed"),
      );
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
      const nextAudit = await postJson<RepositoryAudit>(
        "/api/audits/sgc",
        (status) => t("errors.requestFailed", { status }),
      );
      setAudit(nextAudit);
      setAuditState("complete");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("errors.auditFailed"),
      );
      setAuditState("error");
    }
  }

  const expected = primary.claim.expected;
  const actual = report?.evaluation.actual;
  const pipelineSteps = isGcn
    ? [
        {
          title: t("pipeline.legacyCaptured"),
          detail: repairReport
            ? repairReport.failure.classification
            : t("pipeline.pinnedRuntime"),
          complete: Boolean(repairReport),
        },
        {
          title: t("pipeline.codexApplied"),
          detail: repairReport
            ? t("pipeline.compatibilityFiles", {
                count: repairReport.patch.files.length,
              })
            : t("pipeline.minimalDiff"),
          complete: Boolean(repairReport),
        },
        {
          title: t("pipeline.cpuCompleted"),
          detail: repairReport
            ? t("pipeline.measured", {
                value: formatPercent(repairReport.evaluation.actual),
              })
            : t("pipeline.sameConfiguration"),
          complete: Boolean(repairReport),
        },
        {
          title: t("pipeline.evidenceSealed"),
          detail:
            repairReport?.artifactDirectory ?? t("pipeline.beforeAfterVerdict"),
          complete: Boolean(repairReport),
        },
      ]
    : [
        {
          title: t("pipeline.claimExtracted"),
          detail: t("pipeline.metricGrounded"),
          complete: true,
        },
        {
          title: t("pipeline.repositoryAudited"),
          detail: audit
            ? t("pipeline.findingsRecorded", { count: audit.findings.length })
            : isReplay
              ? t("pipeline.archivedAudit")
              : t("pipeline.awaitingCodex"),
          complete: Boolean(audit),
        },
        {
          title: t("pipeline.experimentExecuted"),
          detail: report
            ? isReplay
              ? t("pipeline.verifiedArtifact")
              : t("pipeline.durationCpu", { duration: report.durationMs ?? "--" })
            : t("pipeline.pinnedWorkspace"),
          complete: Boolean(report),
        },
        {
          title: t("pipeline.evidenceSealed"),
          detail: report?.artifactDirectory ?? t("pipeline.logsMetricVerdict"),
          complete: Boolean(report),
        },
      ];

  return (
    <main className="shell">
      <nav className="topbar reveal reveal-1" aria-label={t("nav.primary")}>
        <a className="brand" href="#top" aria-label={t("nav.home")}>
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>ProofLab</span>
        </a>
        <div className="topbar-center">
          {t("workspace.position", { index: activeIndex + 1 })}
        </div>
        <div className="topbar-actions">
          <label className="language-control">
            <span>{t("language.label")}</span>
            <select
              aria-label={t("language.label")}
              value={locale}
              onChange={(event) => selectLocale(event.currentTarget.value)}
            >
              {localeOptions.map((option) => (
                <option value={option.code} key={option.code}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          </label>
          <div className={`system-status ${isReplay ? "is-replay" : ""}`}>
            <span className="status-dot" />
            {isReplay ? t("system.evidenceReplay") : t("system.localRunner")}
          </div>
        </div>
      </nav>

      {isReplay && (
        <aside
          className="preview-banner reveal reveal-1"
          aria-label={t("preview.aria")}
        >
          <strong>{t("preview.title")}</strong>
          <span>{t("preview.description")}</span>
        </aside>
      )}

      <section className="hero reveal reveal-2" id="top">
        <div>
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1>{t("hero.titleLead")}<br /><em>{t("hero.titleEmphasis")}</em></h1>
        </div>
        <p className="hero-copy">{t("hero.description")}</p>
      </section>

      <div
        className="case-switcher reveal reveal-3"
        aria-label={t("cases.aria")}
      >
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
            <small>
              {study.id === "gcn-cora"
                ? t("case.legacyRepair")
                : t("case.goldenPath")}
            </small>
          </button>
        ))}
      </div>

      <section className="workspace-grid reveal reveal-3">
        <article className="dossier-card">
          <header className="card-header">
            <div>
              <span className="folio">
                {t("dossier.active", { index: activeIndex + 1 })}
              </span>
              <h2>{primary.title}</h2>
              <p>{primary.authors} / {primary.venue} {primary.year}</p>
            </div>
            <span className="mode-badge">
              {isGcn
                ? t("mode.legacyRepair")
                : t("mode.run", { mode: primary.mode })}
            </span>
          </header>

          <div className="claim-grid">
            <div className="claim-main">
              <span className="field-label">{t("claim.underTest")}</span>
              <strong>{primary.claim.label}</strong>
              <a href={primary.claim.sourceUrl} target="_blank" rel="noreferrer">
                {primary.claim.sourceLocator} / {t("claim.openPaper")}
              </a>
            </div>
            <div className="metric-cell">
              <span className="field-label">{t("metric.published")}</span>
              <strong>{formatPercent(expected)}</strong>
            </div>
            <div className="metric-cell observed">
              <span className="field-label">{t("metric.observed")}</span>
              <strong>{actual === undefined ? "--" : formatPercent(actual)}</strong>
            </div>
          </div>

          <div className="pipeline" aria-label={t("pipeline.aria")}>
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
                ? isReplay
                  ? t("actions.loadingEvidence")
                  : (isGcn
                      ? t("actions.repairRunning")
                      : t("actions.experimentRunning"))
                : isReplay
                  ? (isGcn
                      ? t("actions.replayRepair")
                      : t("actions.replayRun"))
                  : (isGcn
                      ? t("actions.runRepair")
                      : t("actions.runReproduction"))}
              <span aria-hidden="true">-&gt;</span>
            </button>
            {!isGcn && (
              <button className="button button-secondary" type="button" onClick={runAudit} disabled={auditState === "loading"}>
                {auditState === "loading"
                  ? isReplay
                    ? t("actions.loadingAudit")
                    : t("actions.codexAuditing")
                  : isReplay
                    ? t("actions.replayAudit")
                    : t("actions.auditCodex")}
              </button>
            )}
          </div>
        </article>

        <aside className="verdict-card">
          <div className="verdict-heading">
            <span className="field-label">{t("verdict.label")}</span>
            <span className={`verdict-seal ${report ? "is-stamped" : ""}`}>
              {report ? localizedStatus(report.status) : t("verdict.pending")}
            </span>
          </div>

          <div className="comparison-chart" aria-label={t("comparison.aria")}>
            <div className="chart-scale"><span>0%</span><span>50%</span><span>100%</span></div>
            <div className="chart-row">
              <span>{t("comparison.paper")}</span><div className="bar-track"><div className="bar bar-paper" style={{ width: `${expected * 100}%` }} /></div><strong>{formatPercent(expected)}</strong>
            </div>
            <div className="chart-row">
              <span>{t("comparison.run")}</span><div className="bar-track"><div className="bar bar-run" style={{ width: `${(actual ?? 0) * 100}%` }} /></div><strong>{actual === undefined ? "--" : formatPercent(actual)}</strong>
            </div>
          </div>

          <div className="evidence-list">
            {(report?.evidence ?? [
              { kind: "paper" as const, label: t("evidence.paperClaim"), value: formatPercent(expected) },
              { kind: "repository" as const, label: t("evidence.sourcePinned"), value: primary.repositoryCommit?.slice(0, 12) ?? t("verdict.pending") },
              { kind: "measured" as const, label: t("evidence.runtime"), value: t("evidence.awaiting") },
            ]).map((item) => {
              const href = locatorHref(item.locator);
              return (
                <div className="evidence-row" key={`${item.kind}-${item.label}`}>
                  <span className={`evidence-kind kind-${item.kind}`}>
                    {t(evidenceMessageKeys[item.kind])}
                  </span>
                  <span>{item.label}</span>
                  <span className="evidence-value">
                    <strong>{item.value}</strong>
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer">
                        {t("evidence.inspect")}
                      </a>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {report?.replay && (
            <a
              className="artifact-manifest"
              href={report.replay.manifestUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("evidence.manifest")}
            </a>
          )}

          {repairReport && (
            <div className="repair-chain" aria-label={t("repair.aria")}>
              <div className="repair-stage stage-failure">
                <span>{t("repair.before")}</span>
                <strong>{repairReport.failure.classification.replaceAll("_", " ")}</strong>
                <p>{repairReport.failure.summary}</p>
                <details>
                  <summary>{t("repair.originalLog")}</summary>
                  <pre>{repairReport.failure.stderrTail}</pre>
                </details>
              </div>
              <div className="repair-stage stage-patch">
                <span>{t("repair.patch")}</span>
                <strong>
                  {t("repair.filesChanged", {
                    count: repairReport.patch.files.length,
                  })}
                </strong>
                <p>{repairReport.patch.rationale[2]}</p>
                <code>sha256 {repairReport.patch.sha256.slice(0, 16)}</code>
              </div>
              <div className="repair-stage stage-after">
                <span>{t("repair.after")}</span>
                <strong>{formatPercent(repairReport.evaluation.actual)}</strong>
                <p>
                  {t("repair.againstClaim", {
                    status: localizedStatus(repairReport.status),
                  })}
                </p>
              </div>
            </div>
          )}

          {!isGcn && audit && (
            <div className="audit-note">
              <div><span>{t("audit.title")}</span><strong>{audit.reproducibilityScore}/100</strong></div>
              <p>{audit.summary}</p>
              <details className="audit-findings">
                <summary>
                  {t("audit.viewFindings", { count: audit.findings.length })}
                </summary>
                <ul>
                  {audit.findings.map((finding, index) => (
                    <li key={`${finding.category}-${index}`}>
                      <span>{finding.category} / {finding.impact}</span>
                      <p>{finding.evidence}</p>
                    </li>
                  ))}
                </ul>
              </details>
              {audit.replay && (
                <a
                  className="artifact-manifest"
                  href={audit.replay.manifestUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("audit.manifest")}
                </a>
              )}
            </div>
          )}
        </aside>
      </section>

      <div className="process-anchor" ref={processViewRef}>
        {replayProcess && (
          <ReplayProcessView
            key={report?.id}
            locale={locale}
            process={replayProcess}
          />
        )}
      </div>

      <section className="study-queue reveal reveal-4">
        <header>
          <div><span className="folio">{t("queue.folio")}</span><h2>{t("queue.title")}</h2></div>
          <p>{t("queue.description")}</p>
        </header>
        <div className="queue-grid">
          {studies.map((study, index) => (
            <article className={`queue-card queue-${study.readiness}`} key={study.id}>
              <div className="queue-index">0{index + 1}</div><span className="readiness">
                {study.readiness === "ready"
                  ? t("readiness.ready")
                  : t("readiness.blocked")}
              </span>
              <h3>{study.shortName}</h3><p>{study.note}</p>
              <div className="queue-meta"><span>{study.claim.label}</span><strong>{study.claim.unit === "ratio" ? formatPercent(study.claim.expected) : study.claim.expected.toFixed(1)}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer reveal reveal-4">
        <span>PROOFLAB / BUILD WEEK 2026</span><span>{t("footer.trail")}</span>
      </footer>
    </main>
  );
}
