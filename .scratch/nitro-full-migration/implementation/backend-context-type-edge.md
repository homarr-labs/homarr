# Backend context Auth type-edge substitution

## Frozen minimal delta

Oracle PUBLIC-CONTEXT-PLAN authorizes this consumer-only substitution following accepted pure Auth SessionUser review and COMPOSITION declaration. Before writing, verified API directly declares `@homarr/auth`, Auth declares `./nitro/context-types` → actual `./nitro/context-types.ts`, and that file exports `SessionUser`. Read `implementation/context-public-ports.md`; independent mechanical declaration review remains active and does not grant server graph acceptance.

Only checkout writes: `packages/api/src/nitro/context.ts` and this new handoff. The context delta is exactly **one type import plus two type expressions**, not three expressions:

- `import type { Session } from "@homarr/auth"` → `import type { SessionUser } from "@homarr/auth/nitro/context-types"`.
- `Readonly<Omit<Session["user"], "permissions">>` → `Readonly<Omit<SessionUser, "permissions">>`.
- `readonly Session["user"]["permissions"][number][]` → `readonly SessionUser["permissions"][number][]`.

An exact expected-text comparison proved every other source byte unchanged: anonymous/authenticated union, fields, optional/null contracts, request/setup/error/effect interfaces, revision constant and frozen `createBackendContext` function/default behavior. No other backend/spine/factory/334-row map/index, Auth source/helper, Common/Core/DB, manifest, dependency or lockfile was edited. No comments or tests were added.

| Exact context artifact                  | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| Before source                           | `3494e3f3aadfc69057a15263cb9a7c0bc6a6ab1005ff7fbcd124dcc9fd07e674` |
| After source                            | `5d497a9c2e87a31a9df914477446af03099b99097e2920692c9c5479cd4eb0a2` |
| Identical before/after Bun runtime text | `3c98624a164235eb519cf9b7f8dee7f19d3d82fa252f90057332ab880fa03ff9` |

## Retained compile-only proof

Evidence directory, retained for independent review rather than removed:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/backend-context-type-edge.rrXoz5`

Contains `context.before.ts`, `context.after.ts`, both runtime-text artifacts, `equivalence.ts`, `typecheck.log`, `context-typecheck.log`, `lint.log`, `format.log`, `proof.json` and checkout provenance. A local `node_modules` symlink permits the disposable proof to resolve the actual installed package exports; there is no paths override, mock module or stub declaration.

The retained proof imports distinct actual legacy `Session as LegacySession` from `@homarr/auth`, public `SessionUser` from its declared subpath and actual `BackendPrincipal` from the changed context. It reconstructs previous/new readonly-user shapes and verifies bidirectional assignability, strict normalized mapped-shape equality and equality with the actual authenticated principal user. Separate assertions cover exact keys, optional-key sets, readonly-key sets (every principal-user key remains readonly), permission element/array identity and readonly permissions. Strict shape equality includes each field's null/undefined union; no optional/nullable property is widened or dropped. These are compiler constraints, not value assertions, casts, `any`, fabricated users or runtime tests. Normalization preserves property modifiers while flattening the equivalent intersections.

Two installed TypeScript compiler invocations passed with exit 0 and zero diagnostics:

1. Explicit source roots: context and retained proof. **2614 listed files**, including actual legacy Auth/Next and Node/Bun declarations; type reads only.
2. Explicit source root: context alone. **2332 listed files**; distinguishes the consumer graph from the deliberately legacy-comparing proof.

Both use `env -i PATH="$PATH" HOME="$HOME" bun --no-env-file x --no-install tsc` and:

```text
--ignoreConfig --noEmit --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --esModuleInterop --resolveJsonModule --noUncheckedIndexedAccess
--types node,bun,react,react-dom --pretty false --listFiles
```

`skipLibCheck` is the accepted declaration policy, not source diagnostic filtering. Actual source roots are checked; no broad API root, producer check, install, emit or runtime evaluation was requested. Transitive compiler reads are not approval of mutable Node G/Core/DB implementations and those sources were neither evaluated nor hashed/frozen.

| Retained evidence       | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `equivalence.ts`        | `e20c3dcc26bf77ed3893a5000ad1100dee659855337ad693f84f092b8fb82c6a` |
| `typecheck.log`         | `773aca5dd26d3127a0d5539e1b36ad5765799b0537f7fb8bf05de195328fca31` |
| `context-typecheck.log` | `4539ff2638632a774864850c5669639d3d0cd3686d1e018bbbc8236916bc0d98` |
| `lint.log`              | `0dd9a55fd770619eb2f88feeb5ba7717f4ec094f96ab4de3279a116ef4688a2b` |
| `format.log`            | `67e3f4b066e72e57814326ebcb0cea1545cf4147599b691a1e57f570f4ce848d` |

Context-only `oxlint` passed with zero warnings/errors; `oxfmt --check` passed, with no formatting writes elsewhere. Both use the same clean environment and Bun env-file prohibition. No security/conservation/runtime tests were rerun.

## Runtime erasure and remaining holds

Actual `Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync` on saved before/current after source produces byte-identical runtime text with **zero imports**. Constant/function output is unchanged; no Auth root, provider or other source module was imported/evaluated. This is transpilation evidence, not execution of the context or its server graph.

The Common `FlattenError` and Common/server `DeviceType` type-only root edges remain unchanged, as do DB and Definitions type edges. The context-only compiler list still contains **294 Next/next-auth path lines**; the legacy proof list contains 349. Removing this direct Auth-root edge therefore does **not** close the transitive Next type graph. No public type-closure, host/SQL/runtime graph, session-reader or private-session acceptance follows.

No Q16/session engine/JWT choice, onboarding claim or security-policy change, permission widening, host composition, listener, mount, identity count or whole-feature closure was made. Only existing #01 is completed; this delta does not complete any additional ticket. No environment/current data/credentials/providers/network/browser/container/install/Git/nested agents were used. COMPOSITION owns declaration acceptance; Node G and all other actively mutable source scopes remain outside this frozen consumer delta.

**Frozen and relinquished for independent minimal-delta review.**
