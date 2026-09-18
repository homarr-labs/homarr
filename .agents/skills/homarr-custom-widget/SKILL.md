---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author widgets with release-matched context. Research once; finish validation, evidence, and persistence before the next
widget. Finish with the artifact.

- Read primary API documentation once when it is missing or may have changed. Treat a supplied sample or successful
  preview response as the binding contract; load only the schema, runtime, security, or component context needed.
- Search for components once when a capability is unknown, then batch selected details. Reuse `contextAlreadyLoaded` and
  do not repeat an unavailable lookup.
- A provider/model rejection is a terminal call failure: record the provider, model, and valid-model error, then finish
  from loaded context. If lifecycle tools are unavailable, use the offline artifact route and mark it unverified.
- Community widget: call `customWidget_workshopSearch`, `customWidget_workshopGet`, `customWidget_workshopInstall`; configure
  securely and persist before preview expires.

Return one fenced `json` block; keep evidence prose outside it. The definition has keyed `sources`, `requests`, `template`,
and optional `options`; actions are requests with `kind: "action"`.

- `sources.default` has `baseUrl`, `networkScope`, and credential-free `auth`; Homarr holds credentials.
- Requests use a leading-slash `path`; declare `source`, `method`, and `trigger` when they differ from defaults. Load
  queries use `trigger: "load"`; manual parameterized queries and actions use `trigger: "manual"`.
- Actions stay manual; preserve `confirmation`, `permission`, and `invalidates` only when declared or required. DELETE uses
  full permission and confirmation.
- Read load data from `data.requestId`. Check `status.requestId?.loading` and `status.requestId?.ok === false`; guard
  arrays and nested fields and use `??` for truthful fallbacks. Render requested fields from the supplied contract.
- A load template shows loading, error, empty, and success states and includes `RefreshButton requestId="..."`.
  `SubFetch` is for requested manual parameterized queries; it owns loading/error/retry and receives `(result, metadata)`.
- Options have `label`, `control`, and `default`; bind with `{option:name}` or `$option`. A dependent control has its
  own default and `resetKey={inputs.dependency}`. Do not add lookup, pagination, or detail requests for omitted fields.
- Keep templates expression-only: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use registered names returned by component discovery; `Icon` is an accepted alias
  for canonical `TablerIcon`. Keep credentials and deployment values in Homarr configuration; never put tokens, keys,
  authorization values, or redacted credential placeholders in the manifest.
Use `data.items?.map(item => ...)` only after loading/error branches and provide a no-items branch. Label timestamps with
the documented source timezone; if none is documented, preserve the source value or omit any timezone label; use UTC only when the contract says UTC. Keep hierarchy, imagery, actions, and narrow/wide
layout purposeful; avoid dead controls.

## Bounded lifecycle

1. Build the credential-free definition from the request, verified context, and sample. Preserve a migration's API path,
   method, body, options, and visible behavior.
2. Call `customWidget_validateTemplate` for focused JSX diagnostics. Send source/request/option changes once to
   `customWidget_previewCreate`; use `customWidget_previewReviseTemplate` for a JSX-only correction in its session. In the
   Assistant wrapper, multiline JSX goes to `customWidget_validateTemplate` and `customWidget_previewReviseTemplate` as
   `templateLines`; `previewCreate` receives the complete definition with `template` or `templateLines`.
3. Test every returned query or simulated action once. After a validation failure, make one corrected candidate and
   revalidate. Stop when the result is incomplete, the workbench closes, or the provider/model rejects the call.
4. After a successful final preview and exact tests, call `customWidget_createFromPreview`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

For each lifecycle call, report only its actual result. If tools have no result, add one line after the artifact beginning
`Unverified:` naming the missing validation, preview, renderer, or persistence step. Do not claim rendering or persistence
from syntax or schema checks alone.
