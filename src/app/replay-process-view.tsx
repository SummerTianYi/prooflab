"use client";

import { useState } from "react";
import {
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import type {
  ReplayProcess,
  ReplayProcessPhase,
} from "@/lib/prooflab/replay-process";

interface ReplayProcessViewProps {
  locale: Locale;
  process: ReplayProcess;
}

const phaseMessageKeys: Record<ReplayProcessPhase, MessageKey> = {
  claim: "pipeline.claimExtracted",
  source: "evidence.sourcePinned",
  environment: "process.environmentCaptured",
  baseline: "pipeline.legacyCaptured",
  patch: "pipeline.codexApplied",
  rerun: "pipeline.experimentExecuted",
  verdict: "pipeline.evidenceSealed",
};

const evidenceMessageKeys = {
  paper: "evidence.paper",
  repository: "evidence.repository",
  inferred: "evidence.inferred",
  measured: "evidence.measured",
} as const satisfies Record<string, MessageKey>;

export default function ReplayProcessView({
  locale,
  process,
}: ReplayProcessViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeEvent = process.events[activeIndex] ?? process.events[0];
  const t = (
    key: MessageKey,
    values: Record<string, string | number> = {},
  ) => translate(locale, key, values);

  if (!activeEvent) return null;

  return (
    <section className="process-view reveal" aria-label={t("process.aria")}>
      <header className="process-header">
        <div>
          <span className="folio">{t("process.eyebrow")}</span>
          <h2>{t("process.title")}</h2>
        </div>
        <div className="process-provenance">
          <span className={`process-mode ${process.liveCompute ? "is-live" : ""}`}>
            {process.liveCompute
              ? t("system.localRunner")
              : t("process.replayBadge")}
          </span>
          {process.recordedAt && (
            <span>{t("process.recordedAt", { date: process.recordedAt })}</span>
          )}
          <p>{process.source}</p>
        </div>
      </header>

      <div className="process-layout">
        <ol className="process-event-list">
          {process.events.map((processEvent, index) => (
            <li key={processEvent.id}>
              <button
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                data-process-event={processEvent.id}
                aria-current={index === activeIndex ? "step" : undefined}
                onClick={() => setActiveIndex(index)}
              >
                <span className="process-sequence">
                  {String(processEvent.sequence).padStart(2, "0")}
                </span>
                <span className="process-event-copy">
                  <strong>{t(phaseMessageKeys[processEvent.phase])}</strong>
                  <small>{t(evidenceMessageKeys[processEvent.evidenceKind])}</small>
                </span>
                <span className="process-recorded" aria-hidden="true">✓</span>
              </button>
            </li>
          ))}
        </ol>

        <article className="process-detail" aria-live="polite">
          <div className="process-detail-heading">
            <span>
              {t("process.stepCounter", {
                current: activeEvent.sequence,
                total: process.events.length,
              })}
            </span>
            <span className={`evidence-kind kind-${activeEvent.evidenceKind}`}>
              {t(evidenceMessageKeys[activeEvent.evidenceKind])}
            </span>
          </div>
          <h3>{t(phaseMessageKeys[activeEvent.phase])}</h3>
          <p className="process-summary">{activeEvent.summary}</p>

          <div className="process-facts" aria-label={t("process.facts")}>
            {activeEvent.facts.map((fact) => (
              <div key={`${activeEvent.id}-${fact.label}`}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>

          {activeEvent.command && (
            <div className="process-code-block">
              <span>{t("process.command")}</span>
              <code>{activeEvent.command}</code>
            </div>
          )}

          {activeEvent.excerpt && (
            <details className="process-output">
              <summary>{t("process.excerpt")}</summary>
              <pre>{activeEvent.excerpt}</pre>
            </details>
          )}

          {activeEvent.details && activeEvent.details.length > 0 && (
            <ul className="process-details-list">
              {activeEvent.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}

          {activeEvent.artifacts.length > 0 && (
            <div className="process-artifacts">
              {activeEvent.artifacts.map((artifact) => (
                <a
                  href={artifact.href}
                  target="_blank"
                  rel="noreferrer"
                  key={`${activeEvent.id}-${artifact.href}`}
                >
                  {t("process.openArtifact", { label: artifact.label })}
                </a>
              ))}
            </div>
          )}

          <div className="process-controls">
            <button
              type="button"
              onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
              disabled={activeIndex === 0}
            >
              {t("process.previous")}
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((index) =>
                  Math.min(process.events.length - 1, index + 1),
                )
              }
              disabled={activeIndex === process.events.length - 1}
            >
              {t("process.next")}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
