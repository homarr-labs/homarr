# Full migration design interview

## Confirmed before this interview

- Preserve every current application capability and durable user data; the fixture is not the final product scope.
- Target Nitro v3, Vite/React, TanStack Router and direct oRPC.
- Reuse framework-independent domain/service/UI logic; replace Next-specific glue and any library when justified, including localization.
- All packages may be upgraded and all application surfaces may be redesigned while preserving capabilities.
- Work in the current worktree without branch changes or separate worktrees. The latest user-approved cap is thirty-five Sol-high workers, including reviewers/fixers, with exclusive ownership and genuine dependency readiness.
- Keep a playable local snapshot available for human feedback; use parallel implementation and batched runnable milestones rather than serial per-seam gates.
- Real appdata, credentials and current installations remain untouched during experiments.
- Full-rewrite verification permits focused new regression tests for security, durable-data migration and critical user flows. Checks remain scoped and deferred as previously directed; no broad suites or full-repository typecheck.

## Open design tree

### Round one: resolved policy

1. **New app only.** User selected the Nitro application as the sole development build gate. Released Homarr remains the rollback reference; preserving a simultaneously buildable Next implementation is not required.
2. **External contracts may break.** User answered: “You can break everything. Complete re-write.” Do not make old routes, public API schemas, MCP transport shapes, CLI commands or serialized-format compatibility a default implementation requirement. Preserve product capabilities and durable user content through an explicit conversion path; approval to break contracts is not authorization to delete data or touch real installations.
3. **Focused regressions authorized.** User selected a narrowly relevant new regression set for security, durable-data migration and critical user flows. Do not add broad or implementation-restating tests. Existing scoped/deferred-check rules remain.

Answers received through the design interview on 2026-10-10. These override the provisional preservation recommendation for external contracts and the earlier experiment-only no-new-tests policy.

### Round two: resolved architecture and authoring choices

- **Singleton production:** one active backend per data directory; simultaneous replicas/cluster workers and rolling overlap are unsupported. Safe restart/shutdown remains required.
- **Both databases:** SQLite is default; PostgreSQL remains an optional backend. This does not settle ORM/driver ownership.
- **Reuse UI:** retain Mantine, the recognizable dashboard/editor and existing interaction capabilities, with intentional behavior repairs rather than wholesale visual redesign.
- **Localization:** standalone `use-intl` behind the translation facade; preserve all 36 catalog locales and rich/plural functionality. Detailed locale/formatting behavior remains open.
- **Production auth:** evaluate direct Auth.js Core Fetch integration first with a bounded disposable credentials/LDAP bridge spike. This approves the candidate investigation, not an unproven production bridge. Return evidence for an alternative if necessary; unrelated domain ports continue against principal/policy interfaces.
- **File routes:** TanStack Router file-based routes, organized in folders, with descriptive route filenames rather than Next-style `page.tsx`. Use `createFileRoute` and route-local typed params/loaders. Route-local components/helpers belong in ignored `-components`/`-...` paths; genuinely reusable frontend components belong in an appropriate common UI area, not a blanket move of React into framework-neutral utilities. Respect layout/pathless-layout, non-nested and dynamic route semantics.

User also requests future question rounds in ordinary numbered text, not the question tool.

### Router documentation evidence

Context7 quota remains exhausted (fresh resolve attempt returned quota error). Read current first-party [routing concepts](https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts), [file naming conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions) and [route trees](https://tanstack.com/router/latest/docs/framework/react/routing/route-trees) directly on 2026-10-10.

- Parenthesized directories organize files without changing URL or component nesting; they are not pathless layout components.
- Named `.route.tsx` suffix can define the corresponding segment's layout; `<Outlet>` renders children. Leading `_` creates a pathless layout; trailing `_` opts out of parent nesting; `$name` captures typed dynamic params.
- Leading `-` excludes route-local files/folders from the generated route tree, not from normal imports or security boundaries.
- `__root.tsx` is the required root convention. Index routes use the configured index token; descriptive `boards.index.tsx` remains possible. Root/index convention exceptions do not justify anonymous `page.tsx` feature files.
- The bundler plugin manages the path literal in `createFileRoute`. Validate these conventions against the exact pinned plugin/runtime during implementation, not just newer latest docs.

### Round three: dependent frontier

With singleton, both dialects, UI reuse and Core-first settled, decide Redis removal/state lifetimes, production SQL adapter choice, durable-content conversion, coherent editor draft behavior, live transport and login continuity. Detailed locale switching/time basis, external access token scope/consent/revocation, cache rendering/freshness and scheduling restart recovery follow those answers.

- **Q10 resolved: Redis removed.** User approves complete removal and prefers Nitro KV where useful. Generic KV persistence does not itself settle atomic security-state/transaction/fanout duties; classify each service and choose an appropriate backing implementation.
- **Q11 resolved:** retain Drizzle with direct SQLite/PostgreSQL drivers, subject to compatibility evidence; do not force db0 into the relational/transaction path. The preferred SQLite candidate is Bun SQLite; PostgreSQL uses a checked-out pool client for transactions. Unsupported runtime behavior must be reported, not bypassed.
- **Q12 resolved:** import copied legacy data into the new runtime/schema, leaving the original installation untouched. A current Homarr SQLite backup is a mandatory accepted input, not optional compatibility or a three-table fixture.
- **Q13 resolved:** layout, sections, items and widget options form one coherent atomic board draft. Save commits everything; Discard changes no durable content. Contextual/bulk controls must not retain hidden immediate commits that contradict this policy.
- **Q14 resolved:** logs, job status and live widget delivery use HTTP/SSE on the same Nitro listener. Preserve source-specific authorization, framing/replay/order/abort/backpressure; this does not replace Assistant or MCP's required protocol semantics or upstream Beszel/Docker transports.
- **Q15 resolved:** a migration-time logout is permitted while preserving accounts, existing password verification, linked identities, groups and permissions. Old private session/cache artifacts must not retain authority after restore.

User answered “Yes to each” on 2026-10-10 and further directed: copy/adapt the whole existing Homarr application and backend/tRPC; features/functions must be 1:1 and a current SQLite backup must restore into the Nitro version. Prefer direct reuse and framework/transport adaptation of real source-owned domain behavior, not parallel miniature replacements. Unless an explicitly approved repair above changes behavior, retain source semantics, bounds, defaults, locale behavior and supported capabilities rather than inventing new product policies. Missing facts are implementation investigations; genuinely necessary behavior changes still need explicit disposition. The target remains Nitro/React/TanStack/direct oRPC; tRPC domain code is the source to port, not a reason to silently choose a different final transport.

Older ticket bodies' “Q11–Q15 unanswered” clauses are historical and superseded by this section, not remaining dispatch barriers. Remaining required evidence and genuinely unsettled production-auth alternatives are separate; do not turn source behaviors already covered by 1:1 preservation into new design-question blockers.

### Database/KV clarification evidence — 2026-10-10

Context7 returned the same quota limit for Nitro discovery; use the primary documentation below rather than unverified memory.

- [Current Nitro KV](https://nitro.build/raw/docs/storage.md): unstorage integration, configurable backing drivers, default volatile memory; latest API is `useKV`/`nitro/kv` with old names deprecated. [Pinned beta storage](https://raw.githubusercontent.com/nitrojs/nitro/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/8.storage.md) uses `useStorage`/`nitro/storage`. Do not copy newer API names into the pinned experimental version without a coordinated upgrade.
- [Nitro database](https://nitro.build/raw/docs/database.md): experimental opt-in SQL layer using db0, lazily created/cached named connections, parameterized SQL/prepared statements, SQLite/PostgreSQL connectors. It is not an ORM or an automatic migration/backup framework.
- [db0 guide](https://db0.unjs.io/raw/guide.md): SQL connector abstraction over concrete drivers, usable directly or through Nitro, with optional ORM integrations. It does not translate arbitrary dialect SQL or supply Homarr's relational model.
- [db0 capabilities](https://db0.unjs.io/raw/guide/capabilities.md): current docs expose connector feature flags. `transactions` means BEGIN/COMMIT can share the driver's session, not automatic per-request transaction isolation. Current/latest flags are not proof the pinned db0 release has the same API.
- [db0 Drizzle integration](https://db0.unjs.io/raw/integrations/drizzle.md): connector and typed ORM can be composed. Current integration targets Drizzle v1 RC with relation/casing changes and join-alias/streaming caveats; existing Drizzle 0.45.2 is not a drop-in. ORM upgrades are allowed but require narrow evidence and one dependency owner.

The approved boundary now retains Drizzle/direct SQLite/PostgreSQL drivers for relational and transaction-sensitive state, using Nitro KV only where suitable. The earlier db0-first alternative is historical investigation evidence, not the selected production stack or a demonstrated RAM improvement. Preserve per-service expiry, ownership, bounds and restart semantics even in the approved singleton.

### Returned compatibility evidence

- SQL probe `spikes/sql/EVIDENCE.md`: direct Drizzle rollback/savepoints, SQLite immediate exclusion and PostgreSQL same checked-out session across awaits passed. Async SQLite transaction callbacks commit prematurely; pinned db0 shared-session transactions interleave, retained statements can outlive disposal, and its Drizzle integration fails against 0.45.2. Use explicit direct-driver ownership and synchronous SQLite transaction bodies. The dedicated probe PostgreSQL container was removed; no real installation was used.
- Auth probe `spikes/auth/EVIDENCE.md`: native Core 0.41.3 Credentials/LDAP database sessions fail `UnsupportedStrategy` before authorization/adapter writes. Diagnostic JWT success is not production JWT approval. Late sign-in event failures can be swallowed, and database renewal can persist before later callback failure. Node probe runtime was 24.16.0, below the declared 24.18.0; target-runtime acceptance remains pending. A supported production bridge/alternative is the remaining distinct architecture question; unrelated source ports proceed.
- Localization probe `spikes/i18n/REPORT.md`: installed standalone use-intl 4.13.1 verified all 36 unchanged catalogs, rich/plural/formatting and concurrent request isolation; 28 existing ICU parse issues and omitted-value development/production differences are recorded. Preserve source behavior/diagnostics; do not silently rewrite catalog content or claim browser hydration from a server-only probe.

### Remaining integration evidence

All eight source inventories and three bounded compatibility investigations have returned. Full-product runtime parity remains unverified. A supported production-auth remedy, both-engine full-model/migration/restore behavior, actual dependency/build integration and generated public/MCP schemas still need narrow implementation evidence. These are implementation facts, not human fact-finding assignments. The remaining human auth question is whether to select the documented alternative after the failed native Core bridge; unrelated source-preserving ports proceed.

**Q16 approved by the user, 2026-10-11:** use Auth.js for OIDC and a Homarr-owned SQL-session establishment service for local/LDAP, reusing current verification and preserving password hashes, opaque sessions and revocation without JWT. This resolves the architecture choice, not implementation or production proof. Shared reader/renewal/revocation, trusted-origin/CSRF, critical login/group effects and rollback must still be reviewed and validated before protected exposure; unsupported Credentials/database assertions remain forbidden.

**Q18 approved by the user, 2026-10-11:** require principal-scoped user/group grants for Integration and Widget operations, intentionally fixing legacy authorization through another user's grants. The existing Integration narrowing is now an approved policy direction; Widget's source-unfiltered aggregation requires a separately leased repair. Approval does not establish real authority, compatible-writer/COMMIT binding or mounting. Keep affected operations unmounted until those implementation and native gates pass. See `implementation/sprint-integration-operations.md` and `implementation/sprint-widgets.md`.

**Q17 selected by the user, 2026-10-11:** an existing server-controlled custom HTTPS CA override applies only to the target; the proxy retains the instance's approved anchors. Preserve normal hostname/identity checks and the source-derived default SAMECA bundle when no override is supplied. Managed Fetch's old both-peer mapping does not establish the selected native policy. This selects the override policy, not a new trust store/field, proxy exception or native ownership/handshake proof. Implementation and production acceptance still need their exact reviewed join. See `PROXY-PRODUCTION-JOIN-PLAN.md`.

## Ticket preparation

**Numbered breakdown approved and published:** user reviewed `PROPOSAL.md` and replied “looks good. go ahead.” on 2026-10-10. The 125 slices are published one local file per ticket using the tracker-limit fallback. Publication approval covered numbers/granularity/blockers and did not itself authorize implementation or answer open questions; subsequent explicit requests and Q11–Q15 answers provide that authority.

**Implementation authorized:** user invoked `implement` and requested “do everything in parallel, as much as we can with sub-agents at the same time.” Execute genuinely ready work in this worktree with exclusive owners, up to twelve Sol-high workers and a single composition writer. Preserve native predecessor and exact-contract readiness; independently bounded preparation does not close unfinished tickets. Keep the existing playable image, real appdata and credentials untouched. Review and commit completed owned work to the current branch; preserve all pre-existing uncommitted work and never stage it indiscriminately. Scoped checks remain the explicit repository constraint; no full-repository typecheck or broad suites.

**Subsequent answers and stronger acceptance:** Q11–Q15 are now resolved as recorded above. The user's request for additional parallelism authorizes independent source-preserving backend/package adaptation while host integration is still being built; only actual accepted contracts may be consumed, and no native blocker or final acceptance is marked satisfied by unmounted preparatory code. Current SQLite backup restore is an explicit end-to-end release gate across all 40 models, references, media bytes, serialized values and encrypted families. Use only disposable/synthetic exported backups or user-authorized copies; never access the live installation merely to prove compatibility.

Use `.scratch/nitro-full-migration/RESEARCH.md` and the cited notes to reconcile a feature/endpoint parity ledger. Draft complete end-to-end tickets with verifiable behavior and genuine blocking edges. Include the necessary small shared foundation and expand–contract refactors without turning every capability into a dependency on an entire infrastructure rewrite.

Granularity/dependency approval is now recorded. Linear is currently at its free issue limit; publish one local file per approved ticket with explicit numbered blockers and separately recorded decision/contract readiness. Do not delete unrelated issues, change billing or invent published identifiers. Keep the wayfinder's research/decision issues separate from implementation tickets; settle the remaining design frontier before affected implementation dispatch.

Record resolved terms in the repository glossary only when the human meaning is settled, and hard-to-reverse surprising tradeoffs in ADRs only after agreement. Do not write library choices or migration hypotheses into the glossary.
