# Media native preparation — frozen for review

Consumes the accepted source-port v2 procedure/contribution spine, Auth policy snapshot primitive, and Foundation Bun r2 request type/lifetime shapes. Persistence r3 is accepted infrastructure, **not** an accepted media/local-icon domain transaction plan. This contribution is unmounted preparation; #113 is not complete.

## Exact disposition

| Source identity      | Executable native disposition | Conservation                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `media.getPaginated` | One unmounted native query    | Protected, source demo metadata, default owner-only. All-user opt-in applies only with `media-view-all`; absent permission falls back to own rows, not FORBIDDEN. Byte column excluded, exact creator id/name/image/email projection, descending creation time, original count/page/size/offset. No source REST or MCP metadata exists or is invented. |
| `media.uploadMedia`  | Absent, pending               | Actual source permission-before-input-read preparation and validated File-to-byte/row mapping are ported. No mutation registration, media insert, icon insert, partial success or callback controller exists. Requires accepted concrete dual-engine atomic media plus optional local-icon insert algorithm.                                           |
| `media.deleteMedia`  | Absent, pending               | Source creator-or-`media-full-all` authorization helper is ported, with no implicit admin grant and source missing NOT_FOUND versus existing unauthorized FORBIDDEN asymmetry. No delete registration or partial SQL writes exist. Requires accepted concrete dual-engine atomic media plus matching local-icon deletion algorithm.                    |

`mediaSourceBindings` contains the three exact original identities and `packages/api/src/router/medias/media-router.ts`. `createMediaContribution` invokes `defineBackendContribution(v2)` with `{ media: { getPaginated } }` and only that implemented leaf. Neither mutation is a callable placeholder. Checks conserve all three identities and reject a misnamed nested contribution. Global inventory/registration is untouched.

## Actual functions and resources

- `packages/api/src/nitro/routers/media.ts`: `createMediaProcedures` and `createMediaContribution`; actual source listing SQL body, not a legacy caller or catalog service callback.
- `routers/-media/resources.ts`: injected source `medias` table and exact `and`/`desc`/`eq`/`like` signatures plus mandatory tracked `acquireReadAsync(context)`. Lease exposes server-local DB/current principal, currentness assertion and release. Authentication precedes acquisition; identity mismatch or revoked authority cannot query. Current permissions are snapshotted through the accepted public Auth policy primitive. Currentness/cancellation are checked before SQL, between list/count, after SQL and after release. All paths release in finally.
- `routers/-media/upload.ts`: `prepareMediaUploadAsync`; authenticates, requires `media-upload` and enforces source read-only demo guard before invoking the input/body resource. The unchanged public `mediaUploadSchema` validates the whole File group before any `arrayBuffer` read. Real bytes are read into Buffer rows preserving source ID, creator, filename, MIME, size and content. ID generation is injected with the source generator signature. Reads are sequential, not a claimed aggregate memory bound. No persistence or local-icon algorithm is hidden inside this function.
- `routers/-media/delete-authorization.ts`: `assertMediaDeletionAuthorized`; exact source existence/grant distinction, suitable for the future transaction owner's actual selected media evidence, not an endpoint or repository replacement.

### Exact source schema restored after review

The native input now uses the exact source `paginatedSchema.and(z.object({ includeFromAllUsers: z.boolean().default(false), search: z.string().trim().default("") }))`. This retains the original defaults, trim declaration and observable intersection failures: installed Zod 4.4.3 throws `Unmergable intersection. Error path: ["search"]` for padded text. The earlier `.extend` repair was rejected by independent review and removed; no repair or silent normalization is applied. The existing padded-search check now verifies that rejection before SQL or lease acquisition, while listing/count/page evidence uses source-valid `search: "match"`. Original validation and router sources remain untouched.

### Validation and local icon ownership

The existing `@homarr/validation/media` schema still supplies PNG/JPEG/WebP/GIF/SVG acceptance and **32 MiB per file**. No accepted total bytes/count/concurrency/multipart scheduling policy is inferred. The future host must supply untouched FormData/File input, cancellation and bounded request ingestion before executing anything. This preparation does not parse request multipart bodies itself and does not claim that the per-file schema protects an unbounded request body or aggregate allocation.

`@homarr/icons/local` is publicly declared at `packages/icons/src/local.ts`, currently forwarding to the active `packages/icons/src/repositories/local.icon-repository.ts`. The latter currently supplies `createLocalImageUrl`, `mapMediaToIcon` and `LOCAL_ICON_REPOSITORY_SLUG`. The exact paths were flagged in the session. **No icon source, normalization, checksum, local mapping, repository helper, job body, icon router or check was copied, modified or consumed by a new media write here.** Concrete atomic mutation work must consume that owner's reviewed public helper; it must not duplicate its MD5/name/URL behavior or remove only media rows first. Source deletion matches icons using the existing local URL identity, not a newly invented URL rewrite or delete-all repository operation.

## Binary preparation and execution hold

Source is `apps/nextjs/src/app/api/user-medias/[id]/route.ts` (H19), independent of authenticated listing. `packages/api/src/media-runtime/binary.ts` exports:

- `mediaBinaryDisposition`: explicitly held on sanitizer declaration and real Bun proof.
- `mediaBinaryDescriptor`: immutable Foundation phase/path/descendant/public access **metadata only**, including frozen access. Deliberately has **no `handle`**, so it is not a runnable FetchContribution and cannot accidentally satisfy host registration.
- `readMediaBinaryResponseAsync`: actual source bound-ID SQL query selecting **content and contentType only**, through a tracked server-local read lease. Request parameters and If-None-Match are captured before awaiting resources. Source anonymous lookup is preserved: no new login gate, public-board fallback, principal catalog grant or broad read-all authorization is applied. Missing image becomes a native 404 Response, not a Next application notFound exception. DB is never exposed to a browser or obtained from client SQL input.

`packages/api/src/media-runtime/response.ts` contains the actual source `hasMatchingMediaValidator` state machine and `createMediaBinaryResponse` domain response assembly:

- Non-SVG Buffer bytes remain byte-for-byte identical, including non-UTF8/NUL values; no text decode/reserialize, URL rewrite or icon normalization.
- `image/svg+xml` **and** legacy `image/svg` require the explicit `SanitizeSvg` primitive and sanitize decoded bytes with `{ USE_PROFILES: { svg: true, svgFilters: true } }` **before** hashing/serving. Missing primitive throws `MediaSvgExecutionHeldError`, including conditional requests; no fake sanitizer or unsafe original-byte SVG fallback is provided.
- SHA256 base64url ETag remains quoted. Strong/weak/list/star matching uses the complete source parser, rejecting malformed/trailing syntax even after a prior match.
- 304 has null body and no Content-Length. 200 returns exact actual byte length and stored content type. Both retain `private, no-cache`, source sandbox CSP (`default-src 'none'; style-src 'unsafe-inline'; sandbox`) and nosniff.

`SanitizeSvg` is a **candidate typed primitive**, not effective sanitizer proof, an accepted security controller, or permission to execute native SVG/binary routes. No installed sanitizer runtime was imported or called in this lane. The entire native binary Fetch join remains held; non-SVG domain response checks are offline only. The descriptor does not invent a host application plugin or a new public mount.

The request context structurally consumes the existing Foundation request/signal/onDispose boundary; no application-internal imports or alternative listener exist. The accepted same-listener signal must carry request disconnect/shutdown/deadline cancellation. Read leases settle/release before a buffered response is returned; post-release cancellation is checked. The actual host owns response-body consumption/disposal, route ID decoding, bounded deadlines and generic HTTP error handling. Those joins were **not** tested by direct Response helper calls. No independent timer/deadline claim or long-lived DB handle is added. Currentness/admission callbacks must be the actual resource owner's tracked implementation, not no-op production callbacks.

## Exact dependency and composition requests

1. COMPOSITION alone may declare `isomorphic-dompurify` as a direct `@homarr/api` dependency using the existing source catalog version **3.18.0**. Presently only `apps/nextjs/package.json` declares it. The hoisted installation and its public `dist/index.d.mts` sanitizer types were inspected, but hoisting is not API ownership and declaration alone is not Bun compatibility. No wide-path import of Next/source/node_modules was added.
2. After declaration, a separate approved proof must import the engine from its public package entrypoint on actual Bun and exercise malicious modern/legacy SVG, source profiles, sanitized-before-ETag bytes and security behavior. Only then may the sanitizer primitive and runnable binary `handle`/GET matcher be joined on the accepted Foundation listener. No fallback sanitizer or asserted proof token is supplied here.
3. Publish the narrow media router and media-runtime exports only after review. No package manifest/global API barrel/source-port map/host route was edited. Existing API declarations already include `@orpc/server` beta.43, Zod, Auth/DB/validation workspace packages and check-only Drizzle/Bun types; no extra dependency was introduced for this preparation.
4. Supply tracked read admission/current-principal leases with coherent source table/operator/driver bindings. Accepted r3 transaction types do not provide the domain algorithm for atomic optional-icon upload and authorized icon cleanup. SQLite synchronous transaction bodies and PostgreSQL same-checked-out-session atomic bodies remain a **feature-plan** join, not a type assertion in these files.

## Scoped verification

`bun --no-env-file packages/api/src/nitro/checks/media.mts` passes against a **fresh in-memory SQLite fixture**, generated bytes and native Drizzle with real public `sqliteSchema` bindings. Only the two needed media/user tables are created. The connection closes in finally. No current data/file store, environment, credentials, provider, network, paid call, browser, 3100/3200 listener, container, Nitro build, backup or historical database is used.

The tiny approved critical check verifies:

- Exact source identity/kind/access and source's absence of REST/MCP projection metadata; both mutation properties absent.
- Denied anonymous and pre-aborted listing cause zero queries/lease acquisition. Revoked read authority causes no SQL and releases its lease.
- Default own rows, insufficient-grant all-user fallback (including admin alone), privileged explicit opt-in, source byte exclusion/exact creator projection, descending order, source-valid search/count/page results and orphan creator null behavior. Padded search preserves the source intersection failure before SQL or lease acquisition.
- Upload helper denies before body input, maps actual generated File bytes/metadata after the original validator, and source deletion helper preserves missing/unauthorized distinction without implicit admin grant. These are helper checks, **not** atomic mutations.
- Source strong/weak/list/star ETags and malformed syntax, exact non-SVG bytes/metadata/headers, 304 body/length removal, 404 and missing-SVG-primitive hold.
- Actual binary query content/type-only projection and anonymous domain retrieval through native fixture SQL, then lease release. No SVG sanitizer test is marked passed and no host binary execution is claimed.

Scoped oxlint, oxfmt and strict installed TypeScript 7.0.2 explicit-root checks pass on the seven owned source/check files. The check alone adapts Drizzle's Bun `void` run-result declaration to the frozen source `Changes` Database type; this is a test fixture annotation, not a production dual-engine/transaction adapter. Production DB imports are type-only and injected resources supply the real queries. Context7 was attempted and quota-blocked; official oRPC procedure documentation plus installed beta.43/Zod declarations and the accepted spine were checked.

Remaining: narrow re-review of the restored source schema and existing check; actual API sanitizer declaration/Bun proof and binary same-listener/body lifetime; genuine both-engine tracked host SQL/current authority; concrete atomic media/local-icon plans; durable full-model media/reference restore; upload/select/manage UI and form consumers; authorized errors/refresh/navigation; Q16 real auth closure. All other bounded-reviewed media code, prior app/search and UI/form preparation remain untouched and frozen. No staging, commits, branches, worktrees or nested agents were used.
