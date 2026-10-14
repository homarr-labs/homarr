# Remaining fixture and portable-fetch contract plan

## Exact proposed implementation lease

Five existing files, after the coordinator releases their individual leases:

1. `packages/api/src/backup-runtime/restore.test.ts` — explicit synthetic child environment.
2. `packages/api/src/nitro/routers/-settings-setup/capabilities.ts` — request-callable type only.
3. `packages/integrations/src/beszel/test/beszel-integration.spec.ts` — truthful global-fetch mock shape.
4. `packages/integrations/src/beszel/test/beszel-session.spec.ts` — same fixture-only shape correction.
5. `packages/forms-collection/src/icon-picker/icon-picker.spec.ts` — inject the existing test producers into the pure view.

Do not edit shared TypeScript configuration, `settings-setup.mts`, the legacy fixture child helper, production IconPicker/UploadMedia components, application composition, common exports, manifests, lockfiles, declarations, or any other producer. No new tests or general-purpose helpers are needed.

This read-only discovery wrote only this report. No commands, hashes, checks, compilation, evaluation, tests, browser, SQL/native/engine work, private configuration/data access, network requests or nested agents were performed. Proposed corrections are not validated results.

## Evidence boundary

Read the recorded post-types diagnostics under `TEMP/nitro-convergence-post-types-95fr3hcq/records`: `packages-api.stdout`, `packages-integrations.stdout`, and `packages-forms-collection.stdout`. These are historical receipts of that input, not checks of this proposal.

The shared `node` / `bun` / `css-modules` visibility is the correct retained configuration. Installed Bun `1.3.10` declarations explicitly describe `fetch.preconnect` as a nonstandard Bun extension with a `void` return. Installed Vitest `4.1.10` declarations expose generic `vi.fn` and typed `mockResolvedValue`; Vitest is already a root dev dependency. No installation or dependency change is required.

Other errors in these logs belong to separate producer work. This lease neither duplicates frozen auth/schema/proxy/invites repairs nor promises that correcting its diagnostics alone makes every workspace green.

## 1. Restore child environment: one existing fixture edit

At the existing `spawnSync` call around line 418, the explicitly constructed environment contains only `PATH`; application-visible `ProcessEnv` requires `NODE_ENV`. Add `NODE_ENV: "test"` to that same child environment, preserving exactly `PATH: process.env.PATH ?? "/usr/bin:/bin"`, the command, arguments and encoding.

The suitability of `"test"` is specific to this disposable synthetic fixture: the surrounding test constructs synthetic rows and owned temporary paths; `create-legacy-fixture.mjs` accepts explicit absolute paths, validates the supplied synthetic rows and version, and does not itself select a `NODE_ENV` branch. Thus this labels a synthetic child, not a real caller environment or proof of a newly selected application test branch. Keep the existing sanitized allowlist; do not spread `process.env`, change parent environment policy, add `SKIP_ENV_VALIDATION`, or weaken global `NODE_ENV` requirements. If the coordinator's fixture policy requires a different explicit mode, resolve that policy before authoring rather than borrowing a caller's environment.

Leave archive construction, authentication/authorization resources, source/copy interfaces, migration expectations, cleanup and all existing assertions untouched. Do not create an unauthenticated production owner to repair this fixture diagnostic.

## 2. Capability fetch: portable request-callable port

`RuntimeCapabilityResources.fetch` currently uses `typeof fetch` at `capabilities.ts:14`. Its only inspected use is `resources.fetch(url, { headers, signal })` in the workshop health probe; it consumes `response.ok` and `response.status`. The capability resource does not invoke `preconnect` or any fetch namespace method. `onboard.ts` passes this resource through, and the existing disposable check injects precisely that request callable while preserving its external-call counter and URL/header assertions.

The smallest type-only change is:

```ts
readonly fetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;
```

This retains the actual ambient request arguments and response promise while no longer requiring function-object namespace properties. Native Web/Node/Bun fetch implementations can still be supplied; no JavaScript body, health probe, timeout, cancellation, call count, or error handling changes. Leave the existing mock in `settings-setup.mts` unchanged.

`@homarr/common` was searched, and its current public exports and `src/types.ts` were inspected: no reusable public FetchLike/request-callable type was found. The existing private Wazuh `FetchLike` aliases Undici fetch and is not an appropriate public dependency. `core/infrastructure/http/timeout.ts` already uses `Parameters<typeof fetch>` for its callable arguments, which is consistent with the proposed local port. Do not add a shared helper/export or substitute an Undici response contract for this global Response-based probe.

This extraction follows the installed overload's parameter/return types; it is not a claim to reproduce every possible overload of every platform. A future implementation that actually invokes fetch methods must declare those capabilities explicitly. Do not add a production no-op `preconnect`, change global fetch, or make Bun mandatory for Node-24 runtime execution.

## 3. Beszel: two actual global replacement fixtures

Unlike the injected capability port, both existing Beszel tests assign to `globalThis.fetch`. Merely narrowing a production port cannot repair those assignments. Their current `vi.fn(...) as typeof fetch` assertions incorrectly claim a function-object method that the fixture lacks.

Preserve each original `vi.fn` implementation and wrap that existing callable with `Object.assign`, attaching a real test-only mock member:

```ts
{
  preconnect: vi.fn<typeof fetch.preconnect>(),
}
```

Assign the resulting function object directly to `globalThis.fetch`, deleting the `as typeof fetch` assertion. No second assertion or double-unknown cast is needed: the request callable and the actual attached property remain structurally checked. This method exists on the test replacement only, not on the production global, its prototype, or native Node fetch.

Keep every request branch, response, realtime stream, subscription body, auth counter, issued token, assertion and original-fetch restoration exactly as written. The realtime test must retain `finally { globalThis.fetch = originalFetch; }`; the session suite must retain its captured original and `afterEach` restoration. Do not delegate mock preconnect to native fetch, which could introduce real I/O, or add an extra preconnect assertion/test. Inspected Beszel paths and their HTTP mocks perform requests, not preconnect calls; the added member is honest global-fixture compatibility, not new production behavior.

An existing alternative is `vi.stubGlobal("fetch", fetchMock)`, but its installed signature accepts `unknown`, so calling it alone does not verify a full `typeof fetch` shape. It also adds global-stub restoration bookkeeping. Prefer the explicit attached mock above for the smallest checked change with existing finalizers. Do not use stubGlobal as a universal escape hatch if an exercised method is missing; a future actual preconnect use would require a meaningful method fixture. No universal mock-Bun feature layer is warranted.

## 4. IconPicker: adapt the existing render helper, not the view

The current pure view requires `useIcons` and `canUpload`. It also requires a defined `upload` resource to show the upload action when `canUpload` is true. The test still supplies only `value`, `onChange`, and a spread `Partial<ComponentProps<typeof IconPicker>>`; its old API-client and session module mocks no longer feed this view. Supplying only a hook fixes neither upload coverage nor the permission test.

Reuse the existing fixture producers, retaining all tests and assertions:

- Inject a contextually typed `useIcons(input, options)` from the existing render helper. It must call the existing `findIconsQuery(input, options)` exactly once and return `{ ...queryResult, refetch }`. Pass the original options intact, including `enabled` and the view-provided `placeholderData`; preserve existing loading/fetching/error flags, data and every per-test mutation. Do not replace them with a constant empty result.
- Make the existing `refetch` mock implement the declared promise contract, e.g. `vi.fn<IconPickerQuery["refetch"]>().mockResolvedValue(undefined)`. Keep its existing `mockClear` and retry call-count assertion. No extra retry call or assertion.
- Derive `canUpload` from the existing fixture state: `sessionPermissions.current.includes("media-upload")`. Continue resetting that state in `beforeEach`; the existing upload case continues enabling it before render. This is a synthetic view permission resource, not new production authorization.
- Reuse `uploadSelection` as the supplied upload function with a promise returning the existing ID `"uploaded"`; its existing expected URL remains `/api/user-medias/uploaded`. Populate `upload.isPending: false`, an `isCurrentOwner` callback tied to the captured mounted fixture container, and `outcomeLabels` with explicit synthetic unknown/reconciliation-held labels. `upload.upload`, `upload.isCurrentOwner`, and `upload.outcomeLabels` are required when this resource is present; `upload.onSettled` is optional and needs no invented no-op. Do not supply a permanent production-owner callback or fake empty production resources.

The existing UploadMedia mock is a view-test producer, not a test of the real upload lifecycle. Prefer typing its existing arguments with `UploadMediaProps` and keeping its selected-media callback. If it invokes the injected upload resource, replace (do not duplicate) the old direct `uploadSelection()` call, use its returned IDs for `onSuccess`, and keep exactly one observed uploadSelection call and the same selected media. Supply actual child-state fields `loading`, `disabled`, `outcome: "idle"`, and `retryReconciliation: null`; retain current pending/owner gating. Do not claim this mocked child validates real upload ownership, transport, or reconciliation. No production UploadMedia change or new case is needed.

The helper's broad partial props are also a contract/spread bug: adding required defaults before `...props` still permits an override to replace a fixture resource with `undefined`. Restrict the existing overrides to:

```ts
Partial<Omit<IconPickerProps, keyof IconPickerResources | "onChange">>;
```

Build a checked `IconPickerProps` value with the existing value default and these presentation overrides, then provide `onChange`, `useIcons`, `canUpload` and `upload` explicitly after the spread. Existing callers override only presentation values such as `value` and `suggestedSearch`; they do not need resource overrides. Keep resource types required, without casts or optionalizing production props.

The obsolete API/auth `vi.mock` blocks can be removed as part of this same fixture adaptation: their implementations are relocated into the injected fixture bindings, and IconPicker no longer imports those module clients. Retain translation and UploadMedia mocks, fake-timer policy, debounce timing, DOM cleanup, and all render/error/direct-URL/retry/upload assertions. Mantine components, styles, visual behavior and production resource interfaces remain unchanged.

## Focused acceptance after writer freeze

The coordinator should first confirm the five-file lease is disjoint from active writes, then freeze implementation inputs and create fresh receipts. Inspect the exact diff for environment allowlisting, type-only production changes, unchanged finalizers/assertions, checked required icon resources, and absence of new casts/stubs/dependencies.

Run compiler-only checks with the installed compiler and existing sanitized baseline pattern (`--noEmit --incremental false --pretty false`, no environment-file loading): first API, integrations and forms-collection; then backend/Nitro as unchanged real-fetch composition sentinels if included in the coordinator's focused budget. Run lint and formatting checks scoped to the five leased files. No test execution, SQL fixture creation, application boot, network/integration exercise, native/engine/container checks or package install is authorized by this plan.

Accept the fixture delta only when these targeted diagnostics disappear without suppressing legitimate roots; classify residual unrelated diagnostics under their existing producer leases rather than excluding source/tests. Compiler success alone is not runtime test success. The coordinator's later combined current-input checks, not these historical logs or this unexecuted plan, determine remaining workspace greens. Keep old outputs and input manifests immutable and never relabel them as validation of a new fixture/port revision.
