# Locked-media pure decision candidates — frozen for review

Oracle accepted AUTHORITY-COMMIT-PLAN for planning/pure preparation only. This delivery writes exactly two new source files and this handoff. It changes no existing policy/index, manifest/export, API, DB/Core G, SessionUser or authority producer. It is **unexported source preparation**, not a locked/verified capability, media implementation or #113/auth completion.

## Exact candidate contracts

- `packages/auth/nitro/policy/locked-media/contracts.ts` defines `MediaGroupPermissionFacts` (userId, groupIds, readonly permission-only source rows), `MediaDeletionFacts` (id, nullable creatorId), and `MediaMutationFacts` (existing PolicyIdentity/MutationMode plus upload/delete discriminant; deletion permits undefined for an actually missing row).
- `packages/auth/nitro/policy/locked-media/decisions.ts` supplies `snapshotMediaIdentityFromGroupPermissions`, `decideMediaDeletion`, and `decideMediaMutation`.

These are **untrusted candidate input facts until supplied by the genuine future producer**. The directory name does not mean the types prove locking. There is no brand, credential verification/token/hash DTO, revision/expiry field, authority boolean, apply callback or COMMIT permit. No SQL is read or written. An allow result means only that the supplied facts satisfy the source predicate; it cannot prove their origin, currentness, selected-media identity or transaction lifetime.

### Separate expansion from already-expanded identity

`snapshotMediaIdentityFromGroupPermissions` consumes the candidate permission-only rows corresponding to `auth/callbacks.ts:10–21`: distinct groupPermission permissions INNER JOINed to the actor's actual groupMember rows. It maps the selected permissions through frozen `resolveEffectivePermissions`, with an injected `PermissionDefinitions` containing the **actual `getPermissionsWithChildren`**, then uses frozen `snapshotPolicyIdentity`. The producer must supply groupIds from that same actor's memberships; this helper neither reconstructs a join nor filters an unrelated grant list using groupIds. Supplying mismatched rows/groups is not a verified identity.

The injection reuses the existing source function, not a new permission matrix. `packages/auth/package.json` already declares `@homarr/definitions`; its existing public root and actual `src/permissions.ts:54–109` were read before coding. Type-only compiler comparison against the actual function signature passes. No runtime definitions/Common barrel is imported: it has broader graph edges not required for this pure consumer. The future producer must supply the actual function through its separately reviewed graph; a permissive replacement is not production authority. Source expansion supplies admin → media-full-all → upload/view-all and deduplicates. Everyone grants are obtained only through real membership rows, never an extra everyone-name union/default membership.

The decision helpers instead accept an **already-expanded** PolicyIdentity. They do not secretly expand raw permission arrays, requery memberships or manufacture a role. An identity containing only raw admin without source expansion is not treated as a full-all bypass. `PolicyIdentity`, its readonly permissions/groupIds, definition function and all frozen existing helpers remain unchanged.

## Source equivalence and precedence

`decideMediaMutation` calls existing `enforceMutationMode(mode, "mutation")` first, retaining outer legacy/native mutation precedence: real demo AND read-only denies before authentication/access. Upload then invokes existing `requireGlobalPermission(identity, "media-upload")`, preserving unauthenticated versus authenticated forbidden. A preview demo with read-only false remains writable according to its grants. The supplied ordinary mode must come from COMPOSITION's pinned real configuration; this pure function does not pin it or verify its origin. Frozen `prepareMediaUploadAsync`'s separate defensive ordering/body-reader fences are not replaced or modified.

`decideMediaDeletion` corresponds directly to `router/medias/media-router.ts:101–123` and the frozen `nitro/routers/-media/delete-authorization.ts`: existing `requireAuthenticated` first; actual missing row next; existing `hasGlobalPermission(identity, "media-full-all")` OR authenticated actor ID equals stored creator; otherwise forbidden. Null creator never equals a string actor ID. The outer combined decision applies demo precedence before this inner predicate. There is no direct admin/self-admin helper, filename/ID repair, visibility/grant change or integration/setup authorization.

Outcomes reuse existing `AuthorizationDecision` (`allow` or safe denial reasons unauthenticated/not-found/forbidden/demo-read-only). No transport error strings or new error policy are copied into AUTH. API alone maps the operation/reason to its existing public code/text and keeps its exact missing/non-owner precedence. DB/domain owns row selection/CAS and authority reacquisition under locks; these functions cannot turn missing SQL, lease failures or native COMMIT errors into an allow/deny result.

## Bounded validation actually performed

Every Bun invocation used `--no-env-file`; no installs, runtime auth roots, network or database execution occurred.

| Check                                                                                                                                                                               | Result                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun --no-env-file run node_modules/typescript/bin/tsc -p /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/locked-media-types.WkviB8/tsconfig.json --pretty false` | Exit 0, no diagnostics. Only two new source roots plus disposable compile proof, actual transitive type closure; repository strict options, no incremental/emission. Installed Node/Bun declarations and real node-unifi declarations resolved explicitly. No type shims, diagnostic filtering, casts or suppression. |
| `bun --no-env-file run node_modules/oxlint/bin/oxlint packages/auth/nitro/policy/locked-media/contracts.ts packages/auth/nitro/policy/locked-media/decisions.ts`                    | Exit 0, no diagnostics.                                                                                                                                                                                                                                                                                               |
| `bun --no-env-file run node_modules/oxfmt/bin/oxfmt --check packages/auth/nitro/policy/locked-media/contracts.ts packages/auth/nitro/policy/locked-media/decisions.ts`              | Pass, exactly two files.                                                                                                                                                                                                                                                                                              |
| Single `bun --no-env-file -e` controlled-fact check importing only actual new decisions and node:assert/strict                                                                      | Nine assertions passed; no persistent test file or SQL/authority fixture.                                                                                                                                                                                                                                             |

The disposable compile-only proof uses `Parameters<typeof assertMediaDeletionAuthorized>[1]` from the **actual API helper as a type-only import** and bidirectional identity-function assignments to/from `MediaDeletionFacts | undefined`. It also assigns the actual `typeof getPermissionsWithChildren` to/from the frozen `PermissionDefinitions["getPermissionsWithChildren"]`. No AUTH source imports API, and neither API nor definitions graph is runtime-evaluated for this proof. Static comparison of the inspected source branches establishes the predicate correspondence; compilation alone does not establish runtime authorization behavior.

The nine controlled-fact assertions exercise: owner allow; already-expanded full-all allow with null creator; owner without full-all/null creator forbidden; authenticated missing not-found; anonymous missing unauthenticated; upload without grant forbidden; upload with expanded full-all/upload facts allow; read-only demo denying anonymous upload first; writable preview-demo owner deletion allow. The fixed full-all array is explicitly supplied **already-expanded test data**, not a production principal or a replacement expansion implementation. The real expansion algorithm was inspected/type-compared but not executed through a broad definitions barrel. These checks prove only deterministic pure decisions, not authentic principal, SQL locks, currentness, expiry or COMMIT protection. No broad suite, speculative matrix or new repository test files were added.

The owned disposable compile proof/config were removed after checks/hash recording. Existing source/producer/G bytes were not edited or rebaselined. No environment files/current data/credentials/provider, listeners/browser/container, preserved 3100/3200/3210, Git operation or nested agents were touched.

## SHA-256 delivery evidence

`shasum -a 256` covered only the two new source files and owned disposable proof/config:

| File                                                   | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/policy/locked-media/contracts.ts` | `085ade7c64e881123d9d3272514e1c27ae40f7365d51bf21b405062f9392e5b9` |
| `packages/auth/nitro/policy/locked-media/decisions.ts` | `f4d10c9fc660b2486ce1d17e74b09342e4ea4b175cd7e1d20c43d56d6573b44d` |
| Disposable `proof.ts`                                  | `c6939e1b385e01ba92e7e0ca23097808ad26e3cd00903d475576761e71525508` |
| Disposable `tsconfig.json`                             | `30ddb7cb129cfde052fc49040b682d5f1bf9839b5350883fd70fd28eefb5e1a5` |

## Holds before consumption

Independent review must accept these exact types/decisions and source correspondence before consumption; any publication is COMPOSITION's separate manifest/export allocation. Genuine AUTH request/session origin, DB transaction-held facts, compatible protocol for every enabled authority writer, pinned demo/config/lifetime and actual native COMMIT binding remain absent. Q16/Q17 are not decided. No setup-claim/no-users locking or generic G gate was introduced.

DB reader/lock/writer-protocol implementation is still unallocated pending current import/schema freezes. G3 passing does not make media SQL ready. The accepted paired media/local-icon atomic semantics and all remaining host/session/dual-engine gates remain separate obligations. Frozen existing Auth helpers, SessionUser, API/board/media sources and central counts are unchanged.
