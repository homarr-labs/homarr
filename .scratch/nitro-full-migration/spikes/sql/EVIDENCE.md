# SQL adapter compatibility spike — 2026-10-10

## Outcome and authority

This independent Phase A investigation implements no product persistence adapter and closes neither #02 nor #112. Q11 remains a candidate choice; Q12 importer/in-place upgrade, Q13 board draft, Q14 delivery and Q15 session continuity remain held. No schema, migration, package source, application fixture, manifest, lockfile, index or roster was edited by this worker. No installs, stage/commit, branch/worktree changes, nested agents, current database access or provider calls occurred.

Direct Drizzle 0.45.2 over Bun SQLite and pg.Pool is a viable **bounded transaction candidate**, not production parity evidence. Pinned db0 0.4.1 supports sequential parameterized SQL and raw transaction/savepoint statements, but its shared connections require an additional transaction/execution ownership boundary. Its Drizzle integration does not import with installed Drizzle 0.45.2. Retained prepared statements also bypass db0's top-level disposal guard on both tested connectors.

Authority read: `EXECUTION.md` Phase A/validation constraints; `DESIGN.md` Q11–Q15/database evidence; `issues/02-sqlite-and-postgresql-product-persistence.md`; `research_notes/Homarr full Nitro migration/persistence-background.md` §§3, 5, 7–8. Context7 was not retried: the coordinator's fresh resolve already exhausted quota. Primary pinned docs and installed sources below supplied API evidence.

## Version and declaration verification before probe code

`apps/nitro-experiment/package.json` explicitly declares db0 0.4.1 and Nitro 3.0.260903-beta. `packages/db/package.json` and `packages/core/package.json` declare Drizzle/pg through the root catalog, which pins drizzle-orm 0.45.2 and pg 8.22.0. The experiment does **not** itself declare Drizzle/pg: the scratch probe resolves the existing workspace installations, not a new experiment dependency declaration. No hidden dependency installation was used.

Resolved versions, checked again inside the executed harness:

| Dependency/runtime      | Observed                      |
| ----------------------- | ----------------------------- |
| drizzle-orm             | 0.45.2                        |
| pg                      | 8.22.0                        |
| db0                     | 0.4.1                         |
| nitro                   | 3.0.260903-beta               |
| Bun                     | 1.4.2, darwin arm64           |
| native SQLite           | 3.54.0                        |
| owned PostgreSQL server | 17.9 (Debian 17.9-1.pgdg13+1) |
| TypeScript / @types/pg  | 7.0.2 / 8.20.0                |

## Executed public-driver oracle

`probe.ts` is a standalone diagnostic harness against public Drizzle/Bun/db0/pg APIs, not an implementation test or a new production transaction seam. It uses one synthetic `probe` table; no application models or migrators are imported. Assertions distinguish required successful behavior from deliberately reproduced unsafe-use schedules. All SQLite awaits are outside synchronous successful transaction callbacks; the negative callback case awaits only a synthetic gate, never a network operation.

| Behavior                    | Direct Drizzle/Bun SQLite                                                                                                                                                                               | Direct Drizzle/pg.Pool                                                                                                                                                                       | Pinned db0 0.4.1                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Value binding               | Integer, hostile-looking quote/comment/Unicode text and BLOB `[0,255,17]` round-trip; table survives                                                                                                    | Same text/integer/bytea values round-trip                                                                                                                                                    | Tagged templates and reusable bound `?` statements round-trip text/integer on both engines                                                                                                                               |
| Full rollback               | Duplicate-key failure after two writes restores original row and removes inserted row                                                                                                                   | Same result with awaited driver queries                                                                                                                                                      | Explicit BEGIN/update/ROLLBACK restores original value on both engines                                                                                                                                                   |
| Nested savepoint            | Nested rollback removes inner insert; outer update and following insert commit                                                                                                                          | Same via awaited `tx.transaction`                                                                                                                                                            | Explicit SAVEPOINT/ROLLBACK TO/RELEASE inside sequential transaction works on both engines                                                                                                                               |
| SQLite exclusion            | Two fresh connections to one owned file: immediate writer excludes second immediate writer with `SQLITE_BUSY`; second reader sees previously committed value; second writer succeeds after first commit | Not applicable                                                                                                                                                                               | Shared SQLite session accepts an unrelated insert into the active transaction; owner ROLLBACK removes it. Second BEGIN throws synchronously                                                                              |
| Async transaction ownership | **Unsafe callback demonstrated:** first update commits before callback's awaited gate; late update also persists after rejection, native `inTransaction=false`                                          | PID `[90,90]` across await; concurrent observer PID 91 reads old value, commits an unrelated row, and conflicting row update fails with SQLSTATE `55P03` under probe-only 150ms lock timeout | PG connector is one `pg.Client`, PID 92 for both logical callers. Unrelated acknowledged insert disappears on owner rollback. A second logical BEGIN/insert/COMMIT commits both owners' rows before first owner ROLLBACK |
| Lifecycle                   | Native `close(false)` leaves retained `.prepare()` usable; `close(true)` invalidates it and closes owned statements                                                                                     | Both clients idle/released before `pool.end()`, pool count becomes zero, subsequent query rejects                                                                                            | Top-level operations reject after idempotent `dispose()`. Previously prepared SQLite statement still executes; previously prepared PG statement reconnects from PID 92 to 93 despite `disposed=true`                     |
| Drizzle integration         | Installed direct adapters work                                                                                                                                                                          | Installed direct adapter works                                                                                                                                                               | `import("db0/integrations/drizzle")` throws `SyntaxError: Export named 'getColumnTable' not found` with Drizzle 0.45.2; no v1 integration behavior claimed                                                               |

The overlapping db0 PostgreSQL schedule is deliberately manual raw BEGIN/COMMIT usage, **not** an executed db0/Drizzle-v1 transaction test. The SQLite async-callback hazard also passes the installed Drizzle type declaration: generic callback return values do not themselves forbid promises. It must be excluded by the reviewed command/transaction port rather than relying on ORM typing alone.

Pinned runtime flags were measured rather than borrowed from latest docs: SQLite reports `json=true, transactions=true` and booleans/arrays/dates/uuids false; PostgreSQL reports all six true. Neither pinned database object exposes a `transaction` callback method. These flags indicate dialect/connector capability, not logical-request isolation, automatic transaction serialization, binary value parity or migration ownership.

## Exact execution and cleanup

Final successful run: `sql-spike-1791656151876-4001ba11`; structured evidence is [`results.json`](./results.json), including every final-run Docker command, exit code, stdout/stderr, resource identity and observation.

Commands issued from the repository root:

```sh
bun --version
bun -e 'for (const n of ["drizzle-orm", "pg", "db0", "nitro", "typescript", "@types/pg"]) { try {const p = require.resolve(`${n}/package.json`, { paths: [process.cwd()+"/apps/nitro-experiment", process.cwd()+"/packages/db"] }); const j = require(p); console.log(JSON.stringify({name:n,version:j.version,path:p}));} catch(e) {console.log(n, String(e));}}'
docker image inspect postgres:17 --format '{{.Id}} {{json .RepoDigests}}'
bun --help | grep -E 'env-file|no-env'
bun --no-env-file ./node_modules/typescript/bin/tsc --noEmit -p .scratch/nitro-full-migration/spikes/sql/tsconfig.json
./node_modules/.bin/oxlint --no-ignore .scratch/nitro-full-migration/spikes/sql/probe.ts
bun --no-env-file .scratch/nitro-full-migration/spikes/sql/probe.ts
```

Version/image discovery succeeded. The initial pin-resolution command used Bun's default environment-loading behavior; it queried only package metadata and output only names/versions/paths, never environment values. All actual database probes and TypeScript executions explicitly used `--no-env-file`. Docker child processes receive only PATH/HOME, not inherited application/PG environment settings; PG connections use explicit disposable configuration.

The probe command ran three times while bringing up the diagnostic harness:

1. Exit 1 before any Docker creation: db0's synchronous `exec` exception escaped a promise-only assertion. Fixed the diagnostic assertion to invoke the operation inside an async function. In-memory handles and its owned SQLite file closed/cleaned in `finally`.
2. Exit 1 before any Docker creation: case-sensitive guessed import-error text did not match the actual `getColumnTable` export error. Replaced that guess with a `SyntaxError` check and retained the actual message. Its fresh SQLite resources again closed/cleaned.
3. Exit 0: all successful behavior checks and all reproduced hazards in the matrix recorded; exactly one PostgreSQL container created and removed.

The first lint invocation reported one `consistent-function-scoping` warning in the temporary gate helper; replacing it with `Promise.withResolvers` resolved it. Final scoped lint and typecheck both exited 0 with no output. `skipLibCheck=true` scopes the TypeScript gate to the probe, not to upgrading/validating db0's v1-oriented dependency declarations. No broad repository check or suite ran.

Final-run resources:

- Fresh in-memory SQLite connections: force-closed with `close(true)`; db0's retained prepared statement was explicitly invalidated using the previously captured native handle.
- File: `.scratch/nitro-full-migration/spikes/sql/fixtures/sql-spike-1791656151876-4001ba11.sqlite`; both connections force-closed, this exact path and its possible `-journal`, `-wal`, `-shm` sidecars removed. `fixtures/` is empty.
- Container name: `sql-spike-1791656151876-4001ba11`; full created ID: `d738adee968910087db365c352e0405adb41820a1a6b0890ebc47f12f7814e3f`.
- Existing official image used with `--pull=never`: `postgres@sha256:2cd82735a36356842d5eb1ef80db3ae8f1154172f0f653db48fde079b2a0b7f7`; local image ID `sha256:0668926e2d4e44aca185cb03fbdb5fa76b2b615d4f95afa8a983e3afd61d5a54`. No image pulled/built/deleted.
- Listener: random host port `127.0.0.1:32772` → container 5432. No host 5432 reuse. Data: tmpfs `/var/lib/postgresql/data`, PGDATA `/var/lib/postgresql/data/owned`; inspected mounts `[]`, no host or named/anonymous volume mounts.
- Disposable identity/database `sql_spike_only`, password `disposable_sql_spike_only`, used only on that owned resource. These are synthetic local-only values, not copied credentials.
- `pg.Pool.end()` completed; db0's original connector was explicitly disposed after the retained-statement reconnect to close that otherwise leaked client. Final `docker rm --force d738adee968910087db365c352e0405adb41820a1a6b0890ebc47f12f7814e3f` exited 0. Exact-ID inspect then exited 1 with `no such object`.

Evidence limitation: initial-run `results.json` snapshots were replaced by the successful run, so the first two generated random SQLite basenames were not retained in final evidence. Both exact-path cleanup blocks completed before those later failures, no PostgreSQL container was created by those runs, and the owned fixture directory is empty. The successful-run resource identities and cleanup transcript above are preserved; this is not a historical per-attempt resource ledger.

Concurrent COMPOSITION changes appeared in root `package.json`/`apps/nitro/` during the spike. They are not this worker's writes and were neither modified nor reverted. Existing baseline changes remain untouched.

## Candidate boundaries for the sole #02 writer

1. **Domain repositories:** expose scoped domain DTO/query/compound-command methods; inject the owned transaction handle internally. Do not export a global SQL instance, allow domain code to issue BEGIN on a pool, or make repository access an authorization substitute. Identity/board/integration/media/settings owners still supply their specific semantics.
2. **Discriminated transaction ports:** SQLite sync operations with explicit immediate/deferred selection and nested synchronous savepoints; PostgreSQL async operations with one checked-out client for BEGIN/body/savepoints/COMMIT/ROLLBACK/release. Exclude promise-returning SQLite callbacks at the type boundary and keep network/preparation/effects outside the callback. A runtime returned-thenable check must throw inside the native transaction before commit and revoke the handle so resumed code cannot write; it cannot undo an already-started external effect. A `() => void` type alone is insufficient because TypeScript permits async functions there. Consider dialect-dispatched precomputed command plans instead of arbitrary callbacks.
3. **No escaped handles:** all queries within a command use its transaction port; do not capture the outer pool/database. Define expired/closed transaction-handle behavior and keep prepared statements inside lifecycle ownership. Direct Drizzle does not by itself prevent caller misuse of the outer instance.
4. **Error port:** preserve constraint/conflict, busy/lock-timeout, serialization/deadlock, closed/not-ready and unknown causes as distinct results. `SQLITE_BUSY` and `55P03` were observed here; serialization/deadlock/retry policy is not verified or approved. Avoid automatic retry of arbitrary effects.
5. **Lifecycle/maintenance port:** configure/open → explicit schema/migration readiness → permit work; maintenance denies new work, drains in-flight operations, invalidates handles/statements, then closes every owned connection. Bun force-close and PG pool end need explicit ownership. Nitro's lazy database cache is not that owner. This spike establishes neither the maintenance drain nor safe restore/replacement.
6. **db0-first option:** possible only with reviewed exclusive transaction and ordinary-query scheduling, plus explicit retained-statement disposal/close semantics. A mutex covering only BEGIN/COMMIT while unrelated raw queries bypass it does not solve the demonstrated hazard. A checked-out-client/custom connector or safe execution broker would be separate implementation work; no adapter wrapper is implemented here.

Retaining direct Drizzle 0.45.2 is a lower-change candidate for these transaction duties. db0-first remains an option, not a rejected product decision. No ORM upgrade, new schema mapping, v1 RC integration, importer, re-login/session deletion or PRAGMA/default policy is selected.

## Compatibility limits and primary evidence

Not verified: 40 real models/relations/casing/defaults/constraints; 49 SQLite/17 PG migrations or custom transformations; copied-old/interrupted/repeated startup; restart durability; production Linux/Windows Bun/native binaries; timestamps/booleans/SuperJSON/encryption/collation; db0 binary binding; backup/restore/maintenance; abort/drain; every connection factory; saved-session continuity; deadlocks/serialization retry; full pool-BEGIN failure paths. db0's declared `Primitive` excludes Buffer/Uint8Array and bigint, so binary support must be separately verified rather than inferred from flags. The tested SQLite fixture stays in delete journal mode with probe-only zero busy timeout; WAL/synchronous/default policy remains undecided.

Primary sources read on 2026-10-10:

- [Pinned Nitro database docs](https://raw.githubusercontent.com/nitrojs/nitro/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/50.database.md) and installed `node_modules/nitro/dist/runtime/internal/database.mjs`: opt-in experimental connector layer, lazy named cached database objects; no transaction scope or lifecycle drain in this module.
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions), with installed `node_modules/drizzle-orm/bun-sqlite/session.js:31–54` and `node_modules/drizzle-orm/node-postgres/session.js:180–221` authoritative for 0.45.2: synchronous native SQLite transaction/savepoints versus checked-out awaited PG transaction and release. PG BEGIN precedes that implementation's try/finally; failure during BEGIN is an additional untested lifecycle cell, not a proven leak here.
- [node-postgres transaction guidance](https://node-postgres.com/features/transactions) and installed `node_modules/pg-pool/index.js:431–484`: `pool.query` checks out/releases for each statement; BEGIN/body/COMMIT through separate pool queries cannot guarantee the same client. This is source/documentation evidence; no additional pool misuse experiment was needed.
- [Bun 1.4.2 SQLite docs](https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.2/docs/runtime/sqlite.mdx): synchronous transactions and close(false)/close(true) distinction; platform-specific WAL details remain outside this fixture.
- Installed `node_modules/db0/dist/index.mjs:42–98`, `dist/_chunks/types.d.mts:53–61,171–217`, `dist/_chunks/statement.mjs`, `dist/connectors/bun-sqlite.mjs`, `dist/connectors/postgresql.mjs`, `dist/_chunks/postgresql.mjs`: pinned capability declarations, promise-wrapped sync SQLite, lazy shared PG Client, parameter normalization, wrapper-level disposal guard and escaped statement behavior. These pinned files take precedence over current-main claims.
- [Current db0 Drizzle guide](https://db0.unjs.io/raw/integrations/drizzle.md), installed `node_modules/db0/dist/integrations/drizzle/index.mjs` and `dist/_chunks/sqlite.mjs`: v1-oriented API/relations/casing, no assumed drop-in compatibility. Import failure is the executed evidence; v1 transaction behavior is not certified.

The deliverables are `probe.ts`, `tsconfig.json`, `results.json` and this evidence note, exclusively inside the assigned spike directory. No publication or policy hold is cleared.
