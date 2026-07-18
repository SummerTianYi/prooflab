import { GCN_COMMIT, SGC_COMMIT } from "./studies";
import type {
  LegacyRepairReport,
  RepositoryAudit,
  RunReport,
} from "./types";

const sgcReport: RunReport = {
  id: "replay-sgc-cora-2026-07-17",
  studyId: "sgc-cora",
  status: "reproduced",
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  command:
    "<python> citation.py --dataset cora --tuned --no-cuda --epochs 100",
  repositoryCommit: SGC_COMMIT,
  evaluation: {
    expected: 0.81,
    actual: 0.81,
    absoluteDelta: 0,
    tolerance: 0.02,
    status: "reproduced",
  },
  evidence: [
    {
      kind: "paper",
      label: "Claimed Cora accuracy",
      value: "81.0%",
      locator: "https://arxiv.org/abs/1902.07153",
    },
    {
      kind: "repository",
      label: "Pinned source",
      value: SGC_COMMIT.slice(0, 12),
      locator: "https://github.com/Tiiiger/SGC",
    },
    {
      kind: "measured",
      label: "Observed Cora accuracy",
      value: "81.00%",
      locator: "/evidence/sgc-cora/verified-output.txt",
    },
  ],
  stdoutTail: "Test Accuracy: 0.8100",
  stderrTail: "",
  artifactDirectory: "/evidence/sgc-cora/manifest.json",
  replay: {
    mode: "sealed_replay",
    liveCompute: false,
    recordedAt: "2026-07-17",
    source: "Sanitized summary of the verified local CPU run; original timing is unavailable.",
    manifestUrl: "/evidence/sgc-cora/manifest.json",
  },
};

const gcnReport: LegacyRepairReport = {
  id: "replay-gcn-cora-2026-07-17",
  studyId: "gcn-cora",
  workflow: "legacy_repair",
  status: "reproduced",
  startedAt: "2026-07-17T15:09:06.737Z",
  finishedAt: "2026-07-17T15:10:28.677Z",
  durationMs: 81_940,
  command: "<python> train.py --dataset cora --epochs 200",
  repairedCommand: "<python> train.py --dataset cora --epochs 200",
  repositoryCommit: GCN_COMMIT,
  evaluation: {
    expected: 0.815,
    actual: 0.818,
    absoluteDelta: 0.0030000000000000027,
    tolerance: 0.02,
    status: "reproduced",
  },
  failure: {
    classification: "scipy_private_api_removed",
    summary:
      "The legacy code imports a SciPy private module path removed by modern SciPy.",
    command: "<python> train.py --dataset cora --epochs 200",
    workingDirectory: "repository/gcn",
    exitCode: 1,
    timedOut: false,
    environment: {
      platform: "Windows 10 / CPU",
      python: "3.10.4",
      tensorflow: "2.15.1",
      numpy: "1.26.4",
      scipy: "1.11.4",
      networkx: "3.2.1",
    },
    stdoutTail: "",
    stderrTail: [
      "Traceback (most recent call last):",
      '  File "repository/gcn/train.py", line 7, in <module>',
      "    from gcn.utils import *",
      '  File "repository/gcn/utils.py", line 5, in <module>',
      "    from scipy.sparse.linalg.eigen.arpack import eigsh",
      "ModuleNotFoundError: No module named 'scipy.sparse.linalg.eigen.arpack'",
    ].join("\n"),
  },
  patch: {
    id: "gcn-tf2-compat-v1",
    generator: "OpenAI Codex",
    sourceCommit: GCN_COMMIT,
    sha256: "14dcd94912c5344f2e5787ed09f81fcb410552f59892abca95f7be294b6c6a0b",
    summary:
      "Minimal compatibility repair for the pinned TensorFlow 1.x GCN source on a modern CPU runtime.",
    rationale: [
      "The measured legacy run fails at the removed SciPy private eigsh import.",
      "Source inspection finds TensorFlow 1.x graph APIs and the removed NumPy np.bool alias on the same execution path.",
      "The patch changes compatibility boundaries only; model architecture, data split, seed, hyperparameters, and evaluation remain unchanged.",
    ],
    files: [
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
    ],
    artifact: "repair.patch",
  },
  evidence: [
    {
      kind: "paper",
      label: "Claimed Cora accuracy",
      value: "81.5%",
      locator: "https://arxiv.org/abs/1609.02907",
    },
    {
      kind: "repository",
      label: "Pinned source",
      value: GCN_COMMIT.slice(0, 12),
      locator: "https://github.com/tkipf/gcn",
    },
    {
      kind: "repository",
      label: "Legacy dependency pin",
      value: "TensorFlow 1.15.4",
      locator: "https://github.com/tkipf/gcn/blob/39a4089fe72ad9f055ed6fdb9746abdcfebc4d81/requirements.txt",
    },
    {
      kind: "measured",
      label: "Original failure",
      value: "scipy_private_api_removed",
      locator: "/evidence/gcn-cora/before-stderr.log",
    },
    {
      kind: "inferred",
      label: "Codex compatibility patch",
      value: "5 files / 14dcd94912c5",
      locator: "/evidence/gcn-cora/repair.patch",
    },
    {
      kind: "measured",
      label: "Repaired Cora accuracy",
      value: "81.80%",
      locator: "/evidence/gcn-cora/after-stdout.log",
    },
  ],
  stdoutTail: [
    "Epoch: 0200 train_loss= 0.60381 train_acc= 0.93571 val_loss= 1.06281 val_acc= 0.79400",
    "Optimization Finished!",
    "Test set results: cost= 1.01652 accuracy= 0.81800",
  ].join("\n"),
  stderrTail: "",
  artifactDirectory: "/evidence/gcn-cora/manifest.json",
  replay: {
    mode: "sealed_replay",
    liveCompute: false,
    recordedAt: "2026-07-17",
    source: "Sanitized artifacts from the verified local Windows CPU repair run.",
    manifestUrl: "/evidence/gcn-cora/manifest.json",
  },
};

const sgcAudit: RepositoryAudit = {
  summary:
    "Sanitized archive of the verified read-only Codex audit. The pinned SGC path is compact and inspectable, but environment drift, data provenance, opaque tuning metadata, and single-run evaluation weaken out-of-the-box reproducibility.",
  reproducibilityScore: 58,
  findings: [
    {
      category: "environment",
      evidence:
        "requirements.txt leaves NumPy, SciPy, and scikit-learn unpinned and pins NetworkX 1.11; README.md only requires PyTorch >=1.0.0.",
      impact: "high",
    },
    {
      category: "data",
      evidence:
        "utils.py:load_citation opens seven Planetoid objects from data/, but the repository provides no checksum manifest or acquisition metadata.",
      impact: "high",
    },
    {
      category: "implementation",
      evidence:
        "citation.py --tuned loads an opaque pickled weight decay from SGC-tuning/cora.txt; tuning.py does not retain the 60 trial records used to select it.",
      impact: "medium",
    },
    {
      category: "implementation",
      evidence:
        "args.py fixes seed 42 and utils.py:set_seed seeds NumPy and PyTorch, but deterministic algorithm settings and runtime versions are not recorded.",
      impact: "medium",
    },
    {
      category: "evaluation",
      evidence:
        "utils.py:load_citation hard-codes the public split as the training labels, the next 500 validation nodes, and the test index file.",
      impact: "low",
    },
    {
      category: "evaluation",
      evidence:
        "citation.py prints one four-decimal test accuracy without repeated seeds, variance, confidence intervals, or a machine-readable result artifact.",
      impact: "high",
    },
  ],
  recommendedActions: [
    "Pin a tested CPU dependency set and record the Python and platform versions.",
    "Seal the Cora files with hashes and document their upstream provenance.",
    "Record the tuned weight decay and selection procedure as structured metadata.",
    "Run multiple fixed seeds and emit machine-readable metrics with dispersion.",
  ],
  threadId: null,
  replay: {
    mode: "sealed_replay",
    liveCompute: false,
    recordedAt: "2026-07-17",
    source: "Sanitized findings from the verified read-only, no-network Codex audit.",
    manifestUrl: "/evidence/sgc-cora/manifest.json",
  },
};

export function getReplayRun(studyId: "sgc-cora"): RunReport;
export function getReplayRun(studyId: "gcn-cora"): LegacyRepairReport;
export function getReplayRun(studyId: string): RunReport | LegacyRepairReport;
export function getReplayRun(studyId: string): RunReport | LegacyRepairReport {
  if (studyId === "sgc-cora") {
    return structuredClone(sgcReport);
  }
  if (studyId === "gcn-cora") {
    return structuredClone(gcnReport);
  }

  throw new Error(`No sealed replay evidence for study: ${studyId}`);
}

export function getReplayAudit(): RepositoryAudit {
  return structuredClone(sgcAudit);
}
