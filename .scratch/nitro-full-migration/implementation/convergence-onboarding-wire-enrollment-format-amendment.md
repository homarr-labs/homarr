# E2 — formatter-stable callback amendment

The previous approved whitespace candidate failed to persist through two patch applications; `00d269e4…` records the mismatch, not a completed format repair. The cause of the rewrite is not established. Do not repeat that candidate, modify global/project formatter configuration or bypass patch.

## Minimal source cut

Only `apps/backend/src/server/runtime-composition/runtime.ts`: replace the `authHttpPaths.map` callback's expression body with an explicit block and `return Object.freeze({ ... })`. Preserve its `(path): FetchContribution` signature, exact object fields/values, factory call, route order, array freeze, controller.handle reference and all surrounding statements. Every callback returns the same single frozen route object; this adds no callback invocation, authority, task, condition, guard, new helper or resource.

This narrowly supersedes the whitespace-only restriction for that callback. Verify the resulting source with the installed formatter; apply any layout with patch only. Assembly's accepted one-line predicate removal stays frozen at `f0d2f73f…`. All other files, original Auth9 membership/identities and runtime construction/cleanup behavior are protected.

## Gates

Original enrollment reviewer approves the semantic-equivalent callback cut before the runtime-only author. Preserve partial source and formatter-failure evidence, capture fresh source/diff/protected joins, then run focused Backend/Nitro types and E2 lint/format. Independent final exact-cut rereview precedes closing E's gate and releasing F4 preparation. No new tests, comments, dependencies, settings, native/runtime/FS/data/transport/activation permissions.
