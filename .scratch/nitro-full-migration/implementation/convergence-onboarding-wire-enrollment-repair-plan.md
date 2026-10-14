# E2 — caller freeze-order and formatting repair

Source-only two-file repair plan. The original E2 generation `645cc969…` is frozen; Backend/Nitro types and lint pass at `nitro-onboarding-wire-enrollment-checks-rxdrtc2i`, while format reports only `runtime.ts`. Lifecycle/ownership is source-accepted. Security review withholds acceptance on the deterministic assembly/Application freeze-order incompatibility.

## Exact cuts

- In `apps/backend/src/server/runtime-composition/assembly.ts`, remove only `!Object.isFrozen(route.access)` from the onboarding-route precondition. Genuine C routes are shallow-frozen; their public access objects are frozen by Application after own-data and membership validation. Keep route/array freezing, public access kind, owner assertion, reference identity, exact paths/methods, collision and final reassertion checks unchanged. Do not mutate C routes, change Application's freeze, or accept an alternate controller.
- In `apps/backend/src/server/runtime-composition/runtime.ts`, apply formatter-equivalent whitespace/layout corrections only. Obtain a formatter preview on a fresh private source copy if needed, then apply the source edits with patch; no broad formatting or semantic cleanup. Controller construction/failure settlement is unchanged.

The source-established adverse path is genuine C route construction → assembly rejects its unfrozen access → Application's existing freeze is never reached. Source-only review repairs are appropriate here; executed red/green reproduction and regression phases are explicitly deferred because Application/native startup remains unreleased and no tests were requested. Static checks and source acceptance do not establish runtime success.

## Gates

Original security reviewer approves this exact cut. One author owns only these two paths, preserves all old receipts and captures new diffs/protected joins. Fresh Backend/Nitro types and two-file lint/format plus independent exact-cut rereview follow the new freeze. No Auth/DB/API/Application/entry/client changes, tests, comments, dependencies, runtime/native/fixture/FS/restore/cutover permissions or stronger transport acceptance.
