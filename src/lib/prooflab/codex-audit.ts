import { access } from "node:fs/promises";
import path from "node:path";
import { Codex } from "@openai/codex-sdk";
import type { RepositoryAudit } from "./types";

const CODEX_TARGETS: Partial<
  Record<NodeJS.Platform, Partial<Record<NodeJS.Architecture, string>>>
> = {
  darwin: { arm64: "aarch64-apple-darwin", x64: "x86_64-apple-darwin" },
  linux: { arm64: "aarch64-unknown-linux-musl", x64: "x86_64-unknown-linux-musl" },
  win32: { arm64: "aarch64-pc-windows-msvc", x64: "x86_64-pc-windows-msvc" },
};

async function resolveCodexPath(): Promise<string> {
  if (process.env.PROOFLAB_CODEX_PATH) {
    await access(process.env.PROOFLAB_CODEX_PATH);
    return process.env.PROOFLAB_CODEX_PATH;
  }

  const target = CODEX_TARGETS[process.platform]?.[process.arch];
  if (!target) {
    throw new Error(`Unsupported Codex platform: ${process.platform}/${process.arch}`);
  }

  const packageName = `codex-${process.platform}-${process.arch}`;
  const binaryName = process.platform === "win32" ? "codex.exe" : "codex";
  const binaryPath = path.join(
    process.cwd(),
    "node_modules",
    "@openai",
    packageName,
    "vendor",
    target,
    "bin",
    binaryName,
  );
  await access(binaryPath);
  return binaryPath;
}

const auditSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    reproducibilityScore: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Whole-number reproducibility score on a 0 to 100 scale.",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["environment", "data", "implementation", "evaluation"],
          },
          evidence: { type: "string" },
          impact: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["category", "evidence", "impact"],
        additionalProperties: false,
      },
    },
    recommendedActions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "reproducibilityScore", "findings", "recommendedActions"],
  additionalProperties: false,
} as const;

export function normalizeReproducibilityScore(score: number): number {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`Invalid reproducibility score: ${score}`);
  }

  return Math.round(score <= 1 ? score * 100 : score);
}

export async function auditSgcRepository(): Promise<RepositoryAudit> {
  const repository = path.join(process.cwd(), ".prooflab", "cache", "sgc");
  await access(repository);

  const codex = new Codex({ codexPathOverride: await resolveCodexPath() });
  const thread = codex.startThread({
    workingDirectory: repository,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    networkAccessEnabled: false,
    webSearchMode: "disabled",
    modelReasoningEffort: "medium",
  });
  const turn = await thread.run(
    [
      "Audit this research repository for a CPU-only reproduction of SGC on Cora.",
      "Inspect source and configuration only. Do not install dependencies, edit files, or run training.",
      "Ground every finding in a concrete file, dependency, command, or missing artifact.",
      "Focus on environment drift, data provenance, implementation gaps, and metric extraction.",
    ].join("\n"),
    { outputSchema: auditSchema },
  );

  const parsed = JSON.parse(turn.finalResponse) as Omit<RepositoryAudit, "threadId">;
  return {
    ...parsed,
    reproducibilityScore: normalizeReproducibilityScore(parsed.reproducibilityScore),
    threadId: thread.id,
  };
}
