# Homarr v2 GA release checklist

Updated: 2026-09-06 17:46 CEST (Europe/Berlin)

This is the operational go/no-go checklist for releasing Homarr v2 to all users. Validate it against one frozen
candidate SHA. Add the run, artifact, screenshot, issue, or written risk acceptance beside every completed gate.

## Current state

- [x] `origin/release/v2`: `f1c898efe2da2fd55b26e2a674d7f67420acefee`
- [x] `origin/dev`: `da32acb4f0ba9d8fa8e9667f56a54f85ca497865`
- [x] `origin/main`: `331925c197ad9cbf0138dbbcee9d8952ef9298dc` (`v1.76.2`)
- [x] Readiness PRs #6770 and #6772 through #6789 are merged into `release/v2`.
- [x] PR #6771 was closed without merging.
- [ ] Decide whether PR #6765, the external llama.cpp integration and widget, is included or deferred.
- [ ] Review and merge or close PR #6790, the final release-article follow-up.
- [ ] Create the `release/v2 -> dev` promotion PR. None is open at this snapshot.
- [ ] Create the final `dev -> main` PR. None is open at this snapshot.
- [ ] Resolve the current `dev...release/v2` divergence: 54 commits exist only on `dev`, 581 only on `release/v2`,
      and a dry merge reports 43 conflict paths.
- [ ] Nominate the final candidate SHA. Candidate-dependent validation has not yet been run on the final integrated
      result.

Refresh these facts at the start of the release window. If the candidate SHA changes, invalidate build, migration,
image, browser, security, and deployment sign-offs.

## Release path

```text
release/v2
  -> reviewed integration branch based on current dev
  -> release/v2 -> dev promotion PR
  -> final candidate validation on dev
  -> dev -> main PR
  -> HUMAN merge for the major release
  -> Semantic Release creates v2.0.0
  -> images, archives, docs, Workshop, Discord, and support follow-through
```

The weekly workflow deliberately does not auto-merge major releases. A human must merge the final `dev -> main` PR
after go/no-go approval.

## 1. Freeze `release/v2`

- [ ] Merge or explicitly defer #6765.
- [ ] Merge or explicitly close #6790.
- [ ] Confirm closing #6771 is intentional and mock integration behavior is safe for production.
- [ ] Review every remaining open PR targeting `release/v2`; assign it `include`, `defer`, `superseded`, or `close`.
- [ ] Stop non-release changes and record the frozen `release/v2` SHA: `________________`.
- [ ] Record the release owner and the person authorized to approve risks: `________________`.

## 2. Promote `release/v2` to `dev`

- [ ] Create an integration branch from the current `dev` tip and merge the frozen `release/v2` into it.
- [ ] Resolve all 43 conflict paths semantically; do not accept an entire side mechanically.
- [ ] Review the 54 `dev`-only commits and preserve intentional fixes, translations, docs, CI, dependency, custom
      widget, MCP, auth, integration, and database changes.
- [ ] Pay special attention to conflicts in workflows, dependency manifests and lockfiles, auth, MCP, integrations,
      server settings, database migrations, translations, docs navigation, and release documentation.
- [ ] Confirm no migration, schema, workflow, or release configuration disappeared during conflict resolution.
- [ ] Review the complete integration diff against both parents.
- [ ] Open the promotion PR into `dev`; require human review and all required checks.
- [ ] Merge the promotion PR and record the resulting `dev` SHA: `________________`.
- [ ] Freeze that exact SHA as the final release candidate.

## 3. Validate the final candidate once

### Repository and build

- [ ] Install from the frozen lockfile in a clean environment.
- [ ] Pass formatting, lint, typecheck, production build, unit tests, and the required E2E suite.
- [ ] Pass docs and Workshop builds.
- [ ] Confirm generated files, migrations, translation keys, and API schemas are current and committed.
- [ ] Confirm no tracked build output, debug logging, test credentials, or temporary release files remain.

### Images and installation

- [ ] Build and publish candidate images for `linux/amd64` and `linux/arm64`.
- [ ] Verify manifest architecture entries and record immutable digests.
- [ ] Start the app from the candidate image with no outbound network access after the image pull.
- [ ] Verify a clean install with the documented minimal configuration.
- [ ] Verify supported Docker and Podman deployment paths, health checks, permissions, volumes, and graceful shutdown.

### Upgrade, data, backup, and rollback

- [ ] Upgrade representative `v1.76.2` SQLite, MySQL, and PostgreSQL instances to the candidate.
- [ ] Verify migrations are idempotent, data is retained, and startup errors are actionable.
- [ ] Create a backup using Homarr's backup tool before upgrading and restore it into a clean candidate instance.
- [ ] Confirm restored users are prompted to sign in again and stale sessions cannot be reused.
- [ ] Rehearse the documented rollback procedure, including database and volume restoration.
- [ ] Record migration duration, storage requirements, and the last safe rollback point.

### Security and privacy

- [ ] Run the production dependency audit on the exact candidate and attach the report.
- [ ] Require zero critical production advisories. Patch or explicitly accept every remaining high advisory.
- [ ] Reconcile the two previously accepted image-processing highs with current upstream availability.
- [ ] Pass CodeQL, secret scanning, image scanning, and repository security gates.
- [ ] Verify auth, OIDC nested claims, API keys, permissions, CSRF, cookies, proxies, public origins, and MCP OAuth.
- [ ] Confirm logs, telemetry, backups, exports, and errors do not expose credentials, tokens, or private user data.

### Product acceptance

- [ ] Smoke every primary route on desktop and mobile: login, onboarding, boards, search, management, settings, and
      error and empty states.
- [ ] Create, edit, duplicate, import, export, share, and delete a board with representative widgets and layouts.
- [ ] Verify all supported widget families, integration configuration, secrets, refresh behavior, errors, and recovery.
- [ ] Verify users, groups, permissions, home boards, API keys, OIDC, and proxy-auth flows.
- [ ] Verify Custom Widgets, Workshop, Assistant, MCP, uploads, icons, image proxying, downloads, and backups.
- [ ] Verify tasks, cron jobs, WebSocket updates, Redis behavior, notifications, and background recovery.
- [ ] Recheck the release fixes for UniFi ports, Nextcloud subpaths, Docker CPU usage, Unraid memory units, disabled
      external weather connections, public MCP OAuth origin, and download-name sizing.
- [ ] Run at least one real-provider happy path and failure path for every production-critical integration family.
- [ ] Confirm accessibility basics: keyboard use, focus, dialogs, labels, contrast, zoom, and reduced motion.
- [ ] Confirm no blocker or release-critical issue remains; link accepted known issues.

## 4. Finish documentation and communication

- [ ] Complete the #6790 decision and ensure the final release article matches the shipped candidate.
- [ ] Before publishing, set the v2 article out of draft and remove its editorial release-gate placeholder.
- [ ] Replace branch comparisons and preview references with the final `v2.0.0` tag, image, and URLs.
- [ ] Keep the v1-to-v2 upgrade guide direct: create a backup in Homarr's backup tool, store it somewhere safe, then
      follow the supported image and migration steps.
- [ ] Verify environment examples contain no real domains, secrets, tokens, passwords, or unsafe defaults.
- [ ] Update Helm documentation to the actually published v2 chart version and image tag.
- [ ] Search code, docs, workflows, examples, metadata, and translations for `TODO`, `FIXME`, placeholder text, demo
      credentials, stale v1 copy, preview domains, and old image tags; resolve or explicitly accept every match.
- [ ] Build the docs, run link checks, inspect screenshots and navigation, and verify search indexing.
- [ ] Prepare concise release notes, breaking changes, upgrade steps, known issues, and rollback link.
- [ ] Prepare the Discord announcement, support channels, moderator brief, FAQ, and incident owner.

## 5. Prove CI and deployment readiness

- [ ] Revalidate the restored release automation from #6770 on the final workflow files.
- [ ] Verify weekly `dev -> main` behavior, including the no-change path and the intentional no-auto-merge rule for a
      major release.
- [ ] Fix or explicitly justify any workflow still matching `refs/heads/v2` instead of `release/v2`.
- [ ] Verify required checks and branch protection for `release/v2`, `dev`, and `main`.
- [ ] Verify release tokens, signing/provenance, package permissions, GHCR access, and both Discord webhooks without
      exposing secret values.
- [ ] Put the production release behind an environment with the intended human approval and rollback authority.
- [ ] Rehearse Semantic Release in dry-run mode and confirm it selects `v2.0.0` with the intended changelog.
- [ ] Verify GitHub release assets, source archives, multi-architecture GHCR tags, immutable digests, docs deployment,
      and Workshop deployment from the candidate.
- [ ] Confirm the production image contains no preview-only configuration and installs without GitHub credentials.

## 6. Go/no-go

- [ ] Release owner: `________________`
- [ ] Incident and rollback owner: `________________`
- [ ] Release window and support coverage: `________________`
- [ ] Final candidate SHA: `________________`
- [ ] Homarr image digest: `________________`
- [ ] Workshop image digest: `________________`
- [ ] All blockers are closed or have written acceptance linked here: `________________`
- [ ] Engineering, QA, security, docs, operations, and community owners have signed off.
- [ ] A rollback checkpoint, command sequence, and decision threshold are documented and rehearsed.
- [ ] The `dev -> main` PR contains only the approved candidate and has the required approvals and checks.

## 7. Release and verify

- [ ] Human-merge the approved `dev -> main` PR.
- [ ] Verify Semantic Release creates the `v2.0.0` tag and GitHub release from the approved SHA.
- [ ] Verify release assets and multi-architecture `v2.0.0` and `latest` image tags resolve to approved digests.
- [ ] Perform clean-install and v1-upgrade smoke tests using only public production instructions and artifacts.
- [ ] Verify production docs, release article, upgrade guide, links, search, Workshop, and downloads.
- [ ] Publish the Discord announcement only after public artifacts have passed smoke tests.
- [ ] Monitor startup failures, migrations, auth, integrations, jobs, image pulls, docs, support, and security signals.
- [ ] Roll back immediately if data integrity, upgrade safety, auth, or broad installation is compromised.

## 8. Post-release

- [ ] Triage incoming reports and publish known issues or hotfix guidance quickly.
- [ ] Confirm no regression after the first scheduled tasks, backups, and weekly automation cycle.
- [ ] Close or move the v2 milestone and deferred PRs with explicit follow-up destinations.
- [ ] Record final SHAs, digests, evidence, accepted risks, incidents, and retrospective actions.
- [ ] Remove temporary release freezes, preview resources, and obsolete compatibility paths only after stability is
      confirmed.

## Evidence record

| Gate | Owner | Evidence | Result |
| --- | --- | --- | --- |
| Promotion merge |  |  |  |
| CI and build |  |  |  |
| Images and install |  |  |  |
| Migration and rollback |  |  |  |
| Security |  |  |  |
| Product acceptance |  |  |  |
| Docs and communication |  |  |  |
| Production smoke |  |  |  |
