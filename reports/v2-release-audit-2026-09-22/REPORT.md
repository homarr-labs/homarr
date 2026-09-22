# Homarr v2 release audit — 22 September 2026

**Recommendation: do not approve GA yet.** The release has broad implementation coverage and meaningful model tests, but current security findings, unresolved integration governance, and missing candidate acceptance prevent a release-ready conclusion. This is a full release-scope inventory with targeted source review and live metadata checks, not certification that every component or scenario works.

## Scope and evidence

- Audited `release/v2` at **`b90a704b22467d4aba681ff5f03c3a8a0d359d40`**; clean starting checkout, fetched remote, report branch `feat/v2-release-audit`.
- Compared with current `dev` **`0887bddb8642b5e697b800724b42f6608e74e464`**, using `git diff origin/dev...HEAD`. Merge base: `2513e8454f240caa315b68dd6738b79838eeeecc`. Diff: **2,880 files**, 258,484 insertions, 149,374 deletions; not all lines manually reviewed.
- Release specification: [PR #6545](https://github.com/homarr-labs/homarr/pull/6545), captured body and release article `apps/docs/blog/2026/09-03-homarr-2.0/index.mdx`. Every article heading is mapped in [SPEC.md](SPEC.md); all 136 PR issue dispositions are in [release-issues.csv](release-issues.csv).
- Inventory: **61 widgets, 86 integration definitions, 40 workspace packages, 448 test files, 36 locale files, 257 external direct dependency names/aliases**. Test counts include TS/JS and Go test files; file presence is not execution or coverage percentage.
- Live reads: PR/checks/comments, branch rules, stable release, recent workflows, all referenced issue states, npm public version/advisory metadata. All 43 dependency input files were verified byte-identical to the public GitHub commit before querying npm.
- No application code changed. No unit/E2E suites, Docker builds, database migrations, or security exploits executed. The checkout has no installed dependencies; its ambient Node is 25.1.0 rather than the pinned 24.18.0, and the pnpm launcher errors opening its state database. These are local validation limits, not product failures. Existing CI evidence is retained separately.

## Release decision and next actions

| Priority | Finding or gate | Evidence | Required outcome |
|---|---|---|---|
| P1 | Manual Custom Widget credentials can be echoed back to viewers/Assistant | Source resolver omits redaction values; executor only redacts the separate supplied list. [STANDARDS.md](STANDARDS.md) | Add manual-source redaction at the shared response boundary; verify fake-secret JSON/text/Basic-auth echoes in preview and dashboard reads. |
| P1 | MCP OAuth grants access without client consent | Authenticated authorization GET directly issues a code to any registered callback; exchange creates an ordinary persistent API key. Inherited behavior, still present in v2. [STANDARDS.md](STANDARDS.md) | Explicit consent bound to client/callback/PKCE/resource before grant; verify denial, login return, replay and revocation. Decide token lifetime/scoping. |
| P1 | Locked production dependencies include critical advisories | Next 16.3.1 with Sharp 0.35.3; npm registry advisory response and publisher advisories. [advisories.csv](advisories.csv) | Upgrade affected production dependencies to patched compatible releases, rebuild and scan the final image; record runtime applicability for any accepted finding. |
| Gate | Release PR is not targeting dev; required check is retired | Live base is `feat/onboarding-rebuild`; dev still requires `Container and E2E`, absent from current workflow. | Prepare reviewed direct integration into dev and align required checks with actual release validation. Do not merely remove the protection without a replacement acceptance gate. |
| Gate | Exact candidate acceptance is absent | PR candidate/owner/evidence pending; all six release gates unchecked; current smoke and database migration checks skipped. | Name candidate and release/rollback owner; attach the acceptance matrix below to that SHA and image digest. |
| P2 | Saved integrations in shared-address/overlay range fail through new HTTP surfaces | `100.64.0.0/10` is always blocked by shared network policy, even for administrator-selected saved integrations. | Define deliberate private-overlay support without allowing metadata/SSRF targets; verify IP and DNS forms. |
| P2 | Statistics provider acceptance is insufficiently demonstrated | 30 new Statistics providers + Jackett; located Stats request-handler specs cover demo data, not real provider responses/distributed refresh. | Validate each supported provider/version/auth contract and failed-refresh retention; record per-provider results. |
| P2 validation | Preview accessibility and compact-content problems | Mobile axe reports 12 violation categories; desktop screenshot shows oversized Downloads headers and clipped Assistant text. [BROWSER.md](BROWSER.md) | Reproduce on the candidate with clean settings; fix names/semantics/contrast and confirmed layout issues. |
| P3 | Advanced-view release text disagrees with runtime | Article says one second; implementation, test and shortcut guide say 500 ms. [SPEC.md](SPEC.md) | Align article, accessibility label and video caption. |

The P1 findings are release recommendations based on source paths and dependency advisories; exploitability was not exercised. The Standards and Spec reviews remain separate below so passing one cannot hide a failure in the other.

## Standards

[Full source review](STANDARDS.md): **two current-diff findings** (manual credential response redaction, shared-address restriction), plus **one inherited release security finding** (OAuth consent). Highest severity on this axis: P1. No stylistic findings from formatting/lint rules were substituted for behavior review.

Controls that look sound in inspected source include full integration permission before credential decryption, endpoint/path confinement, pinned DNS resolution, bounded response/decompression/deadline handling, real board/item binding checks, user-scoped previews, default simulated actions, separate credential export metadata, Assistant thread ownership, and Workshop owner/concurrency rules. These observations do not certify the entire sandbox, provider ecosystem, or live permission matrix.

## Spec

[Full heading-by-heading matrix](SPEC.md): **one confirmed specification mismatch** (advanced-view timing, P3), plus explicit acceptance gaps. No other wrong/missing article implementation was established by this bounded static review. The 31-new-integration count is correct. The article's positioning and provider funding promises are not programmatically provable acceptance criteria.

Board transaction/collision/nesting/eight-direction resize tests and focused onboarding/auth tests provide meaningful coverage evidence. They do not establish touch behavior, saved migration results, real provider responses, performance or current test success.

## Current release mechanics

### Branch integration and checklist drift

The live comparison is **73 dev-only / 649 v2-only commits**, not the PR's historical 65/606. This is an ancestry count, not proof that 73 fixes are missing: some changes were copied/squashed.

[PR #6821](https://github.com/homarr-labs/homarr/pull/6821) already merged on 12 September at `f18033ddaa734248f4f8d45541dc8572df3df554`. That commit has **one parent**, so it did not preserve the dev merge ancestry described in the checklist. The old merge base remains. Reconcile overlapping changes in the direct dev integration; do not infer either complete preservation or complete loss from commit titles alone.

The live dev rules require one approval, resolved review threads, linear history, squash-only merging, `Fast gate`, and the retired `Container and E2E` check. These rules conflict with the checklist's historical ancestry-preserving merge instructions. Resolve the actual integration method and required checks together. This audit did not retarget or edit the PR, change rules, merge, publish, or deploy.

Latest stable is now [v1.77.2](https://github.com/homarr-labs/homarr/releases/tag/v1.77.2), published 18 September. The release PR still calls v1.77.1 latest. Schema/migration source comparison between the two tags is empty, supporting the converter's schema-compatibility premise; a v1.77.2 conversion/boot was not run.

The five items the PR calls locally verified/uncommitted (#6850, #6559, #4965, #3675, #962) need individual reconciliation, not bulk check-off. For example, current LDAP DN normalization still uses `decodeURIComponent(entry.dn.replace(...))`, and `scripts/run.sh` still waits for child exits without a bounded escalation. The old local validation report does not prove those fixes are on this candidate. Historical issue-level conclusions were not re-certified here.

### CI, reviews and artifacts

At the pinned head, [CI run 35692700871](https://github.com/homarr-labs/homarr/actions/runs/35692700871) succeeded: Fast gate, amd64/arm64 preview builds, manifest publication. Fast gate runs affected lint/typecheck/build, workspace validation, Custom Widget architecture and bundle checks, and OpenAPI validation. **It does not run the general unit suite.** The routine workflow also does not execute general browser acceptance.

Database change detection and the database gate succeeded, while migration journals and SQLite/PostgreSQL migration jobs were skipped on this push. This is valid change-selection behavior, not a database test pass on the full release. Container smoke is manual-dispatch-only and currently invokes only `e2e/mysql-conversion.spec.ts`. It is explicitly not a routine publication gate.

The three CodeQL analyses succeeded, but the aggregate [CodeQL check](https://github.com/homarr-labs/homarr/runs/106633010777) **failed**, reporting one high-severity alert. Its annotation is at `packages/api/src/test/integration-request.spec.ts:66`: a user-controlled method name indexes a test compressor object. It is a fixture-scoped finding; this audit did not establish production exposure through it. Narrow the fixture dispatch or resolve the finding with evidence. The branch/PR alert-list endpoints returned empty lists, so their empty responses must not override the explicit failing check and annotation.

CodeRabbit's success status is **not full-review proof**: its captured comment says incremental recovery failed and the full review was skipped. Another comment warns its summary may be stale.

The latest captured Workshop success is [run 35547619312](https://github.com/homarr-labs/homarr/actions/runs/35547619312) on preceding `02907b99d`. The next head only changes board removal, so no Workshop rerun is expected from its path filters. Workshop CI validates Compose and publishes two architectures when selected. Its Dockerfile defines a `pocketbase-test` stage, but production builds do not depend on that sibling stage; a green production image alone does not prove its Go tests ran.

No immutable registry digest was independently retrieved in this audit, and no current public deployment SHA was proven. The PR's last deployment comments predate this head. Build/publication success must remain distinct from public installation or upgrade proof.

### Publication contracts

- `.releaserc.json` uses Conventional Commits and draft GitHub releases. `package.json` saying 2.0.0 alone does not guarantee the calculated release; retain a breaking-change signal and verify the release calculation against the integrated candidate.
- `deployment-docker-image.yml` has a major-version signal check. Preserve the human major-release merge gate.
- The GA article is already `draft: false`. Documentation deploys from dev; landing v2 there can publish the announcement ahead of production artifacts. Coordinate publication ordering.
- Homarr and Workshop are separate images/data stores. Verify both architectures, production URLs, Workshop `/pb_data`, TLS, persistent volumes, download links, Helm guidance and actual installed versions.

## Feature/component completeness

Use [SPEC.md](SPEC.md) for every release heading and its acceptance requirement. These companion inventories prevent small surfaces from disappearing inside broad feature names:

| Inventory | Scope and conclusion |
|---|---|
| [widgets.csv](widgets.csv) | All 61 registry entries resolve to existing source directories. 16 have no colocated spec; shared API/UI tests may still cover them. This is a search signal, not a demand for one test per file. Each needs relevant data-state/size/persistence evidence. |
| [integrations.csv](integrations.csv) | All 86 definitions have factory keys, and every non-null declared documentation slug has a corresponding page. HTTP-request support is recorded per integration; unsupported adapters must remain clearly unavailable rather than bypassing auth. Real-service compatibility was not established for all 86. |
| [packages.csv](packages.csv) | All 40 workspace packages/apps/tooling manifests, scripts and test-file counts. The five runtime/app surfaces are Next.js, docs, tasks, websocket and Workshop. Package correctness is not implied by existence. |
| [release-issues.csv](release-issues.csv) | All 136 release-PR issue claims with refreshed issue state and preserved remaining requirements. Claims are labelled as inherited PR dispositions, not new reproductions. |
| [translations.csv](translations.csv) | Every locale compared by leaf key against the 4,365-key English catalog. No linguistic or ICU correctness certification. |
| [dependencies.csv](dependencies.csv) | All 257 direct external names/aliases with requested/locked/latest values; paired with full-lock advisory records. |

The PR claims 72 addressed issues: **39 full and 33 partial**; it leaves **50 not addressed and 14 unverified**. Those are the PR's own scope classifications. “Closed with release” and “fully implemented” are different states. Preserve residual requirements in follow-up work and release notes; do not present all 72 as complete. This audit does not change the existing closure policy or issue states.

### Translation and accessibility

All 35 non-English locale files require English fallback for missing/empty keys. Largest gaps: Finnish 2,870; British English 2,769; Hebrew 2,692; Japanese 2,686; Slovak 2,608; Spanish 2,521. `packages/translation/src/request.ts` intentionally merges English fallback after removing empty translations. This prevents many missing-message failures but does not make v2 fully translated. Equal-to-English values are reported separately and may be legitimate.

Read-only preview login and dashboard checks succeeded at 390px and 1440px with no page-level horizontal overflow; Shift+C and Ctrl+K opened their surfaces. That is a narrow pass: the preview mobile dashboard has 12 automated accessibility violation categories, and screenshots expose compact-content problems. The preview build SHA is unverified. See [BROWSER.md](BROWSER.md).

Before claiming UI completeness, cover RTL, long translated labels, keyboard-only focus/escape/return, screen reader names, touch access to context/advanced actions, contrast in both themes, and exact minimum width. Treat this as acceptance work, not a blanket requirement to add hundreds of low-value tests.

## Dependency and security maintenance

A live npm bulk advisory lookup over locked package versions returned **69 advisory records across 32 packages**, representing **65 unique advisory URLs**: 3 critical, 16 high, 35 moderate and 15 low records. Range variants and the Vitest/mocker pair explain duplicates. This is a **whole-lockfile** result including development, optional and transitive packages, not a production-image scan or exploit count.

157 of the 257 direct names/aliases do not have npm's current `latest` version anywhere in the lockfile. This is a freshness signal only: beta channels, pinned compatibility and major upgrades make “update everything to latest” unsafe. For example, NextAuth 5 beta is intentional even though the npm latest tag is 4.x, and the TypeScript compiler API alias intentionally keeps 6.0.2 alongside TypeScript 7.0.2.

| Component | Locked | Registry latest at capture | Audit disposition |
|---|---|---|---|
| Next.js | 16.3.1 | 16.3.5 | Priority patch. Publisher advisory fixes start at 16.3.3 for both critical records; confirm target compatibility. |
| Sharp (Next transitive) | 0.35.3 | See advisory | Below 0.35.4 patched boundary; inspect final resolved native image libraries. |
| React / React DOM | 19.2.7 | React 19.3.0 | Evaluate coordinated upgrade separately; not a GA blocker solely for lagging latest. |
| Mantine core family | 9.6.0 | 9.6.2 | Coordinate family and patched datatable compatibility; verify visual surfaces. |
| Assistant UI React | 0.15.8 | 0.15.21 | Upgrade with its coupled runtime/AI SDK packages and verify approval/rendering. |
| AI SDK | 7.0.56; additional 6.0.33 transitive | 7.0.109 | Review coupled adapters and older provider-utils dependency path. |
| Auth core | 0.41.3 | 0.41.3 | Current on latest tag. |
| MCP server | 2.0.0 | 2.0.0 | Current version does not fix application OAuth consent semantics. |
| Fastify | 5.9.0 | 5.12.5 | Below 5.12.1 advisory boundary; tasks directly depends on it. |
| Drizzle ORM | 0.45.2 | 0.45.3 | Patch candidate; upgrade only with database evidence. |
| PocketBase JS SDK | 0.26.9 | 0.28.1 | Compatibility review with Workshop backend required, not blind update. |
| TypeScript | 7.0.2; compiler alias 6.0.2 | 7.0.2 | Main compiler current; alias intentional. |
| Undici | 6.23.0, 7.29.1, 8.9.0, 8.10.2 | 8.11.0 | Remaining 6.x advisories are under `@actions/http-client`; do not misreport them as the native integration client's 7.29.1. |

Next's [AVIF optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) affects the locked release and its underlying image dependency. Image optimization is configured, but attacker control/reachability was not reproduced. Its [Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) is deployment-specific; the project's Alpine image is Linux. The third critical record is Handlebars 4.7.8 under release-note tooling (`conventional-changelog-writer`), not a demonstrated dashboard runtime path.

Other runtime-relevant triage includes Tiptap, Mermaid, DOMPurify, adm-zip and Fastify. `adm-zip` is used in authenticated SQLite restore, where application code bounds compressed/declared archive sizes before extraction; those safeguards matter when assessing the [allocation advisory](https://github.com/advisories/GHSA-7q85-xj36-vmfc). Patch and inspect real reachability rather than equating a package match with exploitation. [Advisory parent edges](evidence/advisory-parents.json) retain the dependency context.

Node is pinned to 24.18.0; Workshop builds with Go 1.25.7 and declares PocketBase Go 0.39.9. npm checks do **not** cover Node runtime, Go modules, Alpine packages, Redis, Nginx, native binaries, the standalone converter's separate npm lockfile or image layers. A production SBOM/image scan and Go vulnerability analysis remain acceptance gaps. No freshness/security certification is made for those components.

## Frozen-candidate acceptance matrix

Run these against one immutable build after the P1 fixes and dev integration. Reuse existing focused tests; add new tests only when requested. Repeat affected scenarios when candidate changes, rather than rebuilding/retesting everything for a small fix.

| Gate | Minimum evidence | Current audit status |
|---|---|---|
| Clean install | SQLite and PostgreSQL; first admin, claim race/resume, integrations, first board, restart/sign-in | Source/specs located; not executed |
| Upgrade | Representative latest-v1 SQLite/PostgreSQL databases; users/groups, boards/layouts, media, encrypted secrets, custom widgets, duplicate restart | Migration files/specs present; current push jobs skipped; final upgrade absent |
| MySQL transition | v1.77.2 schema compatibility, read-only conversion, row/journal checks, same encryption key, v2 boot/restart | Tag schema parity established; converter/E2E exist; not run |
| Recovery | SQLite backup restore, failed/oversized/corrupt archive, restart readiness, rollback to untouched v1 backup; PostgreSQL external backup route documented | Source controls/specs found; no recovery execution |
| Identity/permissions | Credentials + real OIDC + real LDAP, Viewer/Editor/Admin, scoped board/integration rights through UI/REST/MCP/Assistant, revoke sessions/keys | Source checks and focused tests exist; OAuth consent blocker |
| Board editing | Desktop mouse/keyboard, 390px mobile/touch and breakpoint edges, nested containers/rails, eight resize directions, multiselect, cancellation, persistence and failed save | Model coverage; exact-candidate browser acceptance absent |
| Every widget | Loading/empty/data/error/stale states, supported integration/option permutations, minimum size, advanced/touch actions, refresh and save/reload | Registry complete; runtime matrix not executed |
| Statistics providers | All 31 additions: named version, valid/invalid auth, representative payload, missing fields, timeout, concurrent refresh, previous snapshot retention/age | Highest provider coverage gap |
| Custom Widgets | Legacy migration/archive, preview → save → bind → render → configure → action, manual/saved auth, response/export redaction, disabled/removed integration | Source coverage; redaction/network findings |
| Workshop | Create/publish/install/update/CSS, moderation and ownership, stale edit conflicts, screenshots, secrets absent, backing data survives replacement | Source review/prior scoped CI; production lifecycle unverified |
| Assistant/provider | Read/mutation approve/deny/cancel, permission change, stream failure, quota, configured local/cloud providers, privacy/log configuration | Source only; no paid/provider execution |
| MCP/REST | Discover/schema/call, API key, consented OAuth+PKCE, proxy BASE_URL, resource binding, token revocation and denied operations | Checked-in schema gate green; OAuth blocker; full live matrix absent |
| Docker/Podman | Multiple endpoints, failures, discovery labels, permissions, repeat discovery/dedup, cross-host identity | Specs/source found; no live engine checks |
| Performance | Same dev/v2 data and hardware: first board latency, request counts, concurrent viewers, 24–72h memory/task stability | No comparative benchmark or soak |
| UI/locales | Desktop/mobile, light/dark, keyboard/focus, RTL/long labels, all translated release strings or explicit fallback policy | Static locale matrix; bounded preview evidence separately |
| Publication | Actual v2.0.0 calculation, both Homarr/Workshop architecture digests, production URLs/docs/Helm, public install+upgrade, rollback owner | Preview build evidence only; owner and final public gates pending |

## North Star and one feature to add

**North Star: a trustworthy, personal control surface for your homelab—understand what is happening and safely act from one place.** Custom Widgets, saved integrations, Workshop and Assistant already make this direction possible. The release's main product risk is that users gain many ways to add capabilities without a coherent way to know whether those capabilities are working.

Add an **Instance health and recovery center** after the existing GA blockers are closed. A compact “Needs attention” view should show:

- Unreachable services, rejected/expired credentials and incomplete integration setup.
- Failed or stale widget data, with last successful retrieval and an explicit distinction between live data and on-demand Statistics snapshots.
- Custom Widgets awaiting migration/configuration, plus broken bindings after an integration is removed.
- Failed background tasks and unavailable Workshop operations, each with a direct repair/settings link and a safe manual recheck.

Start read-only; apply current board/integration permissions to every row and redact diagnostic content. Reuse task/cache/configuration metadata; do not poll every service on page load or automatically restart containers/change secrets. Assistant can explain a selected problem and propose the same approved actions, but the health view must work without AI.

A useful first success measure is **time from a visible failure to the correct repair action**, plus the proportion of failed/stale sources with an actionable reason and last-success time. This improves trust in every new release feature; another isolated widget would help a much narrower slice of users. It is a proposed follow-up, not an added release prerequisite.

## Audit limits

No report can establish “perfect” from static inspection and selected CI. This package makes the entire claimed scope visible, identifies concrete source/security issues, and records what remains unproven. It does not claim a full security penetration test, every issue reproduction, all provider API versions, every UI state, complete translations, or a production/upgrade certification. See [BROWSER.md](BROWSER.md) for the exact limited live UI checks and their build-provenance limit.
