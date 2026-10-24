# Pinned blinded quality evidence

This archive retains all 15 existing core outputs: five iteration-1 `dev` baselines and ten iteration-5
`cand` outputs across the same five cases. The pinned judge is `openai/gpt-6-luna#max`, with rubric source
revision `1677c940c`. Blinded labels are `w01`–`w15`; each artifact has one review, grouped by case, not an
independent multi-judge panel. This small, adaptively selected sample is **descriptive only**, not a controlled
or statistically significant A/B result. No new generation or judging was performed for this archive.

| Case                 | Baseline (1) | Candidate (2) |
| -------------------- | -----------: | ------------: |
| Agify                |           78 |            83 |
| Bored Activity       |           77 |            87 |
| CoinMarketCap        |           80 |            85 |
| Service health       |           81 |          86.5 |
| Pokédex              |           73 |          83.5 |
| **Overall (5 / 10)** |     **77.8** |      **85.0** |

These means use `parseJudgeResult` from `packages/custom-widgets/scripts/ai-evaluation.ts`, not advisory
totals. **All 15 advisory verdicts and all 15 normalized verdicts fail; none chooses `would-use-daily`.**
A +7.2-point mean improvement is not acceptance. Candidate visual quality still averages 71.8, and `w09`
retains a fatal narrow-tile finding. Historical benchmark evidence is not replaced or rewritten.

## Contents and integrity

- `map.json` and `aggregate.json` are exact copies of the pinned mapping and normalized per-case/overall
  aggregate. The aggregate records the evaluator source SHA-256.
- `blinded/w01/` through `blinded/w15/` each retain the exact `prompt.md`, original single-element
  `widgets.json`, untouched `judge.json`, and original `normalized.json` wrapper containing `parseJudgeResult`
  output. The mapping's widget hash is SHA-256 of `JSON.stringify(widgets[0])`, not the raw array file bytes.
- `optional-params/run-{1,2}/` retain both original widget arrays and deterministic `grading.json` files.
  `optional-params/interactions/` retains the request summary, definition integrity and an abridged outcome.
- `provenance.json` records logical source locations, original hashes, byte-preserving copies and the exact
  source-line selection for the abridged outcome. Machine-specific source-root paths are not needed or
  included; no copied prompt, definition, judge, normalized result or aggregate was rewritten.
- `manifest.json` inventories SHA-256 and byte length for every other file in this directory. Its own hash
  is reported separately when the archive is verified, avoiding a self-referential checksum.

Verification checks every archived file against the manifest and its original source, every pinned prompt
and widget hash, inclusion of the exact original widget JSON in its judge prompt, all 15 results against
`parseJudgeResult`, and all per-case/overall aggregate calculations. No bundles, logs, credentials or
screenshots are packaged.

## Optional-country running-app outcome

Both generated attempts passed the five deterministic checks; neither has a quality judge. These checks
did **not** catch run 2's interaction failure, which remains in the archive:

- **Run 1 passes:** blank country omits the country parameter, `US` works, and invalid `U` or an explicit
  overlength `USA` input event hides the trigger and shows actionable two-letter guidance without a request.
- **Run 2 only partially passes:** blank country and `US` work, but invalid `U` / explicit `USA` events submit
  a request and show generic `HTTP 422: Unprocessable Entity`, despite actionable guidance in the upstream
  response. Normal three-letter entry is separately constrained to `US` by native `maxLength=2` in both runs.
- Neither run showed an undefined/null invocation-parameter error. Both definitions and templates were
  unchanged apart from the UI-configured transport URL pointing at the synthetic loopback fixture; no live
  Agify call or real API credential was used. Serialization metadata mentioning `undefined` is not a parameter
  failure.

Running-app screenshots remain outside the repository in the existing scratch evidence. No published
screenshot URL was supplied, so none is invented or linked here; uploaded evidence belongs on the pull request.
