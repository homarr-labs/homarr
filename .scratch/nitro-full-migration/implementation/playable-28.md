# PLAYABLE-WAVE32 lane28 — Q18 principal grants

## Exclusive write inventory declared before implementation

- `packages/api/src/nitro/routers/-widgets/helpers.ts`
- `packages/api/src/nitro/routers/-widgets/resources.ts`
- `packages/api/src/nitro/routers/-integration-management/access.ts`
- `packages/api/src/nitro/routers/-integration-operations/helpers.ts`
- New `packages/api/src/nitro/routers/-resource-authority/repository.ts` (absent at admission)
- This handoff: `.scratch/nitro-full-migration/implementation/playable-28.md`

## Frozen consumed contracts / original specifications

- Authoritative `PLAYABLE-WAVE32.md:59–76`, `Q16-Q18-PRODUCTION-JOINS.md §J4`, `DESIGN.md Q18`.
- `packages/auth/nitro/policy/{identity,resources,index}.ts`: `PolicyIdentity`, `snapshotPolicyIdentity`, `ResourceGrants`, `ResourceAuthorizationRepository`, `constructIntegrationPermissions`, `decideBoardAccess`, `hasQueryAccessToIntegrationsAsync`. Principal-ID defensive filtering and public/owned/granted-board query fallback remain unchanged.
- `packages/api/src/nitro/context.ts`: actual `BackendPrincipal` / `BackendContext`; no fabricated identity/profile.
- `packages/api/src/nitro/routers/-integration-management/resources.ts`: `IntegrationManagementSnapshot` (`db`, authenticated `principal`, `assertCurrentAsync`, `releaseAsync`).
- `packages/api/src/nitro/routers/-integration-operations/resources.ts`: existing repository selection slot and explicit unbound write/HTTP holds.
- `packages/db/runtime.ts`: consume only existing `PersistenceRuntime.engine`, `boundedTransactionSync(operation, synchronousCallback)`, `boundedSnapshotAsync(operation, asyncCallback)` signatures; no lane26 establishment addition consumed. `BoundedTransactionOperation` has `signal`, `lifetime`, `deadlineAt`.
- `packages/db/{driver.ts,schema/sqlite.ts,schema/postgresql.ts}`: existing native database types and Integration, grants, membership, placement, Board tables/relations. No schema/runtime edit.
- Original `packages/api/src/middlewares/integration.ts`, `packages/auth/permissions/{integration-permissions,integration-query-permissions}.ts`: original one/many cardinality/errors/kinds/projections and query delegation; legacy foreign-user aggregation is deliberately repaired, not claimed equivalent.
- Frozen `packages/api/src/nitro/routers/{widgets,integration,integration-operations,custom-widget}.ts`: actual leaf bodies remain read-only, including query-authorized refresh/demo guards.
- Existing API declarations already include Auth, DB, definitions, oRPC, SuperJSON, Zod and Drizzle. Installed Drizzle relational declarations verify SQLite `.sync()` and PostgreSQL awaited relation reads. No manifest/lock/export changes requested during implementation.

## Holds

Read coherence is not mutation authority or credential admission. Existing private production guards, unbound writers/native resources and no-mount decisions remain. No active lane26/27 source, dependency installation, Git mutation, child agents, new tests, credentials, live data or listeners are authorized.

## Implemented source repair — frozen for review

- Widget one/many integration selection now uses the actual native SQL repository snapshot, including app, encrypted secrets, placement links, grant IDs and relevant Board evidence. Direct grants are SQL-selected for the actual user and its SQL-read memberships; anonymous relation predicates are literal `false`, not empty principals. The frozen `constructIntegrationPermissions` applies its independent defensive ID filtering.
- Widget query fallback calls frozen `hasQueryAccessToIntegrationsAsync`. Public boards, actual-principal ownership/user/group Board grants, and source `board-view-all` with a placement remain valid query delegation. Foreign-private-only/unplaced integrations without direct/global use still deny. Interact/full/arbitrary HTTP never inherit this fallback. Existing public query-authorized refresh/demo leaves were not edited.
- Widget `boardAccess` consumes the same repository's principal-filtered Board evidence and frozen `decideBoardAccess`, retaining NOT_FOUND concealment. Saved Custom Widget arbitrary HTTP consumes filtered Integration evidence and still requires full access before availability/kind checks; synthetic empty-group membership is gone.
- Management `getIdentityAsync` no longer accepts or synthesizes `includeEmptyGroup`; actions consume only actual memberships. Native stored-one selection obtains that identity before SQL and applies `getIntegrationAccessRelations(identity)` instead of loading everyone's grants. All owned former `getIdentityAsync(snapshot, true)` call sites were updated to the narrowed signature.
- Repository performs memberships, requested Integration IDs/kinds/grants/placement and relevant Boards/current-user/current-group grants within one native operation: synchronous SQLite `.sync()` calls under the existing bounded transaction, or awaited PostgreSQL calls under the existing bounded read-only snapshot. No independent pool queries, SQLite awaits, caller SQL, new lock/control statement, mutation writer or auth admission is added.
- Returned repository is materialized and bound to the exact snapshot identity; foreign identity requests reject. Caller results are cloned separately from private stored evidence. Lifetime/signal/deadline checks only constrain read delivery; they do not claim fresh credential/grant authority, mutation dispatch or SQL revocation protection after the snapshot exits.
- Source one/many kind checks, duplicate-ID count failure, explicit empty results, native NOT_FOUND/FORBIDDEN messages, management concealment, denial-before-secret-decryption and external app URL projection remain. Frozen router bodies/error sanitization are unchanged. This is the Q18 intentional policy delta, not byte-equivalence with legacy foreign-user grant aggregation.

## Exact reusable signatures / consumer joins

New file exports:

```ts
interface ResourceAuthorizationSelection {
  readonly integrationIds: readonly string[];
  readonly allowedKinds: readonly IntegrationKind[];
  readonly boardIds?: readonly string[];
}

type ResourceIntegrationRecord = ReturnType<typeof readSqlite>["integrations"][number];

interface ResourceAuthorizationSnapshot {
  readonly identity: PolicyIdentity;
  readonly integrations: readonly ResourceIntegrationRecord[];
  readonly repository: ResourceAuthorizationRepository<ResourceIntegrationRecord>;
}

readResourceAuthorizationSnapshotAsync(
  runtime: Pick<PersistenceRuntime, "engine" | "boundedTransactionSync" | "boundedSnapshotAsync">,
  operation: BoundedTransactionOperation,
  admittedIdentity: PolicyIdentity,
  selection: ResourceAuthorizationSelection,
): Promise<ResourceAuthorizationSnapshot>
```

`ResourceIntegrationRecord` is the actual native relational projection, not a permission-only assertion: Integration row plus app, encrypted secret rows, placements with item rows, user grants with `userId`, and group grants with `groupId`.

Changed Widget resource requirement:

```ts
acquireAuthorizationSnapshotAsync(
  context: BackendContext,
  selection: ResourceAuthorizationSelection,
): Promise<ResourceAuthorizationSnapshot>
```

The private host must resolve the real admitted identity, main persistence runtime and request/resource lifetime/budget, and call the new producer. Widget helpers verify anonymous/authenticated branch and actual user ID against the request and await the existing Widget lease currentness before/after acquisition. The factory does not manufacture a principal or profile, issue credentials, or supply COMMIT authority. This required slot is not populated with a fake/default adapter.

Changed helper exports:

```ts
sourceIntegrationPermissions(
  identity: PolicyIdentity,
  record: ResourceGrants<IntegrationPermission>,
): ReturnType<typeof constructIntegrationPermissions>

createIntegrationAccessHelpers(resources).getIdentityAsync(
  snapshot: IntegrationManagementSnapshot,
): Promise<PolicyIdentity>
```

`getIdentityAsync(snapshot, true)` is intentionally removed at all owned consumers. Existing native `getAuthorizationRepository(snapshot)` remains a held producer binding: its identity/evidence must be from the same admitted coherent snapshot; separate pool callbacks or fabricated currentness are not an acceptable join.

Lane01-only declaration request for later host consumption: export the new factory/types from an exact API package path such as `@homarr/api/nitro/resources/resource-authority` pointing to `./src/nitro/routers/-resource-authority/repository.ts`. `drizzle-orm` is already declared in API devDependencies and installed at 0.45.2; this new runtime source imports its pure operators directly to avoid the ambient legacy DB singleton. Lane01 must admit that existing dependency into the production runtime declaration/closure if its packaging excludes devDependencies. No new package or installation is needed by this lane.

## Focused immutable validation / exact blockers

Final owned-source copy: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-28-final-XsxeHK`. Contains the five exact files, copied root lint config, SHA-256 inventory and logs. Node24.18.0 and oxlint1.73.0 ran in a clean environment with disposable HOME/TMP; no project/runtime import evaluation, dotenv, live peer symlink/watch or protected output.

- New repository lint: **PASS**, 0 warnings / 0 errors.
- Full five-file focused lint: **BLOCKED**, 80 pre-existing warnings and 1 pre-existing error. Exact error: `packages/api/src/nitro/routers/-integration-operations/helpers.ts:304`, `eslint(no-control-regex)` on the unchanged URL-control-character guard. Existing resource `typeof import(...)` signatures, intentional credential-safe error suppression and Widget nested normalization produce the preserved warnings. No policy/error-sanitization rewrites or lint suppression were introduced to disguise this baseline.
- Full focused types: **BLOCKED before compiler launch**, not passed. New repository's genuine type import `@homarr/db/runtime` expands `PersistenceRuntime` through active lane26 `packages/db/runtime.ts` and `packages/db/transaction-gate.ts`; its completed frozen return was unavailable. Existing Widget/native resource types additionally retain physical provider/request graphs. No live-mutable closure or invented ambient declarations were used to claim a pass. Coordinator must run no-emit types against the actual completed copied dependency closure, then review grant/source semantics independently.
- No tests/build/Docker/E2E/provider/network/SQL execution, new test files, manifests/lock edits, mounts, Git commands, children or protected3100/3200 access.

Final owned SHA-256:

| Path suffix under `packages/api/src/nitro/routers/` | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `-widgets/helpers.ts`                               | `7840ea4d08ff7bdc5939223eece4b84c7aee3db01f1e6f0cbf32adfaf3414b31` |
| `-widgets/resources.ts`                             | `92d0ac58c3532fba3ad2b89d077688198b552f29b6d0e3305123cd4de940ad32` |
| `-integration-management/access.ts`                 | `5eca037ac428d2c636091735e175844cf2c011656593f94c05bcea80d00285ee` |
| `-integration-operations/helpers.ts`                | `0a452b61e765e3160dbd4f83fa57c3554a4b42977cc2b372d2eaafcf6a68dbab` |
| `-resource-authority/repository.ts`                 | `69f5a8134f60506cfd5fa39e7c43c2ee1379e0f54a9de946800a782a1aba53ec` |

All source is frozen on return. Genuine issuer/resource/native producer integration, independent Q18 policy review, actual types/native evidence and compatible-writer/COMMIT fences remain required. No source snapshot or favorable lint result releases the private production guards.
