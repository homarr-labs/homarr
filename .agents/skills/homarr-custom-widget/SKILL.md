---
name: homarr-custom-widget
description: Author, repair, preview, install, or configure Homarr Custom JSX v2 widgets through tools or an importable definition.
---

# Homarr Custom Widget

Reuse verified samples and shipped examples. Research missing contracts; keep credentials in Homarr.

## Context

Reuse supplied context; load only missing references:

- [schema](references/schema.md): new manifests, sources, requests, options, migration contracts.
- [runtime](references/runtime.md): response paths, manual interactions, input bindings, safe formatters.
- [security](references/security.md): auth, network access, mutations.

Discover unknown names with `customWidget_findComponents`; batch details via `customWidget_getComponents`.
Reuse `contextAlreadyLoaded`; advance on `phaseComplete`.

## Working-app design

Use faithful numbers, rows or charts; no quotas. Preserve identities/units; unknown is not zero. Verify series, history,
denominators and registered chart/helper props. Use quiet theme tokens, persistent options, accessible disclosure,
reduced motion and keyboard/touch access. Keep facts visible; check hover and narrow/wide fit. Preserve repairs/migrations.

https://impeccable.style/ and https://usehallmark.com/: design references, not API authority.

## Author

- Definition: `$schema: "homarr-custom-widget-v2"`, `name`, keyed `sources`/`requests`, one JSX `template`, optional `options`.
  `sources.default` is always required, even static. HTTP: `baseUrl`, credential-free `auth`. Integrations:
  `type: "integration"`/`integrationKind`; bind a matching full-access `integrationId` before preview.
- Loads: `data.requestId`/`status.requestId`, RefreshButton, useful loading/error/empty/success states. Preserve envelopes;
  guard nullable fields. Manual SubFetch renders its result in its child callback.
- Config: `options.name`. Temporary controls: literal `bind`, default, `inputs.name` passed through manual request `params`.
  Every control affects a request or visible selection.
- JSX: one expression, registered names, concise callbacks, theme tokens, wrapping tiles. Imports, hooks, raw HTML/events,
  browser requests, arbitrary functions, statements, IIFEs, and recursion are unavailable.

## Preview and save

1. Call `customWidget_previewCreate` with the complete candidate (validates manifest/JSX). Edits: `definitionId`;
   multiline Assistant JSX: `templateLines`.
2. Configure sources in Homarr. Test every returned query/simulated action once; batch independent reads. Match response
   paths/params to JSX. Live mutations require an explicit request.
3. Fix concrete diagnostics; preserve accepted behavior. Manifest changes: fresh `previewCreate`; JSX-only:
   `customWidget_previewReviseTemplate` resets evidence. Retest.
4. With a renderer, inspect screenshots and bounds at requested sizes. Repair clipping, overlap or unwanted scrolling
   without hiding required content, then inspect again. Otherwise report visual verification missing.
5. For edits, restore unrelated `removedFromSaved` losses. `acknowledgedRemovals` must match only user-requested removals;
   this heuristic does not prove behavior was preserved. Save with `customWidget_updateFromPreview` (edit) or `customWidget_createFromPreview` (new).
   Follow `nextAction` once; briefly report the actual saved result.

`customWidget_validateTemplate`: isolated JSX diagnostics only, never a preview prerequisite. Stop unavailable or repeatedly
stalled paths. Workshop: search/get/install, then configure sources. Schema checks prove neither rendering nor persistence.

Without tools or on an artifact request: one complete fenced `json` definition plus one `Unverified:` line naming missing
preview/renderer/persistence evidence. Successful saves need no duplicate manifest.
