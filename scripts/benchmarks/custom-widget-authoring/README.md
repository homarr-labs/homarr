# Custom-widget assistant authoring benchmark

Requires the matching Homarr checkout with its
existing dependencies installed, Node 24, `tsx`, and `mise`; adds no dependencies. `ROOT` defaults to the repository
working directory, or set it explicitly. Run directories are local synthetic fixtures, not live user data.

## Recorded results (2026-10-24)

| Prompt content                   |                     Dev `1a3df6ba3` |                          Candidate |
| -------------------------------- | ----------------------------------: | ---------------------------------: |
| Component reference              |                        43,776 chars |                       23,515 chars |
| Full widget instructions         | 60,534 chars on every admin request | 42,740 chars, only for widget work |
| Representative workbench message |                        11,996 chars |                        6,121 chars |
| Shared authoring policy          |                         7,372 chars |                       10,227 chars |

The policy deliberately spends more on concrete design guidance while the complete reference gets smaller.
`evidence/prompts-{before,after}.json` records exact revisions and source-file hashes. Reproduce with
`ROOT=/path/to/checkout node --import tsx scripts/benchmarks/custom-widget-authoring/measure-prompts.mts`.
Counts are JavaScript UTF-16 lengths, not token counts or billed savings. Production cache and dollar effects
remain unmeasured: no provider API key was available for a production-equivalent replay.
The four portable skill files match their embedded copies; serialized `getCustomWidgetSkill()` is 11,988 bytes,
below its 12,000-byte response budget. `portable-skill-cases/` retains five separate offline skill evaluation
inputs and rubrics outside the distributed skill; they are not unit tests and are not part of the CLI trial table.

The original five cases are Agify, Bored Activity, CoinMarketCap, service health and Pokédex. Each initial
variant has one run per case; later iterations have two. Generator: `openai/gpt-6-luna#max` through coding-agent
subagents. Independent judges use the repository rubric; their default model was not pinned across the
interrupted session. This is a small, adaptively tuned sample, **not a controlled or statistically significant A/B**.

| Iteration                     | Runs | Weighted judge mean | Full judge passes | Deterministic checks | Mean modeled context chars |
| ----------------------------- | ---: | ------------------: | ----------------: | -------------------: | -------------------------: |
| 1, dev prompt/runtime         |    5 |                73.2 |                 0 |                25/25 |                    714,351 |
| 1, old prompt/patched runtime |    5 |                74.6 |                 0 |                25/25 |                    641,195 |
| 2                             |   10 |                77.6 |                 0 |                49/50 |                    452,761 |
| 3                             |   10 |                78.1 |                 0 |                49/50 |                    477,822 |
| 4, rejected polish wording    |   10 |                76.1 |                 0 |                50/50 |                    459,689 |
| 5, retained wording           |   10 |                85.1 |                 1 |                50/50 |                    446,386 |

Only **1/10** final core outputs meets the full quality bar. A high weighted mean is not a pass: every category
must score at least 75, goal fulfillment at least 85, complexity discipline at least 80, the judge must choose
daily use, and there must be no fatal problems. Remaining weaknesses are visual polish, compact layouts and
manual-lookup details. Judge advisory totals/verdicts are preserved; the table recomputes weighted totals.

Dispatcharr was added separately: dev 2 runs, 9/10 deterministic checks; candidate 2 runs, 9/10. Both failures
are strict auth-representation mismatches: secure `auth.type="headers"` with an `X-API-Key` slot rather than
`apiKeyHeader`. They are retained as failures, not silently promoted. Their weighted means are 78.5 and 85.5;
neither candidate passes the full bar. Three excluded harness-incomplete attempts are also retained: two
Karakeep runs lacked integration discovery, and one Pokédex run used an unsupported fixture base-path split.
The latter was rerun after fixing fixture matching. No exclusion counts as success.

`evidence/results.json.gz` preserves all 57 attempts, including intermediate/rejected/excluded runs, public
fixture requests, generated definitions, tool counts, raw judge categories/reasons, grading and original
artifact hashes. `evidence/prompt-snapshots.json.gz` holds the six exact deduplicated system prompts by SHA-256.
The JSON is compressed only to keep the archive small; there are no production traces or secrets.

```sh
node scripts/benchmarks/custom-widget-authoring/summarize.mjs
gzip -dc scripts/benchmarks/custom-widget-authoring/evidence/results.json.gz
```

`summarize.mjs` verifies prompt hashes and recomputes rubric totals and means. The plain `evidence/summary.json`
is a quick index. Original artifact hashes identify pre-archive files; parsed JSON fields retain their values,
not their original whitespace. Core baseline prompt snapshots were generated using the then-frozen dev
checkout `fd89940fa`; the separate size measurements and running-app before screenshots use later dev `1a3df6ba3`.
Candidate-5 generation was frozen at `569ae905d`. Subsequent placement/MCP-budget fixes do not alter its shared
policy text; those route/wrapper changes are not measured by this simplified simulation.

Running-app screenshots use the exact first dev and candidate service-health outputs, the same deterministic
HTTP fixture, dark theme, 1920×1080 browser viewport and the workbench's 320/720-pixel tile controls. Only the
connection URL was configured to the loopback fixture; generated JSX was not edited. Static grading alone
does not establish visual quality; these screenshots are illustrative, not a substitute for the full rubric.

## Pinned blinded rejudging (2026-10-25)

[`evidence/consolidated-quality/`](evidence/consolidated-quality/README.md) preserves 15 pinned prompts, original
widgets, untouched judges, parser-normalized results and provenance. Baseline 5 versus candidate 10 averages
**77.8 → 85.0**, but **all 15 fail and none chooses daily use**; this is descriptive, not a controlled comparison.
Both optional-country attempts are retained: run 1 passes; run 2 handles blank/US but shows generic HTTP 422 for
invalid country, without an undefined/null-parameter error. Historical evidence above remains unchanged.

## Run

From the Homarr repository root, one example (prepare `draft.json` containing the case-specific
`{"definition": ...}` tool input, with JSX supplied as `definition.templateLines`):

```sh
export ROOT="$PWD"
export TSX_TSCONFIG_PATH="$ROOT/packages/custom-widgets/tsconfig.json"
SIM="$ROOT/scripts/benchmarks/custom-widget-authoring"
RUN="$SIM/runs/agify-name"
mise exec -- node --no-warnings --import tsx "$SIM/sim.mts" init "$RUN" agify-name full
sh "$SIM/tool.sh" "$RUN" customWidget_previewCreate < draft.json
```

Use the exact active tool names and JSON schemas printed by `init`/`call`; the example call must be active in the
checked-out harness. Fill `{{SIM}}` and `{{RUN}}` in `EXECUTOR.md` for the roleplaying agent. It reads the generated
system/user prompts, continues calling tools, and writes `final.md`. Then:

```sh
mise exec -- node --no-warnings --import tsx "$SIM/sim.mts" finish "$RUN"
mise exec -- node --experimental-import-meta-resolve --no-warnings --import tsx "$SIM/grade-sim.mts" "$RUN"
```

`finish` saves `summary.json` and `widgets.json`; `grade` writes `grading.json` and, when a widget exists,
`judge-prompt.md`. Grade a run or a directory tree of runs. An external judge may write `judge.json` using that
prompt's schema; rerun grade to include it. A grading invocation uses one `ROOT` for every run; group runs by
matching checkout. These scripts do not call a model or run a judge. Use fresh run directories: `init`
overwrites state/logs, not old grading/judge files.

Outside the repo, set `ROOT` to its absolute path and resolve the existing `tsx` loader from that checkout;
`tool.sh` does this automatically and reads `ROOT` from the run's `meta.json`, not the caller's environment.
Grading requires `--experimental-import-meta-resolve` so rendering resolves ESM dependencies from `ROOT`;
without it Node ignores the resolver's parent argument. Keep this flag to avoid mixing CJS/ESM runtime contexts.
The explicit `TSX_TSCONFIG_PATH` preserves the checkout's automatic JSX transform when called outside its package.

## Imports and boundaries

- `sim.mts` imports the real `ai-assistant-evaluation.ts` state/tool executor, active definitions, lifecycle and
  efficiency checks; `CUSTOM_WIDGET_AI_EVALUATION_CASES`; `appendActiveCustomWidgetToolInstruction`; the chat
  `customWidgetAssistantInstructions` and tool-output compaction helpers. No lifecycle logic is reimplemented.
- The base prompt is extracted from the literal in `route.ts`, not by invoking the route. Request context is
  fixed synthetic data. Cases clear `preferredExampleId` and include their supplied API samples in the user prompt.
  `full` includes the custom-widget reference; `gated-off` omits that reference only. It is not a separate production
  route configuration. The checkout must retain the expected literal layout and exports.
- Only tools implemented and active in the imported evaluation harness are callable. This is not the complete
  production tool registry, authorization, database, network or MCP environment. Unknown/inactive tools fail.
  Fixture matching, case sample-response fallbacks, and failed unknown-fixture responses remain exactly as
  implemented by that checkout. The CLI adds no success fallback and never replaces failure evidence.
- `grade-sim.mts` uses `getDeterministicEvaluationSuiteIssues`, `buildJudgePrompt`,
  `getAssistantEvaluationPreviewResponse`, and `getWeightedJudgeTotal` when exported (not exported by the
  validation checkout, so the original fixed weights apply). It checks persistence count, lifecycle,
  deterministic contract, and render safety. Efficiency
  issues are reported, not a separate passing gate. Existing judge JSON is parsed, not schema-validated; invalid
  JSON is treated as absent. The judge gate uses category thresholds/daily-use/fatal findings, not its verdict field.
- `render.mts` exports only `renderWidget`, `runtimeError`, and `textContent`. It uses the real React/Mantine,
  Custom JSX renderer/bindings and runtime provider in static server rendering. Its port returns null success data,
  confirms actions, and otherwise does nothing; icons are suppressed. It does not exercise browser interaction,
  actual requests, layout, themes, responsiveness or accessibility. Grade renders only the first widget and only
  load-triggered queries, with success, loading and failed states; empty state is not separately rendered. The
  success render synthesizes HTTP 200 statuses and does not prove upstream success. Its fixture helper may fall
  back to the case's sample response or undefined; this is distinct from tool-executor failure evidence.
  Runtime safety is not a visual-quality judgment.

## Measurement limits

This is **CLI roleplay directional evidence**, not full production model/API/cache/latency/cost equivalence.
The host model, its hidden context and execution environment can differ from Homarr's assistant. No model-token,
prompt-cache, timing or billing measurements are collected.

`cumulativeContextChars` sums the fixed system/user string lengths plus prior tool-input/output string lengths
at each tool step and one final step. It **excludes tool schemas, step instructions, reasoning, assistant prose
(including final.md), executor instructions and the agent harness**. Any earlier claim that schemas were counted
was incorrect. Lengths are JavaScript UTF-16 code units, not tokens. Logged input/output text is truncated to
20,000/4,000 characters, but their counters use full lengths; logged active names describe the state after a call.

`SOURCE-PROVENANCE.json` records SHA-256 hashes of the five unmodified scratch originals and the adaptation
scope. Keep it with trial artifacts; also record the exact `ROOT` revision and local changes for each trial.
No Langfuse payloads are fetched or included.
