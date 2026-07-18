# Nonconvex reproduction candidate and contract

Generated: 2026-07-18

Review type: scoped candidate evaluation

Decision: implement the Gaussian-measurement panel of Wirtinger Flow Figure 2

## Research question

Which nonconvex optimization result can become ProofLab's next evidence-first golden path while remaining scientifically meaningful, CPU-feasible, license-safe, and demonstrable before the Build Week deadline?

The initial domain is computational nonconvex inverse problems and low-rank recovery. A candidate must have:

- a primary paper and an exact algorithm;
- a concrete, bounded empirical claim rather than only a theorem;
- synthetic or very small data and a CPU implementation path;
- provenance that can be sealed with a version or content hash;
- a useful Codex audit or reconstruction story; and
- a result that can be judged without claiming that an experiment proves a theorem.

GPU training, large external datasets, papers with no bounded metric, and code whose reuse terms are unclear are excluded from the first implementation.

## Decision summary

| Candidate | Primary evidence | Reproduction target | Code and license | Deadline fit | Decision |
| --- | --- | --- | --- | --- | --- |
| Wirtinger Flow (WF) | [arXiv v3](https://arxiv.org/abs/1407.1065v3), [journal DOI](https://doi.org/10.1109/TIT.2015.2399924) | Gaussian panel of Figure 2: high-probability recovery around `m/n = 4.5` | Original author-code link is no longer reliably available; the related author-hosted TWF artifact has no license statement | Strong: synthetic `n = 128` problem, no dataset, exact metric and parameters | **Selected** |
| Truncated Wirtinger Flow (TWF) | [arXiv v2](https://arxiv.org/abs/1505.05114v2), [author code page](https://yuxinchen2020.github.io/TWF/code.html) | Linear-time recovery and empirical comparisons | Author-hosted MATLAB artifact is available but has no license statement | Medium: stronger legacy story, but a more complex algorithm and MATLAB/Octave uncertainty | Defer |
| Procrustes Flow (matrix sensing) | [PMLR paper](https://proceedings.mlr.press/v48/tu16.html), [arXiv v2](https://arxiv.org/abs/1507.03566v2) | Geometric convergence for low-rank matrix recovery | No author implementation was linked by the primary sources reviewed | Medium-low: CPU-friendly, but the paper has no numerical figure or table to match | Backup |

WF wins because it combines a canonical nonconvex inverse problem with a compact empirical target. It also broadens ProofLab's repair concept: when official implementation evidence is unavailable or cannot be reused, Codex reconstructs the missing implementation from paper equations under an explicit evidence contract.

## Sealed source record

Hashes below are SHA-256 values of the bytes retrieved on 2026-07-18. They are evidence anchors, not permission to redistribute the artifacts.

| Evidence | Versioned URL | Bytes | SHA-256 | Reuse decision |
| --- | --- | ---: | --- | --- |
| WF paper | `https://arxiv.org/pdf/1407.1065v3` | 8,087,936 | `868bf209f6a66512374a327c765c43749bfc84cc0c732c195d15b463b9c74e91` | Cite; do not vendor the PDF |
| TWF author artifact | `https://yuxinchen2020.github.io/TWF/code/TWF.zip` | 2,465 | `e3aa964b5c521b8f83f3facaa937a0ce7f02460c8a11228115cd4b1a14333743` | Audit only; do not copy or derive code without a license |
| Procrustes Flow PMLR paper | `https://proceedings.mlr.press/v48/tu16.pdf` | 347,592 | `fd7363f0363d22001be6e57d2a91dce968943657cefdfef66e496dd64cea9b83` | Cite; do not vendor the PDF |
| Procrustes Flow arXiv paper | `https://arxiv.org/pdf/1507.03566v2` | 352,298 | `3cc9138b5f1e76188abd372518c479db060ec4a68e8e3682f619eea5f55b959e` | Cite; do not vendor the PDF |

The [TWF author page](https://yuxinchen2020.github.io/TWF/code.html) says its code was adapted from the original WF code and points to `https://www-bcf.usc.edu/~soltanol/PRWF.html`. That original page did not return usable content during this review. The TWF ZIP contains only `TWF.m`, `TWF.m~`, and `compute_grad.m`; neither the page nor the artifact states a software license. ProofLab therefore must not import, translate, patch, or redistribute that source. This is a **missing implementation reconstruction**, not a legacy-code repair.

## Selected paper claim

The selected source is *Phase Retrieval via Wirtinger Flow: Theory and Algorithms* by Emmanuel J. Candes, Xiaodong Li, and Mahdi Soltanolkotabi, arXiv `1407.1065v3`, last revised 2015-11-24.

Section 4.2 and Figure 2 provide the target:

- complex signals of dimension `n = 128`;
- one random Gaussian signal and one random low-pass signal, each fixed across its experiments;
- 50 power-method iterations for spectral initialization;
- step schedule `mu_t = min(1 - exp(-t / 330), 0.2)`;
- 2,500 WF updates;
- 100 independently sampled measurement trials;
- success when phase-invariant relative recovery error is below `1e-5`; and
- the reported conclusion that about `4.5n` Gaussian phaseless measurements suffice for exact recovery with high probability.

ProofLab will initially reproduce only the **Gaussian measurement panel** of Figure 2. Coded diffraction patterns and natural-image experiments are explicitly out of scope for this golden path.

## Executable experiment contract

### Model and algorithm

The implementation will be an independent Python/NumPy reconstruction from paper evidence:

1. Generate a complex signal `x` and complex Gaussian sensing matrix `A`.
2. Form noiseless measurements `y = abs(A @ x) ** 2`.
3. Compute Algorithm 1's spectral initialization, using 50 power iterations and the paper's normalization.
4. Apply equation (2.2) for exactly 2,500 iterations with the Section 4.2 step schedule.
5. Align the final estimate by its global phase and compute `min_phi ||z - exp(i*phi)x||_2 / ||x||_2`.
6. Mark the trial successful only when the error is strictly below `1e-5`.

The paper profile uses complex128 arithmetic, Python 3.11, and NumPy 1.26.4. No early stopping is allowed in the paper profile. The implementation must record the error trajectory at a fixed set of checkpoints without changing the update sequence.

### Deterministic sampling manifest

The paper does not publish random seeds or the exact set of Gaussian-panel sampling ratios. ProofLab will label these choices as **inferred** and seal them in every report:

- ratios: `[2.5, 3.0, 3.5, 4.0, 4.5, 5.0]`;
- `m = round(ratio * 128)`;
- Gaussian-signal seed: `14071065`;
- low-pass-signal seed: `14071066`;
- measurement seed: `1407106500 + 100 * ratio_index + trial_index`;
- NumPy generator: `Generator(PCG64(seed))`; and
- the same generated signal is reused across all ratios and trials for its signal type.

Each report must include the complete seed manifest, dependency versions, platform, CPU description, command, timestamps, and configuration hash.

### Execution profiles

| Profile | Signals | Ratios | Trials per ratio | Iterations | Intended use | Verdict authority |
| --- | --- | --- | ---: | ---: | --- | --- |
| `smoke` | Gaussian | `3.5`, `4.5` | 3 | 100 | CI wiring and parser tests | None; always `inconclusive` |
| `judge` | Gaussian | `3.5`, `4.0`, `4.5`, `5.0` | 20 | 2,500 | Live repair/reconstruction demo | `inconclusive` for the paper claim; may report measured trend |
| `paper` | Gaussian and low-pass | all six ratios | 100 | 2,500 | Sealed reproduction evidence | Full verdict |

The shorter profiles are not silently substituted for the paper profile. The UI and report must show the selected profile and its verdict authority.

### Metrics and verdict

Primary metrics:

- phase-invariant relative recovery error per trial;
- success count and success rate per signal type and ratio;
- smallest tested ratio at which the success rate reaches `0.90`; and
- runtime and peak resident memory.

The paper defines the per-trial success threshold but does not numerically define "high probability." ProofLab's `0.90` rate threshold is therefore an **inferred acceptance rule**, not a quoted paper number.

The `paper` profile verdict is:

- `reproduced`: both signal types achieve success rate at least `0.90` at `m/n = 4.5`;
- `partially_reproduced`: exactly one signal type reaches `0.90`, or both lie in `[0.70, 0.90)`;
- `not_reproduced`: at least one signal type is below `0.70` after a valid complete run; or
- `inconclusive`: the run is incomplete, invalid, uses a shorter profile, or violates the sealed contract.

A negative semilog error slope over a declared fit window may be reported as behavior **consistent with** geometric convergence. It must never be presented as experimental proof of Theorem 3.3 or any other theorem.

## Evidence map

| Evidence class | What belongs here |
| --- | --- |
| `paper` | Problem definition, equations (2.1) and (2.2), Algorithm 1, `n = 128`, signal definitions, 50 power iterations, step schedule, 2,500 iterations, 100 trials, `1e-5` success threshold, and the Figure 2 conclusion around `4.5n` |
| `repository` | Author code-page URL, original WF link availability result, TWF artifact URL/contents/hash, absence of a stated software license, and the future ProofLab implementation commit |
| `inferred` | Independent NumPy reconstruction, dependency pin, ratio grid, random seeds, execution profiles, `0.90` interpretation of high probability, tolerances, and verdict thresholds |
| `measured` | Trial errors, success rates, error curves, commands, environment, runtime, memory, logs, and the final report generated by an actual run |

No nonconvex experimental result has been measured yet. This document authorizes and constrains a future implementation; it is not itself a reproduction result.

## Codex reconstruction and audit chain

The judge-facing workflow should expose these stages:

1. **Source audit**: seal the paper version and show that the original code path is unavailable and the related artifact lacks reuse terms.
2. **Contract extraction**: map every algorithm parameter and metric to a paper page/equation, with inferred choices separated.
3. **Codex reconstruction**: generate the smallest NumPy implementation from the contract, without reading or translating the unlicensed MATLAB source.
4. **Implementation audit**: verify dimensions, conjugation, normalization, global-phase alignment, deterministic RNG, and absence of hidden early stopping.
5. **Run**: execute a selected profile on CPU with bounded time and isolated artifacts.
6. **Comparison**: render success-rate and convergence plots alongside the paper target.
7. **Evidence report**: produce a structured bundle containing source hashes, implementation commit, contract hash, environment, logs, metrics, and verdict.

This chain demonstrates Codex as a scientific implementation and audit agent. The deterministic runner, rather than the model, performs the numerical experiment and computes the verdict.

## Feasibility and resource budget

These are pre-implementation estimates and must be replaced by measured values after a feasibility spike:

- external dataset: none;
- peak numerical working set: expected below 64 MB for one `n = 128`, `m <= 640` trial;
- additional Python environment: expected below 150 MB with only pinned NumPy;
- report, logs, CSV, and SVG/JSON plots: target below 10 MB per retained run;
- `smoke` profile: target below 30 seconds on a two-core CPU;
- `judge` profile: target 2-10 minutes on a two-core CPU; and
- `paper` profile: expected 30-120 minutes on a two-core CPU, so it should be precomputed once and replayed for judges rather than run on every click.

Full paper runs must not be part of ordinary pull-request CI. CI should cover formulas, deterministic seeds, parser behavior, verdict boundaries, and the smoke profile. A public deployment must also add concurrency limits, quotas, and artifact retention before enabling any live compute endpoint.

## Backup contract

If the WF feasibility spike exceeds the resource budget or reveals an unresolved interpretation error, use Procrustes Flow rather than expanding into a different field. Pin the [PMLR paper](https://proceedings.mlr.press/v48/tu16.html) and reconstruct Algorithm 1's PSD Gaussian matrix-sensing case with synthetic low-rank matrices.

The backup can measure relative Frobenius error and a linear trend on a semilog error curve. Because the primary paper does not provide a numerical figure or table, its strongest honest verdict is `theoretical_behavior_consistent`, not `paper_metric_reproduced`. This weaker judge-facing target is why it remains a backup.

## Known risks and stop conditions

- The exact random seeds and Gaussian-panel ratio grid were not published; they must remain inferred evidence.
- The original WF code page may only be temporarily unavailable. A later recovery does not permit reuse unless a software license is also established.
- Independent reconstruction can expose ambiguities in complex conjugation or normalization. Any unresolved ambiguity blocks a `reproduced` verdict and must appear in the report.
- Runtime estimates are not measurements. If the `judge` profile exceeds 10 minutes on the deployment CPU, reduce live trials but keep the sealed paper result and label the live run `inconclusive`.
- Do not add coded diffraction, natural images, noisy recovery, TWF, or arbitrary paper upload before the selected Gaussian contract is complete.

## Search protocol and log

Search window: 2026-07-18. Sources were limited to arXiv, PMLR, author-maintained pages, and publication landing pages. Secondary aggregators and code mirrors were not used as evidence.

Inclusion criteria were nonconvex inverse or low-rank problems, primary-source algorithm details, CPU-scale synthetic data, and a bounded reproduction target. Exclusion criteria were GPU/large-data requirements, theorem-only papers without a measurable paper result for the main path, and software without clear reuse permission.

| Source | Query or route | Screened evidence | Outcome |
| --- | --- | --- | --- |
| arXiv | `phase retrieval Wirtinger Flow theory algorithms` | `1407.1065v3`, paper PDF, version history, DOI | Included as main paper |
| Author site | Yuxin Chen Software -> TWF -> Code | code page, TWF ZIP, original-WF link | Provenance included; code reuse excluded |
| arXiv | `Solving Random Quadratic Systems ...` | `1505.05114v2` | TWF deferred |
| PMLR/arXiv | `Procrustes Flow matrix sensing` | PMLR v48 paper and `1507.03566v2` | Included as backup |
| PMLR | `Non-square matrix sensing without spurious local minima` | PMLR v54 paper | Excluded from implementation shortlist: no empirical paper target |

## Primary references

1. E. J. Candes, X. Li, and M. Soltanolkotabi, [*Phase Retrieval via Wirtinger Flow: Theory and Algorithms*](https://arxiv.org/abs/1407.1065v3), arXiv:1407.1065v3; related DOI [10.1109/TIT.2015.2399924](https://doi.org/10.1109/TIT.2015.2399924).
2. Y. Chen and E. J. Candes, [*Solving Random Quadratic Systems of Equations Is Nearly as Easy as Solving Linear Systems*](https://arxiv.org/abs/1505.05114v2), arXiv:1505.05114v2.
3. Y. Chen and E. J. Candes, [TWF author code page](https://yuxinchen2020.github.io/TWF/code.html).
4. S. Tu, R. Boczar, M. Simchowitz, M. Soltanolkotabi, and B. Recht, [*Low-rank Solutions of Linear Matrix Equations via Procrustes Flow*](https://proceedings.mlr.press/v48/tu16.html), PMLR 48, 2016.
5. D. Park, A. Kyrillidis, C. Carmanis, and S. Sanghavi, [*Non-square matrix sensing without spurious local minima via the Burer-Monteiro approach*](https://proceedings.mlr.press/v54/park17a.html), PMLR 54, 2017.
