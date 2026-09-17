# Custom Widget runtime benchmark — 2026-09-17

This is the runtime follow-up to the SkillOpt Custom Widget comparison. It
records model responses, native validation, bounded repair, and the ledger
accounting for the artifact prompts. The result is evidence for this fixture
set; it is not a production renderer or hydration claim.

## Configuration and scope

- Model: `z-ai/glm-5.3-flash`
- Endpoint: OpenRouter-compatible chat completions
- Configured provider route allowlist: `sail-research/fp8`, `atlas-cloud/fp8`,
  `together`, `coreweave/nvfp4`, `baseten/fp8`
- Provider reported by every completed row: `Sail Research`
- Completion reservation: 4,096 tokens per request
- Native validator: `packages/custom-widgets/scripts/validate-skillopt-response.ts`
- Artifact modes: create, edit/repair, migration, and assistant repair
- Initial runtime set: eight artifact calls plus two MCP plan-only calls
- Post-fix set: two passes for each of the four artifact modes
- Repair continuation: only the two post-fix native-invalid artifacts, at most
  two repair calls per artifact

The MCP rows were evaluated as plan-only. No MCP tool channel was supplied and
no tool was executed, so those rows do not contribute to native artifact
validity.

## Results

The initial runtime prompt exposed a useful regression: the baseline arm had
three of four native-valid artifacts while the first after arm had two of four.
The post-fix exploratory rerun improved the repeated after set to six of eight.
The bounded repair continuation then repaired both remaining cases in three
calls, producing eight of eight native-valid final artifacts.

| Stage | Artifact native valid | Artifact total | Notes |
| --- | ---: | ---: | --- |
| Initial baseline arm | 3/4 | 4 | One create response had four unsupported callback block statements |
| Initial after arm | 2/4 | 4 | Migration path lacked `/`; assistant repair returned multiple JSON blocks |
| Post-fix after, two passes | 6/8 | 8 | Create callback restriction and migration default source still failed once each |
| After bounded repair | 8/8 | 8 | Three metered repair calls; final responses passed schema and JSX validation |

The post-fix failures were retained and repaired from their exact validator
diagnostics. The create failure was
`CALLBACK_VALUE_NOT_ALLOWED` in `template`. The migration failure was
`A widget must define a default API source`. Its first repair exposed a second
native issue, an invalid `sources.default.networkScope` value; the second
repair corrected it. No failed sample was discarded or replaced by a cherry
picked successful generation.

Every final native result reports `syntax: schema-and-jsx` and
`renderer: not-run`. Renderer, browser hydration, live API, and production boot
remain outside this benchmark.

## Prompt fingerprints

These hashes make the prompt revisions and repair inputs reproducible without
checking response text into the repository. The pre-fix and post-fix prompt
source snapshots are recorded separately from the generated request hashes.

| Item | SHA-256 | Characters |
| --- | --- | ---: |
| `ai-prompt.ts` pre-fix snapshot | `dc62b3f90d8921268a795ce4c9695b44d5b5c90bb8e43787513798463799e0ee` | — |
| Live `ai-prompt.ts` at report packaging | `cc5f06eeb8775cc756d427ab88ac333d7ea1ea4c87a857a22a235617d5daee4e` | — |

| Case | Initial before prompt | Initial after prompt | Post-fix after prompt |
| --- | --- | --- | --- |
| `manifest-create` | `27365c6d367118b3eb96802f0c34f041f568d82b3a6293dfd266e2e2f980286b` | `28ae9acf9589c1f730c5fb8386872010ca241a18a9cb8174771bbca42e9aff7f` | `0da81b8d589615ea7fd0320038b534d745d3c7c71dd3f3d6ea62eaf5eea33fb1` |
| `manifest-edit-repair` | `f87746b96e2415f8cb3f972cca187e0630a08efc0c98b0cfd2a5998dd2ef32b6` | `4e321048df44b5e0b6af4346dc84aa95a138def660df158caf9077c2d5e124a4` | `5c90906d32eb50cf29162bda4580b607b97a36e7822dba895fe94c19024e9f26` |
| `manifest-migration` | `569bb1de0dd2a2d8ecfdcfff924368fa2f45a137d210d9c1ee86406d0877a219` | `69a3d818e3ea4600dbf625eac83cd10e2cf436d06f4bcfb9d33bd2ceca3f6f3c` | `2be12d3dd1fa0e3268c288be105d96db9e87092503f215516e682182962801ab` |
| `assistant-repair` | `54d165776b658d09b1d7a8ffae3248b021586f7e5bd2a75cc79550a69a2502e8` | `3c7f8d488dbbf5e250dddca0c3fb598eb0d2b33b1dfc1c299eb36484294cadce` | `e4fbedc76b4026bd234608da05e38bc8b9b1a32c61031212f4be6e611d9d4640` |

The generated request hashes are the authoritative inputs for each run. The
live source hash is listed separately because additional policy edits were
made after the post-fix requests were captured; it is not used to relabel
those earlier calls. The later shared-policy follow-up revision was source
tested by the focused suites; no model run in this report is attributed to that
later source hash.

The repair continuation used the existing `buildRepairPrompt` contract. Its
request fingerprints were:

| Case and attempt | SHA-256 | Characters | Native result |
| --- | --- | ---: | --- |
| `manifest-create`, attempt 1 | `e5446395d7b2452b85ecc38cc784f549a93a3f7759bfbb035129c0e0845ceec0` | 16,187 | valid |
| `manifest-migration`, attempt 1 | `2d15c9d00113513fd9f80692c6f6c6655344695f3de223eb4ce47d58d87b08da` | 14,192 | invalid: `networkScope` enum |
| `manifest-migration`, attempt 2 | `883ec60a9006de47cd1be9e9775f16c0350f641d0a0bc9e9f779af1b58024682` | 14,310 | valid |

## Cost accounting

All rows below were settled through the shared SkillOpt spend ledger. Each row
reported `billing_status: confirmed`, `billing_source: usage.cost`, and the
selected provider. The row sums are scoped to this runtime evidence only.

| Suite | Completed calls | Confirmed row cost |
| --- | ---: | ---: |
| Initial runtime set | 10 | `$0.00803370` |
| Post-fix artifact rerun | 8 | `$0.00494372` |
| Bounded repair continuation | 3 | `$0.00176156` |
| Runtime evidence total | 21 | `$0.01473898` |

At repair completion the shared ledger reported:

- confirmed actual: `$0.03477477`
- unconfirmed estimate carried in the ledger: `$0.11680084`
- mixed `actual_usd`: `$0.15157561`
- reserved/committed amount: `$0.69280744`
- cost confidence: `mixed`

The confirmed value is the authoritative provider-reported total available in
the ledger. The mixed actual includes earlier unconfirmed estimates, and the
reserved value includes commitment and legacy uncertainty; neither should be
described as a new provider charge for this 21-call runtime set.

## Evidence locations

The sanitized report is tracked here. Raw prompts and redacted responses stay
in the local ignored evidence directory:

- Initial rows: `.skillopt-sleep/evidence/runtime-benchmark-20260917/rows.jsonl`
- Post-fix rows: `.skillopt-sleep/evidence/runtime-benchmark-20260917/post-fix-rerun/rows.jsonl`
- Repair rows: `.skillopt-sleep/evidence/runtime-benchmark-20260917/bounded-repair/rows.jsonl`
- Repair summary: `.skillopt-sleep/evidence/runtime-benchmark-20260917/bounded-repair/summary.json`
- Pre-fix source snapshot: `.skillopt-sleep/evidence/runtime-benchmark-20260917/ai-prompt-before-fix.ts`

The focused prompt, authoring-resource, AI-evaluation, and assistant-evaluation
suites passed against the current source: four test files and 64 tests passed.
The current runtime report does not add browser or renderer evidence to that
result.
