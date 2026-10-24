---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author, validate, test, and persist requested widgets.

- Read primary API docs when missing/changed. Samples and successful previews are binding; load only needed schema, runtime,
  security, or component context.
- Batch unknown component searches/details. `contextAlreadyLoaded` reuses context; `phaseComplete` advances.
- Community widgets use `customWidget_workshopSearch`, `customWidget_workshopGet`, and `customWidget_workshopInstall`;
  configure and persist.

Return one fenced `json` block with the complete definition; keep evidence prose outside it. Import requires
`"$schema": "homarr-custom-widget-v2"`, `name`, keyed `sources`/`requests`, and one JSX `template`; `description`/`options`
are optional. Actions are requests with `kind: "action"`.

- `sources.default` is required. HTTP has `baseUrl` and credential-free `auth`: `"none"`, `"bearer"`, `"basic"`, or the API-key
  objects `{"type":"apiKeyHeader","name":"X-Api-Key"}`/`{"type":"apiKeyQuery","name":"api_key"}`; `{"type":"none"}` fails import.
- Saved integrations use `type: "integration"`/`integrationKind`; discover kinds/full-access entries with
  `integration_getKinds`/`integration_all`, bind `integrationId`, omit URL/auth, and keep non-GET requests as actions.
- Paths are slash-prefixed; bind `{option:name}`/`{param:name}` in paths and `{"$option":"name"}`/`{"$param":"name"}` in
  query/body. `$param` is manual-only. Loads use `trigger: "load"`; manual helpers use `trigger: "manual"`. Actions stay manual
  and keep `confirmation`, `permission`, and `invalidates`; DELETE needs full permission.
- Load data.requestId/status.requestId with RefreshButton; status.requestId?.ok === false is error. Manual SubFetch renders its
  result in its child (result, metadata), never in data/status.
- Options (`label`, `control`, `default`) are installation config read as `options.name`; temporary controls use literal
  `bind` and `inputs.name`. Remove controls without an option/request/helper; guard arrays/nested values with `??`.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; `Icon` may alias `TablerIcon`. `component`
  is blocked; use `<Text span>`. Keep hierarchy, theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from request, verified context, and sample. Preserve a migration's API path, method,
   body, options, and behavior; omit unknown requests rather than guessing.
2. Send the complete definition directly to `customWidget_previewCreate`; it validates manifest and JSX. In the Assistant
   wrapper, multiline JSX uses `templateLines`. `customWidget_validateTemplate` is only for isolated JSX diagnostics.
3. Test every returned query/simulated action once, batching independent queries. Fix a concrete error in place: manifest
   changes need a fresh `customWidget_previewCreate`; JSX-only fixes use `customWidget_previewReviseTemplate`. Stop only for
   provider, lifecycle-service, or workbench failures.
4. Persist with `customWidget_updateFromPreview` when `previewCreate` used `definitionId`, otherwise
   `customWidget_createFromPreview`. Follow create `nextAction` once. Configure credentials in Homarr; never repeat secrets.

## Delivery

Report actual lifecycle results. If unavailable, add one post-artifact `Unverified:` line naming missing validation, preview,
renderer, or persistence. Never claim rendering/persistence from schema checks.
