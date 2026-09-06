# Homarr v2 GA release checklist

Initial full audit: 2026-09-06 12:30 CEST (Europe/Berlin)

Merge batch updated: 2026-09-06 15:41 CEST (Europe/Berlin)

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
- [x] A clean `git merge-tree --write-tree origin/dev origin/release/v2` rehearsal reports 42 unique conflict paths.
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
- [x] All 65 open pull requests were inventoried: 36 target `dev`, 21 target `release/v2`, seven are internal stack
      layers and one targets `main`. Every one is classified below as review/merge, port, defer, superseded or cleanup.
- [x] Audit-created readiness PRs #6770 through #6788 are non-draft, have clean merge state and have no failing or
      pending hosted checks. None has a human approval yet, and this evidence must be repeated after each rebase/merge
      wave.
- [x] Repository Actions secret names include `DISCORD_WEBHOOK` and `DISCORD_WEBHOOK_AUTOMATIC_RELEASE`; values were
      not read. Their last name-level updates were 2024-02-03 and 2023-12-20, so delivery must still be tested.
- [x] The `github-pages` environment has a deployment branch policy. The existing `prod` environment has no
      protection rules or reviewers and is not referenced by the production release workflow.
- [x] The public v2 preview is reachable, redirects to the login page, accepts the advertised `demo` account and
      displays `Version 2.0.0` on `/manage/about`.
- [x] A read-only Chromium smoke of the public preview loaded the populated dashboard without application console
      errors, completed an authenticated reload to network-idle in 3.2 seconds, opened the Date and time advanced view
      through its keyboard control, rendered three world clocks, and rendered populated Media Releases data. This does
      not replace final-candidate or real-provider testing.
- [ ] GitHub Dependabot currently reports 168 open repository-wide alerts: 5 critical, 64 high, 82 medium and 17 low.
      These are based on the repository's default-branch dependency view and must be reconciled with the candidate-specific
      `pnpm audit` results.
- [ ] No `v2.0.0` tag or production GitHub release exists yet. The latest production release is `v1.76.2`.
- [ ] The `v2.0.0` milestone is still open but contains zero open issues and only one closed issue. It is not an
      adequate source of release truth.

### Merge batch update

- [x] `origin/release/v2` is `f1c898efe2da2fd55b26e2a674d7f67420acefee` after the release-readiness merge batch.
- [x] PR #6770 and PRs #6772 through #6789 are merged into `release/v2`; every merge commit was verified as an
      ancestor of the remote branch.
- [x] PR #6771 was closed by the release owner and was not merged.
- [x] PR #6780 was rebased after the batch. Its environment-documentation conflict preserves both the public
      `BASE_URL` entry and the `NO_EXTERNAL_CONNECTION` location-search behavior.
- [x] PR #6789 is limited to the Homarr 2.0 release article and its 20 media files.
- [x] The v1-to-v2 guide tells users to export a backup from **Management → Tools → Backup** and keep the downloaded
      file somewhere safe before starting v2.
- [ ] No combined final-candidate CI or test result is recorded for `f1c898efe`; per-PR checks were intentionally not
      followed during the merge batch. Run the final validation once the candidate is frozen.
- [ ] PR #6765 is the only remaining open PR targeting `release/v2`. It is an external new integration/widget and was
      intentionally excluded from this maintainer release-cleanup batch.

### Readiness fixes opened from this audit

These statuses record whether each fix reached `release/v2`; they are not final release sign-offs. Carry the merged
changes through the reviewed `release/v2 -> dev` integration and repeat the final-candidate checks.

- [x] [#6770](https://github.com/homarr-labs/homarr/pull/6770) — restore weekly release no-op behavior and scheduled
      Discord notifications, repair GitHub App token inputs, extend the merge timeout, and remove the obsolete release
      dispatch to the archived documentation repository.
- [x] **CLOSED, NOT MERGED** [#6771](https://github.com/homarr-labs/homarr/pull/6771) — proposed making mock
      integrations opt-in and enforcing the unsafe flag in server-side creation, onboarding and direct-page paths.
- [x] [#6772](https://github.com/homarr-labs/homarr/pull/6772) — generate valid integration documentation links and
      remove committed/generated `null` URLs.
- [x] [#6773](https://github.com/homarr-labs/homarr/pull/6773) — point contributor guidance at the monorepo docs and
      current v2 branch flow.
- [x] [#6774](https://github.com/homarr-labs/homarr/pull/6774) — add the canonical v1-to-v2 upgrade guide with concise
      Backup-tool guidance.
- [x] [#6775](https://github.com/homarr-labs/homarr/pull/6775) — patch the critical Auth.js fail-open and email
      normalization advisories; 131 focused auth/proxy tests and affected typechecks pass.
- [x] [#6776](https://github.com/homarr-labs/homarr/pull/6776) — patch the critical `protobufjs` path while staying on
      compatible 7.x; 24 Docker tests and affected typechecks pass.
- [x] [#6777](https://github.com/homarr-labs/homarr/pull/6777) — replace the SQLite database placeholder with a
      safe ignored local path, remove copy-pastable weak secrets and delete the obsolete source-install
      `CRON_JOB_API_KEY` instruction. It also makes SSO key/credential replacement explicit and removes obsolete
      legacy URL entries; #6779 adds the current public `BASE_URL` contract. The production docs build and hosted Fast
      gate, amd64/arm64 preview builds, container/E2E tests and multi-platform preview publication all pass.
- [x] [#6778](https://github.com/homarr-labs/homarr/pull/6778) — port the focused database-restore re-login and error
      reporting fix from #6624 without unrelated branch drift.
- [x] [#6779](https://github.com/homarr-labs/homarr/pull/6779) — make MCP OAuth discovery, resource validation,
      authentication challenges and login redirects honor the public origin and supported MCP route aliases. Sixteen
      route tests, Next.js typecheck/build, docs build and production-server route smokes pass.
- [x] [#6780](https://github.com/homarr-labs/homarr/pull/6780) — enforce `NO_EXTERNAL_CONNECTION` before weather
      location search makes an outbound request and show the disabled state. Fifteen focused tests and affected
      typechecks pass.
- [x] [#6781](https://github.com/homarr-labs/homarr/pull/6781) — use Unraid's byte-based memory metrics and clamp
      inconsistent values instead of using layout metadata.
- [x] [#6782](https://github.com/homarr-labs/homarr/pull/6782) — report Docker container CPU as a 0–100 percent share
      of the whole machine while retaining one-shot/Podman fallback behavior. Twenty focused tests pass.
- [x] [#6783](https://github.com/homarr-labs/homarr/pull/6783) — sync the committed Helm page to live chart 8.28.2 /
      app v1.76.2. Regenerate it again from the v2 chart after that chart is published.
- [x] [#6784](https://github.com/homarr-labs/homarr/pull/6784) — give the Downloads name column a stable default width
      without changing user-resizable persisted state.
- [x] [#6785](https://github.com/homarr-labs/homarr/pull/6785) — support nested OIDC group/name claim paths while
      preserving v2's provider and verified-email linking safeguards. Twenty-three focused Auth tests pass.
- [x] [#6786](https://github.com/homarr-labs/homarr/pull/6786) — preserve reverse-proxy subpaths in Nextcloud CalDAV
      discovery. Five focused Nextcloud tests pass.
- [x] [#6787](https://github.com/homarr-labs/homarr/pull/6787) — use valid UniFi HTTPS default ports, preserve explicit
      ports and avoid hiding authentication failures. Six focused tests pass.
- [x] [#6788](https://github.com/homarr-labs/homarr/pull/6788) — patch every published, fixable high-severity
      production dependency path found by the audit with exact catalog versions and range-scoped overrides. All
      workspace typechecks, the production docs build and 18 focused backup/ZIP tests pass. Its hosted Fast gate,
      amd64/arm64 preview builds, container/E2E tests and multi-platform preview publication all pass.
- [x] [#6789](https://github.com/homarr-labs/homarr/pull/6789) — add the draft Homarr 2.0 release article and its 20
      referenced media files.
- [x] A temporary combined audit of `origin/release/v2` plus #6775, #6776 and #6788 reports 0 critical, 2 high, 20
      moderate and 9 low production advisories. Both remaining high findings are Docusaurus build-time paths to
      `image-size@2.0.2`; the registry still reports 2.0.2 as latest while both advisories require `>=2.0.3`.
- [x] That exact temporary combined graph also passes all 38 Turbo typecheck tasks and the Docusaurus production build.
- [x] The five repository-wide critical Dependabot alerts were reconciled: three runtime Auth.js alerts are addressed
      by #6775, `protobufjs` is addressed by #6776, and the remaining `handlebars` alert is development-scoped and is not
      present in the candidate's production audit.

### Recommended review and merge order

- [ ] Merge #6769 early so the team works from this checklist; continue updating its evidence in the release tracking
      issue if the file itself is frozen.
- [x] Merge the release-control and documentation fixes: #6770, #6772, #6773, #6774 and #6777. #6771 was closed by
      the release owner without merging.
- [x] Merge the lockfile security chain in this order: #6775, rebase/re-audit #6776, then rebase/re-audit #6788. Do not
      resolve their shared lockfile conflicts by choosing one side wholesale.
- [x] Merge the backup, public-origin, privacy, authentication and integration correctness fixes: #6778, #6779,
      #6780, #6785, #6786 and #6787.
- [x] Merge the isolated display/metric fixes: #6781, #6782 and #6784.
- [x] Merge #6783 with the current chart metadata.
- [ ] Regenerate the Helm documentation after the v2 chart is published.
- [ ] Decide #6765 explicitly before freeze. It is not ready to merge on the current evidence.
- [x] Merge #6789 with the draft Homarr 2.0 article and its 20 media files.
- [ ] Run combined checks on the frozen `release/v2` candidate. Per-PR CI was intentionally not followed during this
      merge batch and is not final-candidate evidence.

### Current merge conflicts

- [ ] `.agents/skills/codebase-context/SKILL.md`
- [ ] `.agents/skills/datatable-migration/SKILL.md`
- [ ] `.agents/skills/documentation-sync/SKILL.md`
- [ ] `.agents/skills/mcp-integration/SKILL.md`
- [ ] `.mcp.json`
- [ ] `AGENTS.md`
- [ ] `apps/docs/docs/getting-started/installation/helm.md`
- [ ] `apps/docs/docs/management/certificates/index.mdx`
- [ ] `apps/docs/docs/widgets/app/index.mdx`
- [ ] `apps/docs/docs/widgets/bookmarks/index.mdx`
- [ ] `apps/docs/docs/widgets/smart-home-entity-state/index.mdx`
- [ ] `apps/docs/docs/widgets/smart-home-execute-automation/index.mdx`
- [ ] `apps/nextjs/src/app/api/mcp/[transport]/route.ts`
- [ ] `apps/nextjs/src/components/board/items/widget-context-menu.tsx`
- [ ] `apps/nextjs/src/components/board/sections/gridstack/use-gridstack.ts`
- [ ] `e2e/onboarding.spec.ts`
- [ ] `package.json`
- [ ] `packages/api/src/router/widgets/smart-home.ts`
- [ ] `packages/integrations/src/truenas/test/truenas-integration.spec.ts`
- [ ] `packages/translation/src/lang/ca.json`
- [ ] `packages/translation/src/lang/cs.json`
- [ ] `packages/translation/src/lang/de-CH.json`
- [ ] `packages/translation/src/lang/el.json`
- [ ] `packages/translation/src/lang/en-gb.json`
- [ ] `packages/translation/src/lang/es.json`
- [ ] `packages/translation/src/lang/et.json`
- [ ] `packages/translation/src/lang/fr.json`
- [ ] `packages/translation/src/lang/hr.json`
- [ ] `packages/translation/src/lang/hu.json`
- [ ] `packages/translation/src/lang/lt.json`
- [ ] `packages/translation/src/lang/lv.json`
- [ ] `packages/translation/src/lang/no.json`
- [ ] `packages/translation/src/lang/pt-br.json`
- [ ] `packages/translation/src/lang/pt.json`
- [ ] `packages/translation/src/lang/ro.json`
- [ ] `packages/translation/src/lang/ru.json`
- [ ] `packages/translation/src/lang/sl.json`
- [ ] `packages/translation/src/lang/sv.json`
- [ ] `packages/translation/src/lang/uk.json`
- [ ] `packages/translation/src/lang/vi.json`
- [ ] `packages/widgets/src/health-monitoring/component.tsx`
- [ ] `packages/widgets/src/system-disks/component.tsx`

## Current hard blockers

- [ ] **BLOCKER — integrate histories:** reconcile all 54 `dev`-only commits and resolve the 42 current merge
      conflicts without dropping either branch's behavior.
- [ ] **BLOCKER — production dependency audit:** the baseline `mise exec -- pnpm audit --prod --audit-level high`
      reported 141 findings: 4 critical, 65 high, 62 moderate and 10 low. The isolated combined graph with #6775,
      #6776 and #6788 has 0 critical, 2 high, 20 moderate and 9 low. Those fixes are merged; repeat the audit on the
      exact frozen candidate and explicitly accept or wait for a published `image-size` fix.
- [ ] **BLOCKER — direct authentication advisories:** #6775 is merged. Revalidate every authentication provider on the
      combined candidate and confirm the critical `next-auth` and `@auth/core` findings remain absent.
- [ ] **BLOCKER — weekly promotion automation:** #6770 is merged. Prove its success, failure and no-release paths in
      controlled workflow runs.
- [ ] **BLOCKER — scheduled notifications:** #6770 is merged. Prove scheduled start, success, major and failure notices
      in a non-public Discord channel.
- [ ] **BLOCKER — MCP public origin:** #6779 is merged. Repeat discovery/login/401 challenges through the actual
      production reverse proxy and subpath before publishing MCP as GA-ready.
- [ ] **BLOCKER — documentation release:** #6770 removed the false handoff to the archived
      `homarr-labs/documentation` repository. Confirm the authoritative monorepo GitHub Pages workflow deploys
      `apps/docs` when the v2 docs reach `dev`, then verify the public site and Algolia recrawl.
- [ ] **BLOCKER — branch rules:** the strong `v2 release` ruleset targets the legacy `refs/heads/v2`, not
      `refs/heads/release/v2`. The active release branch does not receive those required checks.
- [ ] **BLOCKER — production deployment guard:** the release workflow publishes after a `main` push without a
      protected production environment, while `main` currently requires no status checks. Decide and test the exact
      human approval/check boundary before the release window.
- [ ] **BLOCKER — final upgrade rehearsal:** perform backup, migration, restore and rollback rehearsals from real
      `v1.76.2` installations for SQLite, MySQL and PostgreSQL.
- [ ] **BLOCKER — upgrade guide:** #6774 is merged with the concise Backup-tool instruction. Verify the guide against
      real upgrade and restore rehearsals and the final image/tag.
- [ ] **BLOCKER — beta feedback:** reproduce or close every unresolved report in the public v2 beta issue.
- [ ] **BLOCKER — release scope:** explicitly include or defer the open llama.cpp PR and every release-sensitive fix
      listed below before feature freeze.
- [ ] **BLOCKER — production defaults:** #6771 was closed without merging. Confirm that decision against the combined
      candidate's mock-integration API/UI behavior or record explicit risk acceptance.
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
- [x] **PORT ONLY** [#6624 backup restore re-login](https://github.com/homarr-labs/homarr/pull/6624) — focused v2
      port opened as #6778; do not merge unrelated branch drift.
- [x] **PORT ONLY** [#6631 MCP OAuth base URL](https://github.com/homarr-labs/homarr/pull/6631) — expanded and
      production-smoked current-v2 port opened as #6779.
- [x] **SUPERSEDED** [#6662 board access-control form](https://github.com/homarr-labs/homarr/pull/6662) — current
      `release/v2` already renders the access/danger forms outside the unified outer form; no duplicate port required.
- [x] **PORT ONLY** [#6674 weather and `NO_EXTERNAL_CONNECTION`](https://github.com/homarr-labs/homarr/pull/6674) —
      focused current-v2 privacy/offline port opened as #6780.
- [x] **PORT ONLY** [#6749 Unraid memory utilization](https://github.com/homarr-labs/homarr/pull/6749) — focused
      current-v2 metric fix opened as #6781.
- [x] **PORT ONLY** [#6250 container CPU utilization](https://github.com/homarr-labs/homarr/pull/6250) — focused
      current-v2 normalization fix opened as #6782.
- [x] **PORT ONLY** [#6733 Helm documentation](https://github.com/homarr-labs/homarr/pull/6733) — current chart
      metadata port opened as #6783; regenerate again after publishing the v2 chart.
- [x] **DEFER WHOLESALE** [#6601 broad dependency update](https://github.com/homarr-labs/homarr/pull/6601) — its
      6,000-line lock/dependency churn is not a safe release patch. Use #6775, #6776 and #6788 for the focused
      candidate-specific security work.

### Feature/UI candidates to include or defer explicitly

- [x] **DEFER** #6657 OMV volume selection — feature work, not a GA blocker.
- [x] **DEFER** #6645 Beszel GPU metrics — feature work, not a GA blocker.
- [x] **PORT ONLY** #6621 Downloads column width — minimal current-v2 fix opened as #6784; supersedes #6122.
- [x] **DEFER** #6603 isolated pnpm linker/phantom dependencies — broad package-manager/workspace refactor.
- [x] **DEFER** #6572 Hermes Agent integration — large new integration and widget.
- [x] **DEFER** #6562 favicon detection — new network-facing app-form behavior.
- [x] **DEFER** #6561 Komodo integration — large new integration.
- [x] **DEFER** #6546 REST dashboard automation — large API expansion; release separately after threat-model review.
- [x] **DEFER** #6537 dashboard memory work — very large conflicting performance branch; benchmark separately.
- [x] **DEFER** #6518 Sportarr integration — new integration.
- [x] **DEFER** #6517 UGOS integration — conflicting new integration.
- [x] **DEFER** #6515 SABnzbd archived-history options — changes requested remain.
- [x] **DEFER** #6458 API add-item section targeting — changes requested remain.
- [x] **DEFER** #6393 board keyboard shortcuts — conflicting feature work.
- [x] **PORT ONLY** #6295 Nextcloud subpath fix — current-v2 port opened as #6786.
- [x] **PORT ONLY** #6294 nested OIDC claims — current-v2 port opened as #6785 while preserving newer auth guards.
- [x] **PORT ONLY** #6210 UniFi default ports — cleaned current-v2 port opened as #6787.
- [x] **SUPERSEDED** #6148 path-only app URLs — current v2 already accepts safe same-origin paths and blocks unsafe
      schemes through `getSafeAppHref`; #5595 is also superseded.

### Remaining open `dev` candidates

- [x] **DEFER** #6214 disabled users, #6140 Dawarich, #6144 FileFlows, #6145 Pushover, #4957 Incus and #4549
      automatic layout — drafts, conflicting branches or new-feature scope.
- [x] **CLOSE/SUPERSEDED** #6132 dependency group — stale/conflicting dependency churn; use candidate-specific
      advisory fixes.
- [ ] Confirm the release owner accepts every recommended `DEFER` classification above before feature freeze.

### Stack and stale-PR cleanup

- [ ] Close or reframe #6545 after the real promotion PR exists.
- [ ] Close internal stack PRs #6569, #6555, #6503, #6502, #6482, #6450 and #6356 after confirming their commits
      are present in `release/v2`.
- [x] **CLOSE** classification recorded for #6549: its head and base are both `dev`, and its history includes
      acknowledged unrelated media changes despite approval.
- [ ] Close #6549 after preserving any unique issue/history references.
- [x] **CLOSE/SUPERSEDED** classifications recorded for #6122, #6148, #5595, #6621, #6624, #6631, #6674, #6749,
      #6250, #6294, #6295, #6210 and #6733 after their current-v2 replacement or source-equivalent behavior is merged.
- [ ] Close those source/duplicate PRs only after the replacement PRs land and their history is linked.
- [ ] Move all accepted deferred work to a `v2.0.x` or `v2.1` milestone.
- [ ] Confirm no open PR still targets `release/v2` when the candidate is frozen.

### Documentation and announcement branches

- [x] PR #6760 is merged into `release/v2`.
- [ ] Do not merge `origin/feat/homarr-v2-release-blog` wholesale. It remains two commits behind and nine ahead, but
      changes 199 files, combines the article with a broad documentation rewrite, deletes many current screenshots and
      includes `apps/docs/.release-research/` scratch material.
- [ ] Split a focused release-material branch containing only the reviewed Homarr 2.0 blog, required media and
      GitHub/Reddit/Discord announcement variants; rebase that branch after the product/docs freeze.
- [ ] Remove private release-research files from the publishable diff.
- [ ] Replace announcement links to internal stack PR #6545 with the real promotion/release URL.
- [ ] Replace GA announcement calls to the preview/beta thread with the production release, upgrade guide and support
      destinations; keep a beta link only if it serves a deliberate archival purpose.
- [ ] Update the blog path/date if the final publication date differs from `2026/09/03`.

## 4. Security and privacy gate

- [ ] Re-run `mise exec -- pnpm audit --prod --audit-level high` on the final candidate.
- [ ] Reduce all critical production-reachable findings to zero.
- [ ] Merge #6775's patched `@auth/core` release and validate every authentication provider on the final candidate.
- [ ] Merge #6775's patched `next-auth` release and validate failure-open, email normalization and session behavior on
      the final candidate.
- [ ] Merge #6776's patched `protobufjs` 7.x resolution and rerun the audit on the final candidate.
- [ ] Merge #6788 after #6775 and #6776, resolve/review the resulting lockfile once, and repeat its typecheck, docs,
      container and production-audit evidence on the rebased head.
- [ ] Resolve the repository-wide development-scoped `handlebars` alert separately or record why it does not block
      production; it is not present in the candidate's production dependency audit.
- [x] #6788 patches the audited high findings for `undici`, `adm-zip`, `fast-xml-parser`, `axios`, `postcss`,
      `serialize-javascript`, `fast-uri`, `js-yaml`, `brace-expansion`, `find-my-way`, `immutable`, `svgo`, `shell-quote`,
      `@xmldom/xmldom` and their affected paths; #6776 patches `protobufjs`.
- [ ] Record a time-bounded risk decision for the two `image-size` highs. They are limited to Docusaurus MDX image
      processing during the docs build, but no patched package is currently published. Upgrade immediately when
      `image-size>=2.0.3` becomes available, or hold GA if the security owner does not accept that build-time exposure.
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

- [ ] Dense Beszel/widget text scaling — current `release/v2` contains merged #6616; still retest the reported
      13/23/24-column layouts on the final candidate.
- [ ] Incorrect v1.74 update indicator — the current public preview displays `Version 2.0.0`; still verify the final
      immutable image and update checker report the production tag without a false update.
- [ ] Full-page widget refresh reported as roughly 5 seconds in v1 versus 72 seconds in v2 — the 2026-09-06 public
      demo smoke completed an authenticated network-idle reload in 3.2 seconds with no application console errors.
      Repeat with a large real-provider dashboard and profile server/browser memory before closing.
- [x] Date/time widget missing world clocks — reproduced as fixed on the current public preview: keyboard activation
      opened advanced view with New York, Paris and Tokyo clocks. Retest the final candidate after freeze.
- [ ] Media Releases widget reported non-functional — current public demo advanced view renders seven populated mock
      releases. Repeat with every supported real provider before closing the report.
- [ ] Compact bookmarks reported as not compact — current `release/v2` contains merged #6747; visually retest all
      supported sizes and mobile layouts.
- [x] No new beta-thread comments were present after 2026-08-29 when refreshed on 2026-09-06.
- [ ] Review the beta issue again for new comments immediately before freeze.
- [ ] Reply with fix/issue links so testers know each report's disposition.
- [ ] Close or convert the beta thread only after all reports have a disposition.

## 8. Documentation and placeholder cleanup

### User documentation

- [ ] Review and merge #6774's canonical `Upgrade from v1 to v2` page.
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

- [ ] Review and merge #6773's `.github/pull_request_template.md` update; it points documentation changes at the
      monorepo and describes the current v2 branch flow.
- [ ] Decide whether to restore a root `README.md`. Only `docs/README.md` currently exists.
- [ ] Review and merge #6772; it replaces the seven committed `href="null"` integration links and makes the generator
      use canonical integration documentation URLs.
- [ ] Review and merge #6777; it replaces `.env.example`'s SQLite database placeholder with the runnable
      source-development path `./db.sqlite`, documents the separate `/appdata/db/db.sqlite` container default and keeps
      other database examples commented.
- [ ] Review and merge #6771; it comments out `UNSAFE_ENABLE_MOCK_INTEGRATION` in `.env.example`.
- [ ] Repeat #6771's disabled/enabled direct URL, API creation and onboarding smoke on the final candidate.
- [ ] Review and merge #6777's removal of copy-pastable `AUTH_SECRET` and `SECRET_ENCRYPTION_KEY` values; confirm the
      final source-install guide requires two different random values.
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

- [ ] Merge #6770, then prove the weekly workflow exits successfully with a clear `no releasable change` result when
      Semantic Versioning finds no bump.
- [ ] Merge #6770, then prove scheduled runs notify by default and manual runs respect the notification checkbox.
- [ ] Prove weekly success, failure and major-release/manual-merge paths in controlled runs.
- [ ] Correct the `v2 release` ruleset target or remove the stale legacy branch/rule after preserving required checks.
- [ ] Add required final checks to `main`; its current productive ruleset requires review but no status checks.
- [ ] Require at least one human approval, resolved threads, stale-approval dismissal and no force push/deletion for the
      final promotion.
- [ ] Review ruleset bypass actors and limit release bypasses to the necessary bots/owners.
- [ ] Protect a real production deployment environment and bind the irreversible Semantic Release/tag/publish path to
      it, or record an explicit alternative control. The current unprotected, unused `prod` environment is not a gate.
- [ ] Merge #6770's removal of the false archived-repository handoff and verify the monorepo `dev` docs deployment is
      authoritative.
- [ ] Review and merge #6770's explicit production deployment failure/cancellation notification.
- [ ] Review and merge #6770's mandatory post-release check that verifies `dev` contains the Semantic Release commit
      after synchronization; prove the verification fails loudly when synchronization is incomplete.
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

- [x] Confirm the `DISCORD_WEBHOOK` and `DISCORD_WEBHOOK_AUTOMATIC_RELEASE` secret names exist without exposing their
      values.
- [ ] Confirm both webhook values still work; their name-level update timestamps are from 2024 and 2023 respectively.
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
