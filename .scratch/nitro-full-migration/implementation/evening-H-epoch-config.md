# Evening H — serialized epoch config amendment freeze

Only product delta: `apps/backend/src/server/startup-configuration.ts:152` adds the required version-1 persistence field:

```ts
epochInitializationTimeoutMs: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
```

Missing, nonnumeric, fractional, zero, negative, infinite or unsafe-integer values reject during existing strict JSON validation before database allocation. No coercion, optional field, default or fallback. The actual numeric value remains in the readonly validated persistence object passed to `captureHostConfiguration`; the existing typed `PublicHostConfiguration` return/capture path is unchanged. P owns the forthcoming required contract/capture implementation; no active P body was read or edited here.

## Caller contract update

The prior six-file handoff is preserved unchanged; its version-1 example now additionally requires `host.persistence.epochInitializationTimeoutMs`. The synthetic proof caller must choose an explicit positive safe integer in milliseconds. There is no application-selected timeout.

For example, **only if that caller explicitly elects a 10000 ms bound**, its persistence object is:

```json
{
  "engine": "sqlite",
  "mode": "fresh",
  "path": "/ABSOLUTE/OWNED/RUN/data/main.sqlite",
  "migrationsFolder": "/ABSOLUTE/OWNED/RUN/assets/sqlite",
  "epochInitializationTimeoutMs": 10000
}
```

That literal is conditional illustration, not a default, actual proof configuration or execution result. Substitute the caller's chosen bound and actual owned canonical paths. Versioned listener/origin alignment, empty base path, private path checks, fresh-only policy, culture option preservation and primary/cleanup failure handling are unchanged.

## Receipt

The amendment is frozen for independent joint H/P/U review after all owners return. Only this single leased source file and this directly absence-checked new handoff were patched. No other H path, runtime/native/assembly/contract/configuration/U/D file or previous report was read or modified in this follow-up. No commands/checks/compiler/lint/runtime/build/install/tests/native/SQL/data/.env/secrets/Git/children/Context7. No production readiness, new proof or acceptance-count claim.
