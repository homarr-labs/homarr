---
name: homarr-custom-widget
description: Author, validate, preview, test, install, or configure API-backed Homarr Custom JSX v2 widgets.
---

# Homarr Custom Widget

Author one widget or a coordinated set. Finish each widget's evidence and persistence before starting the next; use one
shared research pass for a set. Finish with the artifact and a short evidence boundary.

## Choose the route

- Read primary API documentation once when it is missing or may have changed. Treat a supplied sample or successful
  preview response as the binding contract; load only the schema, runtime, security, or component context needed.
- Search for components once when a capability is unknown, then batch selected details. Reuse `contextAlreadyLoaded` and
  do not repeat an unavailable lookup.
- A provider/model rejection is a terminal call failure: record the provider, model, and valid-model error, then finish
  from loaded context. If lifecycle tools are unavailable, use the offline artifact route and mark it unverified.
- For a community widget, call `customWidget_workshopSearch`, `customWidget_workshopGet`, then
  `customWidget_workshopInstall`; configure its source securely. Preview configuration expires, so persist before it does.

## Artifact contract

For the current widget, return exactly one fenced `json` block; keep evidence prose outside the fence. The definition has
keyed `sources`, `requests`, a `template`, and optional `options` when needed. Actions are requests with `kind: "action"`;
there is no top-level `actions` field.

- `sources.default` has `baseUrl`, `networkScope` (`public`, `private`, or `loopback`), and credential-free `auth`.
  Auth is `none`, `bearer`, `basic`, or an `apiKeyHeader`/`apiKeyQuery` object containing only its `name`; Homarr holds
  the credential.
- Requests use a leading-slash `path`; declare `source`, `method`, and `trigger` when they differ from defaults. Load
  queries use `trigger: "load"`; manual parameterized queries and actions use `trigger: "manual"`.
- Read load data from `data.requestId`. Check `status.requestId?.loading` and `status.requestId?.ok === false`; guard
  arrays and nested fields and use `??` for truthful fallbacks. Render requested fields from the supplied contract.
- A load template shows loading, error, empty, and success states and includes `RefreshButton requestId="..."`.
  `SubFetch` is for requested manual parameterized queries; it owns loading/error/retry and receives `(result, metadata)`.
- Options have `label`, `control`, and `default`; bind with `{option:name}` or `$option`. A dependent control has its
  own default and `resetKey={inputs.dependency}`. Do not add lookup, pagination, or detail requests for omitted fields.
- Keep templates expression-only: no imports, hooks, refs, raw HTML/events, browser requests, eval, recursion, IIFEs,
  statement blocks, or arbitrary functions. Use named `Icon` or `TablerIcon`. Keep credentials and deployment values in
  Homarr configuration; never put tokens, keys, authorization values, or redacted credential placeholders in the manifest.

Minimum shape: include `$schema`, `sources.default`, `requests`, and `template`; actions live under `requests` with `kind: "action"`.

Use `data.items?.map(item => ...)` only after loading/error branches and provide a no-items branch. Label timestamps with
the source timezone when known. Keep hierarchy, imagery, actions, and narrow/wide layout purposeful; avoid dead controls.

## Bounded lifecycle

1. Build the credential-free definition from the request, verified context, and sample. Preserve a migration's API path,
   method, body, options, and visible behavior.
2. Call `customWidget_validateTemplate` for focused JSX diagnostics. Send source/request/option changes once to
   `customWidget_previewCreate`; use `customWidget_previewReviseTemplate` for a JSX-only correction in its session.
3. Test every returned query or simulated action once. After a validation failure, make one corrected candidate and
   revalidate. Stop when the result is incomplete, the workbench closes, or the provider/model rejects the call.
4. After a successful final preview and exact tests, call `customWidget_createFromPreview`; configure private URLs and
   credentials through Homarr and never repeat plaintext secrets.

## Delivery

For each lifecycle call, report only its actual result. If tools have no result, add one line after the artifact beginning
`Unverified:` naming the missing validation, preview, renderer, or persistence step. Do not claim rendering or persistence
from syntax or schema checks alone.
