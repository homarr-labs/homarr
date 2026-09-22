# Saved integration network implementation

## Scope

- Added the server-only `any` HTTP network scope for administrator-configured saved integrations.
- Saved integration requests now accept every valid resolved IPv4 or IPv6 destination, including `100.64.0.0/10`, loopback, private, link-local, reserved, multicast, and IPv4-mapped IPv6 addresses.
- Requests remain limited to HTTP and HTTPS URLs. Existing authentication and full-access authorization, same-origin and saved-path confinement, DNS pinning, redirect restrictions, trusted-certificate handling, reserved-header checks, timeouts, request/response limits, rate limits, and secret redaction remain unchanged.
- Manual Custom Widget HTTP sources deliberately retain the public/private/loopback schema and address filtering. The internal `any` scope is not accepted by Custom Widget manifests or setup input.

## Files changed

- `packages/custom-widgets/src/server/request-types.ts`
  - Added `CustomWidgetHttpNetworkScope = CustomJsxNetworkScope | "any"` for the server executor.
- `packages/custom-widgets/src/server/request-executor.ts`
- `packages/custom-widgets/src/server/index.ts`
  - Exported the server HTTP network-scope type.
- `packages/custom-widgets/src/server/network-policy.ts`
  - Allows every valid resolved IP for `any`; keeps existing classification enforcement for manual scopes and still rejects invalid resolver output.
- `packages/api/src/router/integration/integration-http.ts`
  - Assigns `any` only to connections derived from saved integrations.
- `packages/custom-widgets/src/test/server-policy.spec.ts`
- `packages/api/src/router/test/custom-widget/request-executor.spec.ts`
  - Extended existing focused scope coverage for CGNAT, link-local, and IPv4-mapped IPv6 destinations under `any`.
- `apps/docs/docs/management/custom-widgets/requests-and-security.mdx`
- `apps/docs/docs/management/api/index.mdx`
  - Documented unrestricted saved-integration destinations and the unchanged manual-source scopes.

## Validation

- `git diff --check`: passed.
- `packages/api/src/router/test/custom-widget/request-executor.spec.ts`: 17/17 passed with Node 24.18.0.
- `packages/custom-widgets/src/test/server-policy.spec.ts`: 28/28 passed with Node 24.18.0. The focused executor case now exercises the complete DNS-pinned request path with `networkScope: "any"`, confirming request validation accepts the internal scope.
- The server-policy spec was run outside the default sandbox because its existing cases bind temporary loopback HTTP servers; the sandbox run failed only with `listen EPERM`.
- Root is handling formatting separately. No broad test/build was run.
- No package manifest, lockfile, source-resolver credential behavior, stats code, or UI code was changed by this implementation.
- No commit or push was performed.

## Concurrent worktree state

Unrelated existing changes are present in stats/docs/package/workspace files and `reports/`; they were left untouched.
