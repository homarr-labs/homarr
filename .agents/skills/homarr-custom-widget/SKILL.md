---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author one widget at a time with release-matched context. Finish validation, evidence, and persistence before the next
widget, then return the artifact.

- Read primary API documentation once when it is missing or may have changed. Treat supplied samples and successful
  previews as the binding contract; load only needed schema, runtime, security, or component context.
- Search for unknown components once, batch selected details, reuse `contextAlreadyLoaded`, and do not repeat unavailable
  lookups. A provider/model rejection is terminal: record it and finish from loaded context.
- Community widgets use `customWidget_workshopSearch`, `customWidget_workshopGet`, and
  `customWidget_workshopInstall`; configure and persist before preview expires.

Return one fenced `json` block with the complete definition; keep evidence prose outside it. The definition has keyed
`sources`, `requests`, `template`, and optional `options`; actions are requests with `kind: "action"`.

- `sources.default` is required. HTTP sources have `baseUrl`, `networkScope`, and credential-free `auth`; saved sources
  use `type: "integration"` and `integrationKind`. Homarr holds credentials.
- For saved integrations, discover HTTP kinds and full-access entries with `integration_getKinds`/`integration_all`, bind
  `integrationId` before preview, omit URL/auth fields, and keep non-GET requests as actions.
- Requests use literal slash-prefixed paths. Load/current display queries use `trigger: "load"`, including option-bound
  requests read through `data`/`status` and `RefreshButton`; use `trigger: "manual"` only for explicit manual helpers.
- Actions stay manual; preserve `confirmation`, `permission`, and `invalidates`; DELETE requires full permission and
  confirmation. `$option` is for saved options; `$param` is only for manual `SubFetch`, `ActionButton`, or `ToggleSwitch`.
- Read load data from `data.requestId`, check `status.requestId?.loading` and `status.requestId?.ok === false`, and show
  loading, error, empty, and success states with `RefreshButton requestId="..."`. `SubFetch` owns manual loading/error/retry
  and receives `(result, metadata)`; map the response array, not its envelope.
- Options have `label`, `control`, and `default`; dependent controls declare a default and `resetKey={inputs.dependency}`.
  Remove controls that do not feed an option, request, or runtime helper. Guard arrays/nested values and use `??` for
  truthful fallbacks. Preserve documented timezone values; use UTC only when the contract says UTC.
- Templates are one expression: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered component names; `Icon` may alias `TablerIcon`. Keep hierarchy,
  theme tokens, useful states, and narrow/wide layouts purposeful.

## Bounded lifecycle

1. Build a credential-free definition from the request, verified context, and sample. Preserve a migration's supported API
   path, method, body, options, and visible behavior; omit unknown requests rather than guessing.
2. Use `customWidget_validateTemplate` for focused JSX diagnostics. Send source/request/option changes once to
   `customWidget_previewCreate`; use `customWidget_previewReviseTemplate` for a JSX-only correction in its session. In the
   Assistant wrapper, multiline JSX uses `templateLines` and preview creation receives the complete definition.
3. Test every returned query or simulated action once. After a validation failure, make one corrected candidate and
   revalidate. Stop when the result is incomplete, the workbench closes, or the provider/model rejects the call.
4. After a successful final preview and exact tests, call `customWidget_createFromPreview`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

Report each lifecycle call only by its actual result. If a required tool result is unavailable, add exactly one line after
the artifact beginning `Unverified:` naming the missing validation, preview, renderer, or persistence step. Never claim
rendering or persistence from schema checks alone.
