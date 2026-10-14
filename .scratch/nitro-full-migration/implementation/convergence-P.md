# Convergence P — frozen App create producer

Source-only freeze under `WRITER-RULES.md`, `CONVERGENCE-NEXT.md:39`, BP Oracle allocation and `convergence-C0.md`. Added only `packages/db/runtime-app/contracts.ts`, `packages/db/runtime-app/statements.ts` and this report. No other source, facade, exports, manifests, schema, migrations, Auth, runtime, gate or backend changed.

## Frozen private contract

- `AppInsertValues`: readonly generated `id`, `name`, `iconUrl`, nullable `href`, optional nullable `description` and `pingUrl`.
- `AppMutation`: exactly `{ kind: "create", values: AppInsertValues }`.
- `AppMutationResult`: `AppInsertValues & { readonly appId: string }`.
- `captureAppMutation(input: AppMutation): AppMutation`: copies only the six source insert fields into detached frozen values and freezes the discriminator. Preserves optional undefined/null values. Converts only empty `pingUrl` to null, matching `packages/api/src/nitro/routers/app.ts:245–255`. Does not generate or retry an ID, trim values, validate URLs again, add ownership or accept arbitrary insert fields.
- `AppMutationPreconditionError`: `code = "APP_MUTATION_PRECONDITION"`; rejects an unsupported runtime discriminator.
- `AppMutationPermissionError`: `code = "APP_MUTATION_PERMISSION"`; rejects missing current expanded `app-create` permission. Later transport integration must map this to the original permission-denial behavior without replacing native outcome errors.

## Concrete synchronous unit

`executeAppMutationSync(database: HomarrDatabase, mutation: AppMutation, credential: NativeCredentialEvidence, configuration: NativeCredentialPolicyConfiguration): AppMutationResult` recaptures the exact values before policy observation, calls C's actual private `readNativeCredentialPolicySync` with the same database, requires returned expanded `app-create`, then synchronously executes the original plain app insert and returns `{ appId: insertValues.id, ...insertValues }`.

The reader and evidence/configuration types are direct private relative imports from C, shared with Board. No credential/domain/actor/membership/grant SQL, permission expansion or witness validation is duplicated here. C must supply the real ready-domain, exact adopted credential, current actor/provider, complete bounded membership and expanded current global-grant reader; its frozen C0 signature is a required dependency, not a successful stub. At this producer freeze, C's `statements.ts` and `validation.ts` were not yet present when inspected and are being implemented concurrently.

The database parameter must be the existing transaction-scoped handle supplied by the retained runtime's `boundedTransactionSync`. This leaf opens no connection or transaction, performs no native COMMIT, awaits no provider/bcrypt work and accepts no permission callback or detached policy. SQLite table import and `.insert(...).values(...).run()` reuse current DB types and scoped-query patterns. There is no engine cast or PostgreSQL execution path. Plain insert uniqueness/FK/native errors propagate unchanged; no conflict handling, ownership condition or replay is added. The returned object is a unit result, not evidence that the surrounding native transaction committed.

## Required pending integration; no activation

1. C must land its actual frozen synchronous credential-policy reader and canonical validation. No local substitute or optional dependency is permitted.
2. D must invoke the fixed unit inside the retained native SQLite immediate transaction, capture business values/generated ID before deferred work, and retain trusted producer configuration plus exact owned credential evidence. Session operation deadline must be clamped before gate creation; the existing gate remains responsible for settlement, cleanup, physical drain and nonretryable ambiguous COMMIT.
3. D must join durable credential schema, evidence mutation and the tracked/drained adoption workflow with genuine first-adoption/resume provenance. Coordinator owns package exports/facades, actual migration identities and target/catalog integration.
4. Later exclusive Auth/main/API scope must extract evidence from the genuine owned lease, preserve exact request/principal association and original validation/middleware/error order, retain work through SQL settlement, and mount only this implemented App create leaf after writer closure. Do not route writes through a generic wrapper that replaces native errors or postchecks successful settlement.

Generic COMMIT authority remains unsupported. Other App writes, unjoined credentials/grants, PostgreSQL, source API activation, restore/replacement and protected publication remain held. No commands, checks, tests, builds, SQL/native/runtime execution, real data, credentials, providers or sealed evidence were used. Coordinator must perform focused lint/type checks after all reached writers freeze; no compiler, runtime, procedure or activation acceptance is claimed.
