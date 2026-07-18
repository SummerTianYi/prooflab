import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluateMetric } from "./evaluation";
import { runProcess } from "./process-runner";
import { GCN_COMMIT, getStudy } from "./studies";
import type {
  LegacyFailureClassification,
  LegacyRepairReport,
  RepairPatchMetadata,
} from "./types";

const RUN_TIMEOUT_MS = 90_000;
const LEGACY_TIMEOUT_MS = 60_000;
const PATCH_ID = "gcn-tf2-compat-v1";

const PATCH_FILES = [
  {
    path: "gcn/inits.py",
    changes: ["Route TensorFlow calls through tensorflow.compat.v1."],
  },
  {
    path: "gcn/layers.py",
    changes: ["Route TensorFlow calls through tensorflow.compat.v1."],
  },
  {
    path: "gcn/metrics.py",
    changes: ["Route TensorFlow calls through tensorflow.compat.v1."],
  },
  {
    path: "gcn/train.py",
    changes: [
      "Route TensorFlow calls through tensorflow.compat.v1.",
      "Disable TensorFlow 2 behavior before graph construction.",
    ],
  },
  {
    path: "gcn/utils.py",
    changes: [
      "Import eigsh from the public SciPy sparse.linalg API.",
      "Replace the removed NumPy np.bool alias with np.bool_.",
    ],
  },
] as const;

function experimentEnvironment(repository: string): NodeJS.ProcessEnv {
  const allowed = [
    "HOME",
    "USERPROFILE",
    "PATH",
    "TMPDIR",
    "TEMP",
    "TMP",
    "SYSTEMROOT",
    "WINDIR",
    "LANG",
    "LC_ALL",
  ];
  const env = Object.fromEntries(
    allowed.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
  );

  return {
    ...env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    CUDA_VISIBLE_DEVICES: "",
    PYTHONNOUSERSITE: "1",
    PYTHONUNBUFFERED: "1",
    PYTHONPATH: repository,
    TF_CPP_MIN_LOG_LEVEL: "2",
    TF_ENABLE_ONEDNN_OPTS: "0",
  };
}

function tail(value: string, lines = 30): string {
  return value.trim().split("\n").slice(-lines).join("\n");
}

function commandString(executable: string, args: string[]): string {
  return [executable, ...args].join(" ");
}

async function assertExists(filePath: string, message: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}

export function classifyGcnFailure(
  output: string,
  timedOut = false,
): LegacyFailureClassification {
  if (timedOut) {
    return "timeout";
  }

  const normalized = output.toLowerCase();
  if (
    normalized.includes("no matching distribution found") ||
    normalized.includes("could not find a version that satisfies the requirement")
  ) {
    return "unsupported_dependency";
  }
  if (
    normalized.includes("scipy.sparse.linalg.eigen.arpack") ||
    normalized.includes("no module named 'scipy.sparse.linalg.eigen")
  ) {
    return "scipy_private_api_removed";
  }
  if (
    normalized.includes("module 'tensorflow' has no attribute") ||
    normalized.includes("tensorflow has no attribute")
  ) {
    return "tensorflow_api_removed";
  }
  if (
    (normalized.includes("np.bool") ||
      normalized.includes("module 'numpy' has no attribute 'bool'")) &&
    (normalized.includes("has no attribute") || normalized.includes("was a deprecated alias"))
  ) {
    return "numpy_alias_removed";
  }
  if (
    normalized.includes("modulenotfounderror") ||
    normalized.includes("no module named")
  ) {
    return "missing_dependency";
  }

  return "unknown";
}

function failureSummary(classification: LegacyFailureClassification): string {
  const summaries: Record<LegacyFailureClassification, string> = {
    unsupported_dependency:
      "The upstream TensorFlow 1.x dependency cannot be resolved for this Python runtime.",
    missing_dependency: "The legacy program cannot import a required runtime dependency.",
    scipy_private_api_removed:
      "The legacy code imports a SciPy private module path removed by modern SciPy.",
    tensorflow_api_removed:
      "The legacy code calls a TensorFlow 1.x API absent from the TensorFlow 2 top-level module.",
    numpy_alias_removed:
      "The legacy code uses a NumPy scalar alias removed by modern NumPy.",
    timeout: "The legacy command exceeded its time budget.",
    unknown: "The legacy command failed with an unclassified error.",
  };
  return summaries[classification];
}

export function parseGcnAccuracy(output: string): number {
  const match = output.match(
    /Test set results:[\s\S]*?accuracy=\s*([0-9]*\.?[0-9]+)/i,
  );
  if (!match) {
    throw new Error("GCN run completed without a parseable test accuracy.");
  }

  const accuracy = Number.parseFloat(match[1]);
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    throw new Error(`GCN run returned an invalid test accuracy: ${match[1]}`);
  }
  return accuracy;
}

export function buildGcnPatchMetadata(patch: string): RepairPatchMetadata {
  const changedFiles = Array.from(
    patch.matchAll(/^diff --git a\/(.+?) b\/.+$/gm),
    (match) => match[1],
  );
  const expectedFiles = PATCH_FILES.map((file) => file.path);

  if (JSON.stringify(changedFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error("GCN compatibility patch does not match its audited file manifest.");
  }

  return {
    id: PATCH_ID,
    generator: "OpenAI Codex",
    sourceCommit: GCN_COMMIT,
    sha256: createHash("sha256").update(patch).digest("hex"),
    summary:
      "Minimal compatibility repair for the pinned TensorFlow 1.x GCN source on a modern CPU runtime.",
    rationale: [
      "The measured legacy run fails at the removed SciPy private eigsh import.",
      "Source inspection finds TensorFlow 1.x graph APIs and the removed NumPy np.bool alias on the same execution path.",
      "The patch changes compatibility boundaries only; model architecture, data split, seed, hyperparameters, and evaluation remain unchanged.",
    ],
    files: PATCH_FILES.map((file) => ({
      path: file.path,
      changes: [...file.changes],
    })),
    artifact: "repair.patch",
  };
}

async function collectEnvironment(
  python: string,
  repository: string,
): Promise<Record<string, string>> {
  const script = [
    "import json, platform",
    "import tensorflow, numpy, scipy, networkx",
    "print(json.dumps({",
    "  'platform': platform.platform(),",
    "  'python': platform.python_version(),",
    "  'tensorflow': tensorflow.__version__,",
    "  'numpy': numpy.__version__,",
    "  'scipy': scipy.__version__,",
    "  'networkx': networkx.__version__,",
    "}))",
  ].join("\n");
  const result = await runProcess(python, ["-c", script], {
    cwd: repository,
    timeoutMs: 60_000,
    env: experimentEnvironment(repository),
  });

  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(`Unable to inspect GCN runtime: ${tail(result.stderr)}`);
  }

  const jsonLine = result.stdout.trim().split("\n").at(-1);
  if (!jsonLine) {
    throw new Error("GCN runtime inspection returned no environment metadata.");
  }
  return JSON.parse(jsonLine) as Record<string, string>;
}

export async function runGcnLegacyRepair(): Promise<LegacyRepairReport> {
  const projectRoot = process.cwd();
  const cacheRepository = path.join(projectRoot, ".prooflab", "cache", "gcn");
  const patchPath = path.join(
    projectRoot,
    "experiments",
    "patches",
    "gcn-tf2-compat.patch",
  );
  const python =
    process.env.PROOFLAB_GCN_PYTHON ??
    path.resolve(
      projectRoot,
      "..",
      ".prooflab-runtime",
      "gcn-legacy-venv",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    );

  await assertExists(
    cacheRepository,
    "GCN source cache is missing. Run `npm run setup:gcn` first.",
  );
  await assertExists(
    python,
    "ProofLab GCN Python environment is missing. Run `npm run setup:gcn` first.",
  );
  await assertExists(patchPath, "The audited GCN compatibility patch is missing.");

  const study = getStudy("gcn-cora");
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const runDirectory = path.join(projectRoot, ".prooflab", "runs", id);
  const repository = path.join(runDirectory, "repository");
  const trainingDirectory = path.join(repository, "gcn");
  const startedAt = new Date();
  const args = ["train.py", "--dataset", "cora", "--epochs", "200"];
  const command = commandString(python, args);

  await mkdir(runDirectory, { recursive: true });
  const clone = await runProcess(
    "git",
    ["clone", "--local", "--no-hardlinks", cacheRepository, repository],
    { cwd: projectRoot, timeoutMs: 30_000, env: experimentEnvironment(repository) },
  );
  if (clone.exitCode !== 0) {
    throw new Error(`Unable to create isolated GCN workspace: ${tail(clone.stderr)}`);
  }

  const checkout = await runProcess("git", ["checkout", "--detach", GCN_COMMIT], {
    cwd: repository,
    timeoutMs: 15_000,
    env: experimentEnvironment(repository),
  });
  if (checkout.exitCode !== 0) {
    throw new Error(`Unable to pin GCN source: ${tail(checkout.stderr)}`);
  }

  const environment = await collectEnvironment(python, repository);
  await writeFile(
    path.join(runDirectory, "environment.json"),
    `${JSON.stringify(environment, null, 2)}\n`,
  );

  const before = await runProcess(python, args, {
    cwd: trainingDirectory,
    timeoutMs: LEGACY_TIMEOUT_MS,
    env: experimentEnvironment(repository),
  });
  await Promise.all([
    writeFile(path.join(runDirectory, "before-stdout.log"), before.stdout),
    writeFile(path.join(runDirectory, "before-stderr.log"), before.stderr),
  ]);

  if (before.exitCode === 0 && !before.timedOut) {
    throw new Error(
      "The pinned GCN legacy baseline unexpectedly succeeded; refusing to claim a repair without a measured failure.",
    );
  }

  const classification = classifyGcnFailure(
    `${before.stdout}\n${before.stderr}`,
    before.timedOut,
  );
  const isRepairable =
    classification === "scipy_private_api_removed" ||
    classification === "tensorflow_api_removed" ||
    classification === "numpy_alias_removed";
  if (!isRepairable) {
    throw new Error(
      `GCN legacy failure is not safely repairable: ${failureSummary(classification)}`,
    );
  }

  const patch = await readFile(patchPath, "utf8");
  const patchMetadata = buildGcnPatchMetadata(patch);
  await writeFile(path.join(runDirectory, patchMetadata.artifact), patch);

  const patchCheck = await runProcess("git", ["apply", "--check", patchPath], {
    cwd: repository,
    timeoutMs: 15_000,
    env: experimentEnvironment(repository),
  });
  if (patchCheck.exitCode !== 0) {
    throw new Error(`Codex repair patch no longer applies: ${tail(patchCheck.stderr)}`);
  }

  const applyPatch = await runProcess("git", ["apply", patchPath], {
    cwd: repository,
    timeoutMs: 15_000,
    env: experimentEnvironment(repository),
  });
  if (applyPatch.exitCode !== 0) {
    throw new Error(`Unable to apply Codex repair patch: ${tail(applyPatch.stderr)}`);
  }

  const after = await runProcess(python, args, {
    cwd: trainingDirectory,
    timeoutMs: RUN_TIMEOUT_MS,
    env: experimentEnvironment(repository),
  });
  await Promise.all([
    writeFile(path.join(runDirectory, "after-stdout.log"), after.stdout),
    writeFile(path.join(runDirectory, "after-stderr.log"), after.stderr),
  ]);

  if (after.timedOut) {
    throw new Error(`Repaired GCN run exceeded ${RUN_TIMEOUT_MS / 1_000} seconds.`);
  }
  if (after.exitCode !== 0) {
    throw new Error(`Repaired GCN run failed: ${tail(after.stderr)}`);
  }

  const actual = parseGcnAccuracy(after.stdout);
  const evaluation = evaluateMetric(
    study.claim.expected,
    actual,
    study.claim.tolerance,
  );
  const finishedAt = new Date();
  const report: LegacyRepairReport = {
    id,
    studyId: study.id,
    workflow: "legacy_repair",
    status: evaluation.status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    command,
    repairedCommand: command,
    repositoryCommit: GCN_COMMIT,
    evaluation,
    failure: {
      classification,
      summary: failureSummary(classification),
      command,
      workingDirectory: "repository/gcn",
      exitCode: before.exitCode,
      timedOut: before.timedOut,
      environment,
      stdoutTail: tail(before.stdout),
      stderrTail: tail(before.stderr),
    },
    patch: patchMetadata,
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
        value: GCN_COMMIT.slice(0, 12),
        locator: study.repositoryUrl,
      },
      {
        kind: "repository",
        label: "Legacy dependency pin",
        value: "TensorFlow 1.15.4",
        locator: "repository/requirements.txt",
      },
      {
        kind: "measured",
        label: "Original failure",
        value: classification,
        locator: "before-stderr.log",
      },
      {
        kind: "inferred",
        label: "Codex compatibility patch",
        value: `${patchMetadata.files.length} files / ${patchMetadata.sha256.slice(0, 12)}`,
        locator: patchMetadata.artifact,
      },
      {
        kind: "measured",
        label: "Repaired Cora accuracy",
        value: `${(actual * 100).toFixed(2)}%`,
        locator: "after-stdout.log",
      },
    ],
    stdoutTail: tail(after.stdout),
    stderrTail: tail(after.stderr),
    artifactDirectory: path.relative(projectRoot, runDirectory),
  };

  await writeFile(
    path.join(runDirectory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}
