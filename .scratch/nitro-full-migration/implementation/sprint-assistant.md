# Assistant backend-router sprint

Status: native source preparation only, unmounted and producer-held. No accepted-count change; the central 91/334 remains untouched. All 19 source leaves have concrete handler bodies, but none is claimed production-bound, validated, or accepted. This lane is frozen on return.

## Exclusive files

- `packages/api/src/nitro/routers/assistant.ts`
- `packages/api/src/nitro/routers/-assistant/resources.ts`
- `packages/api/src/nitro/routers/-assistant/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-assistant.md`

No shared context, procedure, errors, contribution, map, index, manifests, lockfiles, legacy routers, DB/Core/Auth, host, or other lane was edited. No registration or mounted contribution was added.

## Complete source leaf inventory

Every row below has a native `createAssistantProcedures` handler body and remains producer-held. Q means query; M means mutation. Protected means authenticated without the provider-settings admin permission. Guarded preserves the shared demo guard; exception preserves the source conversation-only authenticated demo-write exception.

| Exact source path                  | Kind | Access    | Demo      | Additional producer dependencies                                                                       |
| ---------------------------------- | ---- | --------- | --------- | ------------------------------------------------------------------------------------------------------ |
| `assistant.getAvailability`        | Q    | protected | guarded   | Configuration SQL and authoritative demo mode                                                          |
| `assistant.getContextEntities`     | Q    | protected | guarded   | Board/integration grants, home-board settings and entity SQL                                           |
| `assistant.getModelCapabilities`   | Q    | protected | guarded   | Model discovery/cache, provider credential codec and HTTP                                              |
| `assistant.getRuntimeOptions`      | Q    | protected | guarded   | Model discovery/cache, credential codec, HTTP and demo mode                                            |
| `assistant.getAdminConfiguration`  | Q    | admin     | guarded   | Configuration SQL and configured Homarr runtime URLs                                                   |
| `assistant.updateConnection`       | M    | admin     | guarded   | Configuration writes, secret codec and configured Homarr URLs                                          |
| `assistant.clearCredentials`       | M    | admin     | guarded   | Configuration writes                                                                                   |
| `assistant.discoverModels`         | Q    | admin     | guarded   | Forced model discovery/cache, secret codec and HTTP                                                    |
| `assistant.updateConfiguration`    | M    | admin     | guarded   | Configuration writes, model discovery, secret codec and HTTP                                           |
| `assistant.listThreads`            | Q    | protected | guarded   | Owner-filtered thread SQL                                                                              |
| `assistant.createThread`           | M    | protected | exception | Thread/configuration SQL and real ID generation                                                        |
| `assistant.updateThreadModel`      | M    | protected | exception | Owned thread writes, model discovery and demo mode                                                     |
| `assistant.getThread`              | Q    | protected | guarded   | Owned thread/message SQL                                                                               |
| `assistant.getGenerationTelemetry` | Q    | protected | guarded   | Owned message SQL, generation-token verifier, secret codec and trusted-certificate telemetry transport |
| `assistant.renameThread`           | M    | protected | exception | Owned thread writes                                                                                    |
| `assistant.deleteThread`           | M    | protected | exception | Owned thread deletion and real foreign-key cascade                                                     |
| `assistant.appendMessage`          | M    | protected | exception | Owned thread/message writes                                                                            |
| `assistant.submitFeedback`         | M    | protected | exception | Owned message transaction and actual SQLite/PostgreSQL driver/schema dispatch                          |
| `assistant.deleteMessages`         | M    | protected | exception | Owned thread/message deletion and timestamp writes                                                     |

All rows also require the genuine `BackendContext` database/principal producer and `authority.assertCurrentAsync` binding. `assistantImplementedPaths` records bodies, while `assistantProducerHeldPaths` explicitly records the same held identities. Neither list is an acceptance declaration.

## Source equivalence

- Compared `router/assistant.ts`, availability, parent ordering, generation access/telemetry, provider definitions, integration authorization, board listing/access/home-board algorithms, physical assistant schemas, database transaction dispatch and server-setting reads. No tRPC caller, session/JWT decision, ambient environment initialization, or generic controller/execute delegation was carried into the draft.
- Source availability is protected, not anonymous and not admin-gated. Availability checks the real provider API-key requirement, enabled flag, model ID and demo mode. Admin-only connection/configuration/discovery gates remain separate. Conversation mutations retain only the existing authenticated demo exception.
- Input schemas, limits, nullable/optional fields, trims, provider enum, header validation, defaults and ignored `createThread.localId` match source. `discoverModels` retains the sole explicit output schema, including model-field bounds. Other output projections/undefined mutation results remain source-shaped.
- Configuration ID remains `default`. Runtime URL precedence is Workshop URL then Homarr website URL then the real preset. Admin responses expose configured booleans, never keys or headers. Connection changes clear/reset exactly the source fields; fresh inserts supply the connection fields and retain database defaults for enabled, web search, model ID and timestamp.
- Discovery retains `/models` handling, authentication headers, custom-header override precedence, 15-second timeout, endpoint/status/JSON errors, 1,000-model bound, real tool/text filtering, ID/name/context/pricing/modality normalization and locale sorting. The injected cache preserves the provider/base/path/updatedAt key, ten-minute TTL, refresh bypass and clear-before-set behavior. It must be a process-owned cache, not a new per-call map.
- The existing demo-only `homarr-assistant` presentation row and configured-model fallback are conserved source branches, not invented provider availability or discovery results. Capability/discovery failure fallbacks and model-label resolution retain the source behavior.
- Context listing ports the actual board listing SQL rather than calling the old router. Owner/public/grant/board-view-all selection, integration grant prefilter, source empty-group sentinel, app/integration 250 limits, widget 500 limit, order, home-board fallback and output category ordering are retained. Native pure integration policy receives only the already-filtered grants and the corresponding principal/group IDs. The non-leaf legacy request-context resolver is not a conserved router leaf and remains untouched in the legacy module.
- Thread listing remains owner-filtered, descending updatedAt and capped at 100, without invented cursor pagination. Ownership failures remain `NOT_FOUND: Conversation not found.` Messages retain createdAt/id SQL tie ordering followed by the actual `orderMessagesByParent` helper.
- Durable provider secrets remain encrypted through the exact concrete codec signatures. Durable message content remains raw SuperJSON text, not newly encrypted/coerced JSON. Existing-message replacement, parent/format persistence, user-text title derivation and timestamp writes match source.
- Telemetry retains owned-message lookup, OpenRouter/key gate, exact generation/access-token patterns, first-eight bound, real generation-token verification before transport, per-generation provider headers, null filtering and completeness semantics. Its transport contract names the actual source telemetry primitive, preserving its parsing/cache/timeout/trusted-certificate behavior rather than faking an empty provider response.
- Feedback retains source SuperJSON metadata merging and both physical transaction algorithms: PostgreSQL row lock and awaited transaction update; SQLite synchronous get/update/run. Thread/message deletion and empty-ID no-op semantics remain unchanged.
- Domain error codes/messages are conserved. Local native error construction retains the source non-internal `{ zodError: null, error: null }` data shape; the frozen shared adapter still masks internal failures. Unknown provider JSON is narrowed without unsafe casts; malformed shapes remain failures rather than accepted fabricated models.

## Missing producers and mounting holds

`AssistantProcedureResources` requires explicit physical schema/operators, real database access, real createId, the concrete settings query, configured nonsecret runtime URLs, process-owned model cache, the credential codec, generation-access verifier and actual discovery/telemetry transports. Type-only references to legacy crypto/telemetry signatures do not initialize those legacy environment-dependent modules or constitute a backend binding.

`authority.assertCurrentAsync` is only a required candidate boundary, called after the shared source access/demo gate and before business work. This lane does not implement credential verification, current admin authority, authority leases, revocation coordination, or transactional authorization/currentness across subsequent awaits/writes. A caller-supplied no-op would not satisfy the hold. Factory existence and raw SQL bodies do not establish current credential/commit authority or production safety.

No fallback resources, fake keys, fabricated models, false provider availability, no-op authority implementations, transport producers or host assembly were created. The actual audited backend producers and authority/commit contract must be reconciled before any mounting. No additional authority is inferred from a source-shaped result.

## Source-only verification

Inspected dependency manifests and installed declarations: `@orpc/server` 2.0.0-beta.43 builder/context/use/input/output/handler APIs, Zod 4.4.3, SuperJSON 2.2.6 parse/stringify signatures, public auth policy exports, physical database types and actual transaction signatures. Required packages already exist in `@homarr/api` dependencies.

Read-only source comparison found 19/19 leaf identities with no extras, matched all 19 input-schema texts after local schema-name substitution, and matched all source domain-error messages. Additional board-helper limits are conserved; the legacy non-leaf request-context resolver's 30-reference limits are outside the leaf inventory and were not ported.

No lint, typecheck, build, test, format, install, new tests, network, provider/model/paid calls, SQL execution, credential/environment/current-data reads, Git actions, nested agents, listeners, browser, container or 3100/3200 actions were performed. Final lint/typecheck and relevant validation remain outstanding; these source comparisons are not runtime equivalence proof or acceptance.

## Independent review fix lease

Review identified one P2 composition finding: the runtime `isRecord` import used the broad `@homarr/common` root. The sole authorized code delta changes its specifier in `-assistant/helpers.ts` from `@homarr/common` to `@homarr/common/object`.

Read the actual export chain before editing: `packages/common/index.ts` re-exports `./src`, `src/index.ts` re-exports `./object`, and the public `./object` package export points directly to `./src/object.ts`. Both paths expose the same existing `isRecord` function. No implementation or dependency changed.

The source-byte comparison restores only the new import specifier to its previous value and compares the resulting helper bytes against their pre-fix SHA-256, `783967ce4587f75db2d15f945149c6938884d2c906c91796c903a9f0a3fb3b37`. Router and resources are compared against their pre-fix hashes, `780cb53cd551c379678af138cc14c10d24f9a681d0adef05db5bf0f7a539a743` and `d0a4af9536c33ec6f95844c5963f183ed0f93bde62e98108171fed21303e3b8d`, respectively. This comparison is restricted to unchanged source bytes, not behavioral output verification.

All 19 bodies, other helper bytes, router and resources remain unchanged. No validation commands, runtime evaluation or additional repairs were performed. No source-count acceptance, parity, physical-currentness or COMMIT claim is made. Frozen on return; subsequent independent review and rereturn remain required.
