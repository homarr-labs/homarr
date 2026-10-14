# PLAYABLE-WAVE32 lane30 — board snapshot cache join

## Reopen30 — exact P2 scope recorded before edits

Only `packages/request-handler/src/board-query-snapshot.ts` and this handoff reopen. Replace the property-order-sensitive input string comparison with `hashKey([serialize(input)])`, using already-declared React Query5.101.2 and SuperJSON2.2.6 public exports. Their installed source confirms recursive plain-object key sorting and retained SuperJSON JSON/type metadata. Generated current keys and QueryClient-derived query hashes stay unchanged. The other seven source files remain frozen; no scope or activation widening.

### P2 fix frozen for independent re-review

Exactly three producer lines changed: add public `serialize` import, add public `hashKey` import, compare `hashKey([serialize(target.input)])` against `hashKey([serialize(source.input)])`. This canonicalizes object property order while preserving SuperJSON type metadata; it does not compare lossy raw-input JSON or introduce a custom comparator. The generated callback key, QueryClient-derived query hash, allowlists/RSS matching/caps/generations/50ms isolated race/save settlement and all authority/CAS holds are unchanged.

Installed evidence reverified before edits: request-handler directly declares React Query and SuperJSON; React Query5.101.2 reexports Query Core, whose `src/utils.ts:232–242` implements stable recursive plain-object key sorting for `hashKey`; SuperJSON2.2.6 `dist/index.d.ts:43` exposes `serialize`, and `dist/index.js:17–38` returns the JSON payload together with type/referential metadata. No dependency or manifest changes.

P2 immutable closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-wave32-lane30-p2-oeVpVh`. It copies the previous frozen dependency/source closure without symlinks, then substitutes only the revised producer. Baseline and post-check SHA256 comparisons confirm the other seven sources stayed unchanged and the producer differed by only those three intended lines. Revised producer SHA256: `806684f2f70856ca5b64222bce87be37ecc4fc5796a02435c19078c70d7cbb52`.

All checks exited0 with clean PATH/temporary HOME and explicit Node24.18.0: strict TypeScript7.0.2 noEmit/no incremental against the immutable eight-file closure; oxlint1.73.0 `--deny-warnings` and oxfmt0.58.0 `--check` against only the revised producer. Raw `typecheck.log` is empty; `lint.log` records0 warnings/errors on1 file; `format.log` records success. `source-hashes.json`, `producer-before.ts.txt`, `p2-validation-results.json` retain hashes, status and exact inline probe source.

The narrow SDK-only inline probe exits0 and `sdk-probe.log` records the original RSS failure (different SuperJSON strings despite equal TanStack hashes), acceptance of reversed/nested property order, rejection of changed RSS counts/URL array order, and preserved distinctions for Date versus ISO string, BigInt versus string, undefined versus null/absent, NaN versus null and Infinity versus NaN. This imports only frozen public SDK functions, not the producer/backend/cache runtime. No test file, host mount, provider/SQL/cache IO, build/install/listener, child, Git, comment or unsafe type widening was added. This is submitted for independent re-review, not declared accepted or activated.

## Exact write allocation recorded before implementation

- `packages/redis/src/cache/contracts.ts` new cache-only structural contracts, no state/history/security imports.
- `packages/redis/src/cache/board-snapshots.ts` new injected disposable board-snapshot consumer: exact logical key, serialized-string storage, source retention/size policy.
- `packages/redis/src/cache/index.ts` new cache-only entrypoint; package export belongs to01.
- `apps/backend/src/infrastructure/cache/contracts.ts` retain existing public signatures and timeout error; replace duplicate structural contracts through accepted public cache entry only after01 declares it.
- `apps/backend/src/infrastructure/cache/board-snapshots.ts` join source consumer through accepted public cache entry only after01 declares it; retain compatibility exports.
- `apps/backend/src/infrastructure/cache/nitro-storage.ts` preserve reviewed Nitro owner and add a producer-ready per-board storage factory/lifetime join.
- `apps/backend/src/infrastructure/cache/index.ts` publish immediately usable named binding exports.
- `packages/request-handler/src/board-query-snapshot.ts` new producer, now explicitly authorized by coordinator and appended Lane30 amendment; no other request-handler path.
- This handoff; bounded immutable validation artifacts only in an owned approved temporary directory.

## Original source producers (read-only)

- `apps/nextjs/src/app/[locale]/boards/(content)/_query-snapshot.ts`: board item SHA256 fingerprint lines109–118, generation/permission preparation119–127, channel/persister128–144, generation-aware restore/save145–184, isolated50ms restore and late-restore-before-save186–230.
- `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx`: existing board prefetch/snapshot invocation and best-effort restore policy; no edits allocated.
- `packages/redis/src/lib/channel.ts:127–172`: legacy ordinary string get/set/remove and TTL compatibility specification only; no edits allocated.
- Frozen `implementation/stack-nitro-kv-cache.md`, `STACK-ADAPTER-APIS.md` §4, `PLAYABLE-WAVE32.md` Oracle amendments.

## Bounded allocation request sent to coordinator

Request ONLY new `packages/request-handler/src/board-query-snapshot.ts`, disjoint from20 common widget paths; no existing request-handler barrels/shared-cache/provider/runtime changes. Coordinator authorized this exact absent path through the Lane30 amendment before edits. Port the original snapshot algorithm with injected cache/generation callbacks, not replacement authority. No existing board snapshot producer was found in request-handler.

01 declaration request: `packages/redis/package.json` export `./cache` to `./src/cache/index.ts`, backend direct `@homarr/redis` workspace dependency, request-handler catalog dependencies `@tanstack/query-async-storage-persister`, `@tanstack/react-query`, `@tanstack/react-query-persist-client` at already-installed5.101.2. Request-handler SuperJSON is already declared; wildcard export already addresses the producer. No private deep import, undeclared dependency or Redis fallback will be used. Actual dependent import edits await01 declarations.

Installed beta43 `@orpc/tanstack-query/dist/index.mjs:30–39,212–219` generates `[path,{input,type:"query"}]` or `[prefix,path,{input,type:"query"}]`. Producer decoding will reject legacy tuples, streaming/infinite/mutation keys. A typed caller callback must supply the actual current adapter-generated query key on restore; QueryClient's own `defaultQueryOptions` supplies its hash. No handwritten replacement key/prefix namespace. This avoids restoring another request/principal prefix from the shared disposable snapshot into the current QueryClient.

## Unchanged holds

No SQL/security/history/state algorithms or DB authority changes. Cache is not CAS/auth/durable state. Preserve logical expiry, lossless UTF16 key encoding, opaque SuperJSON strings and actual pending settlement before storage shutdown. FS unlink errors swallowed inside upstream unstorage, unknown orphan reclamation, mount physical isolation, external writers and producer read-decide-remove invalidation remain explicit holds. No cache mount/runtime or protected output is configured here.

## Frozen implementation return

Completed source join, not host/runtime activation. All eight owned TypeScript files are frozen; hashes are recorded in the isolated validation closure. No additional allocation is requested. The exact request-handler producer allocation above is now fulfilled; its wildcard package export already exposes `@homarr/request-handler/board-query-snapshot`.

Actual01 declarations were read before dependent imports: backend now declares `@homarr/redis`, Redis publishes `./cache`, and request-handler declares the three existing catalog Query/persister packages. No manifest/lock/config was edited by30. Backend's existing board-snapshot and contract exports now delegate to the single cache-only Redis entrypoint instead of retaining duplicate consumer implementations. This entrypoint imports only Node Buffer and local/type-only cache contracts, never the legacy Redis root, clients, state/history/security, Core or DB.

### Usable exports and exact signatures

- `@homarr/redis/cache`: `SerializedStringCache` (`getAsync(key): Promise<string|null>`, `setAsync(key,value,{ttlMs?,ttlSeconds?}?): Promise<void>`, `removeAsync(key): Promise<void>`), `SerializedStringCacheOwner` (`stopAsync(): Promise<void>`), `SerializedCacheWriteOptions`, `BoardSnapshotIdentity`, `SerializedBoardSnapshotStorage`, existing version/maxAge/maxBytes constants, and `createSerializedBoardSnapshotStorage(cache, {boardId,boardContentFingerprint})`.
- Backend existing `createNitroBoardSnapshotCacheOwner({expectedDriver:"memory"|"fs",operationTimeoutMs?})` remains immediately compatible with the producer's `cache` input. Its reviewed private mount, envelope validation, UTF16 lossless encoding, logical expiry, limits, queued/native settlement and stop semantics are unchanged. The only algorithm-neutral internal edit is using `Promise.all(pending)` rather than spreading its synchronously consumed iterable.
- Backend new `createNitroBoardSnapshotStorageOwner(options): NitroBoardSnapshotStorageOwner` provides `createStorage(identity): SerializedBoardSnapshotStorage` and `stopAsync(): Promise<void>`. It binds the actual injected consumer to one actual Nitro cache owner, blocks new storage creation after stop and drains the same owner. It does not mount/dispose Nitro storage or close foreign resources.
- Producer `createBoardQuerySnapshot(board: BoardSnapshotBoard, integrations: readonly {id:string}[], ports: BoardQuerySnapshotPorts): BoardQuerySnapshot` returns `restoreAsync(queryClient): Promise<void>`, `saveAsync(queryClient): Promise<void>`, `stopAsync(): Promise<void>`.
- `BoardSnapshotBoard` is the exact read-only source projection `{id,items:[{id,kind,integrationIds,options}]}` needed for fingerprint/RSS/shareability; no Next Board type or Auth/server graph is imported.
- `BoardQuerySnapshotPorts` requires the real cache, `prepareGenerationsAsync(): Promise<void>`, `getGenerationAsync(id): Promise<{value:string,isShared:boolean}>`, and `queryKeyFor(path:readonly string[],input:unknown): QueryKey|null`. Caller supplies genuinely authorized integrations and generation authority; none is manufactured here. `queryKeyFor` must validate/select the source allowlisted procedure and call that current scope's actual oRPC `.queryKey({input})`, or return null for an unavailable procedure. It is not an invented RPC/client method or permission grant.

### Preserved producer policy and reviewed additions

- Exact original item-list JSON SHA256 fingerprint; original `board-widget-queries-v1` key/buster;259200000ms retention; unchanged12-path allowlist plus board-matching RSS URL ordering/default100/max-post count.
- Original permitted integration intersection, all-board-integration seeding gate, shared-generation requirements and initial/current generation equality; no generation fence, epoch mutation or SQL-check-then-cache-CAS assertion added.
- Successful `rscWidgetPrefetch` queries only,128KiB ordinary/256KiB Beszel stats,512KiB aggregate/serialized-string limits, inline-base64 exclusion, no mutations, SuperJSON serialization. Size selection runs again after actual generated-key rebinding so a larger current scope prefix cannot bypass byte caps.
- Generated beta43 ordinary-query key decoder only: exact optional string prefix, string-array path, `{type:"query",input}`. Legacy tRPC tuples, metadata extras/fnOptions, mutations/live/streamed/infinite shapes are excluded. Old legacy tuples therefore provide no seeds; no alternate key namespace or legacy-to-oRPC key fabrication exists.
- Restore gets the current generated key through the genuine caller callback, checks same path/input, obtains the current QueryClient's hash through public `defaultQueryOptions`, then hydrates an isolated QueryClient. This does not transfer an old request/principal scope prefix into the current client. Only the winning50ms race hydrates the destination; late results cannot overwrite it. The isolated client is cleared only after restore/dehydration actually settles.
- Save waits admitted late restores and serializes this producer's saves, retaining the installed persister's no-retry/source best-effort persistence behavior without throttler early-return races. Individual generation calls are tracked even when their `Promise.all` sibling rejects. Producer stop blocks new admissions and repeatedly drains accepted work including nested late restores/generation calls; it is settlement, not persisted-success proof. It does not stop the injected cache or generation owner.
- Source's restore errors remain caller-visible. Caller may preserve original `_creator.tsx` best-effort restore catch; cache storage methods themselves do not swallow native errors. No retryer, Redis fallback, fake readiness or success projection was added.

## Remaining bounded owner joins / holds

01 alone may join real caller grants/generation ports and generated-key resolver to this producer, intentionally configure the exact private mount, and compose shutdown: stop producer admissions/work, await every producer `stopAsync`, then await the cache owner's `stopAsync`, then tear down its owned Nitro storage. Host config/build/processes are untouched. The convenience storage owner and raw cache owner are alternatives over the same sole-owner slot, not two concurrent owners.

Existing read-decide-remove invalidation remains unconditional across producer instances/requests: the local cache key lane is not cross-request CAS. Retain DB authority/publication/invalidation holds. No active peer implementation or legacy Redis root was consumed as an accepted runtime. Auth/SQL generation backing and whole-request lifetime joins remain required; a typed callback alone is not their acceptance.

The accepted key encoder still rejects logical keys over512 UTF16 code units during operations, never truncates them. No new constructor rejection was added to the shared storage consumer. PostgreSQL board IDs are bounded at64 chars; SQLite's source `text` and validation `z.string()` do not establish a universal bound for imported IDs. Oversized historical IDs therefore remain an explicit best-effort cache limitation, not a claimed complete ID migration or a board-authority rule.

FS upstream `unlink` can resolve an Error that unstorage ignores; no deletion-failure proof/shim is claimed. Expired never-read entries/old fingerprints/unknown orphans are not reclaimed, and physical backing capacity/expiry is not bounded. Private mount identity does not prove disjoint filesystem directories. Sole-owner module ordering does not cover HMR/duplicate modules/external writers/processes. FS atomic rename is not CAS/durability; explicit memory is process-local disposable acceleration. These release holds remain unchanged.

## Validation — final frozen bytes

Owned disposable closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-wave32-lane30-Z53L4x`.

- Copied only the eight owned source files, JSON lint/format configs, actual declared Redis export manifest and dependency artifacts; no symlink/watch/peer source graph. Installed Nitro3.0.260903-beta/storage declarations, unstorage2.0.0-alpha.10, backend-declared Zod4.6.5 (copied from its existing exact artifact), TanStack5.101.2, SuperJSON2.2.6, TypeScript7.0.2, oxlint1.73.0, oxfmt0.58.0 and Node types24.13.3 were used. No installation.
- Each check ran with `env` restricted to an explicit Node24.18.0 PATH and temporary HOME, no env/credential load, no application runtime import. Typecheck: strict/noEmit/no incremental, owned includes only; exit0 and no diagnostics. Lint: actual root rules plus `--deny-warnings`; exit0, zero warnings/errors on8 files. Formatter `--check`: exit0.
- `source-hashes.json`, `validation-results.json`, `typecheck.log`, `lint.log`, `format.log`, isolated `tsconfig.json` retain evidence. Final hash comparison confirms owned source unchanged during checks. Earlier first lint surfaced9 warnings (source-default SuperJSON imports, one shadowed name, iterable spreads); these were repaired and final checks rerun. No warnings were suppressed.
- These are focused source/declaration checks, not whole-package/build/Nitro virtual-storage/runtime/race/native-failure/restart acceptance. No new or existing tests, build, install, listener, filesystem-cache IO, SQL, provider calls, real env/credentials/data, Git action or child agent ran.
