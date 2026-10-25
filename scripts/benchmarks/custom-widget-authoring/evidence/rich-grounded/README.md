# Grounded rich-widget authoring

One synthetic infrastructure-overview fixture, not a production quality or billing benchmark. The fixed request asks for all summary metrics, capacity, every service, incidents with friendly names and the returned history as a real chart. `response.json`, `fixture.mjs` and `prepare.mts` retain the input and prompt-generation method.

## Attempts, including failures

- Baseline `c72a2e02b`: the offline copied-prompt response asks for documentation/full response because the excerpt loses capacity, incidents and history. It does not produce a widget.
- `candidate/attempted-prompt1.md`: preserved intermediate context with only 16 of 43 observed response paths. Not accepted as complete grounding.
- `candidate/attempt2-chart-contract-missing/`: preserves the model's request for chart contracts instead of an invented chart.
- `candidate-final/`: the prompt retains all 43 observed paths and verified common-chart contracts. Its 6,380-character generated template was imported, previewed and saved unchanged through the actual assisted workflow. The app rendered all six services, 12 history rows, an SVG chart and a real refresh. **Empty-state blank/NaN values, unresolved incident IDs and an import input warning remain recorded failures.** The original is not a perfect-quality result.
- `candidate-repair-1/`: a subsequent model feedback iteration using that original prompt, artifact, exact fixture and running-app failures. It is **not** a new blinded comparison or a hand-edited output. Its provenance records input hashes; the response itself does not claim lifecycle verification.
- `repair-app/`: subsequent actual assisted creation preserved the exact 7,885-character repaired template through `createFromPreview`, with all six services, 12 history rows, real SVG/refetch, friendly incident names and clean actual fixture states. Analyzer, console and page errors were empty. There is still 6 px contained mobile chart overflow and a shared request/error scale. Concurrent source changes are recorded: this is interaction evidence, **not a source-stable timing or quality comparison**.

The model is the pinned Luna session recorded in the original provenance. No model token/cache/latency/dollar measurements were available. These attempts do not supersede the 15 failed quality judgments in the adjacent archive.

## Integrity and app evidence

`manifest.json` inventories the 34 named byte-preserved source artifacts, excluding this README and the manifest itself. Original prompts, definitions and outputs are not reformatted. The app reports record exact persistence hashes and honest fixture/viewport/console limitations; screenshots are published separately on PR #7358, not replaced with mockups or SSR output.

No credentials, captured auth headers, machine environment, generated bundles or screenshots are packaged. Local addresses and IDs refer only to isolated synthetic fixtures. `candidate-final/provenance.json` describes its prompt-source hash, not a claim that subsequent repository edits were remeasured.
