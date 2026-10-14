# Widget sprint implementation — frozen candidate

## Outcome

Implemented actual native oRPC bodies for the complete source widget inventory: **95 leaves, 46 nested subrouters (74 queries, 20 mutations, one subscription)**. All 95 are **binding-held, unmounted candidates**, not accepted/live capabilities. No shared registry, contribution, central 334 map, existing router, legacy source, manifest, host or port configuration was edited. The accepted 91/334 count is unchanged.

## Exclusive files

- `packages/api/src/nitro/routers/widgets.ts`
- `packages/api/src/nitro/routers/-widgets/resources.ts`
- `packages/api/src/nitro/routers/-widgets/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-widgets.md`

`createWidgetProcedures(resources)` returns the real nested widget router bodies. A future coordinator composition must place that object under `widget`. It never delegates execution to old tRPC routers, callers or controllers. `widgetImplementedPaths` is the exact source-body inventory; `widgetBindingHeldPaths` deliberately aliases the entire inventory. No contribution is exported or registered by this lane.

## Exact inventory

Every listed identity has a ported native body **and** remains binding-held. Paths are `widget.<subrouter>.<leaf>`; the source filenames are relative to `packages/api/src/router/widgets/`.

| Subrouter          | Leaves                                                                                                                | Source                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| stats              | catalog, snapshot, refresh                                                                                            | stats.ts                                  |
| archiveTeamWarrior | getStatus                                                                                                             | archive-team-warrior.ts                   |
| beszel             | getSystems, getAlerts, getSystemStats, subscribeSystemStats                                                           | beszel.ts                                 |
| anchorNotes        | listNotes, getNote, updateNote                                                                                        | anchor-notes.ts                           |
| coolify            | getInstancesInfo                                                                                                      | coolify.ts                                |
| immich             | getServerStats, getAlbum, getAlbumPreview, getAlbums                                                                  | immich.ts                                 |
| paperlessNgx       | getStats                                                                                                              | paperless-ngx.ts                          |
| patchmon           | getStats                                                                                                              | patchmon.ts                               |
| bazarr             | getBadges                                                                                                             | bazarr.ts                                 |
| notebook           | updateContent                                                                                                         | notebook.ts                               |
| weather            | atLocation                                                                                                            | weather.ts                                |
| airQuality         | atLocation                                                                                                            | air-quality.ts                            |
| app                | ping                                                                                                                  | app.ts                                    |
| dnsHole            | summary, enable, disable                                                                                              | dns-hole.ts                               |
| smartHome          | entityState, entityDetails, switchEntity, executeAutomation                                                           | smart-home.ts                             |
| stockPrice         | getPriceHistory                                                                                                       | stocks.ts                                 |
| mediaServer        | getCurrentStreams                                                                                                     | media-server.ts                           |
| mediaRelease       | getMediaReleases                                                                                                      | media-release.ts, media-release-result.ts |
| calendar           | findAllEvents                                                                                                         | calendar.ts                               |
| downloads          | getJobsAndStatuses, pause, pauseItem, resume, resumeItem, deleteItem                                                  | downloads.ts                              |
| mediaRequests      | getLatestRequests, getStats, answerRequest                                                                            | media-requests.ts                         |
| mediaOrganizer     | getData                                                                                                               | media-organizer.ts                        |
| rssFeed            | getFeeds                                                                                                              | rssFeed.ts                                |
| indexerManager     | getIndexersStatus, testAllIndexers                                                                                    | indexer-manager.ts                        |
| healthMonitoring   | getSystemHealthStatus, listStorageVolumes, getClusterHealthStatus                                                     | health-monitoring.ts                      |
| mediaTranscoding   | getDataAsync                                                                                                          | media-transcoding.ts                      |
| minecraft          | getServerStatus                                                                                                       | minecraft.ts                              |
| options            | getWidgetOptionSettings, saveItemOptions                                                                              | options.ts                                |
| releases           | getLatest                                                                                                             | releases.ts                               |
| networkController  | summary                                                                                                               | network-controller.ts                     |
| firewall           | getFirewallCpuStatus, getFirewallInterfacesStatus, getFirewallVersionStatus, getFirewallMemoryStatus                  | firewall.ts                               |
| notifications      | deleteNotification, getNotifications                                                                                  | notifications.ts                          |
| timetable          | getTimetable, searchStations                                                                                          | timetable.ts                              |
| tracearr           | getDashboard                                                                                                          | tracearr.ts                               |
| speedtestTracker   | getDashboard                                                                                                          | speedtest-tracker.ts                      |
| uptimeKuma         | getDashboard                                                                                                          | uptime-kuma.ts                            |
| audioStats         | getStats                                                                                                              | audio-stats.ts                            |
| umami              | getWebsites, getVisitorStats, getEventNames, getTopPages, getTopReferrers, getMultiEventTimeSeries, getActiveVisitors | umami.ts                                  |
| vpn                | getSummaries                                                                                                          | vpn.ts                                    |
| ups                | getSummaries                                                                                                          | ups.ts                                    |
| traefik            | getDashboard                                                                                                          | traefik.ts                                |
| customApi          | refresh, getData, queryRequest, executeAction                                                                         | custom-api.ts                             |
| secrets            | setSecret, deleteSecret, getConfiguredKinds                                                                           | widget-secrets.ts                         |
| wud                | getStats                                                                                                              | wud.ts                                    |
| llamacpp           | getStats                                                                                                              | llamacpp.ts                               |
| wazuh              | getAgents, getAlerts, getSummary, getTimeline, getTopList, getVulnerabilities, getFim, getAuthFailures                | wazuh.ts                                  |

No source leaves are intentionally omitted. `custom-api-security.ts` is not called by the current widget router: the current Custom JSX request path uses the named-request executor, not the retired arbitrary-fetch helper. It is not exposed as an extra endpoint or substituted for current business logic.

## Source equivalence

- Source `publicProcedure`/`protectedProcedure` access, procedure kind and demo guard descriptors are retained; protected non-integration leaves also use `authenticatedProcedure`. Integration access is native middleware with the original cardinality schemas, supported-kind selection, relation projections, database ordering, duplicate-ID count failure, error messages, decryption and external app URL derivation. No stricter deduplication or permissions rewrite is applied.
- The legacy widget integration middleware loads **unfiltered integration user/group grants**. Its permission helper aggregates those loaded grants, even without principal filtering. The native helper intentionally preserves that source quirk, including the anonymous query case. The stricter accepted native policy is not substituted. Query-access fallback retains the original direct-board-permission, group-membership, public/owned-board SQL stages, early returns and `board-view-all` behavior. Board action checks retain the filtered permission queries and NOT_FOUND concealment, including empty-ID anonymous grant behavior.
- Inputs retain source numeric bounds, defaults, optionality, array bounds, enum definitions and merged integration-ID schemas. No new output validator is invented: widget leaves have inferred outputs in the legacy source. MCP metadata text is carried through `sourceProjectionMeta`, including the actual Wazuh and llama.cpp metadata even where old map projection cells do not describe it.
- Request handling retains the genuine named handler `.handler(...).getDataAsync()` calls and the source inputs, timestamps, cache invalidations and result projections. Resources expose those actual primitive types, not endpoint-shaped controller callbacks. The request primitive bindings must preserve their source shared-cache identities, stale policies, timeouts, provider arguments and history behavior.
- Multi-integration settling preserves partial-success order, integration identity envelopes, sanitized failure strings, epoch/null/empty fallback values and each leaf's all-failure policy. Umami visitor statistics intentionally have no fallback while other Umami leaves swallow upstream errors into their source empty/zero results. Wazuh preserves dashboard-link selection, mock envelopes and friendly public error classification.
- Beszel retains first-integration selection, historical period and Docker arguments, optional alert-history inputs, independent systems/alerts settling, a four-entry drop-oldest queue, raw `LiveStatsEvent` payloads, detached producer error handling, pre-abort behavior, AbortController propagation and iterator-finally cancellation. Request disposal also stops the subscription. The provider/lifecycle binding is still held.
- Downloads retain default limit 50, archived-history default false and history window default seven days. Mutations settle all providers before invalidating the selected integrations, then throw the first rejection. Source SABnzbd scanning/provider semantics remain owned by the genuine download primitive, not a replacement miniature implementation.
- Anchor note normalization, mock ID checks, conditional title/content updates, cache invalidation order and 400 logging/403/404 translation remain intact. Smart-home safe entity details, false-provider-result errors and invalidation are preserved. Stats refresh remains a public query-access mutation, with the source demo mutation guard and force/freshness/queue semantics delegated to the real stats primitive.
- App ping retains server setting refusal, authenticated visibility, public-board app/bookmark option discovery, the repository's database read even when anonymous access fails, empty URL conflict and original ping result envelope. RSS retains broad permission/ownership eligibility, otherwise restricting against **all configured RSS items**, partial failures, URL-safe logging, date sorting and global slicing; no board-visibility policy fix is added.
- Notebook/options persistence retains SuperJSON merging and item/board mismatch checks, with no added kind check. Timetable changes keep normalization, unchanged/default early exits, private-address blocklists, DNS pinning and fresh resolution for custom requests. Saved timetable reads and configuration station searches retain their distinct view/modify rules. Custom Widget placement changes retain the administrator-only normalization/deep-equality guard.
- Release queries retain the caught board/token-loading errors, persisted repository matching, persisted provider-URL preference, token attachment only for a matched saved repository, version-regex precision construction, safe public provider errors and current-time unexpected-failure timestamps. Persisted repositories are deserialized with a typed SuperJSON result rather than an unsafe cast; there is no new runtime validation changing the original malformed-data behavior.
- Release secrets retain modify-board authorization, encrypted delete/insert transaction bodies for both physical drivers, delete filters, kind-only reads, and the source catch-to-empty behavior when the table read fails. Secret values never become response fields.
- Custom JSX retains placed-item/legacy-definition checks, enabled/configuration checks, cache-version hashing, source selection, full integration access for arbitrary requests, permission selection, named request rendering, per-category limit acquisition/release, source-secret selection, runtime-param hashing, manual/load distinction, confirmation rules, load error/status envelopes, metadata-only integration cache versions, capabilities and success-only invalidations. Native domain-error translation retains retry-after metadata. Actual credential-derived HTTP/TLS resolution, bounded execution/redaction and distributed limits are explicit held primitives, never replaced by fake success.

## Required bindings / holds

All paths require a real `WidgetProcedureResources.acquireRequestAsync(BackendContext)` lease. This is a candidate contract, not a physical implementation. Before any acceptance or exposure, the coordinator must bind and review:

1. Exact physical tables/operators and real `BackendContext.db`, verified current principal/authorization and cancellation/disposal. The lease must remain tied to that request and its current authority, including all provider/cache/history work and stream production. `assertCurrentAsync` and `releaseAsync` are required; no principal or database override is fabricated here.
2. The declared request-handler primitives and native integration factory with accepted runtime resources, provider authentication, credential revisions, cache backing, histories, limits and cancellation. Their types alone do not establish a working native binding.
3. Real server settings, encrypted secret codec and driver-dispatched transactions. SQLite and PostgreSQL schema/effect equivalence still needs the deferred validation review.
4. Actual ping, timetable DNS lookup/pinned requests, stats snapshot/refresh history and the shared caches/invalidation services. No network or storage operation was run during preparation.
5. Custom JSX distributed request capacity and release semantics, genuinely bounded/redacting HTTP execution, full-access integration HTTP auth/TLS/cache-version resolution and provider-specific derived credentials. The supplied executor must retain source structured error logging and domain errors; a raw unguarded fetch/native factory is not an accepted binding.
6. The Beszel realtime provider, request disposal order, producer shutdown and authority continuity. No listener or provider subscription was opened.

The source-preserved unfiltered-grant quirk is not permission approval for production exposure. No new policy should silently be imposed in this lane; reconciliation/security decisions belong to the coordinator under the existing gates.

## Source-only verification

Dependencies and package exports were read from the API, Auth, integrations and request-handler manifests. Installed `@orpc/server` is pinned **2.0.0-beta.43**; its installed declaration files confirm `$context`, metadata plugins, `.use`, multiple `.input`, `.output` and `.handler` APIs. Existing native `procedure.ts`, `BackendContext`, error mapping and sibling resource patterns were read. No external documentation fetch was needed or performed: the sprint's previously retrieved docs and the installed/local sources are the approved references.

Read-only source comparison found 95 distinct native body identities and 95 builder handler bodies, with no missing/extra identities against the source inventory. The returned nested router has exactly the original 46 root subrouters. No `any`, unsafe casts, old runtime-router imports or tRPC execution tunnel was added. Const assertions and typed deserialization retain source types without unsafe casts.

No lint, typecheck, build, test, format or install command was run; validation remains expressly deferred. These source-comparison observations are not a compilation, runtime, acceptance or publication claim. No tests, Git mutations, environment/credential/current-data reads, network/provider calls, SQL execution, listeners, browsers or containers were used. Ports **3100/3200** are untouched. Freeze this lane after return; coordinator reconciliation and final required validation are outstanding.

## Incremental import-only lease — frozen recovery handoff

The completed 95-body port was not repeated. The coordinator reports that all five independent subset reviews returned no findings on the source bodies; this recovery does not rerun or expand those reviews.

The preceding mechanical lease applied exactly one source patch to `packages/api/src/nitro/routers/-widgets/helpers.ts`: its combined `@homarr/common` import was replaced with these existing public specifiers, now confirmed by a source read at lines 8–10:

- `FlattenError`: `@homarr/common` → `@homarr/common/error`
- `isRecord`: `@homarr/common` → `@homarr/common/object`
- `removeTrailingSlash`: `@homarr/common` → `@homarr/common/url`

Implementation identity was verified through source, without runtime imports: `packages/common/index.ts` re-exports `./src`, and `packages/common/src/index.ts` re-exports `./error`, `./object` and `./url`. The existing package export entries point directly to those same `src/error.ts`, `src/object.ts` and `src/url.ts` files. Their previously read declarations define the same `FlattenError`, `isRecord` and `removeTrailingSlash` bindings, not replacement implementations. `@homarr/common` was already declared in the API dependencies. No manifest, lockfile, export, function or algorithm change was needed.

### Retained source-byte evidence and limitation

The preceding lease recorded these pre-change SHA-256 values for the three permitted source files only:

| Source                  | Recorded before value                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `-widgets/helpers.ts`   | `e1baed5a20cd3e9c221c275fac49f0fa731599050f5bd5386b5f2f2ef4e6f5f5` |
| `widgets.ts`            | `3610475532bc1e4f11c3544c4451ee1be2673b09aaf3d6f66233871d94749c2b` |
| `-widgets/resources.ts` | `d550e705ce4811d5678d3856e7d0c12a96a86753e9943cd6c79d5a12c7b244c4` |

Its retained calculation found exactly one occurrence of the old import and predicted helper digest `f0e563c75d4d0632e28497a31bb40e47e15a2989ccb816c149859c79d096bc15` after replacing only that import. **This is an expected value, not an observed post-change digest.** The patch tool reported that single helper patch successful, but the subsequent transport interruption returned no completed post-change byte comparison.

Consequently, exact equality of every remaining helper byte and the complete router/resources files is **not independently proven by the available retained evidence**. No complete immutable before-file snapshots or measured after digests are available here. The recorded patch contains only the import replacement, and this lease issued no other source writes; the recovery confirms the three import lines by source read and writes only this handoff. It does not invent a whole-file equality result or rerun hash/executable commands.

### Unchanged holds

This removes only the helper's direct Common root-barrel edge. It does not certify the full bounded native graph or modify Custom Widget/server transitive imports, Core logging, request handlers, providers, DB/schema/assets, the shared API spine, source security checks, manifests, central map/index, host or ports 3100/3200. No runtime graph evaluation or production mounting/count acceptance occurred.

Q18 remains unanswered and unapproved: the frozen widget grant behavior is unchanged, with no stricter principal-scoped repair or new restoration of foreign-user exposure. Production, real-backing, current-authority/currentness and COMMIT holds remain in force. Final required validation is outstanding; no lint, typecheck, build, test, format, install, runtime import, hash command, Git, SQL, network/provider, environment/credential/data, listener, browser, container or nested-agent action was run in this recovery. Both the mechanical delta and the source bodies are frozen on handoff.
