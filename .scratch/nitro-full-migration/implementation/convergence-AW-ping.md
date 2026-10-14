# AW ping normalization — narrow source freeze

Applied the approved repair only in `packages/auth/nitro/production-sessions/sql-persistence.ts`, inside `captureAppCreate`.

- Captured `values.pingUrl` as immutable `sourcePingUrl` from the existing detached `ownRecord` result.
- Preserved the identical validation predicate and `AppMutationPreconditionError`.
- Initialized the separate normalization variable after the guard, allowing inference as `string | null | undefined` without a cast or default.
- Preserved empty string -> null, undefined, null and valid strings, together with both detached freezes.
- Scope, evidence, settlement, schemas and all other AW source remain unchanged.

Read `WRITER-RULES.md`. No commands, checks, tests, runtime/native/SQL/data execution, secrets or nested agents were used. The coordinator's app diagnostics and additional owner proxy diagnostics are supplied premises, not independently validated results. Source is frozen; no compiler/runtime PASS is claimed, and existing activation/publication holds remain unchanged.
