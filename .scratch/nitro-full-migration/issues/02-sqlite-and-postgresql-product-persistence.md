# 02: SQLite and PostgreSQL product persistence

**What to build:** Open, transact, restart and deliberately convert the real durable product on default SQLite or optional PostgreSQL without reseeding away existing content. This is the named shared physical-persistence expansion; feature commands, authorization and UI remain with their domain owners.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Map all 40 models, relationships, IDs, keys/cascades/indexes/nullability/enums/timestamps, BLOB/bytea, serialized options/settings and encrypted values on both engines; preserve stored values, including divergent historical search-new-tab defaults.
- [ ] Recognize existing applied history and order for 49 SQLite and 17 PostgreSQL migration assets/journals, seed and five custom transformations; fresh, copied-old, interrupted and repeated startup fail safely before writes when conversion fails.
- [ ] Parameter binding, sync SQLite transactions/savepoints and checked-out asynchronous PostgreSQL transactions preserve rollback/locking semantics; immediate SQLite and PostgreSQL row-lock exclusion support compound board commands without network awaits inside sync transactions.
- [ ] Main, trusted-hostname, proxy-reader and temporary connections have explicit readiness/close/maintenance ownership or deliberate consolidation; a real authorized feature reads and mutates durable data, then demonstrates restart persistence on each engine.
- [ ] Approved conversion/recovery snapshots preserve legacy Custom JSX readability, ciphertext and reference integrity; record supported binary/data recovery and encryption/trust prerequisites before destructive conversion, without claiming automatic downgrade or cross-engine restore.
- [ ] Future focused durable-conversion/transaction regressions use disposable or copied fixtures, distinguish unsupported matrix cells and submit migration/native resource descriptors to #21; prototype PRAGMAs and a three-table fixture are not production evidence.

## Coverage

**CORE-02**; exact physical models: `users`, `accounts`, `sessions`, `verificationTokens`, `apiKeys`, `groups`, `groupMembers`, `groupPermissions`, `invites`; `boardUserPermissions`, `boardGroupPermissions`, `integrationUserPermissions`, `integrationGroupPermissions`; `boards`, `sections`, `items`, `layouts`, `itemLayouts`, `sectionLayouts`, `sectionCollapseStates`; `apps`, `searchEngines`, `icons`, `iconRepositories`; `integrations`, `integrationSecrets`, `integrationItems`; `customWidgetDefinitions`, `customWidgetSecrets`, `legacyCustomWidgetDefinitions`, `legacyCustomWidgetSecrets`, `widgetSecrets`; `assistantConfigurations`, `assistantThreads`, `assistantMessages`; `medias`, `serverSettings`, `onboarding`, `trustedCertificateHostnames`, `cronJobConfigurations`. Five transformations: release providers, OPNsense credential kinds, app-description display, removed widget integrations, legacy sections/gutters. Evidence: [core 40-model ledger](../drafts/core.md), [persistence §§2–3](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md).

## Required contracts

#01 runtime readiness/contribution/abort; #04 server-only codec/secret references; domain owners' exact value/reference declarations. Publish individually reviewed repository, transaction/savepoint/error, readiness/close and maintenance interfaces for both engines. #111/#112 consume engine primitives and own archive/complete crypto-reference restore, not this ticket. No whole-domain completion barrier.

## Decision holds

**Q11** ORM/driver stack is unresolved; db0 is a connector, not an approved ORM/migrator replacement. **Q12** copied-data importer versus in-place upgrade controls concrete conversion. New default/PRAGMA, interrupted conversion and rollback policies require disposition; Q15 governs session-row continuity with #09 rather than silently dropping rows. Dispatch needs applicable decisions and reviewed revisions.

## Ownership

Sole physical schema/migrations/journals/driver/connection/transaction writer for all 40 models and both engines. Domain owners supply commands/projections/declarations without shared-schema edits. COMPOSITION alone installs resources/dependencies; no data access, conversion or checks occur during publication.
