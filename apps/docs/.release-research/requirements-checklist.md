# Homarr 2.0 release-post completion matrix

## Snapshot and publication gate

- Audited application source: `release/v2` at `ac62e5bfd6731651b75345b8bb6a07882fad8daa`.
- Final live check: 2026-09-03. The branch tip is unchanged; roll-up PR #6545 and all seven named stack PRs are open; issue #6600 is open; no `v2.0.0` GitHub release exists.
- The Docusaurus post therefore remains `draft: true`. Its final editorial comment lists the publication-time tag, date, image, and migration checks.
- Unsupported marketing statements were not repeated as facts: the Chrome-memory number is tied to its exploratory workload, the same run's CPU increase is disclosed, and the unproven 80% Custom Widget number is explicitly rejected.

## Requirement coverage

| Requested area                | Article coverage                                                                                                                                                                  | Primary visual                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Prior Homarr blog conventions | Front matter, author map, excerpt boundary, direct house voice, safety warning, screenshot-led sections, and CTA follow the audited 0.11/0.14/1.0 precedents.                     | Hero before `<!-- truncate -->`             |
| Roll-up and sub-PR audit      | All seven layers beneath #6545 plus the roll-up were read; the source report records their descriptions, heads, state, ancestry, and claim disposition.                           | Research reports under `.release-research/` |
| Assistant                     | Three entry points, model/provider discovery, credentials, attachments, mentions, sources, usage, history, approvals, Workshop provider, and permission boundaries.               | `assistant-control-surface.webp`            |
| MCP                           | Authentication, endpoint capabilities, management workflow, safety boundary, catalog domains, and snapshot count of 124 reviewed tools. No claim of complete MCP-spec compliance. | `mcp-management.webp`                       |
| Command-menu rework           | Cmd/Ctrl+K, local-first mixed modes, configured remote providers, permission-aware create actions.                                                                                | `command-menu.gif`                          |
| Drag-and-drop rework          | Transactional placement, rollback, eight-direction resize, canvas/container/rail support, pointer/touch/keyboard handling.                                                        | `drag-and-drop.gif`                         |
| Multi-item moves              | Ctrl/Cmd selection, copy/paste/delete/move, atomic commit, all-items-must-fit constraint.                                                                                         | `batch-move.webp`                           |
| Side rails and mobile layouts | Left/right desktop rails, protected Base/Mobile roles, same-board geometry, optional breakpoints, Reset from Base, rail projection on mobile.                                     | `responsive-layouts.webp`                   |
| Board switcher                | Searchable keyboard-navigable preview gallery and shortcut.                                                                                                                       | `board-switcher.webp`                       |
| Configurable header           | Fixed left/center/right zones, built-in controls, board shortcuts, compact behavior, recovery control.                                                                            | `header-studio.webp`                        |
| Custom Widgets v2             | Full workbench, API sources, credentials, load queries, explicit previews and states, validation and safety limits.                                                               | `custom-widget-workbench.webp`              |
| Custom Widget actions         | GET/POST/PUT/PATCH/DELETE, `ActionButton`, `ToggleSwitch`, confirmations, feedback, rollback, invalidation.                                                                       | `custom-widget-post-action.webp`            |
| Custom Widget options         | All 15 verified controls plus paths, query values, JSON bodies, and dynamic choices.                                                                                              | Workbench/action screenshots                |
| Community Workshop            | Browse, install, update, publish, rate, report, and share widgets/CSS; credential-free authoring prompt.                                                                          | `community-workshop.webp`                   |
| Advanced widget modes         | 40 explicit opt-ins, ten explicit opt-outs, access methods, preview/pin behavior, compact-default caveat.                                                                         | `advanced-downloads.webp`                   |
| Broader widget work           | Unified settings workspace, Weather/Clock redesigns, Air Quality/Countdown/Timer, and named targeted refinements.                                                                 | `advanced-downloads.webp`                   |
| Onboarding and autodetect     | Current six-stage setup studio, Docker-compatible discovery, draft review, transactional first-board creation.                                                                    | Fresh local `onboarding-studio.webp`        |
| Login and auth                | New login surface plus shared instance/auth branding.                                                                                                                             | `new-login.webp`                            |
| External users/groups         | LDAP first-sign-in provisioning, adapter-backed OIDC persistence/linking, external-group sync, explicit provider-specific caveat.                                                 | Described in onboarding section             |
| Docker/Podman                 | Multiple endpoints, per-host capabilities and partial failure, assisted app/integration setup.                                                                                    | `docker-assisted-setup.webp`                |
| Docker labels                 | Native `homarr.*` contract and the five verified Homepage compatibility fallbacks.                                                                                                | Docker setup screenshot                     |
| Fewer clicks/UI polish        | Contextual Add content, inline Quick Add, in-flow integrations, colocated Workshop discovery, short two-click confirmations with cancellation.                                    | `add-content-menu.webp`                     |
| Permissions                   | Lossless matrix, Viewer/Editor/Admin presets, access versus create capabilities, effective preview, server filtering and aligned navigation.                                      | `permission-matrix.webp`                    |
| Branding                      | Instance name/logo/favicon, colors, board-color policy, five corner styles, auth appearance.                                                                                      | `instance-branding.webp`                    |
| Global Custom CSS             | Shared editor, instance scope, board-over-global cascade, administrator trust warning.                                                                                            | `global-css-and-auth.webp`                  |
| Caching and parallel fetch    | Parallel board work, in-flight deduplication, bounded L1, optional Redis L2/locks, stale-on-error, session restore, lazy surfaces.                                                | Technical prose and focused note            |
| Chrome-memory claim           | Exact 366.5→258.2 MiB four-tab result, 22–52% phase range, +18% CPU, exploratory/final-build caveats, no latency claim.                                                           | Dedicated admonition                        |
| 80% Custom Widget claim       | Explicitly identified as unsupported; concrete field-scoped/debounced/stale-safe improvements are described instead.                                                              | Dedicated admonition                        |
| Upgrade safety                | Backup and data-volume warning, prerelease isolation, legacy Custom JSX migration behavior, final-tag gate.                                                                       | Warning before long form                    |

## Deliverables and validation

- Main Docusaurus article: `blog/2026/09-03-homarr-2.0/index.mdx`, 20 local media assets, descriptive alt text, two focused GIFs.
- GitHub Release variant: pure GitHub Markdown with eight absolute tag-pinned raw media URLs and a publication note.
- Reddit variant: sensational headline, complete high-level feature narrative, safety and benchmark honesty, demo/roll-up/article links.
- Discord variant: 1,889 UTF-16 code units, below Discord's 2,000-character message limit.
- Render: production Docusaurus build completed with the draft temporarily enabled, then the source was returned to `draft: true`.
- Browser QA: dark desktop at 1440×1000, light mobile at 390×844, no mobile horizontal overflow, and all 20 article media assets reported complete with non-zero natural widths.
- Final handoff screenshot: `release-announcements/2.0.0/rendered-blog-preview.png`.
- Static checks: every article media reference and internal documentation target resolves; every author key exists; `git diff --check` is clean.
