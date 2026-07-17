import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluateMetric } from "./evaluation";
import { runProcess } from "./process-runner";
import { getStudy, SGC_COMMIT } from "./studies";
import type { RunReport } from "./types";

const RUN_TIMEOUT_MS = 90_000;

function experimentEnvironment(): NodeJS.ProcessEnv {
  const allowed = ["HOME", "PATH", "TMPDIR", "LANG", "LC_ALL"];
  const env = Object.fromEntries(
    allowed.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
  );

  return {
    ...env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    CUDA_VISIBLE_DEVICES: "",
    PYTHONNOUSERSITE: "1",
    PYTHONUNBUFFERED: "1",
  };
}

function tail(value: string, lines = 30): string {
  return value.trim().split("\n").slice(-lines).join("\n");
}

export function parseSgcAccuracy(output: string): number {
  const match = output.match(/Test Accuracy:\s*([0-9.]+)/);
  if (!match) {
    throw new Error("SGC run completed without a parseable test accuracy.");
  }

  return Number.parseFloat(match[1]);
}

async function assertExists(filePath: string, message: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}

export async function runSgcReproduction(): Promise<RunReport> {
  const projectRoot = process.cwd();
  const cacheRepository = path.join(projectRoot, ".prooflab", "cache", "sgc");
  const python =
    process.env.PROOFLAB_PYTHON ??
    path.resolve(projectRoot, "..", ".prooflab-runtime", "venv", "bin", "python");

  await assertExists(
    cacheRepository,
    "SGC source cache is missing. Run `npm run setup:sgc` first.",
  );
  await assertExists(
    python,
    "ProofLab Python environment is missing. Run `npm run setup:sgc` first.",
  );

  const study = getStudy("sgc-cora");
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const runDirectory = path.join(projectRoot, ".prooflab", "runs", id);
  const repository = path.join(runDirectory, "repository");
  const startedAt = new Date();

  await mkdir(runDirectory, { recursive: true });
  const clone = await runProcess(
    "git",
    ["clone", "--local", "--no-hardlinks", cacheRepository, repository],
    { cwd: projectRoot, timeoutMs: 30_000, env: experimentEnvironment() },
  );

  if (clone.exitCode !== 0) {
    throw new Error(`Unable to create isolated run workspace: ${tail(clone.stderr)}`);
  }

  const checkout = await runProcess("git", ["checkout", "--detach", SGC_COMMIT], {
    cwd: repository,
    timeoutMs: 15_000,
    env: experimentEnvironment(),
  });

  if (checkout.exitCode !== 0) {
    throw new Error(`Unable to pin SGC source: ${tail(checkout.stderr)}`);
  }

  const args = [
    "citation.py",
    "--dataset",
    "cora",
    "--tuned",
    "--no-cuda",
    "--epochs",
    "100",
  ];
  const processResult = await runProcess(python, args, {
    cwd: repository,
    timeoutMs: RUN_TIMEOUT_MS,
    env: experimentEnvironment(),
  });

  await writeFile(path.join(runDirectory, "stdout.log"), processResult.stdout);
  await writeFile(path.join(runDirectory, "stderr.log"), processResult.stderr);

  if (processResult.timedOut) {
    throw new Error(`SGC run exceeded ${RUN_TIMEOUT_MS / 1_000} seconds.`);
  }
  if (processResult.exitCode !== 0) {
    throw new Error(`SGC run failed: ${tail(processResult.stderr)}`);
  }

  const actual = parseSgcAccuracy(processResult.stdout);
  const evaluation = evaluateMetric(
    study.claim.expected,
    actual,
    study.claim.tolerance,
  );
  const finishedAt = new Date();
  const report: RunReport = {
    id,
    studyId: study.id,
    status: evaluation.status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: processResult.durationMs,
    command: `${python} ${args.join(" ")}`,
    repositoryCommit: SGC_COMMIT,
    evaluation,
    evidence: [
      {
        kind: "paper",
        label: "Claimed Cora accuracy",
        value: `${(study.claim.expected * 100).toFixed(1)}%`,
        locator: study.claim.sourceLocator,
      },
      {
        kind: "repository",
        label: "Pinned source",
        value: SGC_COMMIT.slice(0, 12),
        locator: study.repositoryUrl,
      },
      {
        kind: "measured",
        label: "Observed Cora accuracy",
        value: `${(actual * 100).toFixed(2)}%`,
        locator: "stdout.log",
      },
    ],
    stdoutTail: tail(processResult.stdout),
    stderrTail: tail(processResult.stderr),
    artifactDirectory: path.relative(projectRoot, runDirectory),
  };

  await writeFile(
    path.join(runDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  return report;
}
