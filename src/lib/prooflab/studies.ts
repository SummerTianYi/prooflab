import type { StudyDefinition } from "./types";

export const SGC_COMMIT = "2c7a2727e82e462d8ef9d6e57f0b08888e16488f";
export const GCN_COMMIT = "39a4089fe72ad9f055ed6fdb9746abdcfebc4d81";

export const studies: StudyDefinition[] = [
  {
    id: "sgc-cora",
    shortName: "SGC / Cora",
    title: "Simplifying Graph Convolutional Networks",
    authors: "Wu et al.",
    venue: "ICML",
    year: 2019,
    repositoryUrl: "https://github.com/Tiiiger/SGC",
    repositoryCommit: SGC_COMMIT,
    claim: {
      metric: "test_accuracy",
      label: "Cora test accuracy",
      expected: 0.81,
      tolerance: 0.02,
      unit: "ratio",
      sourceUrl: "https://arxiv.org/abs/1902.07153",
      sourceLocator: "Citation-network results",
    },
    mode: "ported",
    readiness: "ready",
    note: "Golden path: modern runtime, original data split, pinned source commit.",
  },
  {
    id: "gcn-cora",
    shortName: "GCN / Cora",
    title: "Semi-Supervised Classification with Graph Convolutional Networks",
    authors: "Kipf & Welling",
    venue: "ICLR",
    year: 2017,
    repositoryUrl: "https://github.com/tkipf/gcn",
    repositoryCommit: GCN_COMMIT,
    claim: {
      metric: "test_accuracy",
      label: "Cora test accuracy",
      expected: 0.815,
      tolerance: 0.02,
      unit: "ratio",
      sourceUrl: "https://arxiv.org/abs/1609.02907",
      sourceLocator: "Table 2",
    },
    mode: "ported",
    readiness: "ready",
    note: "Legacy repair: preserves the modern-runtime failure, applies a Codex compatibility patch, and reruns on CPU.",
  },
  {
    id: "transformer-wmt14",
    shortName: "Transformer / WMT14",
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    venue: "NeurIPS",
    year: 2017,
    repositoryUrl: "https://github.com/tensorflow/tensor2tensor",
    claim: {
      metric: "bleu",
      label: "WMT14 English-German BLEU",
      expected: 28.4,
      tolerance: 0.5,
      unit: "bleu",
      sourceUrl: "https://arxiv.org/abs/1706.03762",
      sourceLocator: "Abstract and Table 2",
    },
    mode: "feasibility_only",
    readiness: "blocked",
    note: "Feasibility audit: original result requires eight P100 GPUs and a large translation pipeline.",
  },
];

export function getStudy(id: string): StudyDefinition {
  const study = studies.find((candidate) => candidate.id === id);

  if (!study) {
    throw new Error(`Unknown study: ${id}`);
  }

  return study;
}
