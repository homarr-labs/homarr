---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author one widget with release-matched context; finish validation, evidence, persistence, then return artifact.

- Read primary API documentation once when it is missing or may have changed. Treat supplied samples and successful
  previews as the binding contract; load only needed schema, runtime, security, or component context.
- Search for unknown components once and batch selected details. `contextAlreadyLoaded` means reuse the earlier result and continue; `phaseComplete` advances to the next visible tool. Stop only for a genuine provider/model or closed-workbench failure.
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
- Read `data.requestId`; check `status.requestId?.loading`/`?.ok === false`; show loading/error/empty/success with
  `RefreshButton`. `SubFetch` owns manual loading/error/retry, receives `(result, metadata)`; map the response array, not envelope.
- Options have `label`, `control`, `default`; installation config is `options.name`, never `inputs`. Request-bound TextInput,
  Select, NumberInput, Pagination use literal `bind` + default and manual `SubFetch params` map `inputs.<name>` to `$param`.
  Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove controls with no option, request, or helper; guard arrays/nested with `??`;
  preserve documented timezone values; use UTC only when the contract says UTC.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; `Icon` may alias `TablerIcon`. Keep hierarchy,
  theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from the request, verified context, and sample. Preserve a migration's supported API
   path, method, body, options, and visible behavior; omit unknown requests rather than guessing.
2. Use `customWidget_validateTemplate` for focused JSX diagnostics. Send source/request/option changes once to
   `customWidget_previewCreate`; use `customWidget_previewReviseTemplate` for a JSX-only correction in its session. In the
   Assistant wrapper, multiline JSX uses `templateLines` and preview creation receives the complete definition.
3. Test every returned query or simulated action once. On a concrete schema or preview error, fix only that field, call `customWidget_validateTemplate` once to re-enter validation, then visible `customWidget_previewCreate` with the corrected definition; use `customWidget_previewReviseTemplate` only for JSX-only errors. Stop only for genuine provider/model, lifecycle-service, or workbench-closure failures.
4. After a successful final preview and exact tests, call `customWidget_createFromPreview`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

Report actual lifecycle results. If unavailable, add one post-artifact `Unverified:` line naming missing validation, preview,
renderer, or persistence. Never claim rendering/persistence from schema checks.
