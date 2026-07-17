# ProofLab

ProofLab turns a paper, source repository, and dataset into an auditable research reproduction attempt. Instead of presenting a benchmark number as a black box, it preserves the claim, the pinned source, the execution logs, the measured result, and an explicit verdict.

The Build Week MVP focuses on a fast, reproducible golden path: [Simplifying Graph Convolutional Networks](https://arxiv.org/abs/1902.07153) (SGC) on Cora. It also shows the next two investigation modes: a GCN legacy-repair case and an Attention Is All You Need feasibility audit.

## What it does

- Reproduces the published SGC Cora accuracy claim on CPU from a pinned upstream commit.
- Creates an isolated working copy for every run and captures stdout, stderr, duration, command, and a JSON report.
- Compares the measured metric to the published claim with an explicit tolerance and returns a verdict.
- Uses Codex in a read-only, network-disabled audit to identify reproducibility risks in the source repository.
- Displays source evidence, measured evidence, and audit findings in a judge-friendly workspace.

## Quick start

### Supported platform

macOS or Linux with Node.js 20+ and Python 3.10+. The SGC runner is CPU-only. Docker is not required for this MVP.

### Run locally

```bash
npm install
npm run setup:sgc
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select **Run reproduction** to execute the SGC/Cora verification. A successful run should report a test accuracy close to `81.00%`.

If the default `python3` is older than Python 3.10, select a newer interpreter during setup:

```bash
PROOFLAB_PYTHON=/path/to/python3 npm run setup:sgc
```

### Test without rebuilding

For a quick judge check, run the commands above, open the local URL, and press **Run reproduction**. The app creates `.prooflab/runs/<run-id>/report.json`, `stdout.log`, and `stderr.log` for inspection.

The **Audit with Codex** control is optional for basic testing. It requires an authenticated Codex CLI, because ProofLab starts a read-only Codex audit against the cached upstream SGC repository. The runner itself does not receive credentials.

## Evidence model

Every conclusion is labeled as one of four evidence types:

- `paper`: a metric or claim attributed to the paper.
- `repository`: a pinned source revision or repository fact.
- `inferred`: an implementation detail reconstructed from available evidence.
- `measured`: an artifact produced by the current experiment.

Each run uses the pinned SGC commit `2c7a2727e82e462d8ef9d6e57f0b08888e16488f`. The generated Python environment lives beside the app in `.prooflab-runtime/` so Next.js build tooling never bundles research dependencies.

## How Codex contributed

Codex was used throughout the Build Week implementation to turn the project concept into a working, testable vertical slice. It helped establish the evidence contract, inspect the upstream SGC code path, design the isolated CPU runner, build the research-workspace interface, and add verification for metric parsing, timeouts, and verdict evaluation.

Inside the product, Codex performs a separate repository audit with `read-only` filesystem access, approvals disabled, networking disabled, and structured JSON output. The audit grounds findings in concrete source files, data artifacts, environment requirements, and evaluation code.

For the hackathon submission, include the `/feedback` Session ID from the primary Codex thread used to build the project in the Devpost form.

## Verification

```bash
npm run verify
```

This runs linting, unit tests, TypeScript checks, and a production build.

## Current limitations

- The SGC golden path is local and CPU-only; Docker isolation is planned but not yet included.
- `npm run setup:sgc` downloads the pinned public SGC source and Python dependencies on first use.
- The GCN repair and Transformer feasibility cases are intentionally queued demonstrations, not completed reproductions in this MVP.
