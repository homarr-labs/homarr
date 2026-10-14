# Auth context type leaf — candidate for narrow review

Added only `packages/auth/nitro/context-types.ts` and this handoff. The leaf exports **only `SessionUser`**, equivalent to the current augmented `@homarr/auth` `Session["user"]`. No consumer, API context, auth root, manifest, provider, session, configuration, policy, board source or authority was changed. COMPOSITION must accept and declare the public type entrypoint before substitution/consumption. Production auth selection and Q16 remain open; this is not an auth feature completion.

## Actual source shape

`packages/auth/index.ts:2,10–17` uses the actual `DefaultSession` from `@auth/core/types` and augments next-auth with `{ id: string; permissions: GroupPermissionKey[]; colorScheme: ColorScheme } & DefaultSession["user"]`. The candidate uses the same intersection, in the opposite operand order, with both imports explicitly type-only.

Installed Auth Core **0.41.3** `types.d.ts:204–223` declares `DefaultSession.user?: User`; `User extends DefaultUser`, whose fields are `id?: string`, `name?: string | null`, `email?: string | null`, `image?: string | null`. The intersection makes the user's ID required; name/email/image remain optional and nullable. Indexed reads of each optional field have type `string | null | undefined`. The result is not a nullable/optional user object, a stored-user DTO, a new Session interface or an auth verifier.

`permissions` remains a **required mutable `GroupPermissionKey[]`**, not a readonly array on the leaf. `colorScheme` remains the actual public `ColorScheme` type. Neither permission nor color unions were duplicated. Existing `packages/api/src/nitro/context.ts:9–16` separately applies `Readonly<Omit<Session["user"], "permissions">>` and supplies a readonly permission array within its anonymous/authenticated discriminated union; that existing transform was verified unchanged against the leaf, not moved into it.

Dependencies were checked before writing: `packages/auth/package.json` already declares `@auth/core`, `@homarr/definitions` and TypeScript. Auth Core declares `./types`; definitions declares its public root. No dependency, manifest or broader runtime export was added. Per exhausted Context7/no-network constraints, the actual installed first-party declaration and legacy augmentation were consulted rather than a newer documentation shape.

## Compile-only equivalence proof

An explicitly owned disposable directory under the approved OpenCode temporary root held `equivalence.ts` and `tsconfig.json`. No unit/test file was added to the repository. The proof imports the **actual** `Session` type through `@homarr/auth`, the new local leaf, and the actual `BackendPrincipal` from the unchanged API context. Its temporary public-auth resolution points directly at the existing declared `packages/auth/index.ts`; it does not shim or reproduce the augmentation. Its candidate principal is exactly the existing anonymous/authenticated transform with only `SessionUser` substituted.

Four strict function assignments compile both directions, without casts:

```ts
const toLegacy: (user: SessionUser) => Session["user"] = (user) => user;
const toCandidate: (user: Session["user"]) => SessionUser = (user) => user;
const toExistingPrincipal: (
  principal: CandidatePrincipal,
) => BackendPrincipal = (principal) => principal;
const toCandidatePrincipal: (
  principal: BackendPrincipal,
) => CandidatePrincipal = (principal) => principal;
```

The same disposable file uses symmetric generic conditional equality assertions (`Assert<T extends true>`) to verify:

- `keyof SessionUser` equals actual legacy keys and exactly `id | permissions | colorScheme | name | email | image`.
- Optional keys equal the actual legacy optional keys and exactly `name | email | image`.
- All mapped field types equal their actual legacy counterparts; permission arrays equal exactly.
- Each name/email/image indexed type equals `string | null | undefined`.
- The complete candidate principal and authenticated readonly user equal the actual existing API types, including the readonly permission element/array transformation.

No assignment assertion, `any`, shape cast, extra field, copied permission union, declaration shim or filtered compiler diagnostics was used.

### Compiler results and limits

Command: `bun --no-env-file run node_modules/typescript/bin/tsc -p /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-context-types.wNswjX/tsconfig.json --pretty false`.

**Repository-strict equivalence pass:** exit 0, no diagnostics. The temporary config extends the actual repository `tooling/typescript/base.json`, retains `strict: true` and existing declaration-check policy, disables incremental/emission, and has only the proof file as its explicit root. It loads installed Node/Bun declarations with an explicit real typeRoots path and resolves the existing installed `@types/node-unifi` declaration to avoid inherited temporary `${configDir}` ambiguity. It checks the real transitive type closure required to resolve the actual legacy augmentation/API principal; it does not execute that closure or run the broad auth package suite.

**Additional stricter-mode probe did not pass:** adding `exactOptionalPropertyTypes: true` (not enabled in the repository base) reported transitive diagnostics, with no candidate/proof diagnostic, at:

- Auth: `callbacks.ts:39`, `configuration.ts:105`, LDAP authorization `:91`, OIDC provider `:57`.
- Common: Octokit handler `:28`, response error `:10`.
- Core: SQLite driver `:18`, DB scope `:258`, HTTP request `:69,101`, Redis client `:14`.
- Custom widgets: assistant placement `:321`, request schema `:224`, secret requirements `:24,25`, source setup `:67,68`, JSX analyzer `:166`.
- DB: transaction gate `:315`; definitions: assistant `:169`; validation form i18n `:25,26,27,35`.

Those errors concern explicit undefined on optional fields/options and incompatible optional-property assignments in existing transitive source. They were not filtered, suppressed or repaired. The successful proof was rerun under the actual repository strict options, without this additional mode override; exact key/optional/nullability assertions remain in that proof. Do not interpret its pass as whole-closure compatibility with `exactOptionalPropertyTypes`, runtime graph approval or a stability certificate for active workers.

## Runtime erasure and owned static checks

The leaf has two `import type` declarations and one `export type`; **zero runtime imports, values, initializers or module augmentation**. It never imports the auth root, session, provider, env or configuration even for its own type definition.

Compile-only erasure command: `bun --no-env-file build packages/auth/nitro/context-types.ts --target=bun --external='*' --outdir=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-context-types.wNswjX/erasure`.

Result: one module, 8-byte `context-types.js` containing only Bun's generated `// @bun` marker; no import/export/runtime statement. All dependencies were externalized; no dependency graph or generated output was executed. This is erasure evidence only, not a runtime auth check. No mutable Core/G file was evaluated or hashed.

- `bun --no-env-file run node_modules/oxlint/bin/oxlint packages/auth/nitro/context-types.ts` — exit 0, no diagnostics.
- `bun --no-env-file run node_modules/oxfmt/bin/oxfmt --check packages/auth/nitro/context-types.ts` — pass, one file.

Every Bun invocation disabled env-file loading. No runtime test, SQL fixture, listener, environment/appdata/credential/provider/network/browser/container, install, Git mutation or nested agent was used. The disposable proof/config/generated output were removed after recording their hashes; no persistent extra check/config file remains.

## SHA-256 evidence

`shasum -a 256` hashed only the new leaf and owned disposable proof/config/erasure output, never mutable Core/G source:

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/auth/nitro/context-types.ts`             | `f6288524ace2573e18a5ef6a2d80a839075ab9bae2e37fbc7c635bbc69a894c6` |
| Disposable `equivalence.ts`                        | `40d9b49a17e6573629ad32f8fb02f7e9f2dfecc8391821acef1c3b6f7af92a2b` |
| Disposable final repository-strict `tsconfig.json` | `d264bec9dcde04457939c2460d4a9ebd5a8b797a2d3d6bfeb3d841b6f64b13b3` |
| Disposable `erasure/context-types.js`              | `eaba70e8bd1ab5647a2ff80bc15b27b0d5624c43fd3868598a80e5cc5f732eb2` |

Frozen candidate leaf awaits independent type/boundary review. Only after equivalence acceptance may COMPOSITION declare the narrow public entrypoint and a separately allocated spine owner substitute its type import. No auth engine, session strategy or production authority is selected, and the nine prepared board sources and held identities remain unchanged.
