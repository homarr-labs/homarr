---
status: accepted
---

# Bounded Board access replacements

Board access replacement needs DELETE-before-INSERT atomicity on synchronous SQLite and asynchronous PostgreSQL. Use the db-owned `executeWritePlanAsync(db: HomarrDatabase, plan: readonly SQL[]): Promise<void>` only for separate Board User and Group access replacements, rather than exposing a shared async transaction callback that cannot respect SQLite's synchronous lifetime.

## Contract

- Build trusted, parameter-bound statements before execution: DELETE one Board's access rows, then optionally INSERT the replacement rows in input order. An empty replacement still deletes; an empty plan is a no-op.
- Execute the snapshotted plan in one synchronous SQLite transaction or one PostgreSQL transaction with sequential awaits. Resolve with `void` after commit; reject after rollback, preserving existing native SQLite errors and PostgreSQL error causes.
- Keep the existing Board authorization before persistence and preserve constraint failures; do not deduplicate replacement rows or combine User and Group saves.
- Match the database handle, mapped schema and process driver. `HomarrDatabase` remains the existing SQLite-shaped facade; PostgreSQL execution uses the existing driver dispatcher, not a new cross-driver type guarantee.
- This is a bounded internal write seam, not a SQL sandbox or repository layer. Results, caller callbacks, retries, nested execution, read-dependent branching and unrelated write migrations are excluded. Statements and captured values must remain unchanged during execution.

The existing dispatcher still supports paired driver callbacks, and insert collections remain useful for ordered inserts, but neither provides a single replacement implementation including deletion. This decision adds the execution seam only; caller migration is separate work and does not change isolation or serialize concurrent replacements.
