# Specialist typeflow convergence: two production annotations

Read-only source review; only this new plan is written. No commands, checks, network requests, or production edits were performed.

## Evidence and ownership

The supplied `nitro-convergence-post-types-95fr3hcq/records/packages-integrations.stdout` records five Traefik diagnostics (TS2739 and four TS18046), one OpenMediaVault TS2322, and two separate Beszel fixture TS2352 diagnostics. Limit implementation to the two native-client files below.

Existing definitions were inspected: `src/traefik/traefik-types.ts:21–26` exports `TraefikResourceSummary` with four numeric counters; `src/http-auth.ts:12–17` requires `headers: Record<string, string>`. Both types are already imported at the affected sources. `src/native-clients/systems/http.ts:176` accepts an operation returning `Promise<T>`. The integrations manifest already declares its existing dependencies; these fixes add no library or import.

## 1. Traefik: select the accumulator overload

File: `packages/integrations/src/native-clients/specialists/traefik.ts:31–42`.

Change only line 32:

```diff
-  resources.reduce(
+  resources.reduce<TraefikResourceSummary>(
```

This gives the reducer accumulator and return value the existing summary type rather than the passthrough resource type, whose extra fields are `unknown`. The legacy implementation already uses this exact generic at `src/traefik/traefik-integration.ts:181`.

Keep the reducer body and `{ total: 0, enabled: 0, warnings: 0, errors: 0 }` unchanged. Every resource increments `total`; normalized `enabled`, `warning`, and `error` increment their respective counters. `disabled`, missing, and unrecognized statuses increment only `total`. These are existing aggregation seeds, not replacement values for missing API measurements. Do not change normalization, endpoint failure handling, resource selection, or add a metric.

## 2. OpenMediaVault: type the authentication-producing callback

File: `packages/integrations/src/native-clients/systems/openmediavault.ts:35–44`.

Change only line 36:

```diff
-    return await this.runAsync(async (http) => {
+    return await this.runAsync(async (http): Promise<IntegrationHttpAuthentication> => {
```

The callback annotation checks each returned object against the existing authentication contract at its source, avoiding an inferred union of header objects with opposite optional-undefined keys. No shared HTTP-client change is needed.

Preserve both branches verbatim: cookie authentication returns `Cookie` with `${session.loginToken};${session.sessionId}` and redacts that combined value plus both constituent strings; header authentication returns `X-OPENMEDIAVAULT-SESSIONID` and redacts `session.sessionId`. Retain client-bound authentication through the existing `runAsync` and `loginAsync(http)`.

Do not edit `loginAsync:163–189`: the actual parser validates `response.sessionid` with `loginSchema`, otherwise finds both existing session/login cookie names through `getSetCookie()`, rejects missing cookies with 401, and returns the existing discriminated `OmvSession`. Keep its narrowing, parser, response handling, and session-store behavior intact. No unknown-value assertion, default header, normalized parser, or new schema is required.

## Independent review and expected validation

- Production diff: exactly the two annotation edits above. No casts, `any`, suppression, DTO weakening, comments, tests, dependency changes, endpoint/query configuration, cancellation, lifecycle, or quarantine changes.
- A subsequent focused integrations typecheck should remove the six recorded production diagnostics. The two recorded Beszel fixture errors must remain visible unless their separate owner fixes them: `src/beszel/test/beszel-integration.spec.ts:96` and `src/beszel/test/beszel-session.spec.ts:113` lack Bun's required fetch `preconnect` member. Do not touch those fixtures or claim a clean package typecheck.
- A subsequent focused lint review should accept these existing-type annotations; this is an expectation, not a completed check.
- Namespace/cache/private-producer source holders and the stipulated old-69/widget/integration-89 source-count baseline remain outside the diff. No recount was performed; source counts are not runtime evidence or an 89-integration activation claim.
