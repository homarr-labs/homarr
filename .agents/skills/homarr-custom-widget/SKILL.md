---
name: homarr-custom-widget
description: Author, repair, preview, install, or configure Homarr Custom JSX v2 widgets through tools or an importable definition.
---

# Homarr Custom Widget

Build the requested widget from verified API contracts and samples. Preserve working behavior during repairs and migrations.
Use shipped examples for matching services; research only missing or changed contracts. Keep credentials in Homarr.

## Context

Reuse context already supplied by the host. Load only the missing reference:

- [schema](references/schema.md): new manifests, sources, requests, option bindings, or migration contracts.
- [runtime](references/runtime.md): response paths, manual interactions, input bindings, and safe formatting helpers.
- [security](references/security.md): authentication, network access, and mutations.

Use registered components. Batch unknown names with `customWidget_getComponents`; search with `customWidget_findComponents`
when the component name is unknown. Fetch a full component document only for an unresolved prop or concrete diagnostic.
`contextAlreadyLoaded` reuses earlier context; `phaseComplete` advances to the visible next phase.

## Author

- Include `$schema: "homarr-custom-widget-v2"`, `name`, keyed `sources`/`requests`, and one JSX `template`; `options` is optional.
  `sources.default` is required even for static widgets. HTTP sources use `baseUrl`, `networkScope`, and credential-free `auth`.
  Saved integration sources use `type: "integration"`/`integrationKind`; bind a matching full-access `integrationId` before preview.
- Load requests render `data.requestId`/`status.requestId`, with a RefreshButton and useful loading/error/empty/success states.
  Preserve response envelopes and guard nullable fields. Manual SubFetch renders its result inside its child callback.
- Options are installation config via `options.name`; temporary controls use literal `bind` plus a default and pass
  `inputs.name` through manual request `params`. Every control must affect a request or visible selection.
- Use one JSX expression, registered names, concise expression callbacks, theme tokens, and wrapping tile layouts.
  Imports, hooks, raw HTML/events, browser requests, arbitrary functions, statements, IIFEs, and recursion are unavailable.

## Preview and save

When lifecycle tools are available and creation/editing is requested:

1. Send the complete candidate directly to `customWidget_previewCreate`; it validates manifest and JSX together. Pass
   `definitionId` for an edit. Multiline JSX in the Assistant wrapper uses `templateLines`.
2. Follow source configuration requests in Homarr, then test every returned query and simulated action once; batch independent
   reads. Match response paths and parameter names to the JSX. Simulate mutations unless live execution is explicitly requested.
3. Correct concrete diagnostics while preserving accepted behavior. Manifest changes require fresh `previewCreate`; JSX-only
   corrections use `customWidget_previewReviseTemplate`, which resets evidence. Retest the corrected candidate.
4. Save the exact tested preview with `customWidget_updateFromPreview` for edits or `customWidget_createFromPreview` for new
   widgets. Follow its `nextAction` once. Report the actual saved result briefly.

For isolated JSX diagnostics, use `customWidget_validateTemplate`; it is not a preview prerequisite. If a tool is unavailable
or repeated attempts make no progress, stop that path and report the missing step. Never claim renderer or persistence proof
from schema validation. Community installs use Workshop search/get/install, then source configuration.

When tools are unavailable or the user requests an artifact, return one complete fenced `json` definition. Add one
`Unverified:` line for missing preview, renderer, or persistence evidence. A successful tool save needs no duplicate manifest.
