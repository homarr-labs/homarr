# Bun SQLite migration scratchpad

Updated 2026-10-16.

## Runtime decisions

- Keep `DB_DRIVER=better-sqlite3` and the existing SQLite schema/migrations/file format. The setting chooses the SQLite dialect; the JavaScript runtime chooses its native client.
- `openSqliteDatabase(filename, config, options)` opens Bun's built-in `bun:sqlite` and `drizzle-orm/bun-sqlite` on Bun; Node retains `better-sqlite3` and its corresponding Drizzle adapter.
- Both clients expose the minimal synchronous SQL interface needed by backup readers/restores. The helper supplies a schema-preserving `SqliteDatabase<TSchema>` and a matching migration function. Existing conditional writes retain `changes` and `lastInsertRowid` metadata.
- Every Bun connection explicitly enables foreign keys and sets a 5,000 ms busy timeout, matching the existing Node driver's defaults. This also applies to read-only backup readers.
- Drizzle 0.45.2 declares its Bun run result as `void`, while its implementation directly returns `Statement.run()`. Bun 1.4.2 returns `{ changes, lastInsertRowid }`; focused runtime checks verified both fields and conditional updates affecting zero rows. The local module contract corrects that adapter type without erasing the schema or introducing Bun global types into Next.js.
- Lazy module names through `createRequire(import.meta.url)` keep Bun-only modules out of Node/Next.js resolution. Backend assembly must retain `drizzle-orm` as a runtime dependency.
- SQLite migrations, the small proxy settings reader, backup exports and temporary backup restores now use the same runtime selection. Node migration scripts remain supported.

## Discovered compatibility issues

1. `new Database(filename, {})` and `{ readonly: false }` fail with `SQLITE_MISUSE` on the available Bun versions. Normal opens use explicit `{ readwrite: true, create: true }`; backup readers use `{ readonly: true }`.
2. A read-only WAL checkpoint fails with `SQLITE_IOERR_WRITE`. Export now uses a parameterized `VACUUM INTO ?` directly. A live WAL smoke confirmed that the resulting backup includes committed writes from the WAL without checkpointing or changing the live database.
3. Referencing global Bun declarations in shared core code adds Bun's `fetch.preconnect` requirement to frontend compilation. Shared driver code uses local module contracts instead; Bun typings stay in the backend app.
4. The existing Node CJS migration bundle emits esbuild's `import.meta` warning for the unexecuted Bun branch. The resulting bundle was run successfully under Node 24.18.0 with its native addon staged at the same `build/better_sqlite3.node` path used by the container.
5. Direct pragma probes found Bun defaults to `foreign_keys=0` and `busy_timeout=0`, while the existing Node driver uses `foreign_keys=1` and `busy_timeout=5000`. Without explicit parity, cascading deletes, set-null relationships and concurrent administration writes would change behavior. Bun opens now set both pragmas before creating the Drizzle session.

## Focused validation

All runtime checks used isolated databases under `/tmp`; no user database was read or changed. Toolchain: `mise exec -- bun` = Bun 1.4.2, Node 24.18.0.

- Core and database package typechecks passed after the driver change.
- In-memory Bun smoke passed insert metadata, zero-row conditional update, schema-aware relational reads, transaction commit and transaction rollback.
- Node created a database using the current Homarr SQLite migrations. Bun reopened and migrated the same file, updated onboarding data, read onboarding/default locale through the independent proxy reader, and exported/read an integrity-checked snapshot. Node then reopened the Bun-written database and passed `PRAGMA integrity_check`.
- A separate WAL database kept its writer open while a read-only Bun connection created a `VACUUM INTO` snapshot; the backup contained the committed row.
- Bun foreign-key parity smoke rejected an orphan insert, cascaded a child delete, set a nullable relationship to null, and confirmed the same configured pragmas on a read-only connection.
- A separate Bun process held a write lock for 350 ms. The migrated connection waited approximately 453 ms and then completed its write, confirming lock contention is retried instead of failing immediately.
- The existing SQLite migration source was compiled using `@homarr/db build:sqlite`, then the compiled CJS bundle completed migrations, seeds and custom migrations under Node using an ephemeral database.

No test files were added. No broad test suite or Docker build was run for this subtask. Full HTTP backup authorization, upload limits and process restart remain part of the enclosing backend acceptance checks.

## Primary references

- [Bun SQLite runtime documentation](https://bun.com/docs/runtime/sqlite)
- [Bun SQLite API reference](https://bun.com/reference/bun/sqlite)
- [Drizzle Bun SQLite adapter](https://orm.drizzle.team/docs/sqlite/connect-bun-sqlite)

Installed Drizzle 0.45.2 driver, session, migration implementation and declarations were also inspected to verify the exact adapter contract used by this checkout.
