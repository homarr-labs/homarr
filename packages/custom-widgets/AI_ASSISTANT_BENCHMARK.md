# Assistant authoring benchmark — 2026-09-21

This campaign evaluates pass@1 Custom Widget authoring through the real staged tool lifecycle. It uses synthetic requests, API notes, and preview fixtures only.

## Baseline and fixed setup

The baseline is `release/v2` at commit `c6da4a4366fa852e8aae67fea7137a21bae7538b`, not `dev`. Its prompt bundle is pinned in `scripts/prompt-baselines/` with source hashes.

- 18 hard cases: 6 train, 6 dev, 6 held-out
- Generator temperature: `0.2`
- Attempts per case: `1`
- Generator and judge output caps: `32768`
- Judge: `google/gemini-2.5-flash`
- Judge policy v2: `840255e453e0ef01fbda9a2b2d3697a4587b0dc91466bbaca95378f166530015`
- Dev case set: `2111486e0cbd9462e4285aa7717615f1d2b1b39d3a7d141d24ec05ad1a4fbb3e`
- Held-out case set: `d73bfce7cd4bf4c783048eac797192e3f2a368fbb724b00169fa2f2afaa34dbb`

Strict pass requires lifecycle completion, every deterministic contract check, total score at least 85, every required category floor, and a judge pass. Lifecycle means every requested widget was persisted from its tested preview.

The previous report is superseded. It used the wrong baseline, `tool_choice: auto` where an active lifecycle tool was required, an incomplete preview schema, and deterministic checks that rejected valid AST-equivalent JSX.

## Ten-generation search

The campaign ran more than ten prompt generations and parallel judge/rejudge variants. Selected checkpoints:

| Candidate                         | Dev strict | Dev lifecycle | Notes                                                             |
| --------------------------------- | ---------: | ------------: | ----------------------------------------------------------------- |
| release/v2 baseline               |        1/6 |           2/6 | Exact pinned baseline, GLM-5.3, current harness                   |
| generation 3                      |        0/6 |           4/6 | Flash model corrupted contract values                             |
| generation 4                      |        1/6 |           6/6 | First full-model lifecycle success                                |
| generation 5, corrected rejudge   |        5/6 |           6/6 | Best observed prompt; two deterministic false negatives corrected |
| generation 6, corrected rejudge   |        4/6 |           6/6 | Initial Haiku judge violated the rubric                           |
| generation 9                      |        3/6 |           6/6 | Better quality, category-floor misses remained                    |
| generation 10, repeat 1           |        4/6 |           6/6 | Strongest directly judged generation-10 run                       |
| generation 10, repeat 2           |        3/6 |           6/6 | Demonstrates pass@1 variance                                      |
| generation 11, pre-controller fix |        1/6 |           5/6 | Reopened completed previews and exhausted steps                   |
| generation 11, final GLM run      |        3/6 |           4/6 | Same 32k configuration as baseline                                |

Generation 5's 5/6 is the best observed result, not a fully comparable baseline pair: its artifacts were generated before the final 32k configuration and then rejudged with the corrected deterministic checks and judge policy. No output was truncated. The fully comparable final GLM run improves strict dev pass rate from 1/6 to 3/6 and lifecycle from 2/6 to 4/6: both are +33.3 percentage points.

## Model comparison

The final prompt and harness were held constant.

| Generator                      | Reasoning / route  |       Strict | Lifecycle | Scored mean | Model tokens | Result                              |
| ------------------------------ | ------------------ | -----------: | --------: | ----------: | -----------: | ----------------------------------- |
| `z-ai/glm-5.3`                 | medium             |          3/6 |       4/6 |        86.0 |    1,068,013 | Two validation/preview loops        |
| `openai/gpt-5.6-luna`          | high               |          3/6 |       6/6 |        89.2 |      465,542 | Selected                            |
| `deepseek/deepseek-v4.1-flash` | max, DeepInfra FP8 | 0/2 screened |       0/2 |         n/a |          n/a | Stopped after two provider timeouts |

Luna ties GLM on strict passes, completes every lifecycle, scores higher, and records 56% fewer model tokens. It is selected for the default hosted assistant path. DeepSeek's first route attempt was discarded because a strict parameter filter matched no endpoint; the corrected DeepInfra FP8 route then timed out on both screened cases after discovery and was stopped.

## Held-out result

The one complete held-out run used generation 5 with GLM-5.3: 1/6 strict, 6/6 lifecycle, scored mean 76.6. It exposed real generalization gaps in selected-entity rendering, readable timestamps, responsive wrapping, and manual `SubFetch` state ownership. One nested-envelope failure was also a benchmark defect because it required the literal `??` token; that syntax-specific check is removed, but the historical result is not retroactively promoted.

Held-out cases were not reused to claim a new sealed score after their failures informed generation 11. The interrupted generation-11 probe improved BambuBuddy from 77/fail to 85/pass and raised the nested-envelope case to 86 overall, but it is not reported as a complete held-out result.

## Product and harness changes

- Exact release/v2 prompt-bundle provenance and prompt hashing
- Production-equivalent staged tool schemas and required tool selection
- Recoverable validation, stale-template, unchanged-revision, and component-not-found metadata
- Direct persistence after complete preview evidence
- Literal expression request IDs such as `requestId={'rules'}` accepted as static IDs
- Safe normalization for common source-auth and option-name mistakes
- AST-aware deterministic checks for optional chaining, structural guards, paths, actions, and helper bindings
- Bounded malformed-judge retries and fairness policy v2
- Paired-repeat report support with Wilson intervals, bootstrap deltas, and McNemar counts
- Configurable benchmark reasoning effort and OpenRouter provider/quantization provenance

## Limits

These are single pass@1 samples, so model variance is material. The benchmark measures generated manifests and simulated preview evidence, not browser-rendered visual correctness. The held-out set was sealed for the generation-5 run but no longer sealed after its failures were analyzed. Mean scores exclude lifecycle/deterministic failures; strict pass and lifecycle rates are the primary metrics.

OpenRouter usage increased from `$25.101597031` to `$32.187875912`, or `$7.086278881`, below the approved `$10` maximum. This assumes no unrelated concurrent account usage.
