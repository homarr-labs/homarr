# Onboarding transitions — frozen body/candidate preparation

## Outcome and exclusive files

Prepared exactly `onboard.nextStep` and `onboard.completeSetup`. Both remain dependency-held: zero coupled handlers, zero mounted/accepted leaves and no production-authority claim. Builders deliberately have no `.handler`; preparation candidates are not RPC results or authority evidence. Docker's frozen files and the existing four native onboarding leaves were not changed.

- `packages/api/src/nitro/routers/onboard-transitions.ts`
- `packages/api/src/nitro/routers/-onboard-transitions/resources.ts`
- `packages/api/src/nitro/routers/-onboard-transitions/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-onboard-transitions.md`

## Exact two-leaf inventory

| Source identity         | Source kind/schema/output                                                                 | Prepared body versus hold                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboard.nextStep`      | Mutation; no input/output schema; void result; no MCP/OpenAPI metadata                    | Claimed-access builder; first normalized-current guard, second normalized-current read/no-op, user existence read, credentials→user / LDAP-or-OIDC→group / otherwise setup precedence. Paired source SQL update bodies prepared. Transaction-time authority/claim/no-user/current-step producer and conditional transition coupling remain absent. |
| `onboard.completeSetup` | Mutation; exact `onboardingCompleteSetupSchema`; no output schema or MCP/OpenAPI metadata | Setup-step builder, entire source business preparation, exact source output projection retained internally and paired SQLite/PostgreSQL SQL bodies prepared. Current-authority/claim/no-user predicate plus atomic plan/step/claim transaction coupling remain absent.                                                                             |

`createOnboardTransitionBuilders` reuses sourceProcedure's guarded demo predicate before claimed access, its admin bypass versus no-user/valid-claim read path, then normalized setup-step requirement for completeSetup. These existing read checks are not promoted to commit authority. No principal/session is manufactured. Creator ID uses the real authenticated BackendContext principal or null, matching the source optional session user.

## Source business preparation retained

Read the entire source onboarding router and queries, claim helper, frozen setup-read adapter, shared onboarding validation, server-setting reads, integration connection/secret-selection implementation, native stable-ID/step helpers, physical schema exports, key codec and actual driver transaction declarations. The complete setup plan is inline in the source router, not a separate plan module.

- Exact target-board selection and errors; zero-board pending row, Mobile/Base layouts and all board defaults; SHA-256 stable source IDs via the existing frozen helper; ordinary createId calls in source order.
- Integration connection tests remain concurrent and outside SQL; MissingSecretError maps to BAD_REQUEST; failed connection results still warn and allow planning. No failed test is relabeled success. Concrete source testConnectionAsync/MissingSecretError resource identities are typed rather than replaced with controller callbacks.
- Exact existing integration/app lookups, deterministic references, existing integration appId reuse, ID collision/selection errors, icons/ping/description fallbacks and per-secret encryption via the typed source key codec. Encryption/key ownership is not bound here.
- Exact selected Docker source discovery/filtering, missing/ignored IDs, label board-name normalization, fresh-board naming predicate and name collision checks. Discovery is a typed actual Docker primitive, not an ambient import or new Docker operation.
- Exact root-section reuse/creation, required columns/gutter priority, widget compatibility/capacity/batching, existing item/integration references, app placement, grouped Docker container packing and skipped-widget projection. Malformed existing app options remain non-destructive; no layout or algorithm correction.
- Exact four server-setting reads/default merges/serialization and insertion order: appearance, culture, analytics, board. Typed setting tuples replace the legacy Object.entries key assertion without changing order or values.

The internal completeSetup candidate preserves the source final `{ boardId, boardName, docker: { missingSourceIds, ignoredSourceIds, skippedWidgets } }` under `sourceOutput`. The candidate also contains inputs and encrypted plan material; it must never be returned through the leaf. A future accepted wrapper may expose only sourceOutput after an authorized successful commit.

## Errors and normalized-step behavior

Shared builder guards retain FORBIDDEN `Mutations are disabled in demo mode`, FORBIDDEN `This onboarding session is not claimed.` and FORBIDDEN `Step denied` in source order.

Next-step body retains PRECONDITION_FAILED `The welcome step is already complete.` The existing normalizeOnboardingStep is reused: user/group/setup/finish unchanged; settings/integrations→setup; unknown/null/missing→start. Credentials with no user wins before LDAP/OIDC.

Complete-setup bodies retain the exact source codes/messages/order:

- NOT_FOUND `The selected board no longer exists.`
- BAD_REQUEST `Select the exact board to configure when more than one board exists.`
- BAD_REQUEST with the actual MissingSecretError message.
- BAD_REQUEST `Onboarding app source IDs resolve to the same app.`
- BAD_REQUEST `A new integration cannot also be selected by ID.`
- BAD_REQUEST `A new app cannot also be selected by ID.`
- BAD_REQUEST `One or more selected integrations no longer exist.`
- BAD_REQUEST `One or more selected apps no longer exist.`
- BAD_REQUEST `The selected homarr.board label is not a valid board name.`
- CONFLICT `A board with this name already exists.`
- PRECONDITION_FAILED `The target board has no layouts.`
- CONFLICT `Onboarding setup was already completed.` in each driver's conditional setup transition.

No additional legacy-step migration was invented: normalized middleware can admit settings/integrations, but the source completion SQL still matches raw step `setup`. That source behavior is preserved, not repaired.

## Paired SQL bodies and atomic semantics

The resource contract names actual typed physical SQLite/PostgreSQL schemas, eq/inArray operators and actual database transaction primitives. Transaction parameter types are extracted from the installed driver APIs; no cast or synthetic transaction is used. SQL helpers require an already-owned transaction and do not start one, commit one, return success or accept a generic domain apply callback.

CompleteSetup bodies retain this exact SQL order within the future single transaction: conditional setup→finish with previousStep setup and exactly-one affected-row check; app upserts; integration upserts and existing-secret deletion then encrypted-secret insertion; board/layout writes; main/sidebar/container sections; section layouts; items; item layouts; integration-item references; four setting updates; Everyone group home/mobile-board references; onboarding claim-setting deletion. Any failure must roll the entire unit back. SQLite uses synchronous `.run()` and changes; PostgreSQL uses awaited builders and rowCount ?? 0. No asynchronous SQLite/Bun transaction callback, pool/client creation or engine policy modification exists.

NextStep preserves the source's initial guard and second read/no-op, but its source SQL update has no WHERE or affected-row condition. This is explicitly a source body, not an accepted conditional commit. A concrete native current-step/claim/current-authority producer is still required; this lane does not invent a condition, boolean, lease or authorization callback to disguise that missing security join.

## Genuine binding holds

1. Existing setup-read resources establish only request-scoped reads. Missing mutation authority must establish current admin rights or the exact valid, unexpired stored claim with no users at transaction time, together with required step/demo predicates. An initial principal/read boolean is not that producer.
2. The native producer must pair the predicate, conditional transition, prepared physical plan and claim deletion with one resource-owned atomic unit. Stale user-empty checks, claim value/TTL, step races and arbitrary prepared inputs cannot be converted into SQL COMMIT permission here.
3. A future SQLite binding must run only synchronous SQL under G3 ownership. A PostgreSQL binding must use its owned checked-out transaction/session; BackendContext/preparation currently has the source SQLite-typed read surface, so accepted paired PostgreSQL preparation/admission remains a binding hold. No unsafe driver/schema cast was introduced.
4. Concrete provider configuration, integration clients, Docker discovery, key codec/IDs, settings reads and physical schema resources must be bound by their owners, outside the SQL transaction. Those primitive interfaces are faithful source dependencies, not transaction authority or fabricated safe services.
5. Candidate inputs/plans/read snapshots must remain internal and coupled to the authorized commit producer. No handler is installed until these joins are concrete and reviewed. This is the explicitly requested unsupported-coupling fallback, not a runnable mutation backdoor.

## Comparison, deferred validation and freeze

Read-only textual source comparison matched the full completeSetup preparation after explicit context/resource/ORPC-error substitutions, comment removal and whitespace/trailing-comma normalization. Both driver SQL bodies matched after ORPC-error substitution and the typed setting-iteration change. All twelve completeSetup message occurrences/order matched, and the internal sourceOutput projection matched. NextStep was manually compared against both source router and query helper, including its second read/no-op and provider precedence.

Declared dependencies verified in packages/api/package.json: @homarr/auth/common/core/db/definitions/docker/validation, @orpc/server beta.43, superjson, zod and drizzle-orm. Installed SuperJSON parse/stringify and SQLite/PostgreSQL transaction/run declarations, public package exports and existing native procedure APIs were read before writing. No network documentation calls.

No source preparation, query, claim, mutation, provider or SQL body was invoked. No lint/typecheck/build/test/format/install command or new test; no nested agent, Git, credentials/environment/current-data access, listeners/browser/containers or 3100/3200 changes. Validation and coordinator review remain outstanding. Central 91/334 and production gates are unchanged. Three new code files and this handoff only; frozen on return.
