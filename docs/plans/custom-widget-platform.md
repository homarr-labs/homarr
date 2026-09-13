# Custom Widget platform implementation

Approved direction: trusted React/TypeScript/CSS packages and optional supervised Node handlers, dashboard tiles and advanced views, a shared native/custom SDK, owner-enabled named guest controls, and self-hosted/offline distribution. Preserve v2 without silently elevating its trust.

## Delivery ledger

This branch delivers an operational trusted-package platform alongside v2. The exhaustive north-star criterion
(all native capabilities, all authoring affordances and every distribution path) is not yet satisfied.

| Stage                  | Implemented                                                                                                                                                                                                                               | Remaining scope                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1. Existing experience | Zero-source v2 definitions, no empty polling, retained data, request queue, raw repair/export, private/VPN networking, install-to-board                                                                                                   | Progressive individual results use v3; the compatible v2 response remains aggregated.                                           |
| 2. Shared contracts    | Versioned client/server SDK, dimensions/scale/theme/locale, typed handlers, native integration adapters, commands, managed storage and advanced views                                                                                     | Extend maintained adapters and primitives across the entire native catalog.                                                     |
| 3. Trusted packages    | Portable v3 schema, installations/connections/placements, TSX/CSS modules/assets, immutable artifacts, exact dependency closure, supervised Node, migration/rollback, v2 compatibility and explicit conversion                            | Native addon build environments and richer package compatibility negotiation.                                                   |
| 4. Creator workspace   | Multi-file CodeMirror with local TypeScript service, semantic navigation/rename, retained preview, draft/preview/activate, synthetic scenarios, viewport/scale/theme controls, resizable split, Undo/recovery and Assistant proposals     | Visual resource builders, asset upload, project-wide search, and simultaneous viewport comparison.                              |
| 5. Native parity       | Thirteen reference packages with clean semantic diagnostics; Beszel history/live data, downloads controls, clock/timer, checklist, Sonarr, rack, backup, media and composed views; shared tables and native starters                      | Complete native-widget coverage and live-service acceptance of every reference behavior.                                        |
| 6. Workshop lifecycle  | Immutable releases, origin tracking, updates/forks, binding preservation, staged activation/rollback, private Workshop, offline archives, portable collections/shared connection setup, inert package browsing                            | Richer semantic release comparison and catalog presentation.                                                                    |
| 7. Application reach   | HTTP and richer authentication/TLS, native subscriptions, exact-token webhooks, opt-in retained sampling, URL-free encrypted service connections, local Node file/command access, SQLite/MQTT examples and authenticated companion runner | Maintained SSH/browser adapters and native addon build environments; native binaries need a compatible external runner/service. |
| 8. Central experience  | Board/native customization entrypoints, installed library, Assistant draft editing, MCP lifecycle and external CLI scaffold/build/preview/pack/publish                                                                                    | App/integration suggestions and comprehensive contextual discovery.                                                             |

## Invariants

- Package code and exact dependencies are portable; credentials and connection bindings are local.
- Saving a draft does not change deployed placements. Activation switches a validated artifact and retains the previous managed rollback unit.
- Workshop browsing executes no submitted code. V3 execution requires owner trust.
- Anonymous callers can invoke only explicitly granted named actions with approved inputs on the bound placement.
- Render through the host React/Mantine runtime. Supervise server code separately for reliability, without claiming sandbox containment.
- Preserve user state and query identity between compact and advanced views.
- Keep core runtime independent of Workshop/network availability.
- Apply schema changes to all three database drivers; document shipped behavior with every stage.

## Verification

Use focused existing checks and manual acceptance scenarios. Do not add tests or run broad suites/Docker builds without a separate request. Record actual commands and results here as each stage is integrated.

## Acceptance reference packages

Beszel operations, unified downloads, source-free clock/timer, two-server Sonarr, SVG rack/floor plan, authenticated media wall, API-less backup monitor, household guest controls, persistent checklist, and composed homelab overview.

## Workbench and sharing handoff (2026-09-12)

Implemented UI: full-page package source workspace; collapsed file rail; tile/advanced/configuration previews;
static default and reference templates; a local multi-file TypeScript worker; scoped light/dark and scaled viewport
previews; synthetic scenarios; an accessible resizable source/preview split; offline collection setup; separate draft saving, explicit trust, preview and activation; one document
Undo/Redo and recovery draft; reusable local connections and meaningful readiness diagnostics; package conversion
that preserves v2 originals and explicitly replaces selected placements after activation; board placement setup; Workshop release/source review, local binding, staging, fork,
publish and update controls; supplied compiled artifact/dependency-lock inspection; opt-in history, named guest
controls and per-placement webhooks; existing Assistant draft read/proposal tools; exact CLI preview page.

Assistant proposals compare the visible draft revision, show changed files before/after, require explicit Apply,
and produce one Undo operation. They do not save, execute or activate source. Local credentials, bindings, preview
options and response payloads are outside Assistant context. Recognized source credential literals are redacted;
files containing those redactions cannot be replaced by proposals. Context has a 180,000-character per-response
source budget; individual larger files and manifests over 60,000 characters require direct editing.

The following remain concrete follow-up work, not shipped UI claims:

- Editor: automatic import/entrypoint rewrites on file rename, folder organization, binary asset management,
  and project-wide find/replace. Symbol rename and cross-file definitions are implemented.
- Layout: simultaneous phone/tablet preview comparisons, full board background/geometry emulation, screenshot
  capture and automated visual acceptance. Split resizing, named viewports, scale and local color modes are implemented.
- Configuration: a visual manifest/options builder and richer schema-driven input forms for guest actions,
  webhooks, and queries. Advanced authors can supply a configuration surface; generic controls and JSON remain.
- Review: semantic dependency/configuration migration summaries and per-placement readiness reports. Source review
  currently shows whole files before/after. Supplied artifact integrity does not establish source/build equivalence.
- Operations: an editable collector settings form after creation, richer retained-history charts, visible subscription
  and action tracing, and a library maintenance UI for backend cleanup capabilities. Current history has latest
  samples, a sampled table and technical details; lifecycle activity is inspectable technical data.
- Workshop: polished screenshot galleries, a richer dependency/license review, release compatibility guidance,
  public package quality signals and public collection catalog presentation. Offline collections are implemented. Browsing must remain inert; never run untrusted previews
  on the Homarr origin merely to make a catalog look interactive.
- Native customization: expand the template coverage and maintain shared native primitives and versioned SDK
  contracts. A reference fork is an independently editable package, not an automatically synchronized native clone.
- Assistant: in-editor file/line diagnostics and proposal navigation, smaller contextual reads for huge projects,
  and browser-confirmed visual evidence. Compiled preview-session evidence alone is not a rendering test.
- Reference breadth: Sonarr operations, local backup reports/fixed commands and authenticated still-image galleries
  now demonstrate real paths. They do not imply arbitrary app adapters, continuous video streaming, lossless media
  delivery, backup restore verification, or exhaustive native-widget feature equivalence.

Bounded verification for this UI delivery: 18 existing Assistant contract/pending-action tests passed. Three expanded
reference packages passed schema validation, client/server compilation and supervised Node preflight. Manual SDK
smokes covered two-source Sonarr failure isolation and a source-qualified search, camera/Immich image transport,
backup status/history parsing, preview simulation and a real fixed executable writing only to a temporary file.
These smokes used local fixtures; live Sonarr/Immich/camera deployments and the new Assistant provider round trip
still require browser/service acceptance. Record the root's final build/browser status separately.

## Integrated verification

Verified on `feat/custom-widget-platform` with Node 24.18.0 and pnpm 11.15.1. Commands use `mise exec --` in this workspace.

- Next.js production build and Docusaurus production build pass. Next.js is configured to skip its own type validation;
  an independent Next.js `typecheck` passed. The seven affected package typechecks also passed: custom-widgets,
  widget-sdk, db, api, cli, widgets, and workshop.
- `pnpm check:custom-widgets` passes for 335 production modules. The existing bundle check passes without increasing
  its limit: three routes, largest custom runtime payload 314,085 gzip bytes (1,614,719 raw bytes across 11 chunks).
  The TypeScript worker and declaration assets load locally on authoring routes and are absent from that runtime payload.
- Focused existing Vitest files pass: custom-api-v2, preview-sessions, backup, and MCP inventory; 37 tests across four
  files. Another 18 existing Assistant contract/pending-action checks passed during implementation. No new test files,
  broad test suite, Docker build or end-to-end suite was added or run.
- Read-only lint of 256 changed/new production source files exits successfully. Three nonblocking new style warnings
  remain (type-only import, array constructor, variable shadowing), alongside existing framework/PocketBase warnings.
- Every one of the thirteen reference packages reports zero semantic diagnostics through the actual editor language
  service. Reference browser/server outputs compile and pass supervised worker startup. The real Chromium worker and
  CodeMirror checks cover completion details, semantic diagnostics, F12 cross-file definitions and F2 symbol rename.

Production browser acceptance used a separate SQLite database, Redis instance and local server, with no existing user data:

- Source-free package preview renders; syntax errors preserve the last successful view and pause its SDK activity.
- Tile/advanced transitions preserve selection, keyboard controls and focus behavior. The static clock makes one initial
  widget-data load with no periodic data polling through repeated view transitions.
- The editor split supports pointer and keyboard resizing and persists its preference. Viewport presets, 75% scaling and isolated
  dark mode preserve the preview session. The document remains light while the preview uses dark CSS variables.
- Mobile source/preview switching preserves the mounted preview. The settled page width matches the 390px viewport;
  deliberately larger widget canvases scroll inside their preview frame.
- A source package imports through the actual file picker. Its synthetic partial-failure scenario renders a healthy
  memory region beside the simulated storage timeout, labels the scenario and disables live SDK actions.
- An active package exports as a collection, imports into disabled installations, activates and places successfully on
  the selected board. Retrying reports the existing placement and produces no duplicate. Both original and imported
  widgets render on the board. Collection breadcrumbs display names rather than internal import IDs.

Backend/manual acceptance includes immutable archive checks; isolated production CLI/compiler module resolution;
request queues and cancellation; activation, migration failure and rollback; current/previous artifact retention;
connection/placement changes racing with activation; stale reviewed-source rejection; exact guest action inputs and
revocation serialization; fresh native integration permissions; redacted encrypted connection storage; backup key
rotation and rollback; named webhook validation and revocation that survives rollback; retained history coordination;
portable collection atomic import/rebinding; and private local Workshop release/fork/update behavior.

Adapter checks used real supervised Node execution with local fixtures. They cover two-client download failure and
control isolation, two-source Sonarr queries, authenticated media transport, fixed backup commands, Node SQLite
read-only queries, and MQTT authentication/retained messages/publishing/socket cleanup. Synthetic preview checks
prove server entrypoints are not started, missing fixtures never fall back to real services, delays cancel, old
sessions keep their original fixture data, and ordinary connected previews still invoke real handlers.

SQLite migrations ran against a fresh database. MySQL and PostgreSQL definitions, migration SQL, snapshots and
identifier lengths were checked, but those database engines were not exercised. No real Beszel/Sonarr/Immich/camera
or household deployment was available for full service acceptance, and the Assistant provider round trip remains
unverified. These limits must accompany release acceptance; compilation is not proof of those integrations.

The final production build removes all five new runtime-data filesystem tracing warnings. Existing backup/certificate
tracing warnings and a CommonJS export warning remain. The isolated review server required stopping its old embedded
WebSocket listener before restart; this was resolved without touching other running applications.

## Review fixes

The follow-up review found and fixed eight introduced defects:

- **P1 — Credential binding during v2 Undo/Redo.** Restoring an earlier source origin, network scope, or authentication
  destination now discards pending credentials belonging to the newer binding. Previously the editor kept credentials
  when the source ID and secret type matched, allowing a preview or save to send them to the wrong service. The editor
  and server now use the same binding comparison; same-origin path edits preserve compatible credentials.
- **P1 — Existing v2 callback compatibility.** Adding the `host` root also reserved that name for callback parameters.
  Existing `data.hosts.map(host => host.name)` templates failed validation and rendering. Root host context remains
  available, while callbacks keep their existing local-name behavior.
- **P2 — Cold server startup eviction.** Capacity eviction could stop a newly ready process before an accepted
  invocation registered its pending work. Invocations, subscriptions and preflight now reserve the process across
  asynchronous startup, and eviction checks that reservation before and after waiting.
- **P2 — Duplicate server processes after eviction.** Two calls for one artifact could each start a server after
  asynchronous idle eviction, replacing the tracked process and leaving the other unsupervised. The supervisor now
  checks for a concurrently started artifact again before allocating a process.
- **P2 — Partial credential edits.** Changing only a saved Basic Auth password cleared its username; replacing a bearer
  or cookie credential could also remove a TLS private key. The editor now submits only changed credential fields.
  The API merges them with freshly read encrypted credentials inside the existing connection-change lock and rejects
  patches against a different authentication kind. Explicit full replacement remains supported.
- **P2 — Preview managed storage.** Browser hooks and server handlers previously used separate preview stores. Both
  now use the same authorized temporary backend for user, placement and installation scopes. Successful SDK actions
  also invalidate mounted storage queries so server writes appear in the preview.
- **P2 — Guest-action revocation.** Invalid JSON in an edited allowed-input field blocked disabling an existing grant.
  Revocation now bypasses input parsing; enabling a grant still requires valid inputs.
- **P2 — Workshop validation order.** Exceeding the combined retained/new screenshot limit could publish an immutable
  package release before reporting the validation error. The combined count is now validated before publication and
  checked again after refreshing the submission.

Review verification: all six affected typechecks pass (widget-sdk, custom-widgets, workshop, api, widgets and Next.js),
with a final custom-widgets recheck after the process-sharing fix. Focused existing JSX policy, Workshop client/schema
and custom-api-v2 files pass: **127 tests across four files**. Formatting and focused lint pass; `git diff --check` passes.
The Custom Widgets architecture check also passes for 335 production modules.
No repository test files were added during review.

Temporary manual reproductions cover both server-capacity races, credential patches, all three preview storage scopes,
cross-session isolation and discarded-session rejection, Workshop validation ordering, v2 callback rendering, and
Undo/Redo credential binding. An actual SDK hook mounted in JSDOM confirms that a successful server action refreshes
displayed managed storage. Chromium checks mounted the actual connection and guest-action editors with fixture API
responses and verified their submitted payloads. These checks use synthetic credentials and isolated data.

The production builds and full application/browser acceptance above predate these review fixes. They were not rerun
for this focused review; live external services, MySQL/PostgreSQL engines and the Assistant provider round trip remain
outside the verified coverage.
