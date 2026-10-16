# Native workers scratchpad

## Checkpoint

- Branch: `feat/headless-hono-backend`; original checkout preserved.
- Backend-only commit: `ffd6565d4c6adb776fd16148e12764d22cfb7b18`.
- Tag: `checkpoint/headless-backend-20261016`.
- Excludes experimental replacement viewer, account platform, and demo/report files. Enrollment contracts now live in the shared protocol package, keeping the worker independent of the hosted platform.
- Filtered frozen lock and protocol/access/platform/worker types passed. Protocol 24, access 17, platform 10 tests passed. A new build of this exact filtered tree has not been run.

## Parallel ownership

| Work                                                            | Agent                           |
| --------------------------------------------------------------- | ------------------------------- |
| Native static frontend shell, board/editor and worker bar       | native_ui                       |
| Browser connection pool and native oRPC link for existing hooks | main_frontend_explore           |
| Existing management pages, users/groups, tools                  | native_manage and children      |
| Images, files, Assistant and custom widget resource transport   | native_resources                |
| Organization metadata, memberships and invites                  | organizations_explore           |
| Worker-owned service grants, frontend bootstrap and scoped MCP  | worker_capabilities             |
| Integration aliases, native dispatch and custom sources         | federation_explore and children |
| Account OAuth MCP gateway using encrypted relay                 | global_mcp_explore              |
| Independent native frontend containers and two-worker demo      | checkpoint_scope                |
| Integration, dependency updates, validation and review          | root                            |

## Decisions

- Keep the existing frontend hooks as a browser compatibility layer; requests use native oRPC over the selected encrypted worker connection.
- The hosted frontend must not perform private server-component reads. Worker mode serves a translated static shell, then the browser obtains its session, settings, boards, and resources directly from its worker.
- One active primary supplies boards and native settings. Switches remount session, query, and resource state; identical IDs from different workers must not share cached data.
- Native frontend demo uses a new HTTPS root on port 8445 and account routes under `/platform`; the existing 8443 demo remains untouched.
- Integration aliases preserve existing local IDs and foreign keys. A primary uses a dedicated owner-approved service grant to call an integration worker. No arbitrary SDK method forwarding or local duplication of provider credentials.
- Global MCP is an approved client of the worker. Its stored service identity is separate from a browser owner grant; its routing relay remains blind. OAuth authorization and current organization membership are checked independently of worker capability approval.

## Progress

- Created an updated tracked goal with the complete native frontend/worker scope.
- Added shared worker-client dependencies to the native app, API, UI, widgets, and compatibility viewer. Source agents own their modules; root regenerates the workspace lock.
- Organization create/list isolation and one-use invites passed initial focused tests. Browser native link passed initial query/mutation/error/stream/cancellation/switch checks. These are intermediate results, not final acceptance.

## Integration findings

- The first actual Next browser compilation caught a server-only icon repository imported by the new media wrapper. Extracted its existing public URL/slug helpers into the browser-safe icons entrypoint; the second production frontend build passed.
- Fixed a bootstrap switch race: a scope-tagged bootstrap can render only with its original concrete worker connection. Query and resource providers remount on scope changes. Asynchronous API callbacks capture that concrete connection.
- Preserved Firefox request bodies through the resource adapter, including original multipart bodies; adding a Request/body reconstruction would have reintroduced the earlier Firefox failure.
- Added Blob image CSP support and bounded image loading (four simultaneous loads, 32 MiB per preview, 64 MiB retained), with cancellation and URL revocation.
- Native users need their existing permissions when invited. Adding device-bound user grants separately from full worker-owner grants and read-only board shares; directory membership still cannot manufacture private access.
- Bootstrap-derived settings, native session, integration permissions, and Assistant availability must refresh after changes without resetting an in-progress board edit. A scoped live bootstrap query owns this refresh.
- Federation uses explicit operation merge contracts. Preserved global media-request ordering and added a catalog completeness check for native multi-integration operations.
- Hosted MCP and primary-worker integration clients have distinct signed service purposes. Only an approved MCP client may forward a primary's integration alias; a federation service cannot recursively delegate.

## Intermediate validation

- Normal Homarr source frontend renders a real isolated worker's board, header, seven seed items, and edit controls. Screenshot: `/tmp/homarr-native-ui-qa-20261016/native-board.png`. Editing and further browser checks are in progress.
- Native frontend image `homarr:native-frontend-local`, digest `40526b5381b9074014e0e073b8e3fee15dfc6474718e967783dcaed5b4b5733d`, built successfully. It is an intermediate image; later UI changes require a final rebuild.
- That frontend ran as nonroot with networking disabled, no database/Redis/auth secrets, and an unreachable backend URL. Health, `/`, and `/manage/integrations` returned 200; raw backend health returned 404. Startup had no database errors. Its 345.72 MiB figure is image storage; a separate post-render RAM sample was 225.3 MiB. Neither is the headless worker's size.
- Organization tests: six public cases, 98 assertions; ten existing platform cases, 106 assertions. Resource tests: four cases, 21 assertions. Existing Assistant-image and backup-readiness cases passed.
- Native worker encrypted tests prove owner bootstrap, scoped non-admin service permissions, canonical MCP calls, revocation, and native viewer board isolation. Additional native-user and custom-source cases are in progress.
- Eight Custom JSX display tests refer to bundled fixture IDs already absent in both original base `dc2662d9f2eaabf9b7ba14693f8ddda8a56aeeff` and checkpoint `ffd6565d4`. Their failures predate this migration; the test assertions exist in both versions. Do not describe them as new resource-adapter regressions.
- Existing 8443 demo containers and all user keys remain intact. The new independent two-worker deployment is not yet running; final full-suite and parallel reviews remain outstanding.

### Worker authorization completed

- Added explicit device-bound integration service grants, with selected integration IDs, approved native procedure paths, query/interact/full access, audience, account or organization binding, and a maximum thirty-day lifetime. Signed `purpose=mcp` permits one-hop primary alias routing; federation grants select only locally hosted integrations. Neither directory identity nor a service grant creates worker ownership.
- Native frontend bootstrap, certificate metadata, trusted hostname metadata, and MCP management groups now come from the encrypted worker channel. Hosted MCP uses the existing native catalog and dispatcher with cancellation and scoped integration discovery; service sessions have no administrator permission.
- Added owner-approved invitations for existing local Homarr users. Their normal group, board, integration and management permissions remain authoritative. User deletion prevents reconnect; a changed permission graph closes the existing channel. Homarr currently has no separate disabled-user database flag; revoking a worker device grant disables that connection.
- Native viewer shares use persisted board/item selectors and scoped result projection. Published Custom JSX view queries can use their saved integration source without granting arbitrary integration access. RSS source credentials remain in the worker through item-bound requests. Legacy embeds or timetable sources containing inline URL credentials fail closed when shared; owner and local-user connections retain their normal behavior.
- Focused checks: worker-access 20 tests / 119 assertions; three live encrypted worker/relay cases 40 assertions; native viewer policy 11 tests / 53 assertions; RSS and Custom JSX API checks 24 tests. Worker TypeScript, owned-file lint and formatting pass. The root integration run owns the final full suite and browser/container checks.

### Final suite and browser integration

- Explicit native inventory: 360 procedures and 133 native MCP tools. Compared against the saved original 346-procedure inventory: no original path missing and no operation kind changed.
- The repository's original negative project filters unexpectedly included E2E projects with installed Vitest 4.1.10. Stopped that run and replaced the ordinary test scripts with positive `*-node` and `dom` project selection. The intended full unit run then completed: **4,823 passed, 48 failed, 12 skipped; 436 passed files, 16 failed files**. Every remaining failure reproduces on the original source with the current pinned dependencies; details are in `test-audit.md`.
- Updated stale checkpoint-era MCP/REST/instrumentation/prefetch tests to their transported interfaces, preserving their public behavior assertions. Fixed the new ResourceAvatar test mock and restored ordinary Docker `UNAUTHORIZED` behavior while retaining scoped native viewers. Their focused checks pass.
- All twelve Bun test files were exercised separately. Eleven initially passed; the last worker file exposed a fixture deadline that started before cryptographic setup. Its fixed real 350ms expiry test preserves the <400ms lateness assertion and adds no-premature-closure coverage. The complete worker file then passed 21/21. No production expiry behavior changed.
- Native browser editing persists through reload. Chromium also passed board creation, integration create/rename/delete, immediate integration selection, real widget placement, and Custom JSX authoring/preview/placement/reload. The 360px worker dock fits without horizontal overflow.
- Firefox's real native Media form initially exposed top-level FormData incompatibility in the oRPC beta serializer. The browser link now converts repeated fields into file-preserving native input, rejects prototype keys, and retains filenames/MIME/exact bytes. Firefox subsequently uploaded 3,147,775 bytes through the normal UI and rendered a decrypted 1024x1024 Blob preview without hosted API requests. Further Firefox Custom JSX/backup checks are in progress.
- The browser queue preserves the protocol's 16-request bound, admitting 12 active HTTP bodies and reserving finite/control headroom by limiting persistent subscriptions to eight; 256 further requests can queue and cancel. Identical-subscription sharing is being finalized.
- The user changed delegation preferences. All still-running inherited agents were interrupted. Replacement agents use GPT 6.1 Sol Medium; packaging uses Luna 6 Max. Further delegation must keep to Luna 6 Max or GPT 6.1 Sol Medium/Low.
