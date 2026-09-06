# Homarr v2 GA release checklist

Last audited: 2026-09-06 (Europe/Berlin)

This is the working go/no-go checklist for the full Homarr v2 release. Do not mark an item complete from an old
preview, PR run, or verbal confirmation. Add the final SHA, run URL, screenshot, issue, or written risk acceptance next
to every completed release gate.

## Release path

```text
release/v2
  -> reviewed integration branch based on current dev
  -> promotion PR into dev
  -> final candidate validation on dev
  -> weekly or manually-created dev -> main PR
  -> HUMAN merge for the v2 major release
  -> Semantic Release creates v2.0.0
  -> GitHub release + GHCR images + release archives
  -> docs, Workshop, Discord and support follow-through
```

The weekly workflow deliberately does not auto-merge major releases. The v2 `dev -> main` PR must be merged by a
human after the final go/no-go approval.

## How to use this checklist

- `[ ]` means unverified or incomplete.
- `[x]` in the audited snapshot means it was observed on the dated snapshot only. Repeat final-candidate gates after
  integrating into `dev`.
- `BLOCKER` must be closed or have explicit written acceptance from the release owner before the production merge.
- Put evidence directly below the item or link it from the sign-off record.
- If the candidate SHA changes, invalidate build, migration, image, browser, security and deployment sign-offs.

## Audited snapshot

These facts are time-sensitive and must be refreshed at the start of the release window.

- [x] `origin/release/v2`: `35155b18b97b6904f6b571c93de9102c3d79e4da`
- [x] `origin/dev`: `da32acb4f0ba9d8fa8e9667f56a54f85ca497865`
- [x] `origin/main`: `331925c197ad9cbf0138dbbcee9d8952ef9298dc` (`v1.76.2`)
- [x] `release/v2` has 562 commits not in `dev`; `dev` has 54 commits not in `release/v2`.
- [x] The merge base is `2513e8454f240caa315b68dd6738b79838eeeecc` from 2026-08-13.
- [x] The `dev...release/v2` change spans 2,473 files, 243,111 insertions and 59,966 deletions.
- [x] A clean `git merge-tree --write-tree origin/dev origin/release/v2` rehearsal reports 11 content conflicts.
- [x] The exact `release/v2` SHA has successful Fast gate, Container and E2E, CodeQL, Workshop validation and
  amd64/arm64 preview publication checks.
- [x] The latest `dev` deployment workflow at `da32acb4f0ba9d8fa8e9667f56a54f85ca497865` is successful. An earlier
  arm64 offline-install failure was superseded by this green run.
- [x] The Homarr preview manifest exists for amd64 and arm64:
  `ghcr.io/homarr-labs/homarr-test:v2@sha256:9055880e1d04ee78f2ff171ad8ff5ccd0b225e67e0a7635f4158669c40a8d7a0`.
- [x] The Workshop preview manifest exists for amd64 and arm64:
  `ghcr.io/homarr-labs/workshop:v2@sha256:1578c7e68955395a533ea9a3afad1168331cb783bb98b0255c3ded5c0cd927f5`.
- [x] PR [#6760](https://github.com/homarr-labs/homarr/pull/6760) merged the streamlined v2 documentation and
  passed its hosted checks.
- [x] GitHub currently reports zero open CodeQL alerts and zero open secret-scanning alerts.
- [ ] GitHub Dependabot currently reports 168 open repository-wide alerts: 5 critical, 64 high, 82 medium and 17 low.
  These are based on the repository's default-branch dependency view and must be reconciled with the candidate-specific
  `pnpm audit` results.
- [ ] No `v2.0.0` tag or production GitHub release exists yet. The latest production release is `v1.76.2`.
- [ ] The `v2.0.0` milestone is still open but contains zero open issues and only one closed issue. It is not an
  adequate source of release truth.

### Current merge conflicts

- [ ] `.gitignore`
- [ ] `apps/docs/docs/getting-started/installation/helm.md`
- [ ] `apps/docs/docs/widgets/smart-home-entity-state/index.mdx`
- [ ] `apps/docs/docs/widgets/smart-home-execute-automation/index.mdx`
- [ ] `e2e/onboarding.spec.ts`
- [ ] `packages/api/src/router/widgets/smart-home.ts`
- [ ] `packages/integrations/src/truenas/test/truenas-integration.spec.ts`
- [ ] `packages/translation/src/lang/et.json`
- [ ] `packages/translation/src/lang/fr.json`
- [ ] `packages/translation/src/lang/no.json`
- [ ] `packages/translation/src/lang/ro.json`

## Current hard blockers

- [ ] **BLOCKER — integrate histories:** reconcile all 54 `dev`-only commits and resolve the 11 current merge
  conflicts without dropping either branch's behavior.
- [ ] **BLOCKER — production dependency audit:** `mise exec -- pnpm audit --prod --audit-level high` currently exits
  with 141 findings: 4 critical, 65 high, 62 moderate and 10 low.
- [ ] **BLOCKER — direct authentication advisories:** upgrade or explicitly accept the critical `next-auth` and
  `@auth/core` findings. The candidate currently resolves `next-auth@5.0.0-beta.31` and `@auth/core@0.41.2`.
- [ ] **BLOCKER — weekly promotion automation:** the last two scheduled weekly release runs failed in `Get Next
  Version` with `No commit resulted in a version bump since last release!`. Make the no-release case a clean skip.
- [ ] **BLOCKER — scheduled notifications:** scheduled weekly notifications and the failure notification are skipped
  because they depend on `github.event.inputs.send-notifications`, which is absent for schedule events.
- [ ] **BLOCKER — documentation release:** Homarr's release workflow dispatches `homarr-labs/documentation`, but that
  repository's active release workflow only installs dependencies and echoes that it acknowledged the tag. It does not
  build or deploy documentation.
- [ ] **BLOCKER — branch rules:** the strong `v2 release` ruleset targets the legacy `refs/heads/v2`, not
  `refs/heads/release/v2`. The active release branch does not receive those required checks.
- [ ] **BLOCKER — final upgrade rehearsal:** perform backup, migration, restore and rollback rehearsals from real
  `v1.76.2` installations for SQLite, MySQL and PostgreSQL.
- [ ] **BLOCKER — upgrade guide:** publish one canonical v1-to-v2 guide covering breaking changes, backups,
  migrations, rollback limits, changed configuration and supported installation paths.
- [ ] **BLOCKER — beta feedback:** reproduce or close every unresolved report in the public v2 beta issue.
- [ ] **BLOCKER — release scope:** explicitly include or defer the open llama.cpp PR and every release-sensitive fix
  listed below before feature freeze.
- [ ] **BLOCKER — production defaults:** disable mock integrations in `.env.example` and verify server-side creation
  cannot bypass `UNSAFE_ENABLE_MOCK_INTEGRATION`.
- [ ] **BLOCKER — final immutable candidate:** nominate one SHA, freeze it, and repeat all mandatory checks on that
  exact SHA after it is in `dev`.

## 1. Ownership and release control

- [ ] Name the release owner: `________________`.
- [ ] Name the database/backup owner: `________________`.
- [ ] Name the infrastructure/GHCR owner: `________________`.
- [ ] Name the documentation owner: `________________`.
- [ ] Name the Workshop owner: `________________`.
- [ ] Name the Discord/support owner: `________________`.
- [ ] Agree on the feature-freeze time: `________________`.
- [ ] Agree on the production merge window: `________________`.
- [ ] Agree on rollback decision authority: `________________`.
- [ ] Create one release tracking issue and copy/link this checklist there if GitHub assignment is required.
- [ ] Assign an owner and deadline to every accepted blocker.
- [ ] Record explicit written acceptance for any unresolved non-blocking risk.
- [ ] Confirm at least two humans will attend the final go/no-go and release window.

## 2. Integrate `release/v2` into `dev`

- [ ] Freeze new features on `release/v2`.
- [ ] Refresh `origin/main`, `origin/dev`, `origin/release/v2`, tags, PRs and rulesets.
- [ ] Create a temporary integration branch from the current `origin/dev`.
- [ ] Merge `origin/release/v2` into that integration branch.
- [ ] Resolve every conflict semantically; do not choose an entire side for translations, migrations, docs or APIs
  without reviewing both changes.
- [ ] Re-run the merge rehearsal and confirm zero unresolved entries.
- [ ] Review every `dev`-only commit and mark it as preserved, superseded or intentionally rejected.
- [ ] Specifically preserve or reconcile current `dev` changes for:
  - [ ] startup/internal service addresses
  - [ ] MCP void results
  - [ ] Home Assistant actions and smart-home refresh behavior
  - [ ] TrueNAS dataset/pool calculations
  - [ ] OMV disk-temperature matching
  - [ ] Unraid CPU/link/board fixes
  - [ ] custom PUID/PGID startup behavior
  - [ ] Helm documentation
  - [ ] contributor and bug-report automation
  - [ ] all Crowdin translation updates
- [ ] Confirm root `package.json` remains version `2.0.0`.
- [ ] Confirm the final promotion commit/PR contains a breaking Conventional Commit signal such as
  `feat!: release Homarr v2`.
- [ ] Regenerate the lockfile only after dependency and conflict decisions are final.
- [ ] Open the reviewed integration branch as the actual promotion PR into `dev`.
- [ ] Require human review and resolve every thread.
- [ ] Do not use PR #6545 as the production promotion PR; it targets an internal stacked branch.

## 3. Pull-request triage

Every open PR must be marked `include`, `port only`, `defer`, `superseded`, or `close`. New features should default to
defer once the release is frozen.

### Release-sensitive decisions

- [ ] [#6765 llama.cpp integration and widget](https://github.com/homarr-labs/homarr/pull/6765) — currently targets
  `release/v2`, is unstable, has no approval, lacks full CI on its newest head, and has requested responsive/advanced
  mode work. Finish it completely or defer it before integration.
- [ ] [#6624 backup restore re-login](https://github.com/homarr-labs/homarr/pull/6624) — verify whether the final v2
  candidate already contains the intended redirect and user warning. Port the minimal fix if not; do not merge its
  unrelated branch drift wholesale.
- [ ] [#6631 MCP OAuth base URL](https://github.com/homarr-labs/homarr/pull/6631) — security and reverse-proxy
  relevance; include/port or document why it is safe to defer.
- [ ] [#6662 board access-control form](https://github.com/homarr-labs/homarr/pull/6662) — permission correctness;
  include/port or explicitly defer.
- [ ] [#6674 weather and `NO_EXTERNAL_CONNECTION`](https://github.com/homarr-labs/homarr/pull/6674) — offline/privacy
  contract; include/port or explicitly defer.
- [ ] [#6749 Unraid memory utilization](https://github.com/homarr-labs/homarr/pull/6749) — validate against the v2
  system widgets and include/port or defer.
- [ ] [#6250 container CPU utilization](https://github.com/homarr-labs/homarr/pull/6250) — recently updated and
  potentially user-visible for v2 Docker widgets; include/port or defer.
- [ ] [#6733 Helm documentation](https://github.com/homarr-labs/homarr/pull/6733) — reconcile with the v2 Helm
  conflict and current chart; do not ship competing instructions.
- [ ] [#6601 broad dependency update](https://github.com/homarr-labs/homarr/pull/6601) — do not merge wholesale just
  to clear advisories; create a focused security upgrade if this PR is too broad or stale.

### Feature/UI candidates to include or defer explicitly

- [ ] #6657 OMV volume selection
- [ ] #6645 Beszel GPU metrics
- [ ] #6621 Downloads column width
- [ ] #6603 isolated pnpm linker/phantom dependencies
- [ ] #6572 Hermes Agent integration
- [ ] #6562 favicon detection
- [ ] #6561 Komodo integration
- [ ] #6546 REST dashboard automation
- [ ] #6537 dashboard memory work
- [ ] #6518 Sportarr integration
- [ ] #6517 UGOS integration
- [ ] #6515 SABnzbd archived-history options
- [ ] #6458 API add-item section targeting
- [ ] #6393 board keyboard shortcuts
- [ ] #6295 Nextcloud subpath fix
- [ ] #6294 nested OIDC claims
- [ ] #6210 UniFi default ports
- [ ] #6148 path-only app URLs

### Stack and stale-PR cleanup

- [ ] Close or reframe #6545 after the real promotion PR exists.
- [ ] Close internal stack PRs #6569, #6555, #6503, #6502, #6482, #6450 and #6356 after confirming their commits
  are present in `release/v2`.
- [ ] Resolve/close #6549, whose head and base are both `dev`.
- [ ] Close superseded duplicate PRs such as the older Downloads-width and path-only URL variants.
- [ ] Move all accepted deferred work to a `v2.0.x` or `v2.1` milestone.
- [ ] Confirm no open PR still targets `release/v2` when the candidate is frozen.

### Documentation and announcement branches

- [x] PR #6760 is merged into `release/v2`.
- [ ] Rebase `origin/feat/homarr-v2-release-blog` onto current `release/v2`; it is currently two commits behind and
  nine ahead.
- [ ] Review and merge the Homarr 2.0 blog, screenshots/GIFs, and GitHub/Reddit/Discord announcement variants from
  that branch.
- [ ] Confirm no release-research scratch material is published unintentionally.

## 4. Security and privacy gate

- [ ] Re-run `mise exec -- pnpm audit --prod --audit-level high` on the final candidate.
- [ ] Reduce all critical production-reachable findings to zero.
- [ ] Upgrade `@auth/core` to a patched release and validate every authentication provider.
- [ ] Upgrade `next-auth` to a patched release and validate failure-open, email normalization and session behavior.
- [ ] Resolve or accept the critical `protobufjs` path after separating runtime use from testcontainer tooling.
- [ ] Resolve or accept the critical `handlebars` path after identifying whether it enters any production artifact.
- [ ] Triage high findings including `undici`, `adm-zip`, `fast-xml-parser`, `axios`, `hono`, `postcss`,
  `serialize-javascript`, `image-size`, `fast-uri`, `js-yaml`, `brace-expansion`, `find-my-way`, `immutable`, `svgo`,
  `shell-quote`, `@xmldom/xmldom`, `protobufjs` and `handlebars`.
- [ ] For every accepted advisory, record package path, runtime reachability, mitigating controls, owner and target
  patch release.
- [ ] Confirm CodeQL has no open alert on the final SHA.
- [ ] Confirm secret scanning has no open alert on the final SHA.
- [ ] Review authentication, API keys, session invalidation, CSRF and authorization boundaries.
- [ ] Test OIDC, credentials authentication and LLDAP using non-admin and admin users.
- [ ] Test board, integration, app, user, group, API, MCP and settings permissions.
- [ ] Verify public boards never expose private integrations, secrets, Custom Widget credentials or assistant context.
- [ ] Verify logs, analytics and error messages redact tokens, passwords, headers and URLs containing credentials.
- [ ] Verify Custom Widget URL/SSRF, secret, preview-action and sandbox boundaries.
- [ ] Verify MCP destructive tools are permission-checked and clearly described.
- [ ] Review GitHub Actions permissions; repository workflows currently default to write and can approve PRs.
- [ ] Decide whether release workflows must pin third-party actions to immutable SHAs. SHA pinning is not currently
  required.

## 5. Database migration, backup and rollback

v2 adds parallel migrations for Custom Widget v2 tables, layout gutters, layout roles, assistant tables, and header
preferences/branding to SQLite, MySQL and PostgreSQL, plus the custom section/gutter migration.

### Automated migration validation

- [ ] SQLite migration suite passes on the final candidate.
- [ ] MySQL migration suite passes on the final candidate.
- [ ] PostgreSQL migration suite passes on the final candidate.
- [ ] Migration journal integrity suite passes.
- [ ] Schema parity checks pass.
- [ ] Custom Widget v1 data/board-reference preservation tests pass for all three drivers.
- [ ] Backup import/export, concurrent restore and temporary-directory cleanup tests pass.
- [ ] Same-key and changed-key secret re-encryption tests pass.

### Real upgrade rehearsal — repeat for every driver

- [ ] Use a representative `v1.76.2` installation with users, groups, boards, apps, integrations, secrets, media,
  tasks and Custom Widgets.
- [ ] Record source version, database driver, architecture, image digest and backup checksum.
- [ ] Back up the database, `/appdata`, certificates and exact `SECRET_ENCRYPTION_KEY`.
- [ ] Upgrade using the exact final-candidate image digest.
- [ ] Confirm migrations run exactly once and startup becomes healthy.
- [ ] Restart again and confirm migrations do not repeat or corrupt state.
- [ ] Verify users, groups, sessions, API keys and permission scopes.
- [ ] Verify boards, sections, containers, rails, layouts, gutters and breakpoints.
- [ ] Verify apps, integrations, encrypted secrets and search engines.
- [ ] Verify Custom Widget v1 archives and v2 definitions/secrets.
- [ ] Verify assistant configuration/history and branding/header preferences.
- [ ] Export a v2 backup and restore it into a clean v2 deployment.
- [ ] Confirm restore explains session invalidation and sends the user cleanly to sign-in.
- [ ] Test a backup made with a different encryption key.
- [ ] Test a corrupt, incomplete, oversized and wrong-driver backup.
- [ ] Restore the original v1 backup as the rollback rehearsal.
- [ ] State clearly whether v1 can open a v2-migrated database. If unsupported, prohibit rollback with the migrated
  database and require restoration of the pre-upgrade backup.

## 6. Product acceptance matrix

### Installation and runtime

- [ ] Docker Compose fresh install.
- [ ] Docker Compose upgrade from `v1.76.2`.
- [ ] amd64 image.
- [ ] arm64 image, including Raspberry Pi-class hardware.
- [ ] SQLite, MySQL and PostgreSQL.
- [ ] Internal Redis and external Redis.
- [ ] Reverse proxy with HTTPS and WebSocket forwarding.
- [ ] IPv4-only, IPv6-only where supported, and dual-stack behavior.
- [ ] Custom PUID/PGID with bind mounts and named volumes.
- [ ] Docker and Podman sockets, including multiple socket configuration.
- [ ] Kubernetes and current Helm chart.
- [ ] Unraid, TrueNAS, Synology, QNAP, Portainer and Proxmox documented paths.
- [ ] Source installation with Node 24.18.0 and pnpm 11.15.1.
- [ ] `_FILE` secret variants and trusted certificates.
- [ ] Restart, health-check and graceful-shutdown behavior.
- [ ] Offline/`NO_EXTERNAL_CONNECTION` behavior.
- [ ] Low-memory startup and a large real dashboard.

### Authentication, users and onboarding

- [ ] Fresh onboarding from first request to usable admin dashboard.
- [ ] Upgrade bypasses onboarding correctly.
- [ ] Local sign-in, sign-out, expiry, invalid credentials and password recovery.
- [ ] OIDC and LLDAP sign-in, account linking and logout.
- [ ] Admin and non-admin navigation.
- [ ] Create, edit, disable/delete and restore users where supported.
- [ ] Create groups, assign members and verify permission inheritance.
- [ ] Public/private board access and home-board selection.
- [ ] Authentication branding/background does not disclose private app or integration data.

### Boards and layouts

- [ ] Create, rename, duplicate, import, export and delete a board.
- [ ] Create/edit/delete sections, containers and rails.
- [ ] Drag, resize, multi-move and move into/out of containers.
- [ ] Responsive Base, Custom and Mobile layout selection and repair.
- [ ] Sidebars and collapsible/scrollable containers.
- [ ] Empty-board and missing-board states.
- [ ] Edit/view mode transitions, context menus and keyboard interactions.
- [ ] Mobile phone, tablet, 1080p dense grid and large desktop viewport.
- [ ] Light/dark theme, background, border radius and custom CSS.
- [ ] Undo/redo/reset behavior where exposed.

### Apps, search and management

- [ ] App create/edit/delete, favicon/icon selection, ping and Docker association.
- [ ] Integration create/edit/test/delete and app linking.
- [ ] Search engines, DDG bangs and external search.
- [ ] Spotlight modes, commands and permission filtering.
- [ ] Media management and release search.
- [ ] Logs, contextual widget timestamps and redaction.
- [ ] Task list, manual trigger, cron status and Redis reconnect.
- [ ] Certificates add/remove/use flow.
- [ ] Backup download and restore flow.
- [ ] Server settings, analytics consent, culture, branding and global custom CSS.

### Widgets and integrations

- [ ] Run documentation coverage validation for every registered widget/integration slug.
- [ ] Smoke every one of the 59 current widget documentation categories against its actual widget definition.
- [ ] Smoke each integration family with a real service or documented representative fixture.
- [ ] Validate normal, loading, empty, partial-data, authentication-error, timeout and offline states.
- [ ] Validate widget context menus, edit forms, optional integrations and advanced mode.
- [ ] Validate cache/refetch behavior and WebSocket updates.
- [ ] Validate chart labels, tables and text at dense/small sizes.
- [ ] Validate integration actions such as Docker, DNS, download, smart-home and media requests.
- [ ] Confirm unsupported upstream metrics are shown as unavailable rather than fabricated zeroes.

### Custom Widgets, Assistant, MCP and Workshop

- [ ] Custom Widget create, import, edit, validate, preview, save, install, update, uninstall and rollback.
- [ ] Custom Widget queries/actions, redacted journal, secrets and invalidation behavior.
- [ ] Workshop browse, search, detail, screenshot, comments, authentication, publishing and moderation.
- [ ] Workshop outage does not break already-installed widgets.
- [ ] Assistant configuration for Homarr, OpenRouter, Ollama and applicable compatible providers.
- [ ] Assistant conversation, tools, custom CSS and Custom Widget authoring.
- [ ] Assistant consent/privacy claims match actual telemetry and provider behavior.
- [ ] MCP HTTP transport, authentication, OAuth discovery/login, API-key access and error responses.
- [ ] Decide whether Custom Widgets and Workshop remain labelled experimental for GA and define their support policy.

### Browser, accessibility and performance

- [ ] Chromium final-candidate E2E passes.
- [ ] Firefox smoke passes; current automated E2E is Chromium-only.
- [ ] WebKit/Safari smoke passes if it is in the supported browser matrix.
- [ ] Keyboard-only navigation and visible focus states.
- [ ] Screen-reader labels for forms, dialogs, menus and live restore states.
- [ ] Reduced-motion behavior and acceptable color contrast.
- [ ] Compare v1.76.2 and v2 cold start, server memory, browser memory and dashboard refresh time.
- [ ] Confirm no sustained request storm or duplicate subscriptions on large dashboards.
- [ ] Confirm widgets do not take the beta-reported 72 seconds to recover after a full page refresh.

## 7. Public beta feedback closure

Track every report from [issue #6600](https://github.com/homarr-labs/homarr/issues/6600) with a reproducer and fix,
or a linked issue and explicit defer decision.

- [ ] Dense Beszel/widget text scaling — correlate with #6616 and retest 13/23/24-column layouts.
- [ ] Incorrect v1.74 update indicator in the v2 preview — verify final image reports v2.0.0 and no false update.
- [ ] Full-page widget refresh reported as roughly 5 seconds in v1 versus 72 seconds in v2 — reproduce and profile.
- [ ] Date/time widget missing world clocks — reproduce and close or fix.
- [ ] Media Releases widget reported non-functional — reproduce with supported providers and close or fix.
- [ ] Compact bookmarks reported as not compact — #6747 is present; visually retest all supported sizes.
- [ ] Review the beta issue again for new comments immediately before freeze.
- [ ] Reply with fix/issue links so testers know each report's disposition.
- [ ] Close or convert the beta thread only after all reports have a disposition.

## 8. Documentation and placeholder cleanup

### User documentation

- [ ] Publish a canonical `Upgrade from v1 to v2` page.
- [ ] Cover backup prerequisites, database migrations, changed environment variables and rollback limitations.
- [ ] Cover Custom Widget v1-to-v2 migration and archived definitions.
- [ ] Cover Workshop data/volume backup and restore.
- [ ] Cover Docker, Helm/Kubernetes, Unraid, TrueNAS, Synology, QNAP, Portainer, Proxmox and source upgrades.
- [ ] List removed/renamed behavior and known issues.
- [ ] Verify all environment defaults, image names, ports, paths and commands against source.
- [ ] Run `mise exec -- pnpm turbo build --filter=@homarr/docs` on the final docs commit.
- [ ] Treat every broken link, missing image and invalid MDX page as a blocker.
- [ ] Verify generated integration/widget coverage after the final registry is frozen.
- [ ] Verify screenshots against the final UI on desktop and mobile.
- [ ] Verify Algolia indexing/recrawl after deployment.
- [ ] Decide whether merging v2 into `dev` may publish GA-oriented docs before the application release.

### Repository and placeholder cleanup

- [ ] Update `.github/pull_request_template.md`; it still tells contributors to open documentation changes in the
  separate `homarr-labs/documentation` repository even though docs live in this monorepo.
- [ ] Decide whether to restore a root `README.md`. Only `docs/README.md` currently exists.
- [ ] Fix the seven generated `href="null"` integration links in `docs/README.md` and make the generator omit or
  safely handle integrations without a documentation URL.
- [ ] Replace `.env.example`'s `DB_URL='FULL_PATH_TO_YOUR_SQLITE_DB_FILE'` with a safe runnable example or clearly
  commented unset value.
- [ ] Set `UNSAFE_ENABLE_MOCK_INTEGRATION=false` or comment it out in `.env.example`.
- [ ] Verify direct URLs/API calls cannot create a mock integration when the unsafe flag is disabled.
- [ ] Review sample `AUTH_SECRET` and encryption keys so no example can be mistaken for production-safe material.
- [ ] Keep intentional UI input placeholders, test-domain `example.com` values, the Workshop password replacement
  example and media-year `TBD`; these are not unfinished product copy.
- [ ] Run another focused scan for TODO, TBD, lorem ipsum, coming soon, `href="null"`, fake URLs, temporary files,
  screenshots from previews and beta-only wording.

### Release article and notes

- [ ] Rebase and review `feat/homarr-v2-release-blog` after all product decisions are final.
- [ ] Ensure article claims about performance, privacy, features and compatibility have current evidence.
- [ ] Curate release notes; autogenerated notes from 562 release-branch commits are not sufficient by themselves.
- [ ] Run Semantic Release in dry-run mode from a faithful final-candidate branch and inspect the proposed version and
  changelog.
- [ ] Ensure the draft GitHub release body stays below GitHub limits and links to the upgrade guide.

## 9. Workshop production readiness

- [ ] Decide the production Workshop domain, `WORKSHOP_API_URL`, `WORKSHOP_WEB_URL` and `WORKSHOP_PUBLIC_ORIGIN`.
- [ ] Snapshot the PocketBase database, files and configuration.
- [ ] Rehearse the documented v2 Workshop migration/restore procedure.
- [ ] Verify GitHub OAuth callback URLs and credentials.
- [ ] Verify allowed origins, email links, administrator access and moderation.
- [ ] Test amd64 and arm64 Workshop images by immutable digest.
- [ ] Promote the exact approved Workshop digest from `:v2` to its production tag.
- [ ] Verify Workshop health and a Homarr install/update flow after production promotion.
- [ ] Verify docs continue to build and render if Workshop is unavailable.
- [ ] Define Workshop rollback separately from the Homarr application rollback.

## 10. CI/CD production readiness

### Fix before promotion

- [ ] Make the weekly workflow exit successfully with a clear `no releasable change` result when Semantic Versioning
  finds no bump.
- [ ] Fix notification conditions so scheduled runs notify by default and manual runs respect the checkbox.
- [ ] Prove weekly success, failure and major-release/manual-merge paths in controlled runs.
- [ ] Correct the `v2 release` ruleset target or remove the stale legacy branch/rule after preserving required checks.
- [ ] Add required final checks to `main`; its current productive ruleset requires review but no status checks.
- [ ] Require at least one human approval, resolved threads, stale-approval dismissal and no force push/deletion for the
  final promotion.
- [ ] Review ruleset bypass actors and limit release bypasses to the necessary bots/owners.
- [ ] Replace the downstream documentation acknowledgement workflow with an actual build/deploy or remove the false
  release handoff and make monorepo docs deployment authoritative.
- [ ] Add an explicit production deployment failure notification.
- [ ] Remove `continue-on-error` from post-release `dev` synchronization, or add a mandatory job that verifies `dev`
  contains the Semantic Release commit and fails loudly otherwise.
- [ ] Decide whether the absent `beta` branch is intentional. Remove dead beta logic or create/test a real RC path.
- [ ] Verify a manual dispatch redeploys the latest existing release and cannot create an unintended tag.

### Final candidate checks

- [ ] Formatting.
- [ ] Lint.
- [ ] Full typecheck.
- [ ] Full production build.
- [ ] Complete unit suite.
- [ ] SQLite migration suite.
- [ ] MySQL migration suite.
- [ ] PostgreSQL migration suite.
- [ ] OpenAPI schema check.
- [ ] Custom Widget architecture and bundle-budget checks.
- [ ] Workshop integration and image checks.
- [ ] Container and E2E.
- [ ] CodeQL for Actions, Go and JavaScript/TypeScript.
- [ ] amd64 image build.
- [ ] arm64 image build.
- [ ] Multi-platform manifest publication.
- [ ] Docs production build and link validation.
- [ ] Production dependency audit and signed risk report.
- [ ] All required checks are attached to the exact final SHA, not only an earlier `release/v2` SHA.

### Artifact integrity

- [ ] Produce and test `build-alpine-amd64.tar.gz`.
- [ ] Produce and test `build-alpine-arm64.tar.gz`.
- [ ] Produce and test `build-debian-amd64.tar.gz`.
- [ ] Produce and test `build-debian-arm64.tar.gz`.
- [ ] Publish SHA-256 checksums.
- [ ] Generate/review an SBOM for production images and archives.
- [ ] Decide and document signature/provenance verification.
- [ ] Verify the archives and GHCR manifests originate from the same immutable release SHA.

## 11. Discord and community readiness

- [ ] Confirm `DISCORD_WEBHOOK` and `DISCORD_WEBHOOK_AUTOMATIC_RELEASE` exist and work without exposing their values.
- [ ] Test release notifications in a non-public/test channel.
- [ ] Prepare pre-release notice with date, expected impact, backup requirement and upgrade-guide link.
- [ ] Brief moderators and support maintainers on breaking changes, migrations and rollback.
- [ ] Prepare FAQ responses for permissions, layouts, Custom Widgets, Workshop, Assistant, MCP and databases.
- [ ] Prepare success, delay, workflow-failure and rollback messages.
- [ ] Review the prepared Discord copy in `apps/docs/release-announcements/2.0.0/discord.md` after merging the release
  article branch.
- [ ] Prepare GitHub, Reddit and other community variants from the same verified claims.
- [ ] Pin/update the relevant Discord channels and remove beta-only install instructions after GA.
- [ ] Assign people to monitor Discord and GitHub for at least the first 24–48 hours.

## 12. Final go/no-go

### Candidate identity

- [ ] Final `dev` SHA: `________________________________________`.
- [ ] Expected version: `v2.0.0`.
- [ ] Homarr candidate manifest digest: `________________________________________`.
- [ ] Workshop candidate manifest digest: `________________________________________`.
- [ ] Database rehearsal evidence: `________________________________________`.
- [ ] CI run: `________________________________________`.
- [ ] Docs build/deploy evidence: `________________________________________`.
- [ ] Security report/risk acceptance: `________________________________________`.
- [ ] Rollback procedure: `________________________________________`.

### Sign-off

- [ ] Product acceptance owner: `________________` / date: `________________`.
- [ ] Security owner: `________________` / date: `________________`.
- [ ] Database owner: `________________` / date: `________________`.
- [ ] Infrastructure owner: `________________` / date: `________________`.
- [ ] Docs/communications owner: `________________` / date: `________________`.
- [ ] Final release owner GO: `________________` / date: `________________`.
- [ ] A rollback owner is online and the pre-upgrade backups are accessible.
- [ ] No unchecked hard blocker remains without written acceptance.

## 13. Release-day execution

- [ ] Trigger or create the `dev -> main` release PR.
- [ ] Verify the workflow proposes exactly `v2.0.0` and identifies a major bump.
- [ ] Confirm the major PR did not auto-merge.
- [ ] Recheck the PR diff, approvals, required checks and final candidate SHA.
- [ ] Human-merge the PR into `main` during the release window.
- [ ] Watch Semantic Release create the `v2.0.0` tag and draft release.
- [ ] Watch amd64 and arm64 production image builds.
- [ ] Watch all four release archives upload.
- [ ] Watch `ghcr.io/homarr-labs/homarr:v2.0.0` publish.
- [ ] Verify `ghcr.io/homarr-labs/homarr:latest` resolves to the same multi-platform manifest.
- [ ] Verify the GitHub release is public, not draft/prerelease, and contains the curated notes and upgrade-guide link.
- [ ] Download and smoke-test each release archive.
- [ ] Verify image version and `/api/health` revision against the release SHA.
- [ ] Verify the real deployed/runtime image digest, not only the registry tag.
- [ ] Promote and verify Workshop production.
- [ ] Verify public documentation and Algolia search.
- [ ] Verify Discord/community announcements.
- [ ] Verify post-release synchronization puts the Semantic Release commit back into `dev`.
- [ ] Run a production smoke: sign-in, board load, widget query, integration query, WebSocket update, task, backup and
  Workshop browse/install.

## 14. Rollback triggers and execution

- [ ] Define rollback thresholds for startup failure, migration failure, authentication lockout, widespread blank
  boards, data loss, image failure and critical security regression.
- [ ] Stop new writes if data integrity is uncertain.
- [ ] Capture logs, exact image digest and database state before rollback.
- [ ] Re-point `latest` only if the release owner invokes rollback.
- [ ] Restore the pre-v2 database/appdata backup when v1 cannot read the migrated database.
- [ ] Verify v1.76.2 health, authentication, boards, integrations and backups after rollback.
- [ ] Publish the prepared rollback notice.
- [ ] Keep `v2.0.0` artifacts/digests recorded for investigation; do not silently overwrite evidence.

## 15. Post-release follow-through

- [ ] Monitor release workflow, GHCR pulls, startup errors, migration errors and Workshop errors.
- [ ] Monitor Discord, GitHub issues/discussions and support channels for 24–48 hours.
- [ ] Maintain a public known-issues list.
- [ ] Triage v2 reports separately from pre-existing v1 issues.
- [ ] Prepare `v2.0.1` for fixes that are safer than rollback.
- [ ] Remove or redirect `homarr-test:v2` and preview instructions when no longer needed.
- [ ] Confirm beta users have a supported path to GA.
- [ ] Close/repurpose the `v2.0.0` milestone.
- [ ] Close obsolete stack branches and PRs after preserving history.
- [ ] Hold a short retrospective covering integration drift, security backlog, CI failures, docs handoff and beta
  feedback.

## Refresh commands

Run these from a clean Homarr checkout. They are evidence helpers, not substitutes for reviewing the results.

```bash
git fetch origin main dev release/v2 v2 next --tags --prune
git show -s --format='%H %ci %s' origin/main origin/dev origin/release/v2
git rev-list --left-right --count origin/dev...origin/release/v2
git diff --shortstat origin/dev...origin/release/v2
gh pr list --repo homarr-labs/homarr --state open --limit 100
gh run list --repo homarr-labs/homarr --workflow deployment-weekly-release.yml --limit 10
gh run list --repo homarr-labs/homarr --workflow deployment-docker-image.yml --limit 10
gh release list --repo homarr-labs/homarr --limit 10
mise exec -- pnpm audit --prod --audit-level high
docker buildx imagetools inspect ghcr.io/homarr-labs/homarr-test:v2
docker buildx imagetools inspect ghcr.io/homarr-labs/workshop:v2
```

Never print secret values while collecting release evidence.
