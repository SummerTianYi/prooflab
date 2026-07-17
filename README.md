# ProofLab

ProofLab turns a paper, source repository, and dataset into an auditable research reproduction attempt. Instead of presenting a benchmark number as a black box, it preserves the claim, the pinned source, the execution logs, the measured result, and an explicit verdict.

The Build Week MVP focuses on a fast, reproducible golden path: [Simplifying Graph Convolutional Networks](https://arxiv.org/abs/1902.07153) (SGC) on Cora. It also shows the next two investigation modes: a GCN legacy-repair case and an Attention Is All You Need feasibility audit.

## Hackathon context

ProofLab is being built for the [OpenAI Build Week 2026 Challenge](https://openai.devpost.com/) in the **Developer Tools** track. The challenge asks participants to build a working project with Codex and GPT-5.6. Submissions close on July 21, 2026 at 5:00 PM Pacific Time.

The product idea is an AI research reproduction engine: a researcher supplies a paper, source repository, and dataset, and ProofLab turns them into an executable experiment with a traceable verdict. Its core value is not merely running code. It reconstructs missing implementation details, isolates the experiment, distinguishes claims from measurements, compares the result to the paper, and leaves an evidence trail that another researcher can inspect.

The hackathon judges weigh four criteria equally: technological implementation, product design, potential impact, and quality of the idea. Development decisions should therefore preserve a coherent end-to-end experience, make Codex's contribution concrete and non-trivial, and keep the demo understandable in less than three minutes.

The final Devpost submission must include an English project description, a public YouTube demo under three minutes with audio explaining how Codex and GPT-5.6 were used, a testable repository or project URL, clear setup and testing instructions, and the `/feedback` Session ID from the primary Codex build thread. For a developer tool, judges must also receive supported-platform information and a way to test the project without rebuilding it from scratch. See the [official rules](https://openai.devpost.com/rules) for the authoritative requirements.

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

## Current development status

The first end-to-end vertical slice is complete and verified:

- The SGC/Cora CPU reproduction runs from pinned commit `2c7a2727e82e462d8ef9d6e57f0b08888e16488f`.
- The published target and measured test accuracy are both `81.00%`, producing a `reproduced` verdict.
- The runner creates an isolated source checkout, enforces a 90-second timeout, restricts the child-process environment, parses the metric, and writes a structured evidence bundle.
- The Codex SDK audit has been exercised against the real SGC repository with read-only filesystem access and networking disabled. It returned six source-grounded reproducibility findings.
- The responsive research workspace, experiment API, audit API, evidence display, and verdict comparison are implemented.
- `npm run verify` passes with 11 tests across metric evaluation, process timeout behavior, SGC output parsing, and audit score normalization.

The next milestone is **GCN legacy repair**. It should demonstrate the full repair loop: run or inspect the legacy implementation, preserve the initial failure as evidence, have Codex propose a minimal compatibility patch, execute the repaired experiment, and compare the before/after result. The Transformer/WMT14 case remains a feasibility-only audit because an exact reproduction is outside the available compute budget.

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
- The local runner creates isolated workspaces, limits environment variables, applies a 90-second timeout, captures logs, parses metrics, compares tolerance, and writes report.json evidence bundles.
- The Codex SDK repository audit works in read-only, no-network mode and returns structured, source-grounded findings.
- API routes, responsive UI, and 11 automated tests are implemented. `npm run verify` passes.
- Local generated state under `.prooflab/`, `.prooflab-runtime/`, `node_modules/`, and `.next/` is intentionally not versioned.

Primary next objective:
Implement the GCN/Cora legacy-repair case as the second ProofLab workflow. The product should show an auditable before/after sequence: identify or reproduce the legacy environment failure, retain the failure logs as evidence, use Codex to generate a minimal compatibility patch, run the repaired CPU experiment, compare the result to the paper claim, and expose the evidence and status in the existing UI. Keep the current evidence types and report contracts unless a backward-compatible extension is necessary.

Execution guidance:
1. Inspect the existing code, tests, setup scripts, and current Git state before changing anything.
2. Run `npm install` if dependencies are absent. Run `npm run setup:sgc` only when the SGC research environment is needed.
3. Run `npm run verify` to establish a baseline.
4. Research and pin the official GCN paper/repository artifacts before implementing the legacy case. Treat paper claims, repository facts, inferred details, and measured results as separate evidence.
5. Use the smallest implementation that demonstrates the repair loop. Do not attempt an exact Attention Is All You Need/WMT14 training run; keep that case feasibility-only.
6. Add tests for new parsing, failure classification, patch metadata, and verdict behavior. Re-run relevant tests and the full verification command.
7. Update README.md's current status and continuation prompt after the milestone so another Codex session can resume from the new state.

Work autonomously through implementation and verification. Pause only for decisions with material product, legal, credential, deployment, or external-write consequences. At the end, summarize the behavior delivered, evidence produced, tests run, known limitations, and the next shortest milestone. Do not push, publish, or deploy unless I explicitly ask.
```

## Current limitations

- The SGC golden path is local and CPU-only; Docker isolation is planned but not yet included.
- `npm run setup:sgc` downloads the pinned public SGC source and Python dependencies on first use.
- The GCN repair and Transformer feasibility cases are intentionally queued demonstrations, not completed reproductions in this MVP.
