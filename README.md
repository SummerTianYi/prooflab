# ProofLab

ProofLab turns a paper, source repository, and dataset into an auditable research reproduction attempt. Instead of presenting a benchmark number as a black box, it preserves the claim, the pinned source, the execution logs, the measured result, and an explicit verdict.

The Build Week MVP contains two complete CPU workflows: a fast golden path for [Simplifying Graph Convolutional Networks](https://arxiv.org/abs/1902.07153) (SGC) on Cora and an auditable legacy repair for [Semi-Supervised Classification with Graph Convolutional Networks](https://arxiv.org/abs/1609.02907) (GCN) on Cora. It also keeps Attention Is All You Need/WMT14 as an explicit feasibility-only case.

## Hackathon context

ProofLab is being built for the [OpenAI Build Week 2026 Challenge](https://openai.devpost.com/) in the **Developer Tools** track. The challenge asks participants to build a working project with Codex and GPT-5.6. Submissions close on July 21, 2026 at 5:00 PM Pacific Time.

The product idea is an AI research reproduction engine: a researcher supplies a paper, source repository, and dataset, and ProofLab turns them into an executable experiment with a traceable verdict. Its core value is not merely running code. It reconstructs missing implementation details, isolates the experiment, distinguishes claims from measurements, compares the result to the paper, and leaves an evidence trail that another researcher can inspect.

The hackathon judges weigh four criteria equally: technological implementation, product design, potential impact, and quality of the idea. Development decisions should therefore preserve a coherent end-to-end experience, make Codex's contribution concrete and non-trivial, and keep the demo understandable in less than three minutes.

The final Devpost submission must include an English project description, a public YouTube demo under three minutes with audio explaining how Codex and GPT-5.6 were used, a testable repository or project URL, clear setup and testing instructions, and the `/feedback` Session ID from the primary Codex build thread. For a developer tool, judges must also receive supported-platform information and a way to test the project without rebuilding it from scratch. See the [official rules](https://openai.devpost.com/rules) for the authoritative requirements.

## What it does

- Reproduces the published SGC Cora accuracy claim on CPU from a pinned upstream commit.
- Repairs the pinned TensorFlow 1.x GCN/Cora implementation on a modern CPU runtime while preserving the original failure, Codex patch, and repaired result.
- Creates an isolated working copy for every run and captures stdout, stderr, duration, command, and a JSON report.
- Compares the measured metric to the published claim with an explicit tolerance and returns a verdict.
- Uses Codex in a read-only, network-disabled audit to identify reproducibility risks in the source repository.
- Displays source evidence, measured evidence, and audit findings in a judge-friendly workspace.

## Quick start

### Supported platform

macOS or Linux with Node.js 20+ and Python 3.10+. The SGC and GCN runners are CPU-only. The GCN legacy-repair workflow is also validated on Windows 10 with Python 3.10; the current SGC setup script remains macOS/Linux-only. Docker is not required for this MVP.

### Run locally

```bash
npm install
npm run setup:sgc
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select **Run reproduction** to execute the SGC/Cora verification. A successful run should report a test accuracy close to `81.00%`.

To exercise the GCN legacy-repair dossier, prepare its separate modern compatibility environment and then select **GCN / Cora** in the workspace:

```bash
npm run setup:gcn
npm run dev
```

The first setup downloads TensorFlow and can take several minutes. A successful repair run should first preserve the unpatched SciPy compatibility failure, then apply the audited Codex patch and report a repaired accuracy close to `81.80%`.

If the default `python3` is older than Python 3.10, select a newer interpreter during setup:

```bash
PROOFLAB_PYTHON=/path/to/python3 npm run setup:sgc
```

### Test without rebuilding

For a quick judge check, run the commands above, open the local URL, and press **Run reproduction**. The SGC app creates `.prooflab/runs/<run-id>/report.json`, `stdout.log`, and `stderr.log` for inspection. The GCN repair creates `before-stdout.log`, `before-stderr.log`, `repair.patch`, `after-stdout.log`, `after-stderr.log`, `environment.json`, and `report.json` in the same run directory layout.

The **Audit with Codex** control is optional for basic testing. It requires an authenticated Codex CLI, because ProofLab starts a read-only Codex audit against the cached upstream SGC repository. The runner itself does not receive credentials.

## Evidence model

Every conclusion is labeled as one of four evidence types:

- `paper`: a metric or claim attributed to the paper.
- `repository`: a pinned source revision or repository fact.
- `inferred`: an implementation detail reconstructed from available evidence.
- `measured`: an artifact produced by the current experiment.

The SGC workflow uses pinned commit `2c7a2727e82e462d8ef9d6e57f0b08888e16488f`; the GCN repair uses official repository commit `39a4089fe72ad9f055ed6fdb9746abdcfebc4d81`. Generated Python environments live beside the app in `.prooflab-runtime/` so Next.js build tooling never bundles research dependencies.

## How Codex contributed

Codex was used throughout the Build Week implementation to turn the project concept into a working, testable vertical slice. It helped establish the evidence contract, inspect the upstream SGC code path, design the isolated CPU runner, build the research-workspace interface, and add verification for metric parsing, timeouts, and verdict evaluation.

Inside the product, Codex performs a separate repository audit with `read-only` filesystem access, approvals disabled, networking disabled, and structured JSON output. The audit grounds findings in concrete source files, data artifacts, environment requirements, and evaluation code.

For GCN, Codex inspected the measured modern-runtime failure and the pinned execution path, then authored a minimal five-file compatibility diff. The runner applies that sealed patch deterministically and records its SHA-256, rationale, exact file changes, before/after logs, and unchanged experimental assumptions in every report.

For the hackathon submission, include the `/feedback` Session ID from the primary Codex thread used to build the project in the Devpost form.

## Verification

```bash
npm run verify
```

This runs linting, unit tests, TypeScript checks, and a production build.

## Current development status

Two end-to-end workflows are complete and verified:

- The SGC/Cora CPU reproduction runs from pinned commit `2c7a2727e82e462d8ef9d6e57f0b08888e16488f`.
- The published target and measured test accuracy are both `81.00%`, producing a `reproduced` verdict.
- The runner creates an isolated source checkout, enforces a 90-second timeout, restricts the child-process environment, parses the metric, and writes a structured evidence bundle.
- The Codex SDK audit has been exercised against the real SGC repository with read-only filesystem access and networking disabled. It returned six source-grounded reproducibility findings.
- GCN/Cora is pinned to official commit `39a4089fe72ad9f055ed6fdb9746abdcfebc4d81` and the paper's Table 2 target of `81.50%`.
- The unmodified GCN source fails on the modern runtime at its removed SciPy private `eigsh` import. The runner retains the raw command, exit status, environment versions, and logs, and classifies the failure as `scipy_private_api_removed`.
- The Codex-authored compatibility patch changes five files at compatibility boundaries only: public SciPy import, `np.bool_`, and TensorFlow `compat.v1`. It preserves model structure, Planetoid split, seed, hyperparameters, and evaluation.
- The repaired Windows CPU run measured `81.80%`; the absolute delta from the paper target is `0.30` percentage points, producing a `reproduced` verdict.
- The responsive workspace switches between SGC reproduction and GCN legacy repair and displays the before/patch/after evidence chain.
- `npm run verify` passes with 19 tests across metric evaluation, timeouts, SGC and GCN parsing, failure classification, patch metadata, verdicts, and audit score normalization.

The next milestone is **judge-ready delivery**: make the two-workflow setup as frictionless as possible, prepare the English Devpost description and a narrated sub-three-minute demo story, record the primary `/feedback` Session ID, and decide whether a checked-in sample evidence bundle is needed for reviewers who cannot install TensorFlow. Transformer/WMT14 remains feasibility-only because an exact reproduction is outside the available compute budget.

## Continue with Codex on another computer

Paste the following prompt into Codex. It is designed to work whether the repository is already open or must be retrieved from GitHub.

```text
Continue development of ProofLab from its existing Build Week MVP state.

Repository: https://github.com/SummerTianYi/prooflab

If the repository is not already present in the current workspace, clone it and work inside the `prooflab` directory. If it is already present, do not clone another copy. Read README.md and AGENTS.md first, inspect the current Git status and recent commits, and preserve all existing user changes. Do not restart the project or replace the existing architecture.

Hackathon and product context:
- This project is an entry for the OpenAI Build Week 2026 Challenge in the Developer Tools track. The submission deadline is July 21, 2026 at 5:00 PM Pacific Time.
- The required development tools are Codex and GPT-5.6. Their contribution must be visible in the implementation, README, text submission, and demo.
- ProofLab is an AI research reproduction engine. It turns a paper, code repository, and dataset into a runnable experiment, reconstructs missing details, compares measured results with published claims, and produces an auditable evidence trail.
- The target user is a researcher or engineer who needs to determine whether a paper result can actually be reproduced, why a reproduction failed, and what evidence supports the conclusion.
- Judges score technological implementation, design, potential impact, and quality of the idea equally. Optimize for a coherent working product rather than disconnected technical experiments.
- The final submission needs an English description, a public YouTube demo under three minutes with audio explaining Codex and GPT-5.6 usage, a testable repository or project URL, setup/testing instructions, supported platforms, the primary `/feedback` Codex Session ID, and a judge-friendly way to test without rebuilding from scratch.

Current verified state:
- Next.js 16 + TypeScript application with a research-workspace UI.
- SGC/Cora is the completed golden path using pinned commit 2c7a2727e82e462d8ef9d6e57f0b08888e16488f.
- The real CPU reproduction measured 81.00% test accuracy against an 81.00% paper target and produced a `reproduced` verdict.
- GCN/Cora legacy repair is complete using official commit 39a4089fe72ad9f055ed6fdb9746abdcfebc4d81 and the 81.50% paper target.
- The real unpatched run failed at the removed SciPy private eigsh import and was classified `scipy_private_api_removed`. The Codex-authored five-file compatibility patch preserves the model and experiment while adapting SciPy, NumPy, and TensorFlow APIs.
- The repaired Windows CPU run measured 81.80% and produced a `reproduced` verdict. Its evidence bundle contains before/after logs, environment.json, repair.patch with SHA-256 metadata, and report.json.
- The local runners create isolated workspaces, limit environment variables, apply timeouts, capture logs, parse metrics, compare tolerance, and write structured evidence bundles.
- The Codex SDK repository audit works in read-only, no-network mode and returns structured, source-grounded findings.
- API routes, selectable SGC/GCN UI, repair evidence display, and 19 automated tests are implemented. `npm run verify` passes.
- Local generated state under `.prooflab/`, `.prooflab-runtime/`, `node_modules/`, and `.next/` is intentionally not versioned.

Primary next objective:
Prepare ProofLab for judging without destabilizing the two completed workflows. Prioritize setup clarity and demo reliability, then draft the English Devpost description and a narrated demo script/storyboard under three minutes. Make Codex and GPT-5.6's development and in-product contributions concrete. Do not publish, upload, or submit anything without explicit authorization.

Execution guidance:
1. Inspect the existing code, tests, setup scripts, and current Git state before changing anything.
2. Run `npm install` if dependencies are absent. Use `npm run setup:sgc` or `npm run setup:gcn` only when the corresponding research environment is needed.
3. Run `npm run verify` to establish a baseline.
4. Preserve the completed SGC and GCN report contracts and the paper/repository/inferred/measured evidence distinction.
5. Keep Attention Is All You Need/WMT14 feasibility-only; do not attempt expensive training.
6. If adding a sample evidence bundle or demo mode, label it clearly as recorded evidence and keep the live runner path available so it cannot be mistaken for a fresh measurement.
7. Re-run relevant tests and `npm run verify`, then update this status and continuation prompt.

Work autonomously through implementation and verification. Pause only for decisions with material product, legal, credential, deployment, or external-write consequences. At the end, summarize the behavior delivered, evidence produced, tests run, known limitations, and the next shortest milestone. Do not push, publish, or deploy unless I explicitly ask.
```

## Current limitations

- The SGC golden path is local and CPU-only; Docker isolation is planned but not yet included.
- `npm run setup:sgc` downloads the pinned public SGC source and Python dependencies on first use.
- `npm run setup:gcn` downloads a roughly 300 MB TensorFlow runtime on Windows and can take several minutes on first use.
- The GCN repair applies a sealed Codex-authored patch rather than asking a model to regenerate code on every click; this keeps judge runs deterministic while retaining the generator, rationale, changed files, and patch hash as evidence.
- The repaired GCN path uses TensorFlow 2.15's `compat.v1` mode. Deprecation warnings remain in stderr by design and are preserved as evidence.
- Transformer/WMT14 remains a feasibility-only audit; no expensive full training is attempted.
