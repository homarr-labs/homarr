# v2 requested fixes — 22 September 2026

Implementation addendum to the original audit of `b90a704b22467d4aba681ff5f03c3a8a0d359d40`, on `feat/v2-release-audit`. The original evidence remains a historical snapshot. This addendum covers the requested dependency, saved-integration networking, Statistics isolation, and accessibility work; it is not a new GA certification.

## Dependencies

Updated compatible stable releases in the workspace catalog and docs manifest, regenerated the lockfile, and installed with pinned Node 24.18.0 / pnpm 11.15.1. Major migrations and the intentional next-auth beta were retained. The patched `mantine-datatable` stays at 9.3.1 because its existing scale-aware resize patch is version-specific.

Representative updates: Next 16.3.5, React/React DOM 19.3.0, Mantine 9.6.2, Tiptap 3.31.3, Assistant UI React 0.15.21, AI SDK 7.0.109, Docusaurus 3.10.2, Vitest 4.1.11. The manifests and lockfile are the complete version record; [version-changes.csv](fixes/version-changes.csv) lists all 142 changed declarations (including the removed Canvas addon).

Removed stale Assistant dependency overrides, aligned CodeMirror singleton packages, and bounded existing Babel overrides to version 7 after the unbounded range pulled incompatible version 8 into version 7 consumers. Forwarded Assistant UI thread events and validated Tabler SVG element names for updated API types. Removed the obsolete xterm Canvas addon; xterm 6 log viewers use its built-in DOM renderer. Extracted dependency-free Workshop URL configuration so the docs config loader no longer evaluates Zod and Custom Widget runtime schemas.

The [final advisory scan](fixes/npm-audit.json) has no high or critical findings. Two remain: Quill HTML-export XSS (low) and uuid buffer bounds (moderate, docs development-server dependency). Neither has a compatible patch in the retained version line. This is a package advisory scan, not a rebuilt production-image scan.

## Saved integrations

Administrator-configured saved integrations now permit every valid IPv4/IPv6 destination over HTTP or HTTPS, including shared-address overlays, loopback, private, link-local and reserved addresses. All HTTP consumers of saved integrations use the shared server-only `any` scope. Manual Custom Widget sources retain their configured scopes. Saved origin/path confinement, permissions, authentication, DNS pinning and resource limits still apply.

The existing focused executor and policy suites passed: 45 tests across two files. See [network implementation](fixes/NETWORK.md).

## Statistics

The original audit understated existing live evidence. [PR #6863](https://github.com/homarr-labs/homarr/pull/6863) records a **34/34 configured integration sweep**, with per-provider result files and a 53-container clean-restore harness. This does not claim every catalog entry or provider version was tested: Your Spotify required a real account, and several hardware-backed providers had documented fixture limitations. Archived evidence and exact commits are linked in [Statistics implementation](fixes/STATISTICS.md).

Independent endpoint groups now settle separately. Successful metrics update; failed metrics keep their previous stored values and display as unavailable. Native provider execution, its HTTP requests, and legacy metric groups have 30-second child deadlines below the source-wide 60-second limit. This also prevents slow Linkwarden pagination from discarding healthy collection metrics. Partial failures retry after one minute. A complete failure retains the previous snapshot and timestamp. One integration failing does not block another.

Focused tests cover partial success, total group failure, null-value replacement, snapshot retention, retry state, and concurrent healthy/failing integrations: **12 tests across four files passed**. Historical live-provider checks were not rerun or relabeled as current validation. Distributed multi-process refresh remains outside these mocked boundary tests.

## Accessibility and compact layout

Implemented names for Calendar controls, Downloads progress indicators, Notebook editing, avatars and the board-switcher dialog; keyboard-focusable scroll viewports; corrected user-menu target semantics; removal of unsupported row ARIA; and improved automatic text contrast. Compact Downloads omits column drag/resize affordances, while advanced mode retains them. Compact Assistant empty-state sizing and CSS ordering no longer impose the full-height minimum.

Shared docs syntax highlighting and ad-attribution contrast were corrected for light/dark themes. The three changed docs pages pass axe at desktop and mobile widths with no horizontal overflow; a dark-theme Statistics spot check also passes. See [docs browser report](fixes/docs/browser-smoke.md) and its six screenshots. Some axe incomplete contrast checks remain manual-review items.

The clean dashboard, with both its saved image background and a temporary solid background, reports zero axe violations. Dark and temporary light login scans also report zero violations. Image/gradient contrast remains partly manual (582 dashboard image-background nodes; 132 solid-background nodes; 6 login nodes). Compact Assistant bounds and the interactive Calendar event card were checked. See [UI report](fixes/UI.md) and [machine-readable summary](evidence/candidate-ui-a11y-summary.json). Existing release images of advanced Downloads and full-height Assistant are not replaced merely because compact surfaces changed.

## Final validation

- Nine affected packages passed typechecking: Next.js app, widgets, docs, API, Custom Widgets, request handler, integrations, Workshop, and UI. [Log](fixes/typecheck.log).
- Docs production build passed. Scalar emits its dynamic-plugin-import warning; the sandbox cannot write the optional update-check cache. [Log](fixes/docs-build.log).
- Workshop URL/schema regression checks passed: 11 tests. Proxy regression checks passed: 8 tests.
- UI, Widgets and Next.js typechecks passed again after the final shared-theme changes.
- Formatting and `git diff --check` passed.
- Focused lint is not green: 18 errors also reproduce on unchanged HEAD versions of the same files under the updated linter. Current-source comparison adds three semantic-tag preference warnings for named Mantine groups/regions and a ring indicator, with no additional errors. [Current lint](fixes/focused-lint.log), [baseline lint](fixes/lint-baseline.log).
- Two peer warnings remain: tsconfck expects TypeScript 5 while this branch intentionally uses 7; http-cookie-agent has an optional Undici 6 peer, but Homarr imports its Node HTTP adapter rather than its Undici adapter. [Peer report](fixes/peers.log).

## Scope retained

The advanced-view timing article/caption discrepancy was left as requested. The original audit's other findings, release governance and exact-image acceptance gates remain separate work. No commit, PR, merge or deployment is implied by this local implementation.

## Re-review

The requested [candidate review](REVIEW.md) found and fixed three regressions: old persisted Statistics snapshots, failed-metric details masking healthy siblings, and compact disk-card contrast in both themes. Two component regressions reproduce the failures before the fix and pass afterward; browser measurements and the focused validation logs are linked in the review.
