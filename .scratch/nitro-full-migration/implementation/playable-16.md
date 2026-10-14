# PLAYABLE-WAVE32 lane16: media

Status: reopened16's two exact preservation fixes are frozen and returned for rereview. Native upload/delete and authenticated transport/frame joins remain held; no full visual/native parity claim.

## Reopened16: exact two preservation fixes

Pre-edit write inventory: only `apps/nitro/src/features/media/manager.tsx` and this handoff. The other ten source-closure files remain frozen. Move existing filters/pagination into `toolbar`/`footer` props so the accepted P1 renderer controls placement/alignment; include the current validated URL page size in the selector while retaining existing labels, default options and event callbacks. No new frame or consumer-side reconstruction.

The actual assembly has no media namespace. `getPaginatedOptions` remains a required producer-supplied prop, not evidence of an assembled private client; the authenticated transport join remains held. No fake factory/client/principal is introduced. Existing authority/readOnly/lifetime/selection guards remain unchanged. Focused immutable-source/dependency checks passed; authoritative rereview hashes/raw logs follow below.

- Existing search form, all-user switch and page-size selector are passed unchanged into `toolbar`; existing result count and guarded Pagination are passed unchanged into `footer`. The P1 renderer now owns original slot placement/alignment. Upload/content/notice remain their existing nodes; no new frame.
- Selector data is `[...new Set(["10", "20", "50", "100", String(pageSize)])]`: original labels/default options/order and callbacks remain unchanged; validated current25 is present without duplicating standard values.

## Exact write inventory (recorded before implementation)

- `apps/nitro/src/source-ui/media/contracts.ts` (new display-only contracts)
- `apps/nitro/src/source-ui/media/media-actions.tsx` (new original compact copy/open/held-delete controls)
- `apps/nitro/src/source-ui/media/media-table.tsx` (new original table/creator/preview tree)
- `apps/nitro/src/source-ui/media/media-management.tsx` (new media slots delegated to accepted P1; no repeated frame)
- `apps/nitro/src/source-ui/media/index.ts` (new named exports)
- `apps/nitro/src/features/media/manager.tsx` (adapt existing controller to original presentation/generated query options)
- `apps/nitro/src/features/media/gallery.tsx` (delegate list to original tree; retain accepted gallery/controller)
- `apps/nitro/src/features/media/upload-form.tsx` (restore original FileButton chooser; retain held local validation/previews)
- `apps/nitro/src/features/media/index.ts` (publish composition)
- `apps/nitro/src/features/media/contracts.ts` (remove backend type graph from browser-only display/bindings; preserve the actual read shape as structural inputs, with no new transport implementation)
- `.scratch/nitro-full-migration/implementation/playable-16.md` (this handoff)

Original Next sources, accepted P3 leaves, shared forms/modals lane24, manifests/routes lane01 and every backend path remain read-only. No children, Git changes, tests, comments or unsafe casts.

## Sources and frozen prerequisites

Read PLAYABLE-WAVE32 including Oracle amendments. Read original `apps/nextjs/src/app/[locale]/manage/medias/page.tsx`, its four `_actions`, `packages/forms-collection/src/upload-media/upload-media.tsx`, original icon picker and accepted P3 source/published contracts. P3 contains connection/certificate controls, not media leaves; it is not duplicated or repurposed into a media upload form. Shared icon picker remains lane24-owned.

Only declared React, Mantine core/hooks, Tabler and TanStack Query may be runtime imports. Installed Mantine 9.6.0 declaration/implementation review will precede edits. No active peer module is consumed as accepted. The new props-only view permits explicitly labeled synthetic display rows without a synthetic principal or native proof. Existing principal-filtered controller remains distinct.

## Implemented source mapping

| Original source                                                               | Frozen owned implementation                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manage/medias/page.tsx:114–139,150–200`                                      | `source-ui/media/media-table.tsx`: original 680px scroll container, striped/highlight table, visually hidden preview/action headers, 64px contain previews, name/size/creator/action columns, keyed rows. Creator avatar/name restored; `renderCreator` preserves the real caller's UserAvatar settings and Router link without importing its mutable provider closure.                                     |
| `_actions/copy-media.tsx:24–33`                                               | `source-ui/media/media-actions.tsx`: original gray/teal subtle ActionIcon, 16px/1.5 copy/check glyphs and delayed named Tooltip. The original CopyButton glue is replaced by an awaited Clipboard call so only a real successful copy reports success, with explicit failure feedback.                                                                                                                      |
| `manage/medias/page.tsx:184–196`                                              | `media-actions.tsx`: original subtle gray external-link ActionIcon, named tooltip, `_blank` and `noopener noreferrer`. URL stays caller-owned.                                                                                                                                                                                                                                                              |
| `_actions/delete-media.tsx:26–38`                                             | `media-actions.tsx`: original red subtle trash affordance, explicitly labeled unavailable. It only opens hold details and a disabled delete button, never a confirm callback or mutation. Owner/full-all/read-only decisions remain in existing `features/media/access.ts`.                                                                                                                                 |
| `_actions/upload-media.tsx:16–23` and shared UploadMedia `:33–55`             | `features/media/upload-form.tsx`: original FileButton render-function chooser and upload glyph. Existing accepted multipart preparation/local schema validation, filenames, byte sizes, supported MIME accept list, object-URL previews/revocation and clear controls remain. All backend callbacks and success notifications are deliberately absent; chooser reset permits selecting the same file again. |
| `_actions/show-all.tsx` and `manage/medias/page.tsx:39–83,97–110,204–211`     | `features/media/manager.tsx`: retained search/page/page-size/all-users controller, list as original default, optional gallery/selection retained. Router glue becomes `initialInput` plus `onInputChange`, with page reset on filters and out-of-range page correction. Reads use generated options from the caller, not a handwritten key/client query function.                                           |
| Accepted P1 `packages/ui/src/source-views/manage/manage-page-layout-view.tsx` | `media-management.tsx`: media notice/content and title/action/toolbar/footer slots delegated to required `renderLayout`. The accepted frame is consumed by the caller, not extracted again. Actual ManageContainer, breadcrumb and mobile floating action belong to lane05/01.                                                                                                                              |

P3's published controls apply to connections/certificates, not this media source; no P3 bodies were re-extracted. Shared rich icon picker repository/direct-URL/search/controller remains lane24-owned; this lane publishes local media selection `{id,url}` for that frozen consumer join only.

## Immediately mountable exports

Public local entry: `apps/nitro/src/source-ui/media/index.ts`.

- `MediaManagementView(props: MediaManagementViewProps)`: required `renderLayout(slots: MediaManagementLayoutSlots)`, `children`; optional `title`, `primaryAction`, `toolbar`, `notice`, `footer`. Actual P1 renderer receives media slots. No local management-frame fork exists.
- `MediaTable(props: MediaTableProps)`: `items`, `createLocalImageUrl(id)`, `formatSize(size)`, `canShowDelete(media)`, `deleteUnavailableReason`; optional `selectedId`, `onSelect({id,url})`, `renderCreator(creator)`.
- `MediaPreview(props: MediaPreviewProps)`: `media:{id,name}`, actual `url`, optional `height` and numeric or `100%` width; image failure remains visible.
- `MediaActions(props: MediaActionsProps)`: actual media/url, `canShowDelete`, hold reason, optional controlled selection/callback.

`MediaDisplayItem` is an explicitly display-only structural projection of actual paginated output: `id`, `name`, `size`, nullable `creatorId`, nullable creator `{id,name,image,email?}`. It is not a generated transport contract, a principal, or mutation authority.

Public controller entry: `apps/nitro/src/features/media/index.ts`.

- `SourceMediaManager`: requires `getPaginatedOptions(input)`, actual `principal`, actual `authorityRevision`, original `bindings`, accepted P1 `renderLayout`; optional `readOnly`, `onSelect`, `byteUnitSystem`, `renderCreator`, validated `initialInput`, Router-owned `onInputChange`. Generic error/key/page parameters preserve producer option types rather than erasing tagged query keys. Actual assembly has no media namespace, so private controller mounting remains held until a genuine generated producer is admitted with real authenticated scope. The required prop is not a fabricated private client. Anonymous props do not query. Authority/filter changes reset selection; no synthetic identity is constructed.
- `SourceMediaGallery`: retains permission-filtered list/gallery rows and selection, now delegates original table/actions; accepts actual byte-unit preference and creator renderer.
- `SourceMediaUploadForm`: actual schema/MIME/format bindings, `multiple`, `disabled`; no principal or transport callback required for local-only preview. `prepareSourceMediaUpload` remains exported.
- `sourceMediaMutations`: exact upload/delete paths and hold reasons unchanged.

The old `SourceMediaClient` export remains a read-only structural compatibility projection of the source read method, not an assembled client; it is no longer used by the manager. Browser contracts no longer import server/router/DB/auth type graphs. Validation bindings call the real supplied schema's `safeParse`, not a recreated validator. The real formatter retains the optional binary/decimal unit parameter. No copied backend declaration or assumed API output beyond the visible projection is introduced.

## Lane01 declaration/mount requests and held joins

- Runtime dependencies are already declared: React19.2.7, Mantine core/hooks9.6.0, Tabler catalog (installed3.44.0), TanStack Query5.101.2. No new runtime dependency or lock change requested. P1 management's public export is still absent in the inspected UI manifest: request01 to publish its accepted `ManagePageLayoutView` and types via a narrow entry, then supply it through `renderLayout` (or use lane05's frozen composition). No undeclared deep import was added. External installed APIs were read directly because this wave declares Context7 quota exhausted.
- Mount `/manage/medias` only after lane01 snapshot inclusion. For immediate3210 feedback, compose `MediaManagementView` + `MediaTable` with **visibly labeled synthetic display data** and no fabricated principal; `canShowDelete` is presentation-only and never enables a mutation. Actual private reads require lane02's frozen generated options and established real principal/scope. Do not adapt fixture rows into an authenticated SourceMediaManager.
- Supply source validation/MIME/URL/byte-format bindings from frozen originals or accepted public producers. Bind `byteUnitSystem` from real user settings, not guessed preferences.
- Supply real creator UserAvatar/Router link in `renderCreator`, preserving original `/manage/users/<id>/general` destination and authorized settings. Default pure view preserves available avatar/name but deliberately does not fabricate Gravatar preference or navigation. No shared form/modals import is admitted until lane24 returns frozen.
- Parent management frame/breadcrumb/mobile floating primary action and source localization binding remain lane05/01 consumer composition. No route, server, browser screenshot or mounted-runtime parity is claimed by lane16.
- Native upload/delete remain absent and visibly held. Private binary URL hosting is lane01/backend composition's separate hold; the preview leaf cannot make a missing image endpoint available. No fake progress, fake upload success, delete execution, no-op refresh, request principal, credentials, production authority or backend call was added.

## Focused validation

Final frozen snapshot passed strict no-emit TypeScript7.0.2 and oxlint1.73.0 (197 rules, 11 files, zero warnings/errors). Snapshot contains only both owned media directories, copied `.oxlintrc.json` and recursively copied installed external dependency packages, with no symlinks or workspace packages. Checks use Node24.18.0, `env -i`, disposable HOME, no dotenv, no emit/cache/build/servers/network/tests/provider/SQL/Git. Final runtime/browser integration belongs to01.

- Final snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable16-media-frozen-ce736jfj`.
- Frozen owned source closure SHA256: `7fae8d03b974679fc03f4165b4d63a383bbcab62d42c7cec6aee1b6e3339fc71`. Digest is SHA256 of compact sorted JSON mapping all eleven owned closure paths to their SHA256; existing unchanged `access.ts` is included as a dependency, not an extra write.
- Lint invocation: `node node_modules/oxlint/bin/oxlint --config .oxlintrc.json --max-warnings 0 apps/nitro/src/features/media apps/nitro/src/source-ui/media`; final exit0, 137ms, zero warnings/errors.
- Types invocation: `node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2023 --lib ES2023,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --jsx react-jsx --esModuleInterop --types react,react-dom apps/nitro/src/features/media/index.ts apps/nitro/src/source-ui/media/index.ts`; final exit0.
- Both commands use `env -i`, the explicit `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`, and snapshot-only working directory/HOME. There are no active peer source/module imports in the checked closure. No agent child, Git write, installation, new test, protected output, environment credential or runtime listener was used.

## Reopened16 authoritative rereview receipt

- Immutable copied source/dependency snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable16-twofix-o4cwxkwc`. Dependencies/config and the ten frozen source files were copied from the previous frozen snapshot, not mutable peer sources. Only `manager.tsx` was replaced with the two-fix candidate. No symlinks, installs, new tests, children, Git, backend, network or runtime operations.
- Before edits all eleven closure files matched previous closure `7fae8d03b974679fc03f4165b4d63a383bbcab62d42c7cec6aee1b6e3339fc71`. After checks all eleven files match the checkout; the other ten remain byte-identical to that baseline.
- New `manager.tsx` SHA256: `4de986f7a21eb76bc34f892cbc55e7db0a77d40c8051272034728ce6c0545999`.
- New eleven-file source closure SHA256: `4e0d6a8aee743ed6b265aaca2ba15f74050e8c0e0c479e61d42cc585a18f6c2b`, using the same compact sorted path-to-SHA256 JSON algorithm as the baseline.
- Preservation comparison: existing toolbar/footer bodies match after whitespace normalization and relocation, with only the requested selector-data replacement. All pre-render principal/authority/controller guard bytes match exactly. Callback bodies, page correction/selection reset, private-read prop, disabled mutation behavior and readOnly guard are retained.
- Both real lint/types commands above ran in this new snapshot with Node24.18.0 and an empty child environment except disposable `HOME` and explicit Node/system `PATH`. Lint exit0; types exit0. TypeScript remains strict/noEmit/skipLibCheck with no stubbed types; no emit/cache/build outputs.

Raw logs retained in the new snapshot:

| File                   | Bytes | SHA256                                                             |
| ---------------------- | ----- | ------------------------------------------------------------------ |
| `lint.stdout.raw.log`  | 94    | `15f89510e4ca802c1f878d45feacffe46b23aec1828eee778b3737273b789ffe` |
| `lint.stderr.raw.log`  | 0     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `types.stdout.raw.log` | 0     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `types.stderr.raw.log` | 0     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Raw lint stdout:

```text
Found 0 warnings and 0 errors.
Finished in 160ms on 11 files with 197 rules using 16 threads.
```

Return is for source-preservation rereview only. No mounted UI/browser comparison, full visual parity, assembled media transport, native upload/delete or publication authority is established by these checks.
