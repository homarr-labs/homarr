# Backend context Common type-edge cleanup

## Frozen two-line delta

Oracle-approved consumer-only cleanup follows COMPOSITION's actual `implementation/server-public-ports.md` declaration return. Before editing, read the working Common manifest and verified `./error` → `./src/error.ts` and `./request` → `./src/request.ts`, both existing actual files. API already directly declares `@homarr/common: workspace:^0.1.0`. No new dependency/library, declaration or install is needed or performed.

Only checkout writes: `packages/api/src/nitro/context.ts` and this new handoff. Exactly two TYPE-import specifiers changed:

```diff
-import type { FlattenError } from "@homarr/common";
-import type { DeviceType } from "@homarr/common/server";
+import type { FlattenError } from "@homarr/common/error";
+import type { DeviceType } from "@homarr/common/request";
```

Full-file read before and after confirms the context remains 62 lines, with only lines 2–3 changed. Line 1 and lines 4–62 are identical. Reversing these two specifier substitutions reconstructs the prior source exactly; no other text, whitespace, field or function was changed. This is source comparison, not a newly computed hash/compiler/transpiler proof.

The previously accepted `SessionUser` import and both readonly principal-user expressions are untouched. BackendPrincipal union, permissions, optional/nullable fields, setup/request/effect/error contracts, revision constant and complete `createBackendContext` freezer body/default behavior remain unchanged. No public error-policy remap or changed error return shape was introduced.

## Actual identity and reexport paths

| Type           | Previous public path                                                                       | New public path                             | Same actual definition                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FlattenError` | `@homarr/common` → `packages/common/index.ts` → `src/index.ts` → `export * from "./error"` | `@homarr/common/error` → `src/error.ts`     | Existing abstract `FlattenError extends Error`, including its private `flattenResult` and `flatten(): Record<string, unknown>`. Both paths expose the very same class declaration, not a copied structural interface. |
| `DeviceType`   | `@homarr/common/server` → `src/server.ts` → `export * from "./request"`                    | `@homarr/common/request` → `src/request.ts` | Existing alias `"console" \| "mobile" \| "tablet" \| "smarttv" \| "wearable" \| "embedded" \| undefined`. No replacement alias or device-policy copy was added.                                                       |

`src/error.ts` has no imports. `src/request.ts` still has its actual **runtime `next/server` userAgent import**, plus a type-only `./types` import. This allocation permits only the context's `import type { DeviceType }`; it does not make the request source a Next-free runtime leaf or authorize importing/invoking its runtime exports.

Narrowing these two Common barrels is intended to avoid unrelated barrel-driven UniFi type diagnostics without modifying foreign producer source. No compiler was run here, so resolution of those diagnostics and complete transitive type closure remain unverified.

## Deferred validation and runtime expectation

As explicitly requested, **no lint, typecheck, format, build, test, install or Bun runtime import/evaluation was run**. No temporary proof/test file was created and no previous evidence file was modified. Only source/manifests/handoff reads and the two allocated patches were used; no shell/hash command or network was used.

Both imports remain explicitly type-only, and all executable context text is unchanged. Expected runtime erasure is therefore unchanged zero-import context output, with identical revision constant/freezer behavior. This is a source-based expectation: **no new transpiler output or runtime-equivalence execution was computed**, and no compiler pass is claimed. Prior accepted Auth-edge evidence remains historical and untouched, not relabeled as validation of this delta. Lint/type/build validation is deferred until full migration per the user's direction.

All other backend/spine/shared procedures/errors/index/map/routers, Auth/Common/Core/DB producers, manifests/lockfiles, legacy code, host and other-owner scopes remain frozen or actively owned elsewhere. No algorithms/interfaces/comments/casts were added. No Git/nested agent/SQL/provider/environment/current-data/credentials/listener/browser/container activity occurred.

No full B/D graph, runtime Common request use, auth Q16/session engine, public error policy, current authority, host mounting, identity-count or whole-feature/ticket acceptance follows. **Frozen and relinquished for exact two-line source review.**
