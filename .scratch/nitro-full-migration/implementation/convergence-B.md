# Convergence B — frozen SQLite Board permission producer

Source frozen in exactly new `packages/db/runtime-board/contracts.ts`, `packages/db/runtime-board/statements.ts`, and this report. Scope follows `WRITER-RULES.md`, `CONVERGENCE-NEXT.md:39`, BP and C0. No runtime, gate, schema, facade, manifest, migration, Auth, API or backend edits. This is unmounted producer source, not a write permit, procedure acceptance or activation.

## Frozen contract and concrete functions

- `BoardPermissionReplacement`: readonly exact `principalId: string` and `permission: BoardPermission`.
- `BoardPermissionsMutation`: readonly `kind: "replace-user" | "replace-group"`, `boardId: string`, and `permissions: readonly BoardPermissionReplacement[]`. No caller identity, grants, credential selector, authorization callback or reusable authority result.
- `BoardPermissionsMutationError`: sanitized `BAD_REQUEST`, `NOT_FOUND` or `PRECONDITION_FAILED`; messages carry no IDs, SQL, credentials or causes.
- `captureBoardPermissionsMutation(input: BoardPermissionsMutation, maximumRows: number): BoardPermissionsMutation`: detached, frozen exact rows and family/board selection. Validates actual `view`/`modify`/`full` values, rejects accessor/sparse entries and invalid bounds. Strings remain exact, including empty strings allowed by the existing save schema; no trimming, normalization, principal existence precheck, sorting, deduplication or implicit grant expansion.
- `executeBoardPermissionsMutationSync(database: HomarrDatabase, input: BoardPermissionsMutation, credential: NativeCredentialEvidence, configuration: NativeCredentialPolicyConfiguration): void`: concrete synchronous transaction body. Uses the actual SQLite driver/schema types, without casts, engine substitution, new database interface or a public raw client. Recaptures input before SQL; no Promise, provider work, bcrypt or connection/transaction management.

## Native-unit semantics

The mandatory DB-private `readNativeCredentialPolicySync` import uses C0's frozen credential/configuration types and passes the identical transaction-scoped `HomarrDatabase`. C1 owns ready-domain/evidence/actor/provider/clock rereads and complete bounded membership/global-grant expansion. B does not reconstruct them, accept a policy DTO, add an admin shortcut or replace that reader with a stub. The reader's generator composition remains C1-owned; B uses its synchronous scoped runner.

After the reader, B selects the exact Board creator and all current actor user grants/current membership group grants with overflow limits. Every returned relevant permission is checked against the actual Board domain, even when creator/global access would otherwise authorize. Full access is precisely creator OR current user-full OR current group-full OR returned expanded `board-full-all`, matching `-board-mutations/helpers.ts:188–239` and `auth/permissions/board-permissions.ts`. Missing Board and denied full access both throw identical sanitized `NOT_FOUND` / `Board not found`. Public/view/modify grants alone do not authorize replacement.

Only after authorization, B bounds the complete selected Board grant family with an overflow row, deletes all its rows for that Board and inserts the captured exact rows. Empty input still deletes the complete family. User replacement does not delete group grants; group replacement does not delete user grants. Reads/input are bounded by retained `maximumSnapshotRows`; overflow rejects before deletion rather than truncating. Original SQLite FK and compound-key failures remain failures, including repeated exact rows: no conflict-ignore/upsert/dedup or partial success. Original DML errors are not swallowed or converted into success; the native gate must preserve primary and cleanup failures, and the later API join must sanitize native errors.

## Required remaining joins and holds

1. C1 must implement the exact mandatory `../runtime-auth-credential/statements` reader import and its frozen semantics. At this handoff only C0 contracts exist; no claim that B resolves or compiles independently today.
2. D must capture request input before scheduling and invoke this body only inside the existing fixed synchronous bounded SQLite immediate native unit. D owns `BEGIN IMMEDIATE`, COMMIT dispatch/rollback/cleanup, deadline clamping to captured session deadline, lifetime checks, publication/drain of actual work, and nonretryable ambiguous-COMMIT classification. The body's void return is not a confirmed commit receipt. Do not catch/replay it as an automatic retry.
3. Genuine retained runtime credential configuration and durable adoption/evidence must exist. Ready adoption is not authorization, request-time adoption or permission to reopen admission. A later exact-principal issuer-owned dispatch/request association and complete enabled-writer closure remain mandatory before mounting these two leaves.
4. All PostgreSQL writes, other unjoined Board writes, Auth dispatch/main mount and real-data/cutover/restore holds remain unchanged. No generic transaction or structural DTO becomes an authority surface through these files.

Only ordinary source/manifests/installed declarations were read. No commands, checks, tests, builds, native/SQL execution, providers, credentials, protected artifacts or nested agents. Coordinator owns focused lint/type validation after reached writers freeze; no compiler/runtime/procedure acceptance is claimed.
