# PR #6545 review

Reviewed head: `4843c2c6796113e271491db9ce0b79a519326655`
Base branch: `feat/onboarding-rebuild`
Merge-base: `c92e074a6f5d2f7698c33b6c925a27c21aeb5aae`

Scope: 2,443 changed paths, partitioned into 18 non-overlapping pieces. Sequential read-only reviewers use GPT-6 Luna at MAX effort and the review-agent skill. Findings require a concrete introduced defect; minimal-code guidance is applied without inventing style issues.

Prerequisite: Fumadocs PR #6822 merged into release/v2 after schema synchronization, 20 focused tests, and all current CI checks passed. Merge commit is the reviewed head above.

## Findings and coverage

Review in progress.

### 01 — Database (81 paths)

No findings. Covered 20 modified, 53 deleted, and 8 added paths. PostgreSQL/SQLite journals, migration SQL, snapshot chains and column defaults are consistent. Seed/query callers and migration test changes inspected. Review was static; fresh-install and seeded-demo runtime behavior was not newly tested.

### 02 — Authentication, validation, configuration, core (43 paths)

[P2] Reject credentials in public branding image URLs — `packages/server-settings/src/index.ts:34`

The new URL validator accepts `https://user:password@host/logo.png` by checking only the protocol. Public `serverSettings.getBranding` returns these settings, exposing embedded credentials to unauthenticated callers. Reject non-empty URL username/password fields.

Complete diff coverage for all 43 paths and relevant branding, header-preference, OIDC, cancellation, logging and DB-config callers. Static review only; no new runtime checks.

### 03 — API and HTTP routes (196 paths)

[P1] Keep legacy request data redacted before building the migration prompt — `packages/api/src/router/custom-widget/legacy-migration.ts:105`

The prompt now includes legacy query/body values and displayConfig. Downstream redaction is heuristic: opaque credentials under unrecognized keys (for example `sid`) survive. The admin-only migration query returns this prompt to the calling model through MCP with no API-enforced confirmation, so using migration can disclose a legacy session identifier to the provider. Prior behavior redacted all query/body values and omitted displayConfig.

All 196 diffs covered, including rereading truncated test sections. Static review only; UI flow and tests were not executed.

### 04 — Custom Widgets package (82 paths)

No confirmed findings. All 66 production/package files and 16 test diffs covered. Generated catalog was inspected structurally after raw one-line output exceeded limits. No tests, browser, server, or live integration checks were run.

### 05 — Board frontend (87 paths)

[P3] Keep keyboard focus aligned after filtering boards — `apps/nextjs/src/components/board/board-switcher.tsx:130`

Typing while a board card is focused resets activeIndex to zero but leaves focus on that card. If it still matches the filter, Enter activates it although a different first result is highlighted. Move focus to the search input or active result after filtering.

All 87 diffs covered; event handlers and callers inspected. No tests or browser checks executed.

### 06 — Assistant, Custom Widget, Workshop frontend (60 paths)

[P2] Reset source setup values when the imported widget changes — `apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts:45`

When widgets A and B have identical sources, replacing A with B preserves A's edited credentials because setups is memoized only from sources and the reset effect does not run. The file-import page's global paste handler can replace the pending widget while the dialog is still mounted. Importing B then submits/persists A's secrets under B's source IDs, authorizing B using credentials entered for A.

All 60 diffs covered, including panel reassembly/extracted components; relevant paste/import/server callers inspected. No tests, builds or runtime checks run.

### 07 — Application pages (234 paths)

No confirmed findings. All 234 complete diffs covered, including rereads of truncated sections. Invite encoding and breakpoint ordering concerns were resolved from source; the reset concern did not meet the finding threshold. No runtime checks run.

### 08 — Application shell/layout (65 paths)

No findings. All 65 complete diffs covered. The restore flow retains explicit backup preview and a Restore Database action; lack of an additional typed confirmation was not itself an unexpected destructive behavior. Static review only; no tests/runtime checks.

### 09 — Widgets A (189 paths)

No proven findings. All 189 diffs covered. A suspected iframe context-action XSS was rejected after a focused Chromium probe: a real click invoking window.open with a harmless javascript: title payload and the exact `noopener,noreferrer` features produced a blank, opener-less popup; the control without those features executed the payload. React also sanitizes javascript: DOM src values. This is Chromium evidence, not a claim about every browser. No broad tests run; the disposable probe browser and HTTP server were closed.

### 10 — Widgets B (152 paths)

No proven findings. All 152 complete diffs covered. No tests/runtime checks run; no concrete candidate required additional caller proof.

Additional evidence for finding 03: a pure local call to buildLegacyCustomWidgetMigrationPrompt with dummy opaque `sid` values in query and POST body returned a prompt containing that value twice. No provider/network request was made. The tested implementation blob matches the frozen review head (`44570f9d7cf64a25eba86da5d53352d54d9ffafb`).

### 11 — Integrations and services (172 paths)

No findings. All 172 complete diffs covered. Arbitrary HTTP routing requires full access and native integration-derived credentials; transport constraints were traced. The CPU percentage formula is an intentional host-normalized convention without a demonstrated caller contradiction. No tests or live calls run.

### 12 — Shared UI, forms, modals, Spotlight (132 paths)

[P2] Route global creation to a supported page — `packages/spotlight/src/modes/command/global-group.tsx:65`

“Create something” is exposed to board/app/integration creators on every route, but its handler only sets create=true on the current pathname. Only the boards, user groups and invites pages consume it. On app/integration pages and dashboard routes, selecting the command silently does nothing. Route to a supported creation action or scope the command to supported contexts.

All 132 complete diffs covered, including deleted modal sources and replacement callers. Root independently verified the handler and all query consumers. Static review only; no runtime checks.

### 13 — Workshop backend and bundled docs image (24 paths)

[P2] Enforce the search budget for the new native provider — `apps/workshop/homarr_provider.go:28`

Changing the default from DeepSeek to GPT-6 Luna selects OpenAI native search under OpenRouter's default auto engine. The sanitizer's max_uses=3 is ignored by non-Anthropic native search, so it no longer enforces the intended per-request search ceiling; the separate top-level budget is not pinned. Multi-search requests can exceed the cap and incur additional charges. Use an engine that honors the limit or enforce the supported server-tool budget and sanitize overrides. This conclusion follows the request payload and [OpenRouter's server-tool contract](https://openrouter.ai/docs/guides/features/server-tools/web-search), independently checked by the parent; no paid provider call was made.

All 24 complete diffs covered, including image entrypoint, static routing, migrations, provider and integration tests. Static review only; prior image CI success is separate evidence, not a new exhaustive runtime run.

### 14 — Docs application (165 paths)

No findings. All 165 complete diffs covered, including deleted component callers, homepage assets/captions, Carbon, API/search/LLM routes and Workshop. Moving Workshop actions into the details sidebar was explicitly requested and is not a defect. Static review only; no builds, browser or third-party advertising/analytics checks run.

### 15 — Docs content and build (445 paths)

[P2] Explain the MySQL conversion prerequisite in Docker upgrades — `apps/docs/docs/getting-started/installation/docker.mdx:27`

The updated Docker guide says v1-to-v2 migrations run automatically and no separate procedure is needed. MySQL is no longer supported in v2; the new MySQL-to-SQLite guide requires conversion before upgrading. Existing MySQL users following the generic Docker instructions can deploy v2 against an unsupported database. Qualify the claim and link the conversion prerequisite.

[P3] Match Weather's documented defaults to the widget — `apps/docs/docs/widgets/weather/index.tsx:39`

The metadata adds humidity with default yes and changes city/forecast defaults from no to yes. All three runtime defaults are false. These rendered configuration references misstate fresh-widget behavior; restore the actual defaults.

All 445 paths covered; media/assets checked mechanically, generated JSON checked structurally (parses, unique OpenAPI operation IDs, local references), text/config/script diffs read. Root independently confirmed both findings. No tests, builds or runtime checks run.

### 16 — Developer CLI and MySQL converter (161 paths)

[P2] Verify volume ownership before removing the selected container — `tools/homarr-dev/internal/tui/actions.go:323`

The TUI pairs name-discovered containers with `${container.Name}_data` volumes without checking mounts, then force-removes the container before deleting the volume. A manually recreated/bind-mounted `homarr_<name>` container can be paired with a leftover matching volume it does not own; confirming data deletion removes that unrelated container. Reuse the mount/immutable-ID check already used by CLI data deletion.

All 161 paths covered, including deleted TUI replacements and converter source/tests/schema/journals/migration fixtures. No broad tests, builds, Docker or live services run. A suspected SQLite missing-comma failure was rejected by a pure in-memory SQLite 3.45.1 probe of the exact CREATE TABLE statement; it succeeded and PRAGMA foreign_key_list returned both intended constraints.

### 17 — Registry, translations and contributor data (65 paths)

No findings. Exact coverage: 23 definitions paths, 39 translation paths (36 locales plus source), three contributor datasets. JSON duplicate keys, changed keys/interpolations, fallback and relevant callers checked. A backup-limit interpolation concern was rejected: runtime and affected locale text all still specify 256 MiB. Contributor identities and asset URLs checked structurally. No runtime checks.

### 18 — CI, deployment and repository configuration (90 paths)

[P2] Delete only the API key owned by the browser-check run — `scripts/browser-agent/ux-coherence-happy-paths.sh:240`

If the browser script fails after setting cleanup pending but before capturing its created key ID, fallback cleanup deletes every key absent from the baseline. Another user's concurrently created key is included and revoked. Preserve only an explicitly identified owned key; do not infer ownership from a list difference during failure cleanup. Root independently verified the pending/create/ID-capture/EXIT-trap flow; the script was not run.

All 90 paths covered, including 21 workflows, actions, runtime configs/scripts, E2E deletions, guidance and structural dependency/lockfile checks. No tests/builds/CI reruns. General board-interaction E2E coverage is intentionally removed from routine PR CI; those scenarios are no longer gated there. A removed dependency-age policy was not treated as a concrete defect.

## Live PR/CI check during final delta review

PR #6545 remains open with head `0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52`, matching the queued delta. Current checks have no failures: Fast gate, database gate, CodeQL, amd64/arm64 preview builds, multi-platform publishing and Workshop validation/publishing succeeded. Migration execution and image/container smoke jobs were skipped on this head; they are not claimed as newly passed. [CI run](https://github.com/homarr-labs/homarr/actions/runs/36084655940), [Workshop run](https://github.com/homarr-labs/homarr/actions/runs/36084655843).

All ten finding files are unchanged between the original and delta heads; remaining caller changes are under delta review.

### 19 — Newer-head delta (79 paths)

No findings. Complete diff from 4843c2c6796113e271491db9ce0b79a519326655 to 0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52 covered all 79 paths: saved integration authentication, per-item board layout, LDAP/session fixes, release pagination, runtime script, docs/schema and tests. Original finding locations are unchanged. No tests/builds/live services run.

Final live refs: base c92e074a6f5d2f7698c33b6c925a27c21aeb5aae, head 0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52, PR open. The union of original and delta manifests covers all 2459 current changed paths, with zero missing paths.
