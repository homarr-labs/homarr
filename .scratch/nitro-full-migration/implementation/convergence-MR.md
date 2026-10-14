# Convergence MR — Media and onboarding/restore producer joins

Read-only source convergence. Only this new file is written. No product edits, commands, checks, imports/evaluation, native execution, SQL execution, application/file data, environment files, credentials, live calls, historical sealed evidence or nested agents. `evening-M-media-restore.md` is the requested prior plan, not renewed proof. Public same-native host/epoch/SSR enrollment is the supplied baseline; AH/BP/DP retain main, authentication, authority and build ownership.

## Dispatch decision

The smallest next slice is **one admitted media listing, the existing binary producer, public onboarding current-step, and request-bound backup inspection/preparation** on the retained listener. It is not a second runtime or a new backup controller framework. Media writes and onboarding transitions consume DP/AH's eventual same-owner transaction producers. Export and installation still lack genuine producers and must remain held.

Two prior-plan corrections matter now:

- The restore slot is already repaired: `apps/nitro/src/features/onboarding/types.ts:115,234`, `studio.tsx:220–221`, and `packages/onboarding/src/presentation-steps.tsx:22,81` carry/render `sqliteRestore`. Do not repeat that edit. The missing work is the admitted caller supplying the existing flow and a real inspection transport.
- API dependencies already include `isomorphic-dompurify`, and `media-runtime/sanitizer.ts` exports `sanitizeMediaSvg`. The binary descriptor still says `held`; dependency presence is not accepted Bun sanitizer security evidence. Neither its descriptor nor the two media mutation holds may be cleared by mounting alone.

## Current interfaces to consume, not redesign

| Producer                                                  | Actual callable boundary                                                                                                                                                  | MR use                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/api/src/nitro/routers/media.ts`                 | `createMediaContribution(resources)`; `MediaProcedureResources.acquireReadAsync(AuthenticatedBackendContext)` returns `{db, principal, assertCurrentAsync, releaseAsync}` | Exactly `media.getPaginated`; own-only unless both `media-view-all` and explicit all-users input. Preserve existing pagination/search intersection, content exclusion and creator projection.                      |
| `packages/api/src/media-runtime/binary.ts`                | `readMediaBinaryResponseAsync(resources, {request, signal, onDispose}, {id})`; read lease has DB/currentness/release, no principal                                        | Source-public `/api/user-medias/<id>`, not protected listing policy. Inject `sanitizeMediaSvg`; modern and legacy SVG sanitize before ETag. Keep existing CSP, nosniff, private/no-cache, bytes and 304 semantics. |
| `packages/api/src/nitro/routers/-media/upload.ts`         | `prepareMediaUploadAsync(context, readInputAsync, {createId, assertCurrentAsync})`                                                                                        | Existing denial-before-input and original File/name/MIME/bytes mapping; producer preparation, not authorization at COMMIT.                                                                                         |
| `packages/db/runtime-media/mutations.ts`                  | `createMediaSqlRuntime(runtime, localIconSource).uploadMediaAsync(operation, rows)` / `.deleteMediaAsync(operation, selection)`                                           | Existing paired bounded transaction bodies and local-icon atomicity. Both first call unconditional `requireMediaSqlExecution()`. No usable write capability yet.                                                   |
| `packages/api/src/nitro/resources/-setup-read/context.ts` | `createSetupBackedContext(input, {database, schema, signal, assertCurrent}, {operators:{eq}, now})`                                                                       | Same DB and identical request signal; authentic admin or actual hashed, unexpired no-users claim for setup reads. This does not issue claims or lock authority for writes.                                         |
| `packages/api/src/nitro/routers/onboard.ts`               | `createOnboardProcedures({capabilities, discovery, integrations})`                                                                                                        | Pick `currentStep` first. The other three leaves require actual tracked external operations, not fabricated capabilities. No `createOnboardContribution` exists here.                                              |
| `packages/api/src/nitro/routers/onboard-transitions.ts`   | `createOnboardTransitionBuilders()` plus exported preparation/SQLite/PostgreSQL source bodies                                                                             | Builders have no handlers; `onboardTransitionsImplementedPaths` is empty. Attach handlers only to genuine accepted transaction resources.                                                                          |
| `packages/api/src/backup-runtime/nitro-join/service.ts`   | `createNitroBackupService(config)`; inspect/upload/prepare/upload/discard/close                                                                                           | Actual copied engine, global active-operation and preparation-count budgets, private snapshot retention/wiping. Current singleton authorizer takes only operation/signal: request-binding amendment required.      |

`apps/backend/src/server/runtime-composition/auth.ts` currently offers `getCurrentBackendUserAsync(originalHostContext)` and `getRequestLeaseAsync(originalHostContext)`. Its association verifies request/requestId/signal/onDispose and host principal object identity. **Do not call it with the source BackendContext**: `createBackendContext` clones principals, and a source principal is not the host's WeakMap key. AH must retain the original host association in its bridge. `SqlAuthorityReadLease` carries identity, validity, lifetime and `assertCurrentAsync({signal, deadlineAt})`; it carries no DB and explicitly does not supply COMMIT authority.

`createNativeReadResources` currently returns the eleven-read assembly resources, not media resources. MR should add one media contribution beside that assembly after AH enrollment, not recreate or broaden the eleven-read producer. `public-rpc.ts` validates exactly two settings leaves; do not append media/onboarding to that allowlist or thereby make authenticated data public.

## 1. Media read/binary join — smallest consumer patch

Proposed allocation: new `apps/backend/src/server/runtime-composition/media.ts`, consumed by AH's admitted RPC/resource assembly. Coordinator owns the assembly edit. No new generic repository, listener or persistence factory.

Within the **existing whole-request `main.runAsync(async (database, schema) => ...)` callback**, construct `MediaProcedureResources` from that callback's `schema.medias`, actual `{and, desc, eq, like}`, and the admitted source context. Borrow a per-acquisition lease; its release invalidates that borrow, while the enclosing callback/host association owns physical SQL/auth settlement. A no-op release that lets DB use escape is not acceptable. Inline body for the existing `acquireReadAsync` member:

```ts
async acquireReadAsync(candidate) {
  if (candidate !== backend || candidate.db !== database || candidate.signal !== hostContext.signal)
    throw new Error("MEDIA_READ_UNAVAILABLE");
  await assertRequestCurrentAsync();
  let released = false;
  return {
    db: database,
    principal: backend.principal,
    async assertCurrentAsync() {
      if (released || !active) throw new Error("MEDIA_READ_UNAVAILABLE");
      await assertRequestCurrentAsync();
    },
    async releaseAsync() {
      released = true;
    },
  };
}
```

Here `backend`, `database`, `hostContext`, `active` and `assertRequestCurrentAsync` are **per-request variables supplied inside AH's admitted callback**, not existing globals or a new authority implementation. `active` becomes false in that callback's finally. The assertion checks main currentness, composed lifetime/deadline, and the original-host authority association. Final authority checking and nonstreaming RPC serialization must finish before the callback exits; await actual auth disposal according to AH ownership, not twice from the borrowed media lease. No `runAsync` callback returning a DB pointer, no later singleton resource retaining it.

The binary wrapper uses the same callback-scoped DB borrowing, without inventing authentication for this source-public URL. Match GET plus exactly one nonempty ID segment using the host's base-path routing; wrong methods get 405 and unrelated descendants do not become IDs. Call `readMediaBinaryResponseAsync` with `schema.medias`, actual `eq`, and `sanitizeMediaSvg`. Keep the produced body under the host's response disposal/drain owner after SQL release. The response already materializes its bytes; this does not permit output after a host generation fence.

Export only consumed API boundaries: proposed `@homarr/api/media-runtime` → a small `src/media-runtime/index.ts` exporting binary producer/types and sanitizer, and `@homarr/api/backup-runtime/nitro-join` → its existing `index.ts`. Neither currently exists in `packages/api/package.json`. Backend already declares API/auth/DB/contracts; API already declares the sanitizer and DB. No installation or dependency workaround is needed for these joins.

## 2. Media writes — consume DP's producer, retain the execution hold

Exact consumer files: `packages/api/src/nitro/routers/media.ts`, `routers/-media/resources.ts`, existing `upload.ts` and `delete-authorization.ts`. DP exclusively owns `packages/db/runtime-media/{contracts,mutations}.ts` and main's private runtime access.

- Add handlers using existing source identities: `media.uploadMedia` is a guarded permission mutation requiring `media-upload`; `media.deleteMedia` is a guarded protected mutation using `byIdSchema`. Do not add new REST identities. Upload must enter through a lazy body supplier so transport parsing does not defeat `prepareMediaUploadAsync`'s denial-before-read boundary.
- Host ingress must reserve concurrent bytes **before parsing**, bound total multipart bytes, file count and aggregate file bytes, apply deadline/request/host cancellation, and settle the reader. Existing validation is only 32 MiB per file and permits an empty array; reject zero files and over-budget batches before buffering per-file content. Do not silently impose an undocumented guessed aggregate tariff/limit: require explicit host configuration with reviewed limits.
- Feed prepared rows to DP's owner-bound media operation, with original `LOCAL_ICON_REPOSITORY_SLUG`, `mapMediaToIcon`, `createLocalImageUrl` from `@homarr/icons/local`. That producer must select current credential/principal/permission facts inside the transaction, reconfirm every creator, and hold compatible authority through bounded COMMIT dispatch. Reuse the existing media/local-icon transaction bodies, not legacy sequential inserts/deletes.
- For delete, read only `{id, creatorId}` under admission, run `assertMediaDeletionAuthorized`, then ask DP's producer to revalidate authorization and exact creator under its transaction. Source-public byte visibility is not delete permission. Missing/nonowner/demo denial must not delete either table.
- On definitive success invalidate media listing and local-icon consumers. On `MediaSqlMutationError`, preserve `retry="forbidden"`, retain reconciliation rows/bytes only server-side, return sanitized nonretryable outcome. No automatic replay, regenerated upload IDs, or apparent successful delete after ambiguous COMMIT. The current main wrapper's generic operation error cannot be allowed to erase that distinction; DP/BP must deliver a domain operation that preserves it before these handlers mount.

This slice waits for a genuine retained-owner media producer, not a raw `PersistenceRuntime` handed to MR and not an arbitrary `db.transaction` callback. Do not remove `requireMediaSqlExecution()` to make a handler work.

## 3. Onboarding current-step and transitions

For current-step, reuse AH's source context with `createSetupBackedContext` inside the same admitted SQL callback. Compose only `{onboard:{currentStep}}` from `createOnboardProcedures` via existing `defineBackendContribution`; declare exactly `onboard.currentStep`. Do not mark the other three implemented API-source leaves enrolled merely because they were constructed. Setup schemas are SQLite-shaped; the selected main is SQLite, and no PostgreSQL cast is acceptable.

Only after real external resources arrive should MR add `detectRuntimeCapabilities`, `discoverDockerServices`, `testIntegration` to that contribution:

- `RuntimeCapabilityResources.getKubernetesVersion(signal)` and `.fetch` must receive the request/host/deadline signal composed with the existing five-second probe timeout. `Promise.race` is not physical retirement. Keep pending transport work in its actual owner until settled, cancel/consume Workshop health response bodies, and fence result publication.
- `SetupDiscoveryResources.listDiscoveredContainers()` and `SetupIntegrationClientResources.createIntegration(...).testConnectionAsync()` currently lack request signal/release ports. Either inject per-request wrappers around genuine tracked transport ownership or narrowly amend these exact members with signal/disposal support. No fake client, no success shim, no generic transport framework. Use actual Docker discovery, icon SQL and trust-aware integration factories.
- Do not hold a native write transaction while performing network tests. Completion preparation can use these actual resources outside the short durable transaction, but the candidate's source reads and resulting writes must be revalidated as current before dispatch.

Transition consumer allocation: `onboard-transitions.ts`, `routers/-onboard-transitions/{helpers,resources}.ts`. Export its existing transition boundary only when consumed. Wait for AH claim issuer/account/group authority and DP's native domain transaction resource. Reuse `prepareOnboardNextStepSourceBody` and `prepareOnboardCompleteSetupSourceBody`, source key codec, serialized settings/secret values and existing paired SQL bodies.

One source repair is mandatory before next-step can be used. `helpers.ts:798–818` currently updates all onboarding rows unconditionally. The SQLite body should become conditional, with the PostgreSQL twin checking `rowCount`:

```ts
const result = transaction
  .update(resources.schema.onboarding)
  .set({ previousStep: candidate.previousStep, step: candidate.step })
  .where(
    resources.operators.eq(
      resources.schema.onboarding.step,
      candidate.previousStep,
    ),
  )
  .run();
if (result.changes !== 1) throw new ORPCError("CONFLICT");
```

Retain the existing `no-op` candidate branch, but it must not bypass transaction-time admission. Complete-setup already checks one setup→finish row; keep all plan writes and claim removal in that same accepted transaction. Those checks are not substitutes for admin-or-valid-claim/no-users/current-step predicates, candidate-read revalidation, and COMMIT authority. A released read lease or snapshot principal cannot supply them. Client `OnboardingClient` has no nextStep/completeSetup members today; add real typed calls and enable start/completion only after these producers mount, with nonretryable ambiguous outcomes.

## 4. Backup request binding + cancellable ingestion — source-ready amendment

Keep **one host-owned `createNitroBackupService`** and its lifetime, active set, retained map and reservations. Do not create one service per request (it resets global limits and loses retained ownership). Do not set a mutable current-user closure on a singleton.

Exact amendment allocation: `packages/api/src/backup-runtime/nitro-join/{contracts,service}.ts` and `packages/api/src/backup-runtime/archive.ts`. Retain copied engine/parser/crypto/inventory/reset implementations unchanged for this slice. Proposed narrow request capability, supplied only by AH/host admission:

```ts
export interface BackupJoinRequest {
  readonly request: Request;
  readonly signal: AbortSignal;
  assertAuthorizedAsync(
    operation: "inspect" | "prepare" | "export",
    signal: AbortSignal,
  ): Promise<void>;
  assertCurrentAsync(signal: AbortSignal): Promise<void>;
}
```

This is an immutable server-only closure over the original host association, expiry/deadline, principal/claim and generation. It is not a JSON principal, browser-issued permission or transferable authority. Host origin/CSRF/demo policy must deny before body/copy access. Export is admin-only; inspect/prepare admit admin or the explicitly authorized current no-users onboarding claim. No broad onboarding claim access to management/export.

Change `NitroBackupConfiguration` to extend `Omit<SqliteBackupConfiguration,"authorizeAsync">` plus the existing limits/lifetime. Construct the genuine `createSqliteCopyEngine({temporaryDirectory,migrationsFolder})` once. For **each** inspect/prepare operation build actual `BackupDependencies` with that shared engine/target key and the bound request authorizer:

```ts
const dependencies: BackupDependencies = {
  engine,
  targetKey: config.targetKey,
  authorizeAsync: (operation, signal) =>
    admission.assertAuthorizedAsync(operation, signal ?? admission.signal),
};
```

Pass those dependencies into existing `inspectLegacyBackupAsync` / `prepareLegacyBackupAsync`; inner `openCopyAsync` authorization remains real. Make every service method that touches bytes/results take this request binding, including byte-based methods and still-held export entry points. Upload methods take the binding's own `request`, not a separately supplied Request that could be substituted. Compose its signal with `options.signal` and service lifetime in `lifetime.runAsync`, check authorization before ingress, currentness after copied work **and before result publication**. If authorization expires after preparation, remove/wipe the newly retained preparation instead of leaking an unreachable candidate.

For `archive.ts`, amend `readBackupUploadAsync(request, signal = request.signal)` and pass the composed operation signal from both upload callers. Retain its existing multipart limit/parser and exactly-one-`file` rule. Copy the local reader cancellation/settlement pattern from `public-culture.ts:190–240`, not its JSON parser:

- Register an abort listener before the first `read`; use one recorded cancellation promise, handle its rejection, and check aborted state before/after awaited reads, formData decoding and `file.arrayBuffer()`.
- On early/error/abort exit cancel unfinished input, await cancellation and pending read settlement, then release the lock in finally. Cleanup failure must become `BackupError("cleanup-failed")`, which existing join lifetime records as failed and aborts; it must not be masked as invalid archive or successful close.
- Preserve cancellation as `BackupError("cancelled")`, not `invalid-archive`. Remove the listener and wipe owned staging buffers when no longer needed. Buffer/FormData/ZIP synchronous work cannot be advertised as interruptible; keep it globally byte-budgeted and check cancellation at available boundaries.
- Reserve preparation capacity before upload parsing and release exactly once; currently capacity checking occurs after upload. Add host-global byte reservation for upload + owned copy + decompressed/copied/sealed retention. Count limits alone are not a memory bound. Keep reservations until physical reader/copy/cleanup settles, not just until a timeout rejects.

Mount **inspection first**. Source preparation can remain a server-only operation until AH/BP provide principal/generation/candidate ownership across requests and an expiry/discard contract. `SourcePreparation` is an object-identity map key with `toJSON()` reporting `applyReady:false`; never turn its JSON into an accepted restore handle or reconstruct it from a browser ID. Keep inspection board names/counts protected and DTO/errors free of source keys, private snapshot bytes, raw rows and native paths.

Browser join: preserve `BackupTransport` and shared `DatabaseRestoreFlow`. Implement the existing inspection port as authenticated same-host multipart upload (exact one `file`) to the enrolled inspector; do not send JSON/base64 SQL bytes. The existing bytes-based browser port can wrap bytes in one File for the smallest compatibility patch; a later narrow port change to pass the original File avoids its redundant allocation. Server-side admission remains decisive. Validate the existing inspection schema and propagate cancellation; bounded response parsing and output policy remain host obligations.

Use the same admitted transport in `BackupPage transport={transport}` and the existing `sqliteRestore={<DatabaseRestoreFlow transport={transport} variant="standalone" />}` caller slot. Source UI currently defaults to an empty transport, and restore review is deliberately review-only. Keep `apply:false`, `boardOnly:false`, export unavailable, and the restore/transition holds. No changes to the already-correct Welcome slot are needed.

## 5. Export sanitization — precise missing producer, not restore reset

Do not route `inspectExportSnapshotAsync` or raw snapshot bytes to a download. It returns `downloadReady:false`; `exportAsync` throws `export-sanitization-unavailable`. Legacy export source uses a second `better-sqlite3` connection, fixed temporary name and raw/key-carrying archive; none is the Nitro join.

BP/DP must expose a narrow **retained-main-owned consistent SQLite snapshot** operation; actual `PersistenceRuntime.snapshotSqliteAsync(destination)` exists but is private to the main owner. MR must not open the live DB independently. The snapshot destination, exclusive directory ownership, sync and cleanup remain BP-owned.

Smallest subsequent source addition is isolated export operations on the existing copied engine, not reuse of restore preparation: proposed `sanitizeExportAsync(copy, signal)` and `sealExportAsync(copy, signal)` with a distinct export phase. Existing `sealAsync()` requires a converted-ready copy with a freshly reset runtime epoch at current catalog, so it cannot seal a catalog/meta-preserving export by wiring alone.

Freeze the exact export exclusion policy first: exclude transient runtime state/history rows, preserve runtime catalog/meta structure, and decide explicitly whether sessions, verification tokens, obsolete setup claim and other credentials are carried or excluded. Do not delete durable Assistant threads/messages or application families because their names contain history/state. Do not call `resetRuntimeAsync` for export or inject a new epoch. Validate isolated output/catalog after sanitization and before seal; never sanitize the live DB. Archive writing must have a reviewed existing production dependency (API's `adm-zip` is currently dev-only), bounded output, explicit sensitive/key-carriage policy, no-store/security headers and owned cancellable download disposal. Current browser `response.blob()` is unbounded: replace its consumption with a capped, cancelling reader before export is enabled. PostgreSQL ZIP export/cross-engine restore stay unsupported.

## 6. Supervised apply and recovery — wait for real host producer

MR's consumer is the existing retained preparation, **not** an import endpoint writing files. `applyAsync()` remains `production-restore-join-unavailable` until BP/AH/DP provide all of the following; no speculative success callback is enough:

1. An immutable one-shot accepted attempt bound to current principal/claim, authority revision, host generation, candidate identity and fresh authorization. Supervised acceptance must transfer ownership before the request retires; after acceptance, cancellation/disconnection never redispatches installation.
2. A host-wide fence covering HTTP, SSR, RPC, media/download output, provider/trust clients, jobs/history/cache writers. Await actual operations/readers/bodies/client retirement and cleanup. Ordinary DB `maintenanceAsync` automatically returns to ready; it is not that fence. Never await application disposal from its own awaited restore handler.
3. Separately reopen and verify the actual sealed candidate using BP's verification resource. Preparation currently seals/disposes but does not independently reopen in production. Reuse existing copied preparation's key/reference/selected-board validation, session/token/claim logout and its **single** `resetRuntimeAsync`; no second reset or caller-supplied epoch. Board selection changes the home-board destination, not full-replacement scope.
4. Cross-process exclusive target-directory ownership, a retained old recovery snapshot, closed live connections, durable replacement-intent/outcome journal, candidate/fallback fsync and same-filesystem publication with reviewed WAL/SHM handling. Unknown native dispatch, close or journal outcome quarantines; never retry an ambiguous replacement or COMMIT.
5. Recovery before reopening listeners: reconcile journal and actual images/sidecars, verify installed or restored fallback, retain evidence/artifacts on uncertainty. Restart fresh same-owner auth/domain/trust resources and attest actual readiness. Normal restart adopts installed epoch; full prepared restore supplies the fresh reset epoch. Conserved bcrypt/accounts do not issue sessions. SQL hostname rows do not restore external CA files.

Only then extend UI contracts with actual preparation/accepted-attempt status calls, acknowledged confirmation, supervised readiness and nonretryable ambiguous results. Do not replace literal capability holds with optimistic booleans while producers remain absent.

## Exact wait list and later synthetic acceptance

| Wait for                                                                                                                                                                      | MR can do once delivered                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AH's enrolled request bridge preserving original host association and actual current permissions; coordinator's exact contribution selection                                  | Media listing + source-public binary (after sanitizer gate); current-step; no duplicate auth or eleven-read implementation.                                                                                    |
| BP's ingress/response budgets, cancellation/drain ownership and allocated same-listener paths; AH immutable admin/setup admission                                             | Amend backup binding/reader, mount protected inspection, inject shared UI transport. Proposed inspection path must be explicitly allocated; source export/import URLs are not proof an inspector route exists. |
| DP's same-main media/onboarding transactions with compatible enabled writers, currentness through dispatch and preserved ambiguous outcomes; AH claim/account/group producers | Actual upload/delete and next-step/completion handlers; narrowly enable corresponding UI actions.                                                                                                              |
| BP/DP isolated export snapshot/sanitization/sealing and approved archive/key policy                                                                                           | Actual sensitive export download; never raw snapshot fallback.                                                                                                                                                 |
| BP/AH supervisor, maintenance fence, cross-process ownership, verification and recovery producer                                                                              | Bind one-shot apply, then synthetic installation proof only with separate approval.                                                                                                                            |

No checks or proof were run here. After coordinated source freeze, the parent owns focused lint/typecheck and a fresh isolated artifact. Later synthetic proof must cover same-listener listing/media bytes and denied-before-read ingress; request revocation/cancellation with real settled copy cleanup; shared capacity; conditional setup completion/no partial writes; export exclusion without durable-content loss; and, only separately authorized, interrupted supervised replacement plus verified recovery/readiness. Use newly owned synthetic data/keys/ports exclusively. No real backup restore is permitted. Neither source enrollment, compiler success nor old sealed evidence closes these runtime/security holds.
