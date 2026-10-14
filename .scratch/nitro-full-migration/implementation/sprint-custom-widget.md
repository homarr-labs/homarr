# Custom Widget backend router draft — frozen

## Files

- `packages/api/src/nitro/routers/custom-widget.ts`
- `packages/api/src/nitro/routers/-custom-widgets/resources.ts`
- `packages/api/src/nitro/routers/-custom-widgets/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-custom-widget.md`

`createCustomWidgetProcedures(resources)` prepares the source Custom Widget leaves using the existing `authenticatedProcedure` → `sourceProcedure` chain and genuine backend request contexts. It exports the exact `customWidgetPurePreparedPaths`, `customWidgetBindingHeldPaths`, and combined `customWidgetPreparedPaths` identities. No contribution, registration, host binding, manifest, source router, shared context/procedure/error/map/index, or other lane was changed. This is source preparation, not acceptance or production availability.

## Pure source leaves prepared

Source: `packages/api/src/router/custom-widget/metadata-procedures.ts`.

- `customWidget.schema`
- `customWidget.getAuthoringPrompt`
- `customWidget.getSkill`
- `customWidget.getReference`
- `customWidget.getComponentCatalog`
- `customWidget.findComponents`
- `customWidget.getComponent`
- `customWidget.getComponents`
- `customWidget.getSharedProps`
- `customWidget.getExample`
- `customWidget.validateTemplate`
- `customWidget.validate`

These use the actual exported authoring catalog, JSON Schema, authoring normalization, JSX analyzer, diagnostic excerpts, digest, and definition schemas. Administrator permission and the existing source demo contract remain on each descriptor. Full factory construction still requires the resource contract; this list does not announce a separately registered metadata router.

## Resource-backed source handlers prepared, binding-held

All paths below have source-derived handler bodies, not controller placeholders. Their resource and current-authority joins remain candidate contracts.

| Source below `packages/api/src/router/custom-widget/` | Exact binding-held paths                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `management-queries.ts`                               | `customWidget.list`, `customWidget.legacyMigrationPrompt`, `customWidget.get`, `customWidget.available`, `customWidget.optionRequest` |
| `creation-procedures.ts`                              | `customWidget.create`, `customWidget.createFromPreview`, `customWidget.updateFromPreview`                                             |
| `custom-widget-router.ts`                             | `customWidget.update`, `customWidget.toggleEnabled`, `customWidget.delete`, `customWidget.duplicate`                                  |
| `secret-procedures.ts`                                | `customWidget.secretSet`, `customWidget.sourceConfigure`, `customWidget.configurationRequestUser`, `customWidget.secretClear`         |
| `workshop-procedures.ts`                              | `customWidget.workshopSearch`, `customWidget.workshopGet`, `customWidget.workshopInstall`                                             |
| `template-procedures.ts`                              | `customWidget.readTemplate`, `customWidget.writeTemplate`, `customWidget.templatePatch`                                               |
| `transfer-procedures.ts`                              | `customWidget.export`, `customWidget.exportLegacy`, `customWidget.import`, `customWidget.migrateLegacy`                               |
| `preview-base-procedures.ts`                          | `customWidget.previewCreate`, `customWidget.previewReviseTemplate`, `customWidget.previewGet`                                         |
| `preview-query-procedures.ts`                         | `customWidget.previewRefresh`, `customWidget.previewQuery`, `customWidget.setPreviewLiveActions`, `customWidget.previewJournal`       |
| `preview-action-procedures.ts`                        | `customWidget.previewAction`                                                                                                          |

### Missing joins and binding obligations

- `acquireAuthorityAsync` has no implementation here. Its lease must supply the real current administrator, policy identity and configured database and hold authority through reads, source/integration/board grants, durable writes and transaction COMMIT, outgoing requests, and request-state effects. Same-user/admin comparisons are defensive checks, not a replacement for revocation/current-authority coordination. `releaseAsync` is awaited in `finally`. No snapshot-to-COMMIT proof is claimed.
- `tables` and `operators` are typed against existing public physical DB schema/operators, including the actual driver-specific `handleTransactionsAsync` signature. The helper retains asynchronous PostgreSQL transactions with `FOR UPDATE` and synchronous SQLite transactions, including source `immediate` modes only where originally present. No generic `atomicApply` or arbitrary controller-execution resource was introduced. Schema/driver ownership and physical commit bindings remain absent.
- `codec` requires the actual public `SecretCodec` encryption/decryption primitives. Nothing reads an encryption key or environment. Stored encrypted strings are narrowed structurally at the adapter boundary without unsafe casts; credential values are neither logged nor returned by management projections.
- `previewStore` and `requestLimitStore` are mandatory public domain store interfaces. Actual `CustomWidgetPreviewSessionService` and `CustomWidgetRequestLimiter` implementations are composed directly with those stores, not replaced by miniatures or an automatic local-success fallback. Host bindings must provide durable session TTL/CAS, owner checks, journal/evidence persistence, category rates, concurrency ownership and release. No physical Redis adapter was fabricated.
- `configurationStore` needs a concrete source-compatible shared store, including original serialized request decoding, missing/malformed reads, expiry/deletion and TTL behavior. The source create/check handler retains the ten-minute expiry, user ownership, source-authentication snapshot, status projection and URL. The separate secure configuration route must observe the same store and completion lifecycle; that route and its claim/apply coordination were outside this lane. The typed storage contract alone does not prove that join.
- Integration queries retain the source group-membership query, user/group permission filters, empty-group sentinel, full-access requirement, unavailable-kind rejection, and source-kind matching. Board queries retain the source relational group subquery and exact creator/global/scoped grants and `NOT_FOUND` concealment. Permission calculations consume those already-filtered rows; they were not replaced with a differently filtering policy.
- Integration connection derivation still requires the actual injected `getIntegrationHttpAuthenticationAsync` and certificate/hostname/check-server-identity primitives. Its existing origin/path prefix, loopback scope, encrypted-secret cache hash, body/query/header authentication, derived-secret redaction, delayed connection resolution and error conversion are retained. Trusted-certificate reads remain parallel. No provider, credential, or trust-root discovery ran.
- Workshop requires the Homarr API host's actual `WorkshopBackend.get/list` capability and the resolved Workshop web URL. Only its type is imported; no PocketBase client is constructed and no API/provider call ran. Source search pagination/sort/type/outdated options, schema/type validation, export sanitization, source overrides, integration validation, encryption/transaction persistence and missing-credential projection are retained. There is no Workshop-update leaf in the source router; ordinary definition and preview updates retain their source behavior rather than inventing one. Excluding the separate Go/PocketBase service does not remove this host capability requirement.
- Existing public Custom Widget HTTP execution and response-cache primitives are reused, including source network/authentication/security validation and cache invalidation. Host lifetime/current-authority coordination with those effects remains a binding gate, not a newly accepted lifecycle proof.

## Source equivalence notes

- Original package schemas are imported directly: create/update/import/authoring/definition/source/secret/JSX/template-lines schemas retain their intersections, transformations, defaults, security checks and version rules. Locally declared input schemas preserve source strictness, refinements, lengths, nullish/optional behavior and descriptions. Source procedures had no separate output schemas; none were invented.
- MCP metadata strings, permission/demo descriptors, query/mutation identities, source leaf order, error codes/messages, management URLs and response projections are retained. Source domain and authoring errors become oRPC errors with their original codes and client-visible retry/Zod payloads through the existing backend error contract. No tRPC router/caller/tunnel is imported.
- Stored serialization and parsing reuse the original dependency-light `stored-definition.ts`; cache hashing reuses original `cache-version.ts`. Both import graphs were inspected. Other source helpers with ambient roots were re-expressed locally using concrete injected resources, retaining their algorithms.
- Definition insertion/update, secret set/clear/source configuration and legacy migration preserve row construction, SuperJSON serialization, timestamp placement, secret encryption, transaction ordering, obsolete-secret cleanup, binding-change credential deletion and explicit-secret precedence. Legacy rows are preserved, not deleted. Duplicate does not copy secrets. Disabling/deleting absent IDs retains source behavior rather than adding new existence policy.
- Preview persistence retains final-revision successful query/action evidence, simulated-action evidence rules, edit-definition fingerprint conflicts, credential rebinding checks and inherited-secret behavior. Preview request configuration failures, source resolution, confirmation ordering, rate-limit acquisition/release, cache keys/invalidation and best-effort redacted journals follow source order.
- Template revisions, descending splice order, evolving line-range/overlap checks, full-definition validation, template-equality conditional write and source affected-row interpretation are preserved. No attempted repair to optimistic-write policies was introduced.
- Legacy migration prompting preserves source redaction, original request/body/config parsing, credential compatibility, origin/auth/header matching and exact prompt text.

## Verification performed and deferred

Read the sprint, repository architecture/common-port references, actual source router and called helpers, package dependency manifests/public exports, and the installed `@orpc/server` beta declarations. Existing declared dependencies provide all runtime libraries; no dependency or export changes were requested or made.

Read-only source comparisons found no missing/unexpected source leaf identities, no query/mutation mismatches, no omitted source MCP descriptions, no omitted input descriptions and no omitted literal router/helper error messages. Imports were inspected for forbidden ambient Next/auth/env/legacy DB/provider evaluation; DB/Core/Auth/provider/Workshop backend references in resource contracts are type-only. Runtime imports use public pure/domain primitives and the two inspected dependency-light source helpers.

This was source comparison only. No lint, typecheck, build, test, format, install, network/provider execution, new tests, listener/browser/container work or acceptance verification was run. Final lint/typecheck and coordinator/source review remain outstanding. Files are frozen on return; no mounting or accepted-count change is claimed.
