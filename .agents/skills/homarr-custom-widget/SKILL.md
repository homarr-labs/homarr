---
name: homarr-custom-widget
description: Author, repair, preview, install, or configure Homarr Custom JSX v2 widgets through tools or an importable definition.
---

# Homarr Custom Widget

Build from verified contracts/samples and matching shipped examples; research only missing/changed contracts.
Preserve working repairs/migrations; keep credentials in Homarr.

## Context

Reuse supplied context; load only missing references:

- [schema](references/schema.md): new manifests, sources, requests, options, migration contracts.
- [runtime](references/runtime.md): response paths, manual interactions, input bindings, safe formatters.
- [security](references/security.md): auth, network access, mutations.

Use registered components. Resolve unknown names with `customWidget_findComponents`; batch details with
`customWidget_getComponents`. Full documents are only for unresolved props/diagnostics.
Reuse `contextAlreadyLoaded`; `phaseComplete` advances to the visible next phase.

## Working-app design

Use faithful numbers, rows, or charts; no quotas. Keep identities, units and missingness honest; unknown is not zero.
Ground series/history/denominators in verified data. Discover needed registered charts/helpers; verify safe props/data
grammar, not assumed callbacks/overlays. Quiet theme tokens; persistent config in options. Use supported accessible
motion/disclosure, reduced motion and keyboard/touch access. Keep facts visible; verify hover and narrow/wide host fit or
report missing evidence. Preserve repairs/migrations.

https://impeccable.style/ and https://usehallmark.com/ are app references, not marketing pages, packages, catalogs,
required tools, or API authority.

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

With requested creation/editing and available lifecycle tools:

1. Call `customWidget_previewCreate` with the complete candidate (validates manifest/JSX). Edits: `definitionId`;
   multiline Assistant JSX: `templateLines`.
2. Configure sources in Homarr. Test every returned query/simulated action once; batch independent reads. Match response
   paths/params to JSX. Live mutations require an explicit request.
3. Fix concrete diagnostics; preserve accepted behavior. Manifest changes: fresh `previewCreate`; JSX-only:
   `customWidget_previewReviseTemplate` resets evidence. Retest.
4. Save the exact tested preview: `customWidget_updateFromPreview` (edit) or `customWidget_createFromPreview` (new).
   Follow `nextAction` once; briefly report the actual saved result.

`customWidget_validateTemplate`: isolated JSX diagnostics only, never a preview prerequisite. Stop unavailable or repeatedly
stalled paths. Workshop: search/get/install, then configure sources. Schema checks prove neither rendering nor persistence.

Without tools or on an artifact request: one complete fenced `json` definition plus one `Unverified:` line naming missing
preview/renderer/persistence evidence. Successful saves need no duplicate manifest.
