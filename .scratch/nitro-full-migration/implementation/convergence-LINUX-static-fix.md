# Linux supervisor static syntax amendment

The coordinator reported focused control typecheck and lint exit codes of 1, including TS2483 at supervisor.ts:646: a type annotation is forbidden on a for-of declaration.

The isolated source correction assigns the already array-guarded `list` to `const entries: unknown[] = list` and iterates with `for (const entry of entries)`. Element validation through `record(entry)` remains unchanged; no explicit `any`, casts, suppressions, or comments were added.

Approved control semantics, environment and cache settings, fixture freshness, guards, shutdown, and all other logic remain unchanged. Prior reports and the coordinator's `nitro-post-catalog-aEGvEpXI/control-{types,lint}.*` failure artifacts were not modified.

No commands, checks, tests, runtime, native, SQL, or environment inspection were performed. An isolated static recheck remains with the coordinator; no cache execution or boot release is claimed.
