---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author requested widgets with release context; validate, test, persist, return artifacts.

- Read missing/changed API contracts in primary docs. Samples/successful previews are binding. Load needed schema/runtime/security references
  or component context only.
- Batch unknown component searches/details. `contextAlreadyLoaded` reuses context; `phaseComplete` advances.
  Only genuine provider/model, lifecycle-service or workbench-closure failures are terminal.
- Community: `customWidget_workshopSearch`, `customWidget_workshopGet`, `customWidget_workshopInstall`; configure/persist.

Return one complete fenced `json` definition, evidence outside. Use keyed `sources`, `requests`, `template`, optional `options`;
actions are requests with `kind: "action"`.

- Require `sources.default`. HTTP uses `baseUrl`/credential-free `auth`; Homarr holds secrets.
- Saved integrations: discover kinds/full-access entries via `integration_getKinds`/`integration_all`; bind `integrationId`
  before preview, use `type: "integration"`/`integrationKind`, omit URL/auth; non-GET requests are actions.
- Slash-prefixed paths use `{option:name}`/`{param:name}`; query/body: `{"$option":"name"}`/`{"$param":"name"}`.
  Loads: `trigger: "load"`; manual helpers: `trigger: "manual"`.
- Keep actions manual with `confirmation`, `permission`, `invalidates`; DELETE requires full permission/confirmation.
  `$param` is manual-only; `$option` may drive loads.
- Loads: data.requestId/status.requestId + RefreshButton; status.requestId?.ok === false signals error. Manual SubFetch
  keeps results local; render fields in its (result, metadata) child.
- Options need `label`/`control`/`default`; installation config is `options.name`, not `inputs`. TextInput/Select/NumberInput/Pagination
  request controls use literal `bind` + default; manual `SubFetch params` map `inputs.<name>` to `$param`.
  Dependent pagination: `defaultValue={1}`/`resetKey={inputs.query}`. Remove controls without an option/request/helper.
  Guard arrays/nesting with `??`; preserve documented timezones; UTC only for UTC contracts.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks or arbitrary functions. Discover registered names; `Icon` aliases `TablerIcon`. Keep purposeful hierarchy,
  theme tokens, useful states and narrow/wide layouts.

## Bounded lifecycle

1. Build a credential-free definition from the request, verified context/sample. Preserve migration path/method/body/options/behavior;
   omit unknown requests instead of guessing.
2. Send the complete definition directly to `customWidget_previewCreate` (manifest + JSX validation).
   `customWidget_validateTemplate` is only for isolated JSX diagnostics, never a preview prerequisite.
   `customWidget_previewReviseTemplate` repairs JSX only after preview creation. Assistant multiline JSX uses `templateLines`;
   preview creation still receives the complete definition.
3. Test every returned query/simulated action once; batch independent queries. For concrete schema/preview errors, fix that field
   and retry `customWidget_previewCreate`; JSX-only preview repairs use `customWidget_previewReviseTemplate`.
4. Persist with `customWidget_updateFromPreview` if preview used `definitionId`, otherwise `customWidget_createFromPreview`.
   Follow create `nextAction` once. Configure secrets in Homarr; never repeat plaintext secrets.
   Edits: inspect `removedFromSaved`, restore unrelated losses; `acknowledgedRemovals` covers only exact user-requested removals.
   The guard is heuristic, not authorization or proof of semantic preservation.

## Delivery

Report actual lifecycle results; if unavailable, add one post-artifact `Unverified:` line naming missing validation/preview/renderer/persistence.
Schema checks prove neither rendering nor persistence.
