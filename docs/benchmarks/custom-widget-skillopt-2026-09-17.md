# Custom Widget AI authoring evidence — 2026-09-17

This report records the reviewed SkillOpt generations and bounded runtime and
browser checks for the current Custom Widget authoring changes. The fixtures
are synthetic. The evidence does not claim production correctness, client
hydration, live API behavior, MCP transport behavior, or persistence.

## Generation history

The reviewed skill progressed through three manually reviewed generations:

| Generation        | Source identity                                                                                                            | Result                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original baseline | `.agents/skills/homarr-custom-widget/SKILL.md`, SHA-256 `1c1ff19f27fa28fdd5139f3b02b02408606ce239f2f772ba87e809d24ae732fd` | Paired comparison baseline: hard judge 13/24 and native schema + JSX bridge 14/24.                                                                                                                                                                                                      |
| `delivery-v3`     | SHA-256 `a3690294a6aa495b0cababaaf8b5af039d158d7914255497b047fb57d08ad366`                                                 | Compare-only candidate: hard judge 16/24 and native bridge 24/24. One transport-error row was excluded from the 24-output denominator. SkillOpt kept `accepted: false`; manual review approved the compare-only adoption, backup, and receipt.                                          |
| `v3.1`            | Current worktree SHA-256 `c95e24be8e7dea732fea9c09f2e5cc7062b54bfbc69e1b091e6a39ab1865a4f4`                                | Narrow contract correction layered on v3. No model/provider comparison was run. It removes the invalid top-level `actions` shape, restores coordinated-set and ordered Workshop lifecycle guidance, and keeps the serialized skill payload at 11,409 bytes under the 12,000-byte limit. |

The v3.1 contract receipt records matching embedded and live skill hashes,
6/6 authoring-resource checks, 33/33 assistant-evaluation checks, and 2/2
coordinated-set checks in
[`v3-1-contract-check.json`](custom-widget-skillopt-2026-09-17/v3-1-contract-check.json).
The implementation is in
[`ai-prompt.ts`](../../packages/custom-widgets/src/core/ai-prompt.ts),
[`authoring-resources.ts`](../../packages/custom-widgets/src/core/authoring-resources.ts),
and the current
[`homarr-custom-widget` skill](../../.agents/skills/homarr-custom-widget/SKILL.md).

## Runtime artifact path

The initial ten-call runtime set contained eight artifact calls and two MCP
plan-only calls. No MCP tool channel was supplied, so the plan-only rows were
not counted as native artifacts. The progression was:

| Stage                          | Native-valid artifacts | Result                                                                                      |
| ------------------------------ | ---------------------: | ------------------------------------------------------------------------------------------- |
| Initial baseline arm           |                    3/4 | One create response used unsupported callback block statements.                             |
| Initial after arm (regression) |                    2/4 | The migration path lacked `/`; the assistant-repair response returned multiple JSON blocks. |
| Post-fix after, two passes     |                    6/8 | One create callback restriction and one migration default-source failure remained.          |
| Bounded repair final           |                    8/8 | Three repair calls fixed the two remaining cases; the first 6/8 results were preserved.     |

All completed runtime rows used `z-ai/glm-5.3-flash` and reported Sail Research
with confirmed `usage.cost`. The detailed request fingerprints, diagnostics,
and accounting are in the tracked
[`runtime-report.md`](custom-widget-skillopt-2026-09-17/runtime-report.md).

The final native-valid artifacts were then rendered through
`CustomJsxRenderer` and inspected in Chrome for Testing: 32/32 cases passed
across create, edit-repair, migration, and assistant-repair; loading, error,
empty, and success states; and 320px and 1024px widths. The run recorded zero
renderer failures, thrown errors, native-error markers, page errors, or
horizontal overflow. Its sanitized manifest and results are
[`runtime-render-v31-manifest.json`](custom-widget-skillopt-2026-09-17/runtime-render-v31-manifest.json)
and
[`runtime-render-v31-results.json`](custom-widget-skillopt-2026-09-17/runtime-render-v31-results.json).
The matrix used static SSR fixtures: it did not hydrate the client, boot the
production app, make live network requests, click actions, or persist a widget.

## Portable skill benchmark

The portable benchmark sent ten synthetic behavior cases once with each skill
arm, for 20 completed OpenRouter requests. It used
`z-ai/glm-5.3-flash`; all requests used Sail Research and reported confirmed
`usage.cost`.

| Skill                | Baseline |  Current | Maximum |
| -------------------- | -------: | -------: | ------: |
| `codebase-context`   |      4.0 |      6.0 |       9 |
| `documentation-sync` |      6.5 |      5.5 |       7 |
| `mcp-integration`    |      9.0 |      9.5 |      12 |
| **Total**            | **19.5** | **21.0** |  **28** |

This was one manual agent-judgment pass with half-points for partial criteria;
it was not an automated quality score. The separate literal audit found 0/28
full expected-sentence matches in both arms, and all ten cases were free of
must-not violations. Per-call responses and criteria are in the
[`portable benchmark report`](custom-widget-skillopt-2026-09-17/portable-benchmark.md),
[`portable calls`](custom-widget-skillopt-2026-09-17/portable-calls.jsonl), and
[`semantic grades`](custom-widget-skillopt-2026-09-17/portable-semantic-grades.json).

## Checks

The current-source focused regression suite passed 64/64 tests across the
Custom Widget prompt, authoring-resource, AI-evaluation, and assistant-evaluation
tests. The default Vitest loader was unavailable in this checkout because of
an external tsconfig link; the same focused files passed with the isolated
runner configuration. The v3.1 contract checks above were also recorded
separately. Focused `oxfmt`, `oxlint --quiet`, `gofmt`, and `git diff --check`
checks passed; the full repository suite, E2E suite, and production deployment
were not run for this evidence record.

## Cost accounting

The confirmed provider-reported costs attributable to the recorded suites are:

| Suite                            |   Calls or outputs |    Confirmed cost |
| -------------------------------- | -----------------: | ----------------: |
| Original-to-v3 paired comparison | 24 outputs per arm |     `$0.01517842` |
| Portable benchmark               |           20 calls |     `$0.00485737` |
| Initial runtime set              |           10 calls |     `$0.00803370` |
| Post-fix runtime repeat          |            8 calls |     `$0.00494372` |
| Bounded repair continuation      |            3 calls |     `$0.00176156` |
| **Confirmed recorded total**     |                    | **`$0.03477477`** |

At final report packaging, the shared ledger snapshot was `status: running`,
`actual_usd: $0.15157561`, `confirmed_actual_usd: $0.03477477`,
`unconfirmed_estimate_usd: $0.11680084`, `reserved_usd` and `committed_usd:
$0.69280744`, `outstanding_reserved_usd: $0`, and `cost_confidence: mixed`.
The ledger also carried `legacy_actual_usd_estimate: $0.11169939`,
`legacy_reserved_usd_uncertain: $0.65293122`, and
`legacy_uncertainty_usd: $0.54123183`. The mixed actual includes the
unconfirmed historical estimate; the reserved and legacy uncertainty fields
are accounting state and are not additional provider charges for the suites
listed above. Legacy session cost was not recomputed, and Codex agent cost was
not measured.
