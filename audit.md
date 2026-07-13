# Workshop V2 audit

## Purpose

The Workshop is Homarr's central community catalog for custom widgets and CSS themes. It must let people discover, inspect, export, publish, update, report, and install creations from homarr.dev and from Homarr itself without requiring raw copy-and-paste as the default workflow.

### Feature North Star

A Homarr user can move from a useful local creation to a safe community submission, or from a community listing to an installed local creation, in one understandable flow with source visibility and an explicit confirmation boundary.

### Developer-experience North Star

Workshop behavior is defined once: one typed contract, one client, versioned PocketBase migrations, deterministic local startup, shared validation fixtures, typed failures, and UI components that contain presentation rather than PocketBase queries or authorization rules.

## Baseline audit

The abandoned prototype is preserved at `origin/feat/widget-store-prototype-backup` (`89260b875`). This rewrite is rebased onto `dev` commit `d52d9cfed`.

| Area          | Severity | Baseline finding                                                                                                                    | V2 resolution                                                                                                      |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Branch health | P0       | PR #5984 was based on an obsolete `dev` commit and conflicted with the current branch.                                              | Rebuild from current `dev`; keep the old head on a backup ref.                                                     |
| Security      | P0       | Submission validation ran in browsers and could be bypassed with direct PocketBase writes.                                          | Enforce validation, ownership, account state, immutable fields, and upload limits in PocketBase hooks and rules.   |
| Moderation    | P0       | There were no moderator roles, posting bans, disabled accounts, least-privilege actions, or durable moderation history.             | Add roles, account states, explicit moderation routes, a staff UI, and append-only actions.                        |
| Architecture  | P1       | Docs and Next.js defined separate record types, queries, mutations, sorting, voting, and error behavior.                            | Add `@homarr/workshop` as the only public contract and API client.                                                 |
| Performance   | P1       | The browser downloaded every submission and full content, then searched, sorted, and filtered locally.                              | Server-side pagination/filtering/sorting; summary views exclude content.                                           |
| Product       | P1       | Website and app flows were disconnected and sharing still depended on manual content transfer.                                      | Add contextual install and direct share actions backed by canonical exports.                                       |
| UX/UI         | P1       | A large bespoke Docusaurus component set and a separate Mantine modal produced inconsistent interaction and state behavior.         | Use each host's native components with shared flows, copy rules, contracts, and states.                            |
| Accessibility | P1       | Several custom interactive elements bypassed semantic controls and touch targets; focus and reduced-motion behavior was incomplete. | Require semantic controls, visible focus, keyboard operation, 44px touch targets, AA contrast, and reduced motion. |
| Operations    | P1       | A third-party PocketBase image and incomplete bootstrap docs made builds and recovery non-deterministic.                            | Build a pinned official binary with checksum verification; document health, backup, restore, OAuth, and upgrades.  |
| Testing       | P1       | Tests covered a narrow client schema and did not exercise API rules, roles, auth states, moderation, or cross-surface flows.        | Add contract, backend permission-matrix, UI, and end-to-end coverage.                                              |
| Documentation | P2       | Documentation advertised a supported self-hosted Workshop even though V2 is a central Homarr service.                               | Document the central service and local-development overrides only.                                                 |

## Decisions

- Public name: **Workshop**.
- Launch content: custom widgets (`homarr-custom-widget-v2`) and CSS (`homarr-custom-css-v1`).
- Identity: GitHub OAuth only.
- Community features: votes and reports; comments are removed.
- Hosting: one Homarr-operated image and origin at `homarr.dev`; PocketBase serves both compiled docs and `/api`.
- Resilience: the public shell and successfully loaded query data are cached independently; the rest of Homarr never depends on Workshop availability.
- Publishing: immediate, with source inspection, reporting, and staff removal.
- Staff: GitHub-authenticated moderators/admins use `/workshop/admin`; PocketBase superusers are bootstrap/emergency access.

## Launch acceptance

- [x] Anonymous users can browse, search, filter, inspect, copy, and download without receiving full content in listing responses.
- [x] Members can publish, update, delete, vote, and report; ownership and schemas are enforced server-side.
- [x] Posting-banned users cannot create or update submissions but can browse, vote, and report.
- [x] Disabled accounts cannot authenticate or write, including with an existing token.
- [x] Moderators can resolve reports, remove submissions, posting-ban users, and disable/restore non-admin users.
- [x] Only admins can change roles; staff actions are append-only and attributable.
- [x] Homarr can export/share local widgets and CSS and validate/confirm Workshop installs.
- [x] Website and app implement loading, empty, offline, validation, permission, and destructive-action states.
- [x] Keyboard semantics, mobile layout, dark mode, reduced motion, and horizontal overflow received a browser smoke test.
- [x] Clean PocketBase startup, migration, health, backup, and restore procedures are reproducible and documented.
- [x] Documentation and Workshop API are built into one reproducible image and served from `homarr.dev` without production cross-origin requests.
- [ ] Add automated authenticated cross-surface E2E coverage before changing the PR from draft to ready.

## Deferred after V2

Comments, private Workshop deployments, automated approval queues, follows, collections, notifications, arbitrary package types, historical version installation, and personalized recommendations.

## Exit scorecard

The baseline has three P0, seven P1, and one P2 findings. The rewrite closes every product, security, architecture, moderation, performance, operations, documentation, UX, and DX finding. One P1 release-verification item remains: automated authenticated E2E across both public and in-app surfaces. Keep PR #5984 in draft until it lands.

| Gate                        | Result  | Evidence                                                                                                                                                                                          |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch ancestry             | Pass    | Rebuilt from `dev` at `d52d9cfed`; prototype preserved at `origin/feat/widget-store-prototype-backup`.                                                                                            |
| Contract                    | Pass    | Five Vitest cases cover widget/CSS fixtures, filenames, limits, screenshot validation, and round trips.                                                                                           |
| Backend                     | Pass    | Disposable PocketBase integration matrix covers roles, account states, ownership forgery, schema rejection, duplicate votes, private reports, escalation, deletion cascades, and audit snapshots. |
| Backend operations          | Pass    | PocketBase 0.39.6 runs unprivileged and builds with checksum verification; clean boot and a cloned legacy SQLite volume both migrate and become healthy.                                          |
| Type safety                 | Pass    | Scoped Turbo typecheck passes for Workshop, Docs, and Next.js.                                                                                                                                    |
| Lint                        | Pass    | Scoped lint exits clean; remaining warnings predate the rewrite. Workshop has zero warnings.                                                                                                      |
| Format                      | Pass    | Every changed supported file passes `oxfmt --check`; repository-wide Docs formatting still reports pre-existing drift.                                                                            |
| Production builds           | Pass    | Docusaurus and Next.js production builds pass under Node 24.18.0.                                                                                                                                 |
| Browser smoke               | Pass    | Desktop/mobile discovery, disconnected API recovery, and a first-visit online-to-offline reload render without uncaught errors.                                                                   |
| Automated cross-surface E2E | Open P1 | Authenticated website-to-Homarr publish/install and moderator flows still need browser automation.                                                                                                |

Final implementation scores (10 is best): security 9, architecture/DX 9, moderation 9, performance 9, responsive UI 9, theming 9, accessibility 8, automated testing 7. Accessibility remains below 9 until authenticated dialogs and destructive flows receive a full keyboard/screen-reader pass.
