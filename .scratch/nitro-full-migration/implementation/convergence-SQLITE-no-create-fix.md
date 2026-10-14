# SQLite no-create fix — frozen narrow handoff

## Applied amendment

Applied the exact amendment approved by `convergence-SQLITE-no-create.md` to `packages/core/src/infrastructure/db/drivers/sqlite.ts:18`: added `readwrite: !options.readonly` to the existing constructor options, expanding only that statement for formatting. Retained `readonly: options.readonly`, `create: false`, and `strict: true`.

Every other body, interface, cast, foreign-key initialization, Drizzle construction, proxy, transaction, and cleanup remains unchanged. No other source files, comments, casts, tests, or framework changes were introduced. The separately mutating K4 engine is excluded.

## Supplied coordinator evidence

The coordinator reports an already completed isolated Bun 1.4.2 primitive probe with network disabled, a read-only root filesystem, nonroot execution, and tmpfs storage; no product imports or SQL. Supplied observations: current options created an absent synthetic path; explicit writable options rejected an absent synthetic path with `SQLITE_CANTOPEN` and left no file; explicit writable options opened an existing empty synthetic file; the readonly branch opened that existing file. All closes settled and the reported numeric exit status was 0. Supplied receipt reference: `TEMP/nitro-convergence-final-5QDWgFTY/sqlite-no-create.*`.

These are coordinator-supplied observations, not independently read or rerun by this writer. They do not prove product-driver execution, native freshness, writer closure, adoption, or readonly write enforcement. The source amendment corrects opening flags only; file-provenance gaps and all existing holds remain unchanged.

## Freeze and remaining dependencies

Author changes are frozen. No commands, checks, tests, builds, runtime/native/SQL execution, environment/data/secret access, or nested agents were used. Coordinator owns focused lint and typechecks after author freeze; no compiler, runtime, or procedure acceptance is claimed. Any broader provenance, freshness, closure, adoption, or write-enforcement work requires separate authorization.
