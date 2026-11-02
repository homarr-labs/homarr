# Frozen arena authoring contract

All five treatments receive exactly the same twelve cases and runtime context. These are new synthetic reconstructions inspired by the recovered forty-input task inventory, not historical Langfuse fixtures or grades. No live integrations, HTTP calls, external images, credentials, streams or iCal parsing exist here.

## Output

Write ONCE, using the patch tool, a raw first-attempt JSON artifact at your assignment's absolute `outputPath`. Its entire contents must be a strict JSON array of four objects: `[{"caseId":"assigned-case-id","definition":{...}}]`. Return each assigned case exactly once. Copy the complete frozen `case.definition` and change ONLY `template`. No name, description, source, request, option or other metadata changes. `template` is one JSON string, not `templateLines`.

After writing, your final reply is ONLY the small JSON acknowledgement `{"jobId":"assigned-job-id","artifact":"assigned-absolute-outputPath","caseIds":["four","assigned","case","ids"]}`. Do not repeat definitions in the final reply. Both artifact and acknowledgement are JSON only: no Markdown, prose or comments. The harness imports the untouched model-authored artifact, not the final acknowledgement or an alleged final-text definition response.

You may read common frozen contracts, your own assignment and component documentation. Do not run schema/analyzer/browser validation, request feedback, read validation results, rewrite the artifact, or retry. The first write is the only attempt. Invalid/missing artifacts remain recorded failures without repair. All five treatments follow this identical protocol.

`apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_fixtures.json` is the frozen common task source. Each entry contains `id,title,prompt,definition,responses,emptyResponses,manualParams,defaultOptions,simulation`. `responses` are decoded JSON values keyed by manifest request ID, including manual-query/action seed values. Do not invent response envelopes. Public requests are local fixture contracts, NOT claims about live service APIs. Every source is `https://arena.example.com` and is never called.

## Actual runtime

Use only the installed Custom JSX registry and analyzer. Read `packages/custom-widgets/src/core/authoring-resources.ts` (runtime/security references), `packages/custom-widgets/src/core/component-registry.ts`, and the frozen `tools/widget-arena/context.json` after prepare. The latter contains the actual installed public component reference and JSON schema, not another treatment's prompt or output. `customWidgetPreviewDefinitionSchema` validates the complete normalized definition and exact manual-request parameter names. Only supported Mantine components and registered helpers; no raw HTML, imports, hooks, arbitrary JavaScript execution, network callbacks or browser globals. Ordinary callbacks for supported collection operations are allowed. Bindings include `data`, `status`, `options`, `inputs` and the explicitly supported safe helpers. Do not assume normal React executes here.

Use `RefreshButton` for refresh, `SubFetch requestId="literal" params={{exactName: value}}` for manual queries and `ActionButton requestId="literal" params={{exactName: value}}` for actions. All confirmations and invalidation targets are frozen in the manifest. All interactions are fixture simulations. Use no image/link URL literals; render the local placeholder path supplied in camera/notification response data. No production API discovery is needed or allowed.

URI admission permits only `Image src={row.image}` from the supplied fixture row or the exact local `/images/demo-dashboard-background.svg` placeholder. No href/srcSet/poster/secondary URI attributes, protocol-relative strings, external protocols or CSS url() expressions. Do not synthesize URI strings or new image objects. This is a narrow authoring admission rule, not an adversarial sandbox; runtime fixture-only ports and the arena's navigation blocking remain necessary.

## Common measurement

Fixed logical clock `2026-11-02T12:00:00Z`; wide 640×480, narrow 360×640. Handle success, loading, error and empty for every query; manual queries start with deterministic seeded data. Do not call `Date.now()` or create current dates; use fixture timestamps. Refresh intentions are explicit simulation metadata, not promises that cacheSeconds schedules polling. Every task's content and controls remain required regardless of visual treatment. The only authored dimension is template design.

Five treatments × twelve tasks = sixty first attempts. Fifteen four-case jobs use identical case groupings across treatments. No generators have run at freeze. The finite blind schedule contains all ten unordered treatment pairs per case, 120 comparisons; missing/invalid candidates remain unavailable, never losses. Candidate/match IDs are opaque seeded UUIDs. Treatment mappings, prompts and author provenance stay in server-only packs, never the public experiment type.
