# v2 branch merge review

Review range: `origin/dev...origin/v2` at `6aceb2fd1` (merge base `77dc317da22977c51d720a729ed57710b74b5a7d`).

The range contains 630 changed files, 54,851 insertions, and 20,056 deletions. The review was split into focused sub-agent jobs. Findings below were checked against the current `origin/v2` source; speculative concerns were omitted.

Follow-up status: the accompanying `feat/fix-v2-review` branch addresses every verified finding below. It preserves v1 Custom Widgets as migration-required records, provides a secret-redacted LLM migration workflow with atomic replacement, and adds regression coverage across the affected runtime, Workshop, documentation, MCP, database, and CI surfaces.

## Post-PR reviewer follow-up

After the initial fixes were published, CodeRabbit produced eight inline comments and five lower-priority test/maintainability suggestions before its `v2` base-branch policy skipped later review runs. Each was rechecked against the updated branch:

- Legacy troubleshooting now directs users to the preserved-v1, LLM-assisted migration flow, and migration-file parsing reports unexpected failures.
- Workshop publication distinguishes a changed definition from a load failure; behavioral tests prove a changed refetch cannot publish and an unchanged refetch publishes the exact reviewed JSON.
- Workshop optimistic concurrency is enforced by a SQLite compare-and-swap trigger using the request's expected revision, with repeated real PocketBase concurrent-update coverage.
- Workshop rollback preserves a bootstrapped `users` collection on fresh installs, tests both pre-existing and fresh-user paths, and statically enforces parity between shared and PocketBase content limits.
- The legacy migration prompt, migration mutation, and legacy deletion are included in the reviewed MCP allowlist with permission-aware classifications.
- Total request deadlines take precedence over wrapped domain errors, the obsolete OpenAPI import is already replaced by the passing local-source parity check, the unsaved-guard spec matches its module name, and the one-line Workshop JSON classification wrapper was removed.

## Original merge recommendation

Do not merge the reviewed `origin/v2` range without the accompanying fixes. The database reset is release-blocking because it irreversibly deletes every existing custom widget and credential. Legacy widgets must remain visible as migration-required records, with a safe LLM-assisted conversion path to v2. The credential-retargeting paths, Custom JSX denial-of-service paths, Workshop server-validation bypass, and stale preview publication race should also be fixed before merge.

| Priority | Count | Meaning                                                                      |
| -------- | ----: | ---------------------------------------------------------------------------- |
| P0       |     1 | Release blocker / destructive upgrade                                        |
| P1       |     8 | High-impact security, availability, data-loss, or release-integrity issue    |
| P2       |    31 | Correctness, authorization, concurrency, deployment, or substantial UX issue |
| P3       |    10 | Lower-impact defect, test gap, scalability, or CI-hardening issue            |

## Agent: database migrations and persistence

### P0 — Upgrade deletes every custom widget and credential

Files: `packages/db/migrations/sqlite/0042_custom_widget_v2_reset.sql:2`, `packages/db/migrations/mysql/0044_custom_widget_v2_reset.sql:1`, `packages/db/migrations/postgresql/0010_custom_widget_v2_reset.sql:1`

All three migrations drop the definition and secret tables without converting or preserving existing rows. Board-item options keep definition IDs without a foreign key, so user-created widgets become dangling and unusable. Seeding restores only fixed bundled definitions. The SQLite upgrade was reproduced with populated definition and secret rows; both tables were empty afterward.

Fix: replace the reset with a non-destructive, versioned migration. Preserve every legacy definition, its stable ID, ownership, enabled state, board references, and encrypted credentials. Records that cannot be converted mechanically must remain visible in the Custom Widgets management page and on affected board items with a clear **Migration required** status; they must not execute through the v2 runtime until converted.

The migration-required UI should provide a **Generate migration prompt** action that creates a copyable LLM prompt containing:

- the legacy widget definition and legacy schema/version;
- the v2 schema, component/request constraints, and relevant authoring guidance;
- explicit instructions to return importable v2 JSON;
- warnings that credentials are represented only by source/auth requirements and that decrypted secret values must never be included;
- instructions to review and preview the generated definition before replacing the legacy record.

Importing the LLM result should create a draft or preview first. The legacy row must remain recoverable until the user explicitly confirms replacement, and board references should switch atomically only after the v2 definition validates and saves successfully. Add populated pre-v2 upgrade fixtures for all three drivers, management/board rendering tests for migration-required widgets, prompt redaction tests, and end-to-end conversion/rollback coverage.

### P2 — MySQL snapshot names a foreign key that the migration does not create

Files: `packages/db/migrations/mysql/meta/0044_snapshot.json:690`, `packages/db/migrations/mysql/0044_custom_widget_v2_reset.sql:27`

The snapshot records `custom_widget_secret_definition_id_custom_widget_definition_id_fk`, while SQL creates `cw_secret_definition_id_cw_definition_id_fk`. The recorded name is also longer than MySQL's 64-character identifier limit. Future generated migrations can attempt to alter a nonexistent constraint.

Fix: give the FK an explicit short name in the MySQL schema and regenerate SQL and metadata together.

### P2 — Secret source IDs have driver-specific uniqueness semantics

File: `packages/db/schema/mysql.ts:521`

`sourceId` is part of the primary key but inherits the default case-insensitive MySQL collation. The widget schema permits distinct `Api` and `api` IDs, which SQLite and PostgreSQL can store but MySQL treats as duplicates when the same secret kind is used.

Fix: use a case-sensitive/binary collation for identifiers or reject case-normalized collisions consistently across drivers; add a three-driver test.

## Agent: Custom JSX interpreter, runtime, and core schema

### P1 — Accepted regular expressions can freeze the browser

Files: `packages/custom-widgets/src/jsx/analyzer.ts:327`, `packages/custom-widgets/src/jsx/interpreter.tsx:59`

The safety check rejects backreferences, lookbehind, and one narrow nested-quantifier form, but accepts overlapping alternatives such as `/^(a|aa)+$/`. A workshop widget can pass validation and trigger exponential backtracking on the dashboard main thread.

Fix: use a non-backtracking engine or a conservative structural allowlist. Add ReDoS cases covering overlapping alternatives and other catastrophic forms.

### P1 — Large refresh intervals overflow into a request loop

File: `packages/custom-widgets/src/runtime/sub-fetch.tsx:158`

There is no maximum before seconds are converted to milliseconds. Values above the browser timer range can be clamped to roughly 1 ms, making React Query hammer the query endpoint.

Fix: validate and clamp to a documented maximum below `2^31 - 1` milliseconds and test the overflow boundary.

### P2 — Deep response JSON can overflow the binding sanitizer stack

Files: `packages/custom-widgets/src/jsx/bindings.ts:3`, `packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx:165`

`sanitizeData` recursively clones the entire response without depth or node budgets. Deep but compact JSON can throw `RangeError` before interpreter budgets apply, and binding creation occurs outside the renderer's catch.

Fix: sanitize iteratively with depth/node/string limits and route binding-construction failures through the runtime error boundary.

### P2 — Spread props bypass the literal `bind` invariant

Files: `packages/custom-widgets/src/core/custom-jsx-schema.ts:172`, `packages/custom-widgets/src/jsx/runtime-components.tsx:98`

Validation searches source text for explicit `bind`, so `<TextInput {...data.props} />` passes. Runtime then accepts a remotely supplied `bind`. Changing names across refreshes accumulates input state and can cause binding collisions.

Fix: reject `bind` supplied by spreads at the emitter boundary and validate explicit attributes through the AST; add spread-injection tests.

## Agent: custom-widget backend, secrets, requests, and preview sessions

### P1 — Preview can exfiltrate a stored credential to an attacker URL

File: `packages/api/src/router/custom-widget/preview-base-procedures.ts:45`

A manage-only user can provide a victim `definitionId` and a caller-controlled definition with the same source ID/auth kind but an attacker base URL. The procedure decrypts and merges stored secrets, validates only source ID/auth kind, and puts them into the attacker-controlled preview.

Fix: never inherit secrets into an arbitrary submitted definition unless the complete source binding, including origin and auth configuration, matches. Otherwise require secret permission and re-entry. Add a changed-base-URL exfiltration test.

### P1 — Manage-only source edits can retarget persisted credentials

Files: `packages/api/src/router/custom-widget/secret-procedures.ts:80`, `packages/api/src/router/custom-widget/custom-widget-router.ts:68`

`custom-widget-manage` can change `baseUrl`/scope while supplying no secrets; existing encrypted values remain. The next request sends those credentials to the new endpoint, bypassing the intended `custom-widget-secret-write` boundary.

Fix: bind secrets to source origin/auth configuration and clear or reject reuse when that binding changes unless replacement credentials are authorized.

### P2 — Configuration links bypass the secret-write permission

Files: `packages/api/src/router/custom-widget/secret-procedures.ts:170`, `apps/nextjs/src/app/api/custom-widgets/configuration-request/[token]/route.ts:41`

A manage-only caller can mint a bearer setup URL and then use the unauthenticated POST to write encrypted credentials, despite direct secret writes requiring `custom-widget-secret-write`.

Fix: require secret-write permission to mint definition-target links, or introduce a deliberate delegation permission and prevent self-completion. Test the boundary.

### P2 — Concurrent preview mutations lose session state

File: `packages/custom-widgets/src/server/preview-sessions.ts:125`

`setLiveActions`, `setSecrets`, and `configureSource` read and overwrite the full Redis-backed object. Concurrent operations can silently discard one another.

Fix: use CAS/versioned retries or atomic field updates and test concurrent source configuration/toggle operations.

### P2 — Concurrency leases can expire before a legal request finishes

Files: `packages/custom-widgets/src/server/request-limits.ts:6`, `packages/custom-widgets/src/server/request-executor.ts:32`

The Redis lease lasts 30 seconds, while four 10-second redirect hops can exceed it. A new request may acquire capacity while the first still runs, and the first release can decrement the newer lease.

Fix: use owned renewable semaphore leases, or enforce a total request deadline below the lease TTL with ownership-safe release.

### P2 — Template optimistic locking is not atomic

File: `packages/api/src/router/custom-widget/template-procedures.ts:96`

The revision is checked in a read, but the subsequent update filters only by ID. Two patches with the same revision can both pass and last-write-wins.

Fix: make the update conditional on the persisted revision/template and verify the affected-row count; add a concurrent patch test.

### P2 — Looking up another user's preview deletes it

File: `packages/custom-widgets/src/server/preview-sessions.ts:114`

Owner mismatch is grouped with malformed/expired state and deletes the stored session. A user who learns another preview ID can invalidate it.

Fix: return not-found on owner mismatch without deletion; delete only malformed or expired records. Add a two-user test.

### P2 — Public configuration POST parses an unbounded body

File: `apps/nextjs/src/app/api/custom-widgets/configuration-request/[token]/route.ts:41`

`request.json()` materializes the entire unauthenticated body before per-secret 8 KiB validation. A token holder can submit an arbitrarily large payload and consume memory/CPU.

Fix: enforce a small body limit before parsing, schema-parse a strict object, and test oversized input.

### P3 — Option-request parameters are resolved in the wrong slot

File: `packages/api/src/router/custom-widget/management-queries.ts:163`

The API accepts `params` but passes them as options to `resolveCustomWidgetRequestValues`, with `{}` as runtime params. `$param` references fail and `$option` values are mislabeled.

Fix: pass option configuration and runtime params in their correct positions, or narrow/rename the contract; add a param-reference route test.

## Agent: custom-widget editor, workbench, and widget UI

### P1 — Client-side navigation silently loses drafts

File: `apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form.tsx:120`

Only `beforeunload` is guarded. Next.js link/router navigation does not fire it, so normal breadcrumb/sidebar navigation discards the full draft.

Fix: add an App Router navigation guard or persisted drafts, with a client-navigation regression test.

### P2 — Removing a source silently deletes dependent requests

File: `apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-sources-editor.tsx:114`

The remove action immediately filters every request using the source, without confirmation or an affected-item count. Saving makes the loss permanent.

Fix: require explicit confirmation listing dependents or block removal until requests are reassigned.

### P2 — Preview breaks after changing source authentication type

File: `apps/nextjs/src/app/[locale]/manage/custom-widgets/_use-custom-widget-form-actions.ts:134`

Preview submits only newly typed secrets, while the backend merges persisted secrets. Changing basic auth to bearer, for example, merges stale username/password fields and rejects the preview until save cleans them.

Fix: filter persisted secrets against the submitted auth requirements or send explicit removals. Add auth-transition preview coverage.

### P2 — JSON option editor retains another definition's value

File: `packages/widgets/src/_inputs/widget-custom-widget-configuration-input.tsx:279`

The draft state is initialized once and never follows external `value`. Switching definitions with a same-named JSON option can display stale JSON and write it into the new widget on the next edit.

Fix: synchronize on definition/value changes or key the editor by definition ID and option name while deliberately preserving invalid active drafts.

### P3 — Code editor label does not target the editor

File: `packages/custom-widgets/src/workbench/code-editor.tsx:103`

`Input.Wrapper` uses `props.id`, but CodeMirror gets `${props.id}-root`, breaking click-to-focus and explicit assistive-technology association.

Fix: use one matching ID or an appropriate `aria-labelledby` relationship.

## Agent: Workshop backend, PocketBase, deployment, and package contract

### P2 — Direct PocketBase writes bypass canonical publication validation

Files: `apps/workshop/pb_migrations/1784240000_workshop_widgets.js:45`, `packages/workshop/src/backend.ts:456`

Canonical validation is only in the TypeScript client/backend wrapper. PocketBase rules allow an authenticated owner to POST directly with invalid type/schema pairings, oversized CSS, and arbitrary revision/outdated/changelog values; the record becomes public.

Fix: validate and normalize in PocketBase create/update hooks, set server-owned fields server-side, and add integration tests that bypass `WorkshopBackend`.

### P2 — OAuth configuration is applied only on first migration

Files: `apps/workshop/pb_migrations/1784240000_workshop_widgets.js:30`, `apps/workshop/docker-compose.yml:13`

GitHub credentials are read only when the migration first runs. Starting once with empty defaults permanently leaves OAuth disabled, and later secret rotation does not update it.

Fix: synchronize provider settings in an idempotent startup hook, or fail initial startup without credentials and provide an explicit rotation path.

### P2 — Report creation accepts a dismissed status

File: `apps/workshop/pb_migrations/1784240000_workshop_widgets.js:135`

An authenticated direct client can create its one lifetime report as `dismissed`. It triggers email but never appears in the admin open-report list, and uniqueness prevents a later real report.

Fix: force `open` on create and reserve status changes for admins; add a direct API test.

### P2 — Revision increments race and can be forged

Files: `packages/workshop/src/backend.ts:473`, `apps/workshop/pb_migrations/1784240000_workshop_widgets.js:51`

Revision is read/incremented client-side, and PocketBase permits any positive value. Concurrent edits can publish the same revision and overwrite each other; direct clients can jump/reset revisions.

Fix: assign revisions atomically in a server hook with expected-revision/CAS checks.

### P2 — Exported Workshop client module does not exist

File: `packages/workshop/package.json:14`

`@homarr/workshop/client` points to `./src/client.ts`, but that file is absent. Consumers of the advertised export get module-not-found.

Fix: point to the real module or add the missing file; add an exports-resolution test.

### P2 — Migration rollback leaves security configuration mutated

File: `apps/workshop/pb_migrations/1784240000_workshop_widgets.js:211`

The up migration changes users auth/rules/OAuth/admin fields and global rate limits, while down deletes only five Workshop collections. Rolling back leaves password auth and access/security settings changed.

Fix: restore every mutation, or split non-reversible bootstrap from reversible schema and explicitly prevent/document rollback. Test migrate-up/down state.

### P3 — Workshop workflow omits Docker build inputs

Files: `.github/workflows/workshop.yml:3`, `apps/workshop/Dockerfile:9`

Path filters omit root package/workspace/Turbo files, patches, definitions, and TypeScript tooling consumed by the Docker build. Changes can break production without triggering this workflow.

Fix: include every build input in push/PR filters or remove the restrictive filter.

### P3 — Report hook scans every user

File: `apps/workshop/pb_hooks/workshop.pb.js:79`

Each user-triggered report loads the full users table and filters admins in JavaScript.

Fix: query only admin records, preferably with bounded/queued email processing; add a scale-oriented hook test.

## Agent: Workshop frontend, browser, publish, and install flows

### P1 — Private source URLs can be published before review completes

File: `apps/nextjs/src/components/workshop/workshop-publish-modal.tsx:34`

The warning treats definition loading/error as zero private sources, and Publish stays enabled. Publishing then performs a separate export, creating loading/failure and TOCTOU paths that skip confirmation while still publishing private/loopback URLs.

Fix: block publish until inspection succeeds and validate the exact exported definition used for submission; require confirmation again if it changed.

### P2 — Signing in during a vote corrupts displayed counts

Files: `apps/docs/src/components/workshop/useWorkshop.ts:89`, `apps/docs/src/components/workshop/DetailPage.tsx:304`

After authentication, vote delta logic uses pre-auth captured state and does not reconcile counts from the server. A returning user toggling an existing vote can leave counts wrong until reload.

Fix: load the authenticated user's current vote before calculating deltas, or refetch/invalidate both submission and vote after mutation.

### P2 — Dropped widget JSON can be published as CSS

File: `apps/docs/src/components/workshop/SubmitForm.tsx:100`

JSON import selects `customWidget` only when no type was already chosen. If Custom CSS is selected first, dropped widget JSON remains classified as CSS and passes the non-empty CSS validator.

Fix: always switch to `customWidget` for JSON import or reject the mismatch and require an explicit type change.

### P2 — Screenshot removal can leave an invalid gallery index

File: `apps/docs/src/components/workshop/DetailSections.tsx:45`

The selected index persists when the URL list shrinks. A later index can reference `undefined` until navigation/remount.

Fix: clamp/reset index when URLs change and add a shrink-on-rerender test.

## Agent: documentation site and content

### P2 — Workshop docs name ignored environment variables

File: `apps/docs/docs/management/workshop/index.mdx:83`

The page instructs operators to set `NEXT_PUBLIC_WORKSHOP_API_URL` and `NEXT_PUBLIC_WORKSHOP_URL`, which the application never reads. Homarr uses `WORKSHOP_API_URL`; Docusaurus uses `WORKSHOP_URL`.

Fix: document the implemented variables and which process consumes each.

### P2 — Validation docs incorrectly claim only preview is blocked

Files: `apps/docs/docs/management/custom-widgets/index.mdx:60`, `apps/docs/docs/management/custom-widgets/troubleshooting.mdx:33`

The UI blocks both preview and persistence for invalid candidates/diagnostics.

Fix: state that validation blocks Preview and Save/Create while diagnostics remain available.

### P2 — Component-reference explorer is unreachable

File: `apps/docs/src/components/custom-jsx-component-reference.tsx:21`

The new explorer and large static catalog are not imported by any page, route, or MDX file, so the reference has no discoverable URL.

Fix: add and link a Custom Widgets documentation page that renders it, or remove the dead implementation/artifact.

### P2 — Checked-in OpenAPI schema is stale

File: `apps/docs/static/api/open-api-schema.json:6`

The large diff is formatting-only and semantically identical to `origin/dev`. It still omits the live `PATCH /api/users/right-click-widgets` operation from `packages/api/src/router/user.ts:661`.

Fix: regenerate from the current router and make CI compare generated output to the committed artifact.

## Agent: CI, build, packaging, and test configuration

### P1 — Older workflows can overwrite newer preview images

File: `.github/workflows/ci.yml:36`

Concurrency is not cancelled and is separated by event name. Every PR run publishes the same `pr-N` tag, so an older slower run can win; close cleanup uses another group and an in-flight build can republish after closure.

Fix: share one PR-number concurrency group, cancel superseded runs, and verify the PR is open and head SHA still matches immediately before publication.

### P1 — Database test project is never run

Files: `vitest.config.mts:29`, `package.json:38`, `.github/workflows/ci.yml:90`

`db-node` contains the four schema/migration specs, but the root test script runs only `api-node` and `dom`. CI therefore skips all DB migration tests.

Fix: include `--project db-node` or add a required dedicated DB job and assert test-project collection.

### P2 — v2 receives no push CI

File: `.github/workflows/ci.yml:10`

Push triggers cover main/dev/beta/next but not the active v2 integration branch.

Fix: add `v2` while it remains active or prohibit direct pushes with an explicit protected-branch workflow.

### P2 — Architecture and bundle guards are dead scripts

File: `package.json:9`

`check:custom-widgets` and `check:custom-widget-bundle` are defined but invoked by no workflow, Turbo task, build, or test.

Fix: make both required CI steps, with bundle checking after an explicit production build.

### P2 — Draft PRs push orphaned arm64 digests

File: `.github/workflows/ci.yml:227`

The arm64 job accepts draft PRs while the main container job excludes them. It pushes an untagged digest that cannot be published, wasting runner time and accumulating package versions.

Fix: match eligibility conditions or make arm64 depend on the validated container/E2E job.

### P2 — Custom-widget tests run in the wrong environment

Files: `packages/custom-widgets/vitest.config.ts:4`, `vitest.config.mts:40`

The package declares Node tests, but root CI ignores that config and sweeps its specs into the root jsdom project, including server network/session/limiter tests.

Fix: add a dedicated root Node project excluding these files from DOM, or run the package test command as a required step.

### P3 — Invalid bundle budget disables the guard

File: `scripts/check-custom-widget-bundle.mjs:7`

An invalid value becomes `NaN`; comparisons against it are false, so oversized output passes.

Fix: reject non-finite, non-positive, or non-integer values and test invalid inputs.

### P3 — Formatting check treats filenames as options

File: `.github/workflows/autofix.yml:33`

Null-delimited filenames are passed to `oxfmt --check` without `--`; a valid changed filename beginning with `-` is interpreted as an option.

Fix: use `oxfmt --check --` or prefix paths with `./`.

## Agent: MCP/API surface and permissions

### P2 — Production MCP exposure is not tested against an allowlist

Files: `packages/api/src/test/mcp.spec.ts:14`, `packages/api/src/mcp.ts:26`

Tests construct a hand-picked six-router test router rather than the production `mcpRouter`, then use loose `toContain` checks. An omitted production router can expose a newly enabled procedure without CI noticing.

Fix: extract from the real router and compare the complete sorted tool list to an explicit reviewed allowlist, including permission classification for mutations and secrets.

### P3 — Public-procedure test does not exercise public access

File: `packages/api/src/test/mcp.spec.ts:80`

The test only introspects names. Changing a promised-public authoring procedure to protected would remain green.

Fix: invoke each through an unauthenticated caller and pair with expected failures for protected procedures.

### P3 — New prompt/resource transport lacks protocol tests

Files: `apps/nextjs/src/app/api/mcp/[transport]/route.ts:184`, `packages/api/src/test/mcp.spec.ts:23`

Current tests cover only tool extraction, not JSON-RPC initialize, prompt list/get, resource list/read, URI dispatch, MIME types, interpolation, or error behavior.

Fix: add authenticated route-level protocol tests for valid and malformed/unknown requests.

## Agent: residual widgets, integrations, translations, and E2E infrastructure

### P3 — E2E setup and teardown can leak containers

File: `e2e/custom-widgets-custom-jsx-v2.spec.ts:16`

The `try/finally` starts only after all resources are acquired. Setup failures leak earlier containers, and sequential teardown stops after the first rejection.

Fix: register cleanup immediately after each acquisition and use individually guarded or `Promise.allSettled` teardown.

### P3 — E2E now depends on a live Docker Hub pull

File: `e2e/shared/mock-api-container.ts:17`

Every cache miss starts `node:24-alpine`, adding registry outage/rate-limit risk to a test that previously used an in-process server.

Fix: preload/build a pinned repository-controlled image or restore a host server reachable through a test network.

No other verified runtime regressions were found in the remaining non-custom-api widget, integration, modal, board/layout, or translation changes. Locale omissions are covered by the existing deep English fallback.

## Verification limits

- `git diff --check` passed.
- The repository's package commands could not start because this environment has Node `24.16.0` and pnpm `9.5.0`, while the branch enforces Node `>=24.18.0` and pnpm `>=11.11.0`. This is an environment limitation, not a passing or failing test result.
- The SQLite destructive-upgrade path was independently reproduced outside the blocked package commands.
- `.understand-anything/knowledge-graph.json` is absent, so no knowledge-graph diff overlay was generated. Run the repository understanding analysis first if a visual blast-radius overlay is desired.

## Suggested fix order

1. Replace the destructive DB reset with versioned legacy preservation, show migration-required widgets, add the redacted LLM migration-prompt/draft flow, and cover populated upgrades across all drivers; enable `db-node` in CI.
2. Close both stored-secret retargeting/exfiltration paths and make source/secret bindings explicit.
3. Harden regex execution, refresh intervals, deep response sanitization, and preview request limits.
4. Move Workshop validation/revision/report invariants into PocketBase hooks and repair OAuth startup synchronization.
5. Fix preview-image concurrency/publication integrity and make all new architecture, bundle, and package tests required.
6. Address editor/publish data-loss and TOCTOU paths, then documentation and lower-priority test gaps.
