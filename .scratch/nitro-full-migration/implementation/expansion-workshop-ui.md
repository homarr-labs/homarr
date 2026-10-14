# EXPANSION35: Homarr-facing Workshop frontend

## Owned surface and freeze

Only `apps/nitro/src/features/workshop/` and this handoff are owned by this expansion. `index.ts` freezes the exported feature components and `client.ts` freezes their client-facing binding. No route, manifest, host, API, legacy application, Go/PocketBase runtime, runtime provider, database, or deployment files are changed. The active widget-editor feature is neither imported nor modified.

The implementation is a prepared React/Mantine frontend, not an admitted production runtime. No transport is constructed, authenticated, or deployed here. The central host must join real resources before mounting it.

## Actual source reuse

- `apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/_workshop-browse.tsx`: search, sorting, twelve-item pagination, author/revision and community warnings.
- `apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/[id]/_workshop-detail.tsx`: validation, source configuration, security review, template inspection, screenshots, reports and installation.
- `apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts`: shared source setup, optional credentials, one successful import per mounted review and portable definition handling.
- `apps/nextjs/src/components/custom-widgets/integration-source-select.tsx`: matching integration kind and full-access filtering.
- `packages/custom-widgets/src/core/index.ts`: actual parsing, source normalization/setup, import review and portable export functions.
- `packages/custom-widgets/src/workbench/index.ts`: actual source setup component, value initialization and readiness calculation.
- `packages/workshop/src/backend.ts` and `schema.ts`: actual Workshop pages, submissions, report summaries, screenshot URLs, authorship and revision updates. No replacement marketplace model or PocketBase protocol is introduced.
- `packages/api/src/nitro/routers/custom-widget.ts` and `integration.ts`: client inputs and outputs are inferred directly with `RouterClient`, not recreated as frontend DTOs.

## Frozen client-facing flows

| Export                         | Flow                                                                                                                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkshopFeatureScope`         | Requires an authenticated Homarr administrator. Remounts local form state on authority, user, read-only or Workshop authority changes.                                                                                                       |
| `WorkshopBrowse`               | Genuine Workshop pagination and sort/search when transport is joined. Native search-only fallback is labelled first-page, maximum twenty matches; it never manufactures totals or pages.                                                     |
| `WorkshopInstall`              | Native validated detail, source setup and matching full-access integrations, community warnings, real screenshots/report explanations when available, template inspection, explicit installation confirmation and missing-credential result. |
| `WorkshopImport`               | Bounded JSON file or pasted JSON, canonical parsing, local source rebinding, security review and explicit import confirmation. No legacy migration writes.                                                                                   |
| `WorkshopExport`               | Native export, canonical portable normalization and JSON download. Stored credential values and local integration IDs are omitted. Static HTTP destinations, request content and templates remain visible for human review.                  |
| `WorkshopPublish`              | Actual Workshop account required independently of Homarr administration. New publication or owned-submission revision update uses only the existing backend. Exact portable content and publication details must be confirmed.               |
| `WorkshopSourceConfiguration`  | Redacted saved definition and configured-secret metadata; individual HTTP or integration source configuration. Integration input excludes HTTP URL, network scope and credentials.                                                           |
| `WorkshopConfigurationRequest` | Private short-lived source-configuration link, explicit status check using only `requestId`; no secret value appears in status or export.                                                                                                    |
| `WorkshopTemplate`             | Read-only stored JSX and source-provided template revision. Authoring remains with the widget-editor owner.                                                                                                                                  |
| `WorkshopPreviewCreate`        | Canonical configured definition sent directly to native preview creation. Secret entry is local, then cleared after successful submission.                                                                                                   |
| `WorkshopPreviewInspect`       | Normalized template, current revision/expiry, explicit real-query execution, parameter inspection, redacted journal, action metadata and create/update-from-preview persistence. Action dispatch remains held, as described below.           |

Creation/install/import/publication/persistence mutations disable automatic retries and lock the successful mounted flow. Unclassified write failures hold further writes rather than treating a lost response as proof of rejection. No optimistic installed/published/saved result is fabricated. Query and mutation errors use bounded generic messages instead of exposing upstream credential-bearing error text.

## Native endpoint coverage

The derived client includes sixteen Custom Widget leaves and two integration leaves. Fifteen Custom Widget leaves and both integration leaves have actual call sites; `previewAction` is prepared in the typed client but deliberately not dispatched.

| Native leaf                             | Consumer / authority                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `customWidget.workshopSearch`           | Search-only fallback; native administrator and genuine Workshop resource required.                                        |
| `customWidget.workshopGet`              | Canonical validation and source/action metadata for installation.                                                         |
| `customWidget.workshopInstall`          | Explicit confirmed native install; server refetches, validates, binds sources and inserts.                                |
| `customWidget.get`                      | Saved source setup, redacted credential configuration metadata.                                                           |
| `customWidget.import`                   | Canonically parsed portable definition with locally configured sources.                                                   |
| `customWidget.export`                   | Secret-free saved definition for export/publication.                                                                      |
| `customWidget.readTemplate`             | Stored template and revision inspection only.                                                                             |
| `customWidget.sourceConfigure`          | Individual source binding/configuration; server validates current source security and authority.                          |
| `customWidget.configurationRequestUser` | Create a definition/preview configuration request or check one request, never mixed modes.                                |
| `customWidget.previewCreate`            | Server normalization, validation, source checks, compatible stored-secret inheritance and edit-state fingerprint capture. |
| `customWidget.previewGet`               | Current preview revision and metadata, also fresh checks before query/persistence dispatch.                               |
| `customWidget.previewQuery`             | Explicit authorized real service reads, never fabricated responses.                                                       |
| `customWidget.previewJournal`           | Canonical redacted server evidence journal.                                                                               |
| `customWidget.createFromPreview`        | New-widget persistence from current server-validated evidence.                                                            |
| `customWidget.updateFromPreview`        | Existing-widget update with the server's saved-state fingerprint conflict guard; no direct unguarded `update` substitute. |
| `customWidget.previewAction`            | Typed but held. The endpoint does not accept an atomic simulation-only requirement.                                       |
| `integration.all`                       | Actual saved integrations; kind and `permissions.hasFullAccess` filter applies to readiness as well as the selector.      |
| `integration.getKinds`                  | Actual native source catalog names; catalog-read errors retain the source's recorded kind, not a mocked catalog.          |

## Source limits and held edges

1. Native `workshopSearch` accepts `query`, `sort`, `limit`, always asks Workshop for page one and returns only `items`. Full pagination must use the real `WorkshopBackend.list` page contract. When unjoined, browsing/publishing clearly reports a resource hold; native requests can still fail honestly on their own held resources.
2. Native Workshop installation has no reviewed `expectedRevision` input. The server refetches the submission during install. The frontend does not claim that its reviewed revision is pinned atomically through installation.
3. Native preview actions have no `simulateOnly` input. A preceding `previewGet` cannot prevent a concurrent client enabling live actions before `previewAction`. The action button is disabled and its mutation branch throws before dispatch. No `setPreviewLiveActions` call, simulated success, or live service mutation is hidden behind this hold.
4. Native preview persistence accepts only a preview session ID, not a client-reviewed expected revision. Fresh reads detect already-visible revision changes; server evidence and saved-state fingerprints remain authoritative. They do not establish an atomic UI-reviewed-revision lock. The editor/resource owner must freeze preview mutation ownership before joining an exact-review persistence guarantee.
5. `WorkshopBackend.update` sends its own `expectedRevision`, based on its fresh internal read. This frontend additionally checks the displayed previous revision and author before calling it, but the helper rereads before writing. That is not a client-reviewed-revision CAS across both reads. No new PocketBase request is invented to close this source limitation.
6. Workshop sign-in/auth-store subscriptions, voting, reporting submissions, comment moderation, screenshot authoring, CSS submissions and the widget-editor authoring UI are not ported here. Screenshot display uses existing returned filenames and `fileUrl`; publication preserves backend defaults. A host must provide the real Workshop account lifecycle, not a fake signed-in state.
7. No React feature routes or host mounting are created. `onSelect`, `onInstalled`, `onImported`, `onCreated`, `onSaved` and `onPublished` are plain callbacks for the later frozen route/editor boundary. Existing server-returned paths are not asserted to be mounted Nitro routes.

## Central dependency and authority joins

`apps/nitro/package.json` already declares React 19.2.7, Mantine 9.6.0, TanStack Query 5.101.2 and oRPC 2.0.0-beta.43. Feature runtime imports use those existing dependencies only. The actual source-derived types use relative source references like existing Nitro feature clients; they do not introduce a runtime deep-import bundle.

Direct Nitro workspace dependencies for `@homarr/api`, `@homarr/custom-widgets` and `@homarr/workshop` are currently absent. Their production declarations and transitive dependency closure belong to the central manifest owner. Until that join, `WorkshopFeatureBinding.core` and `.workbench` require the exact listed public source exports, supplied by the real host; no fallback implementations are defined here. `transport.kind: available` requires an actual Workshop backend instance with its real current account and separately owned authority key. `held` supplies no client or fabricated status.

The host must supply an existing TanStack Query provider, Mantine provider, derived native client, authenticated principal, current authority generation and read-only/demo policy. It must change the authority key across session, group, permission, credential and resource-generation transitions and retire old client/cache work. Workshop account transitions require the transport authority key to change. The required `onDefinitionsChanged` callback owns cross-feature cache refresh; this feature invalidates only its actual Workshop query prefix. It does not guess widget-editor keys or the widget-runtime key shape (`getScopedWidgetQueryKey` uses procedure path/input plus `cacheScope`). This expansion adds no auth listeners or runtime providers.

Native administrator checks, integration full-access checks, private/loopback source gates, genuine Workshop resources, secret codec, preview state/evidence ownership, compatible writer exclusion and current-authority leases remain server-owned. Frontend administrator checks and filtering are not substitutes. Do not admit native writers or outbound requests merely because these components type against prepared procedures.

## Documentation and verification evidence

Dependencies and public source exports were read before implementation. Context7 resolution for Mantine, TanStack Query and oRPC returned a monthly-quota error. Official current docs were then read directly:

- <https://mantine.dev/core/modal/>: dialog focus, title, cancellation and pending-state behavior. The installed Mantine package was separately verified as 9.6.0; the live documentation page displayed 9.7.2.
- <https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries>: page-qualified query keys and genuine pagination state.
- <https://orpc.dev/docs/client/client-side>: inferred `RouterClient` and direct typed procedure calls.

The project-declared Mantine MCP server is not present in this session's tool catalog; no server was installed or launched to bypass that missing edge.

Scoped lint passed after correcting type-import/accessibility warnings. The application typecheck attempt stopped at a syntax error in the active peer file `apps/nitro/src/features/apps/search.tsx:38`; that file was not read or modified for diagnosis. An isolated feature-entry typecheck identified the distinction between schema input defaults and normalized exported widget output; the feature model now uses the actual normalized `customWidget.export` return type. After that correction, isolated typechecking reported no Workshop feature diagnostics and five existing diagnostics caused by missing `@homarr/node-unifi` declarations in the source integration dependency graph. That remains a central workspace/type-resolution edge. These are partial verification results, not a successful application typecheck. No tests, builds, dependency installations, runtime launches, browser checks, Git operations or nested agents were used.

## Bounded P2 correction freeze

This handoff was relocated with a patch from `implementation/expansion-workshop-ui.md` to exactly `.scratch/nitro-full-migration/implementation/expansion-workshop-ui.md`. The preceding source and verification evidence is preserved as historical evidence, not fresh validation of this correction.

- Preview inspection now delegates to an internal inspector keyed by both session ID and revision. Confirmation, save mutation state, request-child parameters and response state cannot migrate to a different session with the same revision, or to a new revision of the same session. Preview snapshot and journal query keys include both identifiers.
- Private configuration requests now delegate to an internal flow keyed by target type, target ID and source ID. `requestId`, URL, status and mutation observers remain attached to that identity. The create/status operations also capture their flow identity, with status additionally bound to its actual `requestId`.
- `flow.ts` adds a committed-mount generation per mutation flow, established and retired with layout-effect lifecycle. Each dispatch captures a unique operation and abort controller. Successful callbacks require that exact mounted generation, relevant operation identity, native client, principal/permission snapshot, authority/read-only generation, Workshop transport/account and callback recipient to remain current. A later operation supersedes earlier completions. Unmount or replacement retires the generation and aborts outstanding supported client requests.
- Install, import, file reading, source configuration, configuration-request creation/status, publication, preview creation, preview request execution and preview persistence use that guard. Secret clearing, setting a private request ID, definition refresh, journal refresh and external navigation callbacks cannot run from a retired flow. Definition invalidation rechecks the lease before notifying the host and again before invalidating its query prefix; navigation callbacks recheck after notification in case the host synchronously replaced the flow.
- Native oRPC calls receive the captured cancellation signal. Native preview preflight reads and Workshop publication-target reads forward cancellation; after awaited preflight reads the lease is rechecked before any subsequent dispatch. The existing Workshop create/update helpers and `File.text()` do not accept cancellation signals, so their signatures are unchanged and their delayed effects are guarded instead. Client cancellation or ignored completion does not undo a dispatched server mutation, establish rollback, or verify a rejected write. Automatic mutation retries remain disabled and ambiguous current-flow outcomes remain held.
- Preview action execution remains unavailable. No simulation endpoint, account, authority, runtime join, backend writer or editor boundary was invented.

Voting, report submission, comment/report moderation, screenshot upload/removal/authoring, CSS browsing/install/publishing and Workshop account sign-in lifecycle remain missing workflows. Existing screenshot display and reading community report summaries do not complete those workflows. The resource/dependency joins and atomic-review limitations recorded above remain open.

This correction used source reads and patches only, within `apps/nitro/src/features/workshop/` and this owned handoff. No commands, checks, lint/typecheck, tests, builds, installs, formatting, runtime/SQL evaluation, browser/network/provider calls, current account/data reads, Git operations or nested agents were performed for the correction. The fixes are frozen for independent source rereview; no executable verification is claimed.
