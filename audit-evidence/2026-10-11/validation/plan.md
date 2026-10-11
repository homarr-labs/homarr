# Focused validation plan

Existing checks only, after serialized measurements finish. No new test files, broad suites, Docker or application build.

- api-node: `packages/api/src/router/test/integration/integration-router.spec.ts` (public media-search authorization/output).
- dom: `packages/auth/permissions/test/integration-query-permissions.spec.ts` (linked board permissions).
- auth-ldap-node: `packages/auth/providers/test/ldap-authorization.spec.ts` and `ldap-client.spec.ts` (authorization failures/successes and client delegation).
- custom-widgets-node: `component-registry.spec.ts`, `component-catalog.spec.ts`, `jsx-policy.spec.ts`, `runtime.spec.tsx` (supported components, security policy, bindings and required-prop behavior).
- If cache expiry is retained: existing `request-deadline.spec.ts` and `server-policy.spec.ts`, plus actual executor expiry/hit/epoch/in-flight/eviction checks in the evidence harness.
- If notebook serialization is retained: existing `read-only-task-item.spec.ts`, plus measured save/cancel/failed-save/external-refresh/task-toggle/rollback behavior.
- Owning package typechecks: API, auth, Custom Widgets and Next.js; widgets only if notebook changes.
- Changed-source oxlint/oxfmt, architecture check, complete generated catalog parity and `git diff --check`.

Invoke Vitest through pinned Node 24.18.0 and its installed entrypoint, with explicit projects and exact existing paths. Record nonzero test counts and exits. Run package scripts directly through pinned Bun 1.4.2; avoid unrelated Turbo tasks. Results are recorded separately from later PR CI status.
