---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author requested widgets with release context; validate, test, persist, and return artifacts.

- Read primary API docs when missing/changed. Samples and successful previews are binding; load only needed schema, runtime,
  security, or component context.
- Batch unknown component searches/details. `contextAlreadyLoaded` reuses context; `phaseComplete` advances. Stop only for
  genuine provider/model, lifecycle-service, or workbench-closure failure.
- Community widgets use `customWidget_workshopSearch`, `customWidget_workshopGet`, and
  `customWidget_workshopInstall`; configure and persist.

Return one fenced `json` block with the complete definition; keep evidence prose outside it. The definition has keyed
`sources`, `requests`, `template`, and optional `options`; actions are requests with `kind: "action"`.

- `sources.default` is required. HTTP has `baseUrl`, `networkScope`, and credential-free `auth`; localhost/loopback requires
  `networkScope: "loopback"`; never widen an explicit scope. Saved sources use `type: "integration"`/`integrationKind`;
  Homarr holds credentials.
- Saved integrations: discover kinds/full-access entries with `integration_getKinds`/`integration_all`, bind `integrationId`
  before preview, omit URL/auth, and keep non-GET requests as actions.
- Paths are slash-prefixed: strings use `{option:name}`/`{param:name}`; query/body uses `{"$option":"name"}`/`{"$param":"name"}`.
  Loads use `trigger: "load"`; manual helpers use `trigger: "manual"`.
- Actions stay manual; preserve `confirmation`, `permission`, and `invalidates`; DELETE requires full permission/confirmation.
  `$param` is manual-only; `$option` may drive loads.
- Load data.requestId/status.requestId with RefreshButton; status.requestId?.ok === false is error. Manual SubFetch never
  populates data/status; its child receives (result, metadata) and renders its fields.
- Options have `label`, `control`, `default`; installation config is `options.name`, never `inputs`. Request-bound TextInput,
  Select, NumberInput, Pagination use literal `bind` + default and manual `SubFetch params` map `inputs.<name>` to `$param`.
  Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove controls without an option/request/helper; guard arrays/nested with `??`;
  preserve documented timezone values; use UTC only when the contract says UTC.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; `Icon` may alias `TablerIcon`. Keep hierarchy,
  theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from request, verified context, and sample. Preserve a migration's API path, method,
   body, options, and behavior; omit unknown requests rather than guessing.
2. Use `customWidget_validateTemplate` for JSX diagnostics. Send source/request/option changes once to
   `customWidget_previewCreate`; use `customWidget_previewReviseTemplate` for JSX-only corrections. In the Assistant wrapper,
   multiline JSX uses `templateLines` and preview creation receives the complete definition.
3. Test every returned query/simulated action once. On a concrete schema/preview error, fix only that field, call
   `customWidget_validateTemplate` once, then visible `customWidget_previewCreate` with the corrected definition; use
   `customWidget_previewReviseTemplate` only for JSX errors. Stop only for genuine provider/model, lifecycle-service, or
   workbench-closure failure.
4. If `previewCreate` used `definitionId`, persist with `customWidget_updateFromPreview`; otherwise use
   `customWidget_createFromPreview`. Follow create `nextAction` once. Configure credentials in Homarr; never repeat plaintext
   secrets.

## Delivery

Report actual lifecycle results. If unavailable, add one post-artifact `Unverified:` line naming missing validation, preview,
renderer, or persistence. Never claim rendering/persistence from schema checks.
