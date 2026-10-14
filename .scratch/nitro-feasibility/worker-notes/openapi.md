# AJN-504 REST/OpenAPI handoff

**Editing-complete; owned lane relinquished.** Same worktree and branch. No shared contracts, board-read procedure/service, implementer, guards, router, entrypoints, registrations, manifests, lockfile, render/session/widget/editor/packaging files, Linear, roster or planning documents were edited. No commits, installs, server, ports, database, build outputs, browser probe, lint/typecheck or test files.

## Changed paths

Relative to `apps/nitro-experiment/`:

- `src/server/rest/handlers.ts`
- `src/server/rest/router.ts` (new)
- `src/server/rest/document.ts` (new)
- `src/features/api-docs/api-docs.tsx`
- `src/features/api-docs/reference.ts` (new)
- `src/features/api-docs/document.tsx` (new)
- This new note, `.scratch/nitro-feasibility/worker-notes/openapi.md`.

## Surface, policy and consumers

- Exact mounted operation: **`GET /api/boards/{boardId}`**; `boardId` is the shared enum `public | private`. The Fetch handler strips mount prefix `/api`; the procedure metadata is `/boards/{boardId}`. The generated document has relative server `/api` and path `/boards/{boardId}`, not `/api/api/...`.
- `restRouter` contains only `board.read`, implemented with direct beta.43 `os`, explicit shared `boardReadInputSchema` and `boardReadOutputSchema`, and `openapi` metadata. It calls the unchanged `readAuthorizedBoard(context, boardId)`, which calls the real live `authorizeBoardRead`. No RPC mutation is executable or documented through this adapter. Neither REST execution nor generation imports `api/root.ts` or active widget/editor/render implementations.
- Anonymous/viewer public reads return `public-reader`; owner public/private reads return `owner` and `canEdit: true`. Anonymous/viewer private reads return **403 FORBIDDEN**. A missing record for a valid enum ID returns **404 NOT_FOUND**. Unknown IDs and unexpected input fields return **400 BAD_REQUEST**, before repository access. Unmatched paths and unsupported REST methods return 404. Output validation/unexpected failures return **500 INTERNAL_SERVER_ERROR**.
- The normal read errors reuse the shared BAD_REQUEST/FORBIDDEN/NOT_FOUND definitions; mutation-only/global contract errors are deliberately absent from this curated read. Unexpected failures add a fixed sanitized 500 definition. The owned Fetch encoder emits `{code,message,data:{reason}}` with fixed messages/reasons, never arbitrary error data, validation issues, stack traces or repository messages. Reason values are `invalid-input`, `fixture-access-denied`, `missing-board-or-route`, `fixture-request-failed`. The central wrapper's canonical-request failure can instead be `{code}`; generated error schemas explicitly support that code-only alternative.
- DTOs retain the shared sanitized projection and omit `ownerId`, principal/session state and cookie values. Canned success examples cover public reader, public owner and private owner; denial examples cover anonymous/viewer private denial and outer local-request rejection. These are explicitly initial synthetic examples, never fetched board data.
- Registered exports remain **`handleRest(context)`, `handleOpenApi(context)`, `handleApiDocs(context): Promise<Response>`**. Existing central `/api/**`, `/openapi.json`, `/api-docs` wrappers are unchanged consumers; no new registration is requested. `ApiDocs()` also retains its named export. No shared-file/interface blocker was encountered.
- All three handlers independently call `assertLocalRequest`; the unchanged central `runFixtureRequest` also checks it. Docs/spec are public only for canonical local requests, not universally public endpoints. Specs/docs support GET and bodyless HEAD; other methods return 405 with `Allow: GET, HEAD`. All owned responses set no-store and leave central status/header/cookie handling intact.

## OpenAPI and bounded retention

- Deliberately selected **OpenAPI 3.1.0** via `OpenAPIGenerator.generate(restRouter, {version: "3.1.0", ...})`, not relabeling the default 3.2 result. The installed generator performs real 3.2-to-3.1 downgrading; this GET operation has no QUERY-version restriction. Nitro's competing generator remains disabled in the read-only config.
- `getOpenApiDocumentJson(): Promise<string>` takes no request/context/session arguments. Its one shared single-flight promise retains only a bounded immutable public JSON string, at most **65,536 UTF-8 bytes**. Failed generation clears the slot. No live request, principal, repository response or configurable request origin enters the document cache. Static docs are rendered independently with a **32,768-byte** bound and no request-derived props.
- Cookie scheme: OpenAPI `type: apiKey`, `in: cookie`, name `nitro_fixture_session`, with optional operation security alternatives `[{}, {FixtureSession: []}]`. This describes public anonymous access plus the optional session mechanism, not executable authorization or a promise that viewer may read private. The text requires the active owner for private boards and explains live expiry/logout/eviction/restart semantics.
- Descriptions truthfully state host-only HttpOnly SameSite=Strict, Path=/, 15-minute absolute expiry, Secure intentionally absent for the loopback HTTP-only fixture, exact configured URL/Host/any supplied Origin, and foreign-site denial. No API key/bearer enforcement is claimed. The experiment must not be publicly hosted. Fixture login/logout remain typed RPC/UI operations, not additional REST routes.
- `/api-docs` is owned React server-rendered static HTML, with semantic headings/table/details, explicit public/private JSON links and curl placeholders for configured origin and existing local cookie-jar files. It has no scripts, automatic requests, CDN assets, external fonts or live credentials. CSP disallows all default resources, allows only the fixed inline stylesheet, and forbids framing/base/form changes.

## Installed evidence

Read exact installed exports, declarations and implementation before coding; no renewed Context7 call or broad research loop. Canonical Linear AJN-504, SPEC, COORDINATION, foundation/access notes and only direct-oRPC prior research supplied the task evidence.

- `node_modules/@orpc/openapi/package.json`: **2.0.0-beta.43**, exported root and `/fetch`; root `dist/index.d.mts` declares `OpenAPIGenerator`, `generate` version/base/error-schema options and converter list. `dist/shared/openapi.r98bZ3Ig.d.mts` defines explicit method/path/spec/security customization and compact input/output. `dist/shared/openapi.BTq9wym2.d.mts` supports 3.0.x, 3.1.x and 3.2.x; `dist/index.mjs` defaults to 3.2 and uses the installed downgrader for 3.1.
- `@orpc/openapi/dist/adapters/fetch/index.d.mts` plus shared matcher/codec source: real `OpenAPIHandler`, independent REST path/method matching, mount-prefix stripping, compact path-input merge, error status mapping and `customErrorResponseBodyEncoder`. This is not RPCLink/RPCHandler execution or generation masquerading as execution.
- `@orpc/zod` **2.0.0-beta.43** exports `ZodToJsonSchemaConverter` at its root, not `/zod4`; peer is `zod >=4.5.0`. Installed **Zod 4.6.5** satisfies it. Converter source calls Zod `toJSONSchema` with draft-2020-12 and input/output direction. The implementation selects `unrepresentable: "throw"` rather than silently accepting an empty fallback.
- `@orpc/json-schema` **2.0.0-beta.43** declarations/source verified converter interfaces, draft-2020-12 schema vocabulary and `combineJsonObjectSchemaEntries` / `combineJsonSchemasWithComposition`. These build the exact sanitized/code-only error alternatives without custom unsound type assertions. The generator internally uses its delegating/standard converter with the explicit Zod converter first.
- Installed `@orpc/server` declarations/source verified `os.$context`, `.errors/.input/.output/.meta/.handler`, actual input/output validation and Fetch match discrimination. React/DOM **19.2.7** and installed server-render declarations supply `renderToStaticMarkup`. All used packages already exist in the experiment manifest; no new library or Hono/Elysia/Eden import.

## Actual bounded probe

Coordinator approved this exact isolated lane before execution and recorded its reservation. Ran **one inline `bun -e` fresh process from `apps/nitro-experiment`**, with no generated/probe/test file. Runtime reads were owned REST/docs modules, settled contracts/rpc/implementer/board-read and access/guards/local-request/session-service, installed beta.43 libraries, Zod 4.6.5 and React/DOM 19.2.7. Request/config/repository types were type-only. A fake typed repository/config supplied synthetic records; real session selection/resolution/live guards and actual OpenAPIHandler Fetch execution ran in process. No active root router/widget/editor/render/session-transition runtime imports, listener, DB, shared outputs, build or browser were used. Cookies remained solely in memory and were never printed. `Date.now` was restored after the controlled expiry observation and `closeSessions()` cleared/disabled state before exit.

**PASS on the first invocation; no assertion correction, harness failure or source fix was needed.** Actual observations:

- Anonymous, owner and viewer public reads; owner private read; anonymous/viewer private 403 without a live private-content sentinel.
- Correct public-reader/owner capabilities, projection validation and absence of owner identity.
- Valid missing fixture 404; invalid ID/extra query 400 before repository reads; unmatched and double-prefix routes 404; attempted POST read 404 with no save execution.
- Invalid output and a throwing fake repository both returned sanitized 500 without validation issues/internal sentinel.
- Retained already-resolved owner contexts lost private access after actual logout and after controlled absolute expiry; fresh logged-out-cookie lookup also denied.
- Generated document parsed with explicit 3.1.0, exactly one GET/path, required enum path parameter, relative `/api` server, optional cookie security alternatives, statuses 200/400/403/404/500 and nonempty strict projection schema properties. The same cached document was returned on reread. Document omitted in-memory cookie values, live private sentinel and `ownerId`.
- Public docs/spec GET 200/no-store, HEAD 200/empty body, POST 405/Allow, canonical guard rejection for foreign Origin, REST bad-Host rejection, CSP and no script/link/iframe assets, exact public/private links and escaped cookie-jar placeholders. Docs contained no live private sentinel/cookie values.
- Observed **spec 7,083 UTF-8 bytes; docs 6,763 bytes**, both inside their bounds. These are artifact sizes, not performance/memory claims.

The process exited successfully and no reserved resources remain. This is composed in-memory transport/guard/generator/static-render evidence, **not mounted Nitro HTTP/cookie-wrapper or browser verification**.

## Pending final integration

- Source review is the integration gate. Run deferred experimental-package-scoped lint/typecheck only after all editing workers finish; no intermediate check was run here.
- Build/mount Nitro, confirm `/api/boards/public`, owner/private and viewer/anonymous denial through real requests and cookie wrappers; verify invalid/missing/error paths and no-store/status/header preservation. Obtain fixture cookies via actual UI/typed session transport, not an invented REST login.
- Request `/openapi.json` and `/api-docs` on the canonical configured origin, verify full URL resolution and exactly one generated GET operation, 3.1.0, schema/components/examples/errors and no alternate Nitro docs. Confirm actual foreign-origin/Host requests are rejected before public docs delivery; confirm mounted HEAD/405 behavior and no-store.
- Browser review of static docs at desktop/mobile, keyboard focus/details/table readability, direct JSON links with anonymous/owner/viewer sessions and CSP; do not interpret static render as a browser pass.
- Complete slice expiry/logout/eviction/restart, real DB missing/error behavior, full production dependency graph, container/local origin configuration and all other capability/browser checks remain AJN-506 work. No production authentication/public-deployment claim is made.

**Next consumers:** unchanged central REST/docs wrappers consume `src/server/rest/handlers.ts`; source review can start at `router.ts` and `document.ts`; final verification follows the exact paths/status matrix above. Read foundation/access notes for shared projections and live authorization. No coordinator registration or contract change is requested.
