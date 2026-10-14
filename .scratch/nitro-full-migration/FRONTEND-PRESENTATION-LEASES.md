# Frontend presentation leases — source preservation, not feature re-porting

## Decision and boundary

### Authoritative Oracle-approved producer-first amendment

#### Reviewed-source publication and narrowly bounded CSS exception

Oracle now approves publishing the independently accepted P2/P3/P4/P5 leaves through exactly four new domain `index.ts` barrels and four matching `packages/ui/package.json` export fields. Explicit named exports only; leaf bodies, dependencies, lock, root barrel, CSS subpaths and controllers remain frozen. A separate independent declaration review must precede any original consumer join. P2's three original wrappers may receive a fresh exact delegation lease after that gate; P3/P4/P5 consumer/CSS rewiring is not included.

Automatic patch formatting prevents exact byte copies of the P1 header's `border` declaration and P6 indicator's `transition-property` declaration. Oracle permits only independently demonstrated single-declaration whitespace differences with selectors, order, values, strings, escapes, macros and custom properties unchanged. Record both actual and original hashes as formatting-equivalent, never byte-identical. Any additional difference holds the artifact. No patch-tool bypass/configuration workaround, original CSS deletion, redesign or rendering/pipeline acceptance follows. The original CSS remains preserved until a separately enumerated canonical consumer join.

P1-P6 exact new-file preparations are approved. Each worker owns only its enumerated new leaves/contracts/byte-preserved CSS and handoff; original files, controllers, manifests, exports and domain barrels stay frozen during extraction. Source callbacks/display props do not establish authority. Missing provider/API/editor/CSS prerequisites hold only the affected branch; no placeholder or generic rewrite counts as source parity.

Independent review of actual source bodies/types/transitive purity precedes a separate explicit composition lease for existing reviewed domain barrels/public exports and exact original-wrapper/import redirects. The export-first order in the historical final paragraph below is superseded. CSS copies are frozen relocation artifacts, not separately editable forks; old styles move/delete only after exact source identity and all consumer redirects are verified. No main frontend mounting or complete-feature claim follows.

Planning only. A01/A06/A02 remain the frozen coverage baseline: 212 prepared feature files are unmounted; their names and contracts do not establish original-view parity. This plan neither re-audits that result nor authorizes product writes. Original Next and existing shared UI are frozen until the coordinator releases the exact files below. No mutable Widgets-kind presentation, Query/Nav/KV/protocol implementation was read or admitted as a dependency.

Six **proposed**, disjoint extraction leases follow. They own the listed new leaves and, only after source release, the listed original presentation delegations. No directory-wide lease, feature/controller rewrite, route mounting, producer activation, declaration change or new dependency is included. Mixed files permit extraction of the named render symbols/body only; their controller/helper/business sections remain frozen. If simultaneous source-consumer rewiring cannot be exclusively released, deliver the new leaf and leave wiring to the coordinator; do not maintain two editable implementations.

Path notation (literal concatenation, no wildcard write rights):

- `N = apps/nextjs/src/`
- `M = N + app/[locale]/manage/`
- `U = packages/ui/src/source-views/` (new, proposed)
- `F = apps/nitro/src/features/` (existing, read-only contract consumers)

## Deepest viable source owner

Use `U/<domain>` for **prop-only** React/Mantine/Tabler leaves. Both apps already declare `@homarr/ui`; its manifest already declares React, Mantine core/hooks, Tabler, common, definitions, translation and validation. Its TypeScript include covers new `src` files. Its explicit exports do **not** yet publish `source-views`: export admission is a coordinator prerequisite, not an assumed deep-import escape hatch. Inside UI use existing relative leaf imports, never its broad root barrel or frontend/backend runtime.

Do not put API clients, principals, query results, router instances, form-package types, Workshop backend types or editor/chat runtimes into UI contracts. UI does not declare form/forms-collection/boards/custom-widgets/workshop/assistant-ui/dnd/lightbox/dayjs. The following extractions avoid those edges through exact value/action/child props; do not introduce dependencies to make an entire controller fit. API DTO publication is a **separate reviewed contract cut**, not a worker's guessed model.

For still-runtime-bound rich chat, drag composer, structured workbench and screenshot lightbox, the fallback preservation namespace is **frontend-local** `apps/nitro/src/source-ui/`, after separate declaration/resource review. That does not authorize Next importing a browser app or copying its controllers. Where mechanical sharing is possible, move the actual render body to U and make the original a thin consumer. For nonshareable runtime ports, retain frozen source as the specification until coordinated replacement/cutover retires the old implementation; do not create a second diverging product UI.

Each lease may add exactly its named `<domain>/contracts.ts` as a types-only presentation surface. No domain barrel is worker-owned. Existing package implementation, manifest, lockfile, export maps and original consumers outside the tables are coordinator-owned.

## P1 — main chrome and management frames

Own new `U/chrome/contracts.ts`, `U/manage/contracts.ts` and these exact mappings:

| Original proposed presentation release                      | New canonical target / extraction                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `N/components/layout/shell.tsx`                             | `U/chrome/shell-view.tsx`: AppShell render only; settings/Jotai/background reads remain in original wrapper                                                    |
| `N/components/layout/header/configurable-header.tsx`        | `U/chrome/configurable-header-view.tsx`: desktop/mobile zones and floating-controls render plus local timer/focus lifetime; item resources supplied by wrapper |
| `N/components/layout/header/configurable-header.module.css` | `U/chrome/configurable-header.module.css`: actual complete stylesheet, no redesign                                                                             |
| `N/components/layout/header/button.tsx`                     | `U/chrome/header-button.tsx`: actual action/link branches and ref forwarding                                                                                   |
| `N/components/layout/header/header-logo.tsx`                | `U/chrome/header-logo-view.tsx`: explicit resolved href replaces optional board context                                                                        |
| `N/components/layout/header/header-logo.module.css`         | `U/chrome/header-logo.module.css`                                                                                                                              |
| `N/components/manage/manage-container.tsx`                  | `U/manage/manage-container.tsx`                                                                                                                                |
| `N/components/manage/manage-page-layout.tsx`                | `U/manage/manage-page-layout-view.tsx`: breadcrumb becomes required supplied node, not a silent dynamic default                                                |
| `N/components/manage/manage-collection.tsx`                 | `U/manage/manage-collection.tsx`: all three genuine collection leaves                                                                                          |
| `N/components/manage/section-card.tsx`                      | `U/manage/section-card.tsx`                                                                                                                                    |
| `N/components/manage/danger-zone.tsx`                       | `U/manage/danger-zone-view.tsx`: localized heading supplied, actual divider/action tree                                                                        |
| `N/components/manage/unsaved-changes-bar.tsx`               | `U/manage/unsaved-changes-bar-view.tsx`: supplied localized label                                                                                              |
| `N/components/manage/manage-sticky-footer.tsx`              | `U/manage/manage-sticky-footer.tsx`                                                                                                                            |
| `N/components/manage/manage-mobile-primary-action.tsx`      | `U/manage/manage-mobile-primary-action.tsx`                                                                                                                    |
| `M/_components/hero-banner.tsx`                             | `U/manage/hero-banner-view.tsx`: branding/title/image/marquee slots; RSC reads excluded                                                                        |
| `M/_components/hero-banner.module.css`                      | `U/manage/hero-banner.module.css`                                                                                                                              |

**Publish:** shell background/layout values, collapsed/visibility/header height; resolved header zones/display preferences and real render-item slots (item + display mode), burger/user/spotlight/action nodes; hero brand and translated copy. Preserve missing-board disabled avatar, item ordering/keys and every HeaderItem branch in the retained wrapper until its exact native resources are joined. Do not substitute an arbitrary nav list. Keep floating intro 5,000ms/dismiss 900ms, cleanup, focus-within/coarse-pointer/reduced-motion behavior; shell 300px/sm nav, 60px visible header and background min-height.

**Excluded:** `layout/{header.tsx,navigation.tsx,navigation-link.tsx,background.tsx}`, `header/{burger.tsx,user.tsx,user-client.tsx,search.tsx,lazy-spotlight.tsx,docker-quick-access-modal.tsx,tour-target.tsx}`, `board/board-switcher.tsx`, `navigation/dynamic-breadcrumb.tsx`, `manage/{unsaved-changes-guard.ts,use-unsaved-changes-guard.ts,manage-page.constants.ts}`, `layout/constants.ts`; configurable-header settings/API/modal/assistant bindings and `HeaderItem` resource/controller branches; hero RSC translation/settings reads. Existing constants are not duplicated: coordinator publishes exact 60/52 and management 20/48/160 source constants through a dependency-light leaf or passes them explicitly.

**Dependency/hold:** `F/global-tools/{chrome.tsx,presentation-providers.tsx,source-providers.tsx}` are composition contracts, not source chrome replacements. Real navigation adapter, settings snapshot, board shortcuts (60s source freshness), board switcher preload, session/user menu, Docker/Assistant availability and spotlight/tour resources must be bound by their existing owners. Source CSS uses `rem()`, `$mantine-breakpoint-sm` and `@mixin dark/light`; preserve them and separately admit the host stylesheet pipeline. Next declares `postcss-preset-mantine`; the inspected Nitro/UI manifests do not. Do not flatten or restyle the CSS to evade that prerequisite. P1 does not claim the main shell mounted or complete.

## P2 — identity and durable settings controls

Own `U/identity-settings/contracts.ts` and:

| Original proposed presentation release              | New canonical target                                |
| --------------------------------------------------- | --------------------------------------------------- |
| `M/users/create/_components/stepper-navigation.tsx` | `U/identity-settings/stepper-navigation-view.tsx`   |
| `M/users/groups/[id]/_reserved-group-alert.tsx`     | `U/identity-settings/reserved-group-alert-view.tsx` |
| `M/settings/_components/setting-switch.tsx`         | `U/identity-settings/setting-switch-view.tsx`       |

**Publish:** exact previous/next/complete/pending and action/copy props; reserved notice rich content including original documentation link; switch checked/disabled/title/text/spacing and toggle action. Preserve loading/disabled navigation, create-another/reset vs list-return, title-click and switch-click behavior. The original generic BooleanKeys/form.setFieldValue binding stays in the wrapper; no UI import of `@homarr/form`.

**Excluded/reserved:** `users/create/_components/create-user-stepper.tsx`; `users/[userId]/general/_components/{_general-settings-form.tsx,_profile-avatar-form.tsx,_delete-user-button.tsx,_reset-tours.tsx,header-composer.tsx,header-composer.module.css}`; security `_change-password-form.tsx`; group `_rename-group-form.tsx`, `_delete-group.tsx`, `_transfer-group-ownership.tsx`, permissions `_group-permission-form.tsx`, settings `_group-home-boards.tsx`, membership `_add-group-member.tsx`/`_remove-group-member.tsx`; invites `_components/invite-create-form.tsx`; settings `_components/{settings-form.tsx,user-settings-form.tsx,culture-settings-form.tsx,appearance-settings-form.tsx,search-settings-form.tsx,board-settings-form.tsx,branding-settings-form.tsx,analytics.settings.tsx,crawling-and-indexing.settings.tsx}`. These are outstanding rich controls, not covered by three leaves.

**Dependency/hold:** reuse `F/identity/client.ts` (real IdentityAuthority, provider lists, ordered permissions, preferences) and `F/settings/client.ts` (SettingsAccess/read scope), plus reviewed hydration/data ownership. Native identity/profile/password/invite/home-board/tour writes and settings/theme/locale/document reconciliation stay separate. HeaderComposer's genuine dnd sensors/keyboard/order/preview require a separately admitted resource/source leaf; a select or ordered textarea is not parity. Passwords never enter query keys/cache/SSR; durable defaults/header/branding values remain canonical, not local success flags.

## P3 — apps, integration secrets and certificate surfaces

Own `U/connections/contracts.ts` and:

| Original proposed presentation release                                        | New canonical target / extraction                                                                                                   |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `M/apps/page.tsx`                                                             | `U/connections/app-item-view.tsx`: private `AppItem` only; list RSC, search schema, redirects/access and pagination helper excluded |
| `M/integrations/_components/secrets/integration-secret-card.tsx`              | `U/connections/integration-secret-card-view.tsx`: actual card/disclosure/cancel-success state, no dayjs/API DTO import              |
| `M/integrations/_components/secrets/integration-secret-segmented-control.tsx` | `U/connections/integration-secret-kinds-view.tsx`: supplied segment data/default selection/change action                            |
| `M/tools/certificates/_components/certificate-upload-form.tsx`                | `U/connections/certificate-upload-view.tsx`: exact embedded vs form render; validation/multipart/mutation excluded                  |
| `M/integrations/_components/test-connection/test-connection-certificate.tsx`  | `U/connections/certificate-details-view.tsx`: `CertificateDetailsCard` render only, resolved dates/open-PEM action                  |
| same preceding original                                                       | `U/connections/pem-content-view.tsx`: actual PEM content/copy/close render, not modal factory                                       |

**Publish:** app's displayed id/name/icon/description/href with already safety-checked URL and edit/delete nodes; secret kind icon/copy, explicitly public display value or redacted absence, updated/not-set presentation and awaited `onCancel(): Promise<boolean>`; certificate FileInput binding/error/pending/embedded/cancel/submit; certificate subject/issuer/full-long locale-formatted validity/serial/fingerprint and PEM content/close. Preserve line breaks/clamping, original external-link attributes, 44px edit target, public-only eye/reveal, no-secrets segment, cancellation refusing to close, embedded button type, PEM wrapping/copy and confirmation context. Never make redacted secrets readable to render the view.

**Excluded:** app `_app-delete-button.tsx`, edit `_app-edit-form.tsx`; source app-create/icon/upload forms retained under A06 C4; integration edit/new wrappers, `_components/secrets/{integration-secret-inputs.tsx,integration-secret-icons.ts}`, `_components/test-connection/{types.ts,integration-test-connection-error.tsx}`; `CertificateErrorDetails`, `getHeighestCertificate`, `PemContentModal` factory and all session/trust/upload handlers in the mixed certificate file; tools certificates add/remove/hostnames controllers. Search-engine `_form.tsx` remains a separate rich form obligation: generic/fromIntegration, icon selection, immutable short, description and actual selectable integrations cannot be replaced with URL fields.

**Dependency/hold:** reuse `F/apps/context.tsx`, `F/integrations/client.ts`, `F/certificates/contracts.ts`; publish their actual browser DTOs separately, including mapped error/certificate types. P3's projection is not a replacement API model. Native Q17/Q18 policies, server admin checks, certificate multipart and trust-host/self-signed writes remain held. Source trust confirmation must not be activated merely because an `onConfirm` exists. Date/dayjs presentation is supplied by existing caller until a separately reviewed dependency-light formatter exists. P1 collection frame is optional via child composition; no P3 target imports a P1 not-yet-frozen implementation.

## P4 — backup confirmation/progress and operations controls

Own `U/recovery-operations/contracts.ts` and:

| Original proposed presentation release                  | New canonical target / extraction                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `N/components/backup/dangerous-action-confirmation.tsx` | `U/recovery-operations/dangerous-action-confirmation.tsx`                                    |
| `N/components/backup/restore-confirmation.tsx`          | `U/recovery-operations/restore-confirmation-view.tsx`: translated copy supplied              |
| `N/components/backup/restore-progress-panel.tsx`        | `U/recovery-operations/restore-progress-view.tsx`                                            |
| `N/components/backup/backup-preview-panel.tsx`          | `U/recovery-operations/backup-preview-view.tsx`: display-only projection, no analysis engine |
| `M/tools/logs/font-size-slider.tsx`                     | `U/recovery-operations/log-font-size-view.tsx`                                               |
| `M/tools/logs/level-selection.tsx`                      | `U/recovery-operations/log-level-view.tsx`: caller supplies real ordered level labels/values |
| `M/tools/tasks/_components/tasks-table.tsx`             | `U/recovery-operations/task-status-badge-view.tsx`: `StatusBadge` only                       |

**Publish:** exact confirmation copy/icons/color/actions/disabled; active and `restoring|restarting|timedOut`, relogin/retry/reload; preview version/export date/entity rows/board names/migration counts; font size/value action; level options/current/change; badge enabled and actual running/idle/null status with copy. Preserve `I understand` trim/case-insensitive comparison, disabled cancellation, reduced motion, output live/atomic/busy semantics, correct count ordering, font range 10–24/step1 and null-status no badge. Retry on timeout means readiness observation, never replaying restore.

**Excluded:** `backup/{types.ts,use-backup-analysis.ts,database-restore-flow.tsx,migration-progress-panel.tsx}`, backup import/export cards, ZIP/WASM/migration/key/controller logic; logs `{client.tsx,terminal.tsx,log-context.tsx}`, task `createColumns`/cronExpressions/TimeAgo/focus-restoration/subscription/mutations, `F/operations/jobs.ts` (active owner remains exclusive). Do not copy encryptionKey or migration SQL into presentation props.

**Dependency/hold:** `F/backup/contracts.ts` explicitly has `apply:false, boardOnly:false`; its BackupInspection is not the original BackupAnalysis. A separately reviewed projection must preserve real supported inspection fields; missing counts/migrations cannot be filled with zero or fake readiness. `F/operations/client.ts` is the real jobs/status/log consumer seam. Restore/export/native restart/relogin and terminal/iterator lifetime remain separate; retain 256MiB limit and source 5s request/750ms poll/45s timeout at resource owner. Badge extraction does not port the MRT table, fourteen presets, focus return, history/order/retention/user-scroll/xterm appearance or Docker/Kubernetes screens.

## P5 — Custom Widget workbench presentation leaves

Own `U/custom-workbench/contracts.ts` and:

| Original proposed presentation release                     | New canonical target / extraction                                                                                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `M/custom-widgets/_custom-widget-form-layout.tsx`          | `U/custom-workbench/editor-section.tsx`: `EditorSection`; `U/custom-workbench/save-actions-view.tsx`: `SaveActions`; `U/custom-workbench/section-navigation-view.tsx`: actual section links, invalid set becomes prop |
| `M/custom-widgets/_custom-widget-form.module.css`          | `U/custom-workbench/custom-widget-form.module.css`: complete canonical CSS, including future pane/preview selectors                                                                                                   |
| `M/custom-widgets/_custom-widget-preview-status.tsx`       | `U/custom-workbench/preview-status-view.tsx`: `PreviewResult`, `PreviewStatusDot` only                                                                                                                                |
| `M/custom-widgets/_custom-widget-preview-size-control.tsx` | `U/custom-workbench/preview-size-control.tsx`                                                                                                                                                                         |
| `M/custom-widgets/_custom-widget-save-issues-alert.tsx`    | `U/custom-workbench/save-issues-view.tsx`: display issues projection, not save-error parser                                                                                                                           |
| `M/custom-widgets/_lazy-once-accordion.tsx`                | `U/custom-workbench/lazy-once-accordion.tsx`                                                                                                                                                                          |

**Publish:** section id/title/icon/children; dirty/savePending/previewPending/invalid/create-or-edit/onPreview; exact general/sources/requests/options/jsx/preview section IDs and invalid IDs; outcome/title/description; size value/change; actual issue path/message list and translated copy. Keep anchor semantics/scroll margins, submit vs preview exclusivity, accessible S/M/L labels, memoization, 2s copy feedback, first-open lazy mount then native hiding so editor history/effects survive. Preserve entire CSS 75em/100em pane layout rather than extracting misleading generic cards. `status.ready` here denotes local candidate validity only, not authorized native save/preview readiness.

**Excluded:** layout's `CustomWidgetSaveActions`, `CustomWidgetUnsavedChangesGuard`, `CustomWidgetOptionsSnapshotSync`; preview-status `getPreviewSummary`; `_custom-widget-form.tsx`, `_custom-widget-form-state.tsx`, `_use-custom-widget-form-analysis.ts`, `_custom-widget-value-equality.ts`, `_custom-widget-form-utils.ts`, `_custom-widget-save-errors.ts`; sources/requests/options/advanced-manifest/code/JSON editors, preview-action/panel and token-recipient controller. No import of these helper barrels into the new pure leaves.

**Dependency/hold:** reuse `F/widgets-editor/contracts.ts` actual CustomFormValues/PreviewCreated/WidgetEditorBindings; no changes to existing specialized inputs, allowlist, renderer registry or six mutable kind presentations. Source/option/request rename/reference preservation, AI diagnostics/sample response, draft/resource ownership, CodeEditor/CustomJsxRenderer, live vs simulated evidence and atomic save are separate reviewed resource joins. No synthetic preview success. Original remainder imports the single canonical CSS through a coordinator-owned export/consumer join.

## P6 — Assistant indicator and Workshop action/card views

Own `U/assistant-workshop/contracts.ts` and:

| Original proposed presentation release                   | New canonical target / extraction                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `N/components/assistant/assistant-dot-matrix.tsx`        | `U/assistant-workshop/assistant-dot-matrix.tsx`: actual full glyph/hash/render body                                    |
| `N/components/assistant/assistant-dot-matrix.module.css` | `U/assistant-workshop/assistant-dot-matrix.module.css`                                                                 |
| `N/components/workshop/workshop-submission-card.tsx`     | `U/assistant-workshop/submission-card-view.tsx`: resolved screenshot presentation, no Backend client                   |
| `N/components/workshop/workshop-submission-grid.tsx`     | `U/assistant-workshop/submission-grid-view.tsx`: explicit loading/failed/loaded state and caller-rendered real cards   |
| `N/components/workshop/workshop-vote-control.tsx`        | `U/assistant-workshop/vote-control-view.tsx`: score/own vote/pending direction/permission presentation and cast action |
| `N/components/workshop/workshop-report-form.tsx`         | `U/assistant-workshop/report-form-view.tsx`: controlled category/explanation/open/error/pending and action render      |

**Publish:** existing DotMatrixState/output props; displayed submission title/type/author/description/outdated/reportCount, resolved 600x400 screenshot URL/alt/actions; grid cols/ariaLabel/empty/retry/state/rendered cards; vote own `1|-1|null`, score, size/canVote/pending direction; original six report categories, explanation/error, submit/close/change callbacks. Preserve 168px preview, CSS/JSX no-photo treatment, warning badges, score colors/pressed states/loading direction, disabled-vote wrapper tooltip, report explanation trim length ≥3, collapse/form/close tree and source reset-after-confirmed-success ordering. DotMatrix keeps every glyph/state, deterministic timings, output label and reduced-motion CSS.

**Excluded:** Workshop card URL resolution, grid query/refetch bridge, vote queries/mutation/error feedback, report mutation/reset/notification; `workshop/{workshop-session.tsx,workshop-client.ts,workshop-publish-definition.ts,workshop-code-viewer.tsx,workshop-css-import-button.tsx,workshop-screenshots.tsx}`; browse/detail/publish controllers. Assistant provider/runtime/conversation/history/composer/message/tool/question/approval/browser-executor/refresh/configuration modules and panel CSS remain outside this small lease. A dot indicator is not a rich Assistant port.

**Dependency/hold:** `F/assistant/client.ts` retains held/available generation and genuine settlement; `F/workshop/client.ts` lacks full vote/report/account/comment/moderation/CSS/screenshot-authoring parity. These require separately reviewed native Workshop service/account and API models, not callbacks-as-auth. Pending grid skeletons are the source's six 320px placeholders **only during an actual query load**; unavailable/held transport must show its real unavailable state, never a forever-pending substitute. Screenshot lightbox has undeclared `@mantine/lightbox`; preserve 1200x800/192x128 variants, keyboard/loop/returnFocus/zoom in its held resource slice, not a plain image replacement.

## Coordinator-owned joins and complete residual disposition

This is a bounded first phase, not twelve domains declared finished. Every A01.json source row retains its preservation destination and blocker; only the exact render leaves above receive a replacement destination. All other rows remain **assigned preservation obligations under their existing audited producer/resource/router families**, not excluded product behavior. Before opening a next slice the coordinator must enumerate exact paths from those rows; no generic parent lease follows from this plan.

| Residual behavior                                                                                                                                                                                | Existing exclusive destination/owner; required join                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 61 pages, ten layouts, loading/error/not-found, pagination masking, group/user nav, workshop permanent redirect, return targets, focus/scroll/unload                                         | Router/source-route owner; per-route head/load/preload/recovery map from A01/A02; P1 frames do not absorb controllers                                                     |
| Root fonts/CSS ordering/custom branding CSS/RTL/theme, SEO flags, board title/favicon/viewport, manifest/static bytes, Next Image dimensions/layout, Crowdin/PWA, headers/CSP/proxy/setup gating | Document/assets/server-request owner per A01; preserve original semantics, no new browser principal or generated assets                                                   |
| Login/invite/init/claim/setup/auto credentials sign-in/logout/expiry and auth shells                                                                                                             | Existing auth/identity/onboarding families + A06 C6 + Q16 native authority owner; unpublished session/bootstrap fields block real joins                                   |
| Full user/group/invite/settings forms, durable home/search/header choices, media/icon/CSS/avatar/password/tours                                                                                  | Identity/settings/media plus A06 C4/C7; P2 exclusions stay explicit; header drag compositor needs separately reviewed declaration/resource ownership                      |
| App create/edit/delete/selection/quick-add; search engines; integration forms/access/test errors/secrets/certificate trust                                                                       | Existing apps/integrations/certificates + A06 C4 and Q17/Q18; source AppFormHandle async settlement, secret redaction and real confirmation/permission currentness remain |
| Board grid/focus/selection/portals/clipboard/collapse/rails/audio/settings previews; standalone widgets/specialized inputs                                                                       | Existing Board/A05/A13/Widgets owners; keep atomic-write holds and existing 23/95 boundaries; no mutable kind acceptance here                                             |
| Full structured Custom workbench/token recipient/import/source setup/publish preview                                                                                                             | Widgets-editor/Workshop/custom-widget native resource owners; P5 leaves do not replace editors or query/action authority                                                  |
| Rich Assistant messages/attachments/directives/branching/threads/human/browser tools/approval/telemetry/export/admin config                                                                      | Existing Assistant producer/resource + source-local rich presentation slice; no transcript textarea substitute or invented availability                                   |
| Workshop auth/votes/reports/comments/moderation/CSS/install/publish/screenshots                                                                                                                  | Existing Workshop/native service resource owners; P6 views consume only genuine outputs and confirmed outcomes                                                            |
| Backup analysis/migrations/apply/export/readiness/restart/relogin; logs/terminal/tasks/Docker/Kubernetes                                                                                         | Existing backup/onboarding/operations/Docker/Kubernetes resource owners; source native transport, fourteen task presets and ordered/disposable streams retained           |
| Eight-mode palette, tours, About hero/statistics/contributors/hotkeys; API/MCP/Scalar/key reveal/revoke                                                                                          | Existing Search/onboarding/global-tools/identity families and A06 C5/C7; their source views remain outstanding exact future slices, not generic chrome completion         |

Cross-cutting requirements:

1. Publish new explicit `@homarr/ui/source-views/<domain>` subpaths (coordinator owns six domain `index.ts` barrels and `packages/ui/package.json`; no broad root barrel expansion). Canonical moved CSS needing residual Next consumers gets an explicit CSS subpath and separately reviewed typings. No import from `apps/nextjs` in any browser target; no `../../features` or backend-private type imports in UI.
2. Rewire originals to extracted bodies with a single source of truth, preserving existing wrappers and contracts. CSS has one canonical source; all current consumers of a moved stylesheet require an exact coordinator-owned import-only manifest before deletion of its old location. No copy-plus-edit CSS fork. Frozen source deletion/move requires release; this plan itself does not grant it.
3. New props are presentation contracts, not substitute API contracts. Public client input/output, mapped certificates/errors, backup inspection projection, Workshop summaries/votes/reports, editor types and any missing stylesheet/form typings need independent review before adapters. Never use `any`, fabricate principal/admin/readiness or clear native holds.
4. Native resource/query/authority adapters stay with existing owners. Bind real generated oRPC options/keys and one lifetime-scoped Query client after the mutable adapter freezes; real Router Link/preload/loader refresh after Nav freezes. Retain canonical success/unknown outcome/currentness/cache retirement; callbacks do not authorize mutations, retries do not resolve ambiguous writes. No worker invents handwritten keys, API calls, no-op refreshes, readiness toggles or stores.
5. Local disclosure/timers/glyph/copy/first-open lifetime are presentation effects; network/search/auth/SQL/session/secret/upload/stream/resource ownership is not. Preserve original visual trees/CSS/motion/responsive/layout/head/image behavior. A meaningful original pending view may be retained, but not used to conceal an unimplemented native capability.

## Small next phase for Oracle

**Approve P1–P6 as leaf extractions only, initially prioritize P1's SectionCard/ManageContainer/ManageStickyFooter, P4's DangerousActionConfirmation and P6's DotMatrix.** Exact ready files:

- `U/manage/{section-card.tsx,manage-container.tsx,manage-sticky-footer.tsx,contracts.ts}` from the corresponding P1 originals.
- `U/recovery-operations/{dangerous-action-confirmation.tsx,contracts.ts}` from P4 original.
- `U/assistant-workshop/{assistant-dot-matrix.tsx,assistant-dot-matrix.module.css,contracts.ts}` from P6 originals.

These need no feature/API/Query/Nav/provider model; only declared UI dependencies and a source-release/export join. Keep all other lease files unopened for writing until exact contracts are reviewed. Coordinator first publishes `source-views/{manage,recovery-operations,assistant-workshop}/index.ts` and matching explicit package exports; the exact CSS import-consumer release is the DotMatrix blocker. UI already declares `@types/css-modules`: reuse that declaration, review any genuinely missing host typings separately, and do not claim new typings are necessarily needed. DotMatrix CSS uses native syntax and does not depend on P1's held PostCSS pipeline. No route/provider/client wiring is included. Review source-body preservation and old-wrapper reuse before advancing to the mixed-controller render extractions. Subsequent composition/runtime validation belongs to the coordinator after convergence, not this planning phase.

Evidence: safe reads of frozen audits, manifests/exports/declarations, named feature contracts and selected original source bodies. No product code writes, checks/lint/typecheck/build/install/tests, imports/evaluation, real environment/credentials/data reads, network/provider/SQL/browser use, Git mutation or nested agents. Only this plan was written.
