# EXPANSION35: source media frontend

## Scope and admission

New isolated frontend: `apps/nitro/src/features/media/`. No route, shared provider, backend, authentication, manifest, database schema or legacy source changes. No native SQL peer activation.

Frozen source: `packages/api/src/nitro/routers/media.ts` admits exactly `media.getPaginated`. Its `media.uploadMedia` and `media.deleteMedia` bindings remain pending. The feature accepts only the admitted typed query client. Neither pending mutation has a callable client member, transport, endpoint string, optimistic success or fabricated ID. An eligible owner can inspect delete unavailability but cannot delete. Upload supports local file selection and validation only. No network upload, upload completion or upload percentage is claimed.

## Frozen public APIs

- `SourceMediaManager({ client, principal, authorityRevision, bindings, readOnly?, onSelect? })`: authenticated source listing, explicit filename search, page sizes 10/20/50/100, page correction, gallery/list switch, permission-gated all-user switch, error/retry and optional icon selection.
- `SourceMediaGallery({ items, bindings, principal, readOnly, view, includeFromAllUsers?, selectedId?, onSelect? })`: stored-image previews, filename/size/creator name, URL copy/open, optional icon selection and source-authorized delete unavailability. Creator email/image are not rendered. Non-own rows are also filtered out locally unless the explicit all-user flag and the current source grant both allow them. The gallery must receive items from the current admitted query, never a pooled cross-authority cache.
- `SourceMediaUploadForm({ bindings, multiple?, disabled? })`: local-only file selection, validation, bounded image previews, clear and unavailable upload control. `multiple` defaults to true; false preserves the source single-file picker use case. It returns no uploaded media.
- `prepareSourceMediaUpload(files, bindings)`: `empty | invalid | ready`. Ready carries the original multipart `FormData` and original files, not server results.
- `SourceMediaClient.media.getPaginated`: `RouterClient<Pick<ReturnType<typeof createMediaProcedures>, "getPaginated">>`, with the actual native input/output inferred rather than restated.
- `SourceMediaBindings`: the exact source `mediaUploadSchema`, `supportedMediaUploadFormats`, `byIdSchema`, `createLocalImageUrl` and `formatBytes` functions/values supplied by composition. These are required bindings, not replacement validation or URL algorithms. The delete schema is frozen for the missing `{ id: string }` mutation and is not executed as a mutation.
- `SourceMediaSelection`: `{ id, url }` from a returned item and `createLocalImageUrl(id)`, compatible with an icon field. Selection does not insert icons or persist board/app fields.

All contracts are exported from `features/media/index.ts`. English feature-local labels avoid assuming an admitted translation provider; localized shared copy is a separate composition task.

## Source semantics and privacy

Authenticated users may query their own media. `includeFromAllUsers` becomes true only when the current native principal explicitly includes `media-view-all` and the switch is enabled. Upload eligibility requires `media-upload`; delete eligibility requires ownership or `media-full-all`. Read-only state disables write eligibility. There is no client-side admin shortcut, parent-permission expansion, inferred grant or synthetic session. Native policy/lease checks remain the authority.

The required `authorityRevision` must be a nonsecret composition-owned revision that changes on session/authority transitions. User ID, current permissions and read-only state also partition the query and remount local selection/file state. Query cancellation passes its signal directly to oRPC and checks it again before returning. Cache collection is immediate after observer release, retries are disabled, and no previous-page placeholder data is shown. Composition still owns session-wide query clearing and invalidation. Do not put session cookies, API keys, raw tokens or creator emails in the revision.

Source local icon URL semantics remain `/api/user-medias/<id>` through the provided source helper. The UI does not reimplement `mapMediaToIcon` or create checksums, repository rows or icon IDs. Those are server-side physical coupling. Returned creator names are displayed; emails, avatar URLs and raw error details are not surfaced.

## Multipart bytes and preview lifetime

Preparation appends each original `File` under the repeated `files` key with its original filename. It does not normalize non-ASCII filenames, rasterize SVGs, strip animation, read/encode bytes as JSON/base64 or replace file content with preview data. Validation calls the exact source FormData schema: PNG/JPEG/WebP/GIF/SVG, at most 32 MiB per file. Empty selections are not prepared for submission. The source schema remains unchanged, including its existing batch/empty-file semantics.

Per-file preview eligibility uses that same schema. Object URLs are created only in client effects after validation and revoked on replacement, clear and unmount. A changed file cannot temporarily display the previous file's object URL. Image errors show an unavailable preview; SVGs are displayed through `img`, not inserted as HTML. Original bytes are retained even when a preview fails. Files stay local because no upload route is admitted.

Preparation/validation errors, stored-preview errors, clipboard failures and query failures have distinct visible states. Query refresh uses an actual pending indicator. Upload is always unavailable, so there is no fabricated transferred-byte counter, progress timer, completion notification or implicit retry.

## Required server physical coupling

1. Admit a real native upload procedure/endpoint before changing upload availability. It must consume the original FormData/native body, use the source schema and `media-upload` guard, allocate actual server IDs, persist original media bytes/name/type/size/creator and conditionally create local repository icons from `mapMediaToIcon`. Atomic dual-engine media/local-icon writes and current-authority checks are prerequisites, not frontend assumptions. Only actual returned `string[]` IDs may produce uploaded `{ id, url }[]` or trigger list/icon invalidation.
2. Admit native delete before exposing confirmation/submission. Reuse `byIdSchema`, return the source void result, enforce ownership or `media-full-all`, return NOT_FOUND/FORBIDDEN honestly, and atomically remove media plus every icon matching `createLocalImageUrl(id)`. Failure must never remove a row optimistically or report success. No automatic mutation retries.
3. Provide the real native image delivery at the source local URL before claiming gallery delivery complete. The currently inspected image route is Next-owned: `apps/nextjs/src/app/api/user-medias/[id]/route.ts`. Preserve SVG sanitization, private/no-cache semantics, validators, CSP sandbox, nosniff and source visibility rules without making the frontend an authorization mechanism. Until native delivery exists, stored previews/open links can fail and report preview unavailability; no proxy or alternate endpoint is invented here.
4. Direct upload transport must target that admitted endpoint with FormData/native body, not legacy tRPC or invented upload paths. Do not manually set a multipart Content-Type boundary. Couple cancellation to authority/unmount, show only observed byte progress when supported, otherwise honest indeterminate pending state, and distinguish transfer completion from successful server persistence. These transport/success APIs are deliberately not callable in this expansion because there is no admitted mutation contract.

## Coordinator dependency and composition handoff

The Nitro manifest currently declares React, Mantine, TanStack Query, oRPC and Zod but no Homarr workspace dependencies. Runtime feature code only imports already-declared libraries. Frozen source references in `contracts.ts` are type-only relative imports, following existing isolated Nitro feature conventions; they do not bundle backend procedures, SQL resources or Node crypto into the browser. Runtime helpers/schemas arrive through required typed bindings.

Composition will require admitted workspace edges for `@homarr/api` (principal/query contract), `@homarr/validation` (shared upload/delete schema), `@homarr/common` (byte formatting) and `@homarr/icons` (local image URL semantics), or existing explicitly admitted bindings. `@homarr/api` currently does not export `./nitro/routers/media`, so a package-level contract export is also a coordinator task. `@homarr/icons/local` currently re-exports a module importing `node:crypto`; do not value-import it into the browser merely to obtain `createLocalImageUrl`. An admitted browser-safe helper binding/export is required. No undeclared Tabler, translation, form or legacy API dependency was introduced.

The coordinator must mount the feature inside its existing Mantine/QueryClient composition with the real current principal, typed admitted media query client, changing nonsecret authority revision and exact source helper/schema bindings. No shared provider or route was edited here.

## Reference and verification boundary

Source UX, permission conditions, validation and icon mapping were read before implementation. Current Mantine FileInput/SegmentedControl/SimpleGrid/Progress and oRPC client/RPCLink docs were consulted after Context7 reported a quota limit:

- https://mantine.dev/core/file-input/
- https://mantine.dev/llms/core-segmented-control.md
- https://mantine.dev/llms/core-simple-grid.md
- https://mantine.dev/core/progress/
- https://orpc.dev/docs/client/client-side
- https://orpc.dev/docs/rpc/link

No tests were added. No build, install, runtime SQL, provider/env setup, listeners, browser, Git or nested agents were run. Functional native mutation/image delivery remains blocked on real server admission, not asserted complete.

Repository-required lint/typecheck were attempted despite the expansion's requested check-command exclusion. Targeted feature lint passed after correcting semantic-output and immutable-sort warnings. The Nitro project typecheck remained blocked before feature validation by TS1005 in the concurrently edited `apps/nitro/src/features/apps/search.tsx:38`. That peer was not inspected or changed; coordinator validation is still required.
