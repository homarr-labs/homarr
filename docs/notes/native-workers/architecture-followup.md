# Single-worker architecture follow-up — 19 October 2026

Base: `ef57b77d30c8c648ca9970baa10185a802a1ff5b`, branch `feat/headless-hono-backend`.

## Current request

The user approved the remaining architecture candidates after shared request handling: shared credential lifecycle, runtime lifecycle, and bounded published-item reads. They also requested real PostgreSQL validation, easier local accounts and sharing, and an Impeccable-guided redesign for technical users. They explicitly added removal of frontend tRPC.

The latest user decision supersedes the original specification's multiple-worker requirement: one main worker owns boards, integrations, widgets, users and sharing. Remove the frontend worker selector and federation controls; deploy one worker. Replacing the connected worker requires confirmation and must retain the old connection if replacement fails. Existing browser credentials and stopped integration-worker volumes must remain recoverable; no automatic data merging or deletion.

Keep the normal Homarr frontend and native permissions. Local invitation signup and username/password login require no GitHub account. Optional hosted MCP account access remains separately authorized over the encrypted relay. The relay does not receive plaintext application data. Live GitHub sign-in, homarr.dev deployment and image publication remain outside this pass.

## Implementation boundaries

- `@homarr/auth/credential-lifecycle`: native enrollment, verified credential and password-version session insertion; callers retain eligibility, normalization, invitation scope and error policy.
- `@homarr/cron-jobs/runtime`, `@homarr/auth/session-cleanup`, `@homarr/api/websocket-runtime`: runtime policy lives in shared owners; executables own process signals and shutdown deadlines.
- `@homarr/api/published-item-reads`: bounded persisted item selection, preserving intentionally different native and DTO pagination/validation contracts.
- Native browser client and TanStack hooks derive types from the oRPC router. Preserve cache keys, cancellation, streaming, media/FormData, native errors and SSR cookies. Server-only legacy transport may remain for compatibility; frontend imports and runtime must contain no tRPC.
- Single-worker console: Overview, Users, Sharing, Connection and MCP. Keep normal management navigation and `/manage/workers` link compatibility. Users and Sharing use compact tables and focused dialogs. Worker replacement is explicit; local account access and device/board shares remain distinct.

## Evidence

Real PostgreSQL 18.6 validation completed against a disposable isolated database: 10 focused cases, 82 assertions, zero failures. Native local enrollment/login/password reset/revocation, board share isolation, one-use invite race and scoped encrypted integration calls passed. Original-key restart/recovery and encrypted integration-secret decryption after a real database restart passed separately. Evidence: `/tmp/homarr-pg-validation/EVIDENCE.md` and adjacent logs. Container and volume were removed.

PostgreSQL exposed an invitation ID longer than varchar(64). New IDs use a compact worker fingerprint; existing full-fingerprint SQLite invitations remain accepted/listed/revocable. Organization names now respect the 64-character database limit. Different-invite/same-username and artificially paused password races were reviewed in code, not claimed as separate live PostgreSQL proofs.

Focused final checks passed:

- PostgreSQL runtime: 10 cases / 82 assertions, plus key recovery and actual encrypted-secret persistence/restart proof.
- Native client transport: 22 cases, including hosted and worker uploads, native values/errors, cancellation, shared streams, retry exhaustion and terminal authorization failures.
- Single-worker pool: 10 cases / 53 assertions, including failed replacement, hidden credential recovery and forgotten-access write races.
- Shared publication: 26 cases / 117 assertions. Cron lifecycle: 6 cases. Existing RPC/cache checks: 24 cases. Changed frontend/prefetch/cache checks: 78 cases. Existing classic-registration selection: 4 cases.
- Final Next, worker, API, backend, tasks and WebSocket typechecks passed. Widgets/forms integration checks passed with the same ambient declarations provided by Next. Changed-source formatting and lint have no errors; unrelated incumbent style warnings remain.
- Impeccable official skill `pbakaus/impeccable` 4.6.0 was used in Operate mode, retaining Homarr/Mantine. Context loader ran once; the final mechanical detector reported no findings. Installed Mantine declarations were used after its MCP returned404. Product context still describes the marketing surface; it was not rewritten for this application change.

Historical full-suite failures remain documented in `test-audit.md`; no new full-suite pass is claimed for this follow-up. Validation stayed at the requested boundaries.

## Review

Standards review found hosted FormData and transient subscription recovery regressions. Spec review found those same issues plus restoring hidden saved credentials after explicit worker replacement. All three were fixed and independently rereviewed without further blockers. Source browser QA then found an asynchronous xterm callback using a disposed terminal; terminal identity is now checked before scrolling and references are cleared before disposal.

## Browser and deployment acceptance

Source browser checks passed for owner connection, native board save/reload, invite enrollment in a fresh browser, returning username/password login, owner-created accounts, native password reset plus login with the replacement password, desktop/360px Worker/Users/Sharing/Connection/dialog layouts, and real Logs history/live events across remounts. Evidence: `/tmp/homarr-single-worker-ui-qa-20261019.md`; screenshots in the conversation visualization directory use `single-worker-*`.

Public-link creation/viewer/revocation through the browser was rejected by automatic approval review, including for an empty isolated localhost test board. No link was created. A specific user approval question is pending; real backend PostgreSQL sharing/revocation coverage remains green. Do not claim this browser flow passed.

The demo is deployed at `https://brainzilla.llama-stonecat.ts.net:8445/manage/workers`: frontend, worker-primary, platform, relay and gateway are healthy. Normal dashboards, Users/Sharing pages and real Logs render from the production containers. Raw public worker RPC remains404. Existing primary/account/key volumes survived; the retired integration-worker container was removed and its named volume remains intact. Existing8443 demo was not changed.

An old task-created Mock DNS example referenced the retired integration worker. Only its `integration_origin` row was backed up to `/appdata/worker/retired-mock-origin-20261019.json` and removed, converting the existing mock integration to local ownership without changing integration/widget IDs. The original worker volume and other saved configurations remain untouched. Generic dormant federation APIs remain backend-only; the frontend exposes no multi-worker controls.

Final images: frontend `75c4658a2bf2584aec5ab06d7b622e4c05c1688bfe096016864aa95fe0350623`; worker `0432c65ce4a2c6fa266d6a496b6a43a00fcc872e8b1072671e95a286f7b64acb`. These are local images, not published releases.

## Shipping boundary

`apps/backend` and `apps/worker` now consume the shared request, credential, scheduling and publication modules. Process entrypoints retain their own signals, ports and readiness. The worker remains Bun1.4.2 + Hono4.13.13 + native oRPC2.0.0-beta.44; the normal frontend uses oRPC plus TanStack Query, with no frontend tRPC runtime/imports/dependencies. A server-only legacy HTTP/WebSocket bridge remains for old clients.

Before a public release, separately review the beta RPC dependency and encrypted-transport threat model, verify production OAuth configuration in the intended environment, and run the agreed release validation. No live GitHub sign-in, homarr.dev deployment or external cryptographic audit was performed here. PostgreSQL encryption keys must be backed up with the database; its original-key restart guard is documented in `deployments/native/README.md`.
