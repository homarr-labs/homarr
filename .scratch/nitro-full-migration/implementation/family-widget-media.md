# Media widget view handoff

## Freeze

Exactly 12 main presentation entrypoints are extracted and exported only by `packages/widgets/src/rendering/media.ts`. Extraction is done; native producer/composition admission is held for all 12. This is neither full-family completion nor a native mount, bundle, authorization, image-delivery or lease proof.

The supplied A05 baseline, 23 candidates, 95 bindings, 69 catalog entries and options are not changed or recounted here. No route, schema, definition, option, provider, context, manifest, package export or frontend render consumer was edited. Existing media-server tests are read-only. FAMILY-PRODUCER-LEASES remains a composition requirement, not authority conveyed by view props.

## Exact entrypoints and source origins

Paths below are relative to `packages/widgets/src/`. Each view comes from the existing source presentation, retaining its classes, source calculations, compact/advanced layout, selection, accessibility and visible actions rather than redesigning it.

| Kind                       | Main view and extraction status                                           | Source presentation origin                                                                                                    | Native production held on                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calendar                   | `calendar/native-view.tsx` / `CalendarView`: done                         | `calendar/component.tsx`, `calender-day.tsx`, `calendar-event-list.tsx`                                                       | Actual month query/context, settings, board radius, translation, images and runtime query-reference production                                                              |
| downloads                  | `downloads/native-view.tsx` / `DownloadsView`: done                       | `downloads/component.tsx`                                                                                                     | Actual query/history, current interact grants, item/queue mutations, source table layout/storage and option-persistence producer, connection timeout and clipboard producer |
| mediaServer                | `media-server/native-view.tsx` / `MediaServerView`: done                  | `media-server/component.tsx`                                                                                                  | Actual stream query/context, integration/user image delivery and source formatting/translation producers                                                                    |
| mediaRequests-requestList  | `media-requests/list/native-view.tsx` / `MediaRequestListView`: done      | `media-requests/list/component.tsx`                                                                                           | Actual request query, current grants, per-request pending/error mutation producer, invalidation, search, board radius and images                                            |
| mediaRequests-requestStats | `media-requests/stats/native-view.tsx` / `MediaRequestStatsView`: done    | `media-requests/stats/component.tsx`                                                                                          | Actual stats query, search, board radius, translation and image producers                                                                                                   |
| mediaMissing               | `media-missing/native-view.tsx` / `MediaMissingView`: done                | `media-missing/component.tsx`                                                                                                 | Actual page-size query/runtime-reference production, source data/error handling and image delivery                                                                          |
| mediaTranscoding           | `media-transcoding/native-view.tsx` / `MediaTranscodingView`: done        | `media-transcoding/component.tsx`, `health-check-status.tsx`, `panels/{workers,queue,statistics}.panel.tsx`                   | Actual paginated query/runtime-reference production, page correction, board radius, formatting and system color-scheme producer                                             |
| mediaReleases              | `media-releases/native-view.tsx` / `MediaReleasesView`: done              | `media-releases/component.tsx`                                                                                                | Actual releases query, source configuration/formatting/translation, image delivery and browser-safe source OverflowBadge producer                                           |
| immich-serverStats         | `immich/server-stats/native-view.tsx` / `ImmichServerStatsView`: done     | `immich/server-stats/component.tsx`                                                                                           | Actual stats/albums query context and runtime references; source 50-album limit and formatting/translation producers                                                        |
| immich-albumCarousel       | `immich/album-carousel/native-view.tsx` / `ImmichAlbumCarouselView`: done | `immich/album-carousel/component.tsx`                                                                                         | Actual full/preview queries, preview-first/randomized ordering, reduced-motion/timer, runtime actions and public-link image production                                      |
| tracearr                   | `tracearr/native-view.tsx` / `TracearrView`: done                         | `tracearr/component.tsx`, `stats-section.tsx`, `streams-section.tsx`, `violations-section.tsx`, `recent-activity-section.tsx` | Actual dashboard query, source bitrate/formatting/translation and image producers                                                                                           |
| audioStats                 | `audio-stats/native-view.tsx` / `AudioStatsView`: done                    | `audio-stats/component.tsx`, `audio-stats-content.tsx`                                                                        | Actual backend stats query, Navidrome-only advanced streams query, runtime references and source visible-stat/formatting/translation producers                              |

## Source behavior and helper boundary

The existing `component.tsx` entrypoints remain the actual legacy producers, not a new native payload controller. They keep source query inputs/enabled flags, query error/empty behavior, mutations/invalidation, settings/grant acquisition and runtime-reference registration. Presentation state stays local or arrives as controlled props. Downloads keeps table-layout production mounted even for its no-columns/loading branches; table layout and persistence are not reconstructed in the native view. Request-answer pending/error state remains per request. Immich slideshow effects remain in its producer and do not run for the no-photo branch.

Read-only pure helpers reused directly: calendar `calendar-events.ts` (`splitEvents`, half-open agenda selection, date grouping/key and year/month navigation), downloads `helpers.ts` (durable compact/advanced column groups, state filter/order and stats display), media-missing `tabs.ts`, Tracearr `source.ts`, shared `common/locale.ts` and `common/compact-stat-layout.ts`. Existing in-component display calculations are moved, not copied into parallel helper implementations. Source Tdarr page-size/footer/pagination helpers and media-server resolution/episode helpers retain legacy exports through their wrappers.

Helpers with broader import closures are explicit, required source bindings instead of value-imports in native views: safe application URLs/new-tab policy, date validation, byte/bit/duration formatting, icon URLs/categories, zoom-compensated sizing, availability/status/type configuration, Tracearr `formatTotalTracearrBitrate`, audio `getVisibleStats`/`getGridCols`/`getIconSize`, and OverflowBadge. Their actual source implementations are supplied by legacy wrappers. Native composition must supply admitted browser-safe implementations of those same source ports; importing a legacy barrel into a native producer is not proved safe by this extraction.

No shared algorithms, parser/grant expansion, runtime-reference implementation or lease implementation were added. Source calendar runtime registration still uses the source zero-based month while its fetch uses the source one-based month; that producer discrepancy is preserved, not silently normalized here. Source Tracearr reduction seeds and optional-history behavior remain source presentation aggregation, not fabricated provider results. Audio advanced libraries use the actual Audiobookshelf kind plus an existing-data `libraries` field guard instead of the old payload cast; no backend payload is fabricated or coerced.

No missing helper was replaced with synthetic data. Branch-level limitations remain held: the source audio visible-stat helper still exposes a broad string label and its existing backend casts internally; native typed backend correlation is not established here. Media-server source video metadata includes `frameRate` while the source English metadata translations have no `video.frameRate` key; its existing dynamic translation behavior was retained, not repaired with an invented label. These limitations do not authorize changing the frozen shared/helper/translation files.

## Browser import closure versus producer ports

The main native entries and their local child closures have no value-import of Next, tRPC/client API, Auth, Board, settings or translation acquisition. Their runtime imports are declared React, Mantine/core/dates/hooks, Tabler icons, dayjs, clsx, original styles, and the read-only pure/local presentation helpers above. Router input/output, source widget/options/integration contracts, source helper signatures and shared binding interfaces are type-only; they do not cause backend imports at runtime.

`rendering/media.ts` exposes exactly the 12 main views, not the source producer wrappers. Calendar day/event-list and audio content are adjacent native children. Tdarr and Tracearr allowed presentation children now receive their text/format/radius/color values as props. Downloads receives a render-layout port for the actual source table/storage producer and a per-integration indicator port; releases receives its source badge component; requests receive their actual per-request decision producer. Error/empty/loading nodes are explicit producer slots where applicable.

This is a static source import-boundary statement, not a bundle/runtime proof. Injected callbacks/components/nodes, media URLs, timers, query contexts, option persistence, runtime references, parser/schema coupling, current grants and producer leases still need separate physical native admission. Visibility, `canInteract`, action callbacks and layout-persistence permission props are presentation inputs, never authorization. Server grants/current-authority/lease checks remain authoritative. Missing ports remain held; there is no fallback to a fake client, mock payload, inferred grant, replacement parser or invented route.

## Exact changed files

Existing presentation files (all enumerated before edits):

```text
packages/widgets/src/calendar/component.tsx
packages/widgets/src/calendar/calender-day.tsx
packages/widgets/src/calendar/calendar-event-list.tsx
packages/widgets/src/downloads/component.tsx
packages/widgets/src/media-server/component.tsx
packages/widgets/src/media-requests/list/component.tsx
packages/widgets/src/media-requests/stats/component.tsx
packages/widgets/src/media-missing/component.tsx
packages/widgets/src/media-transcoding/component.tsx
packages/widgets/src/media-transcoding/health-check-status.tsx
packages/widgets/src/media-transcoding/panels/statistics.panel.tsx
packages/widgets/src/media-transcoding/panels/queue.panel.tsx
packages/widgets/src/media-transcoding/panels/workers.panel.tsx
packages/widgets/src/media-releases/component.tsx
packages/widgets/src/immich/server-stats/component.tsx
packages/widgets/src/immich/album-carousel/component.tsx
packages/widgets/src/tracearr/component.tsx
packages/widgets/src/tracearr/stats-section.tsx
packages/widgets/src/tracearr/streams-section.tsx
packages/widgets/src/tracearr/violations-section.tsx
packages/widgets/src/tracearr/recent-activity-section.tsx
packages/widgets/src/audio-stats/component.tsx
packages/widgets/src/audio-stats/audio-stats-content.tsx
```

New files:

```text
packages/widgets/src/calendar/native-view.tsx
packages/widgets/src/calendar/native-view-day.tsx
packages/widgets/src/calendar/native-view-event-list.tsx
packages/widgets/src/downloads/native-view.tsx
packages/widgets/src/media-server/native-view.tsx
packages/widgets/src/media-requests/list/native-view.tsx
packages/widgets/src/media-requests/stats/native-view.tsx
packages/widgets/src/media-missing/native-view.tsx
packages/widgets/src/media-transcoding/native-view.tsx
packages/widgets/src/media-transcoding/native-view-types.ts
packages/widgets/src/media-releases/native-view.tsx
packages/widgets/src/immich/server-stats/native-view.tsx
packages/widgets/src/immich/album-carousel/native-view.tsx
packages/widgets/src/tracearr/native-view.tsx
packages/widgets/src/tracearr/native-view-types.ts
packages/widgets/src/audio-stats/native-view.tsx
packages/widgets/src/audio-stats/native-view-content.tsx
packages/widgets/src/rendering/media.ts
implementation/family-widget-media.md
```

## Verification boundary

Dependencies were read from `packages/widgets/package.json` and the workspace catalog before implementation. Installed React 19 type declarations, Mantine 9.6 Calendar/ScrollArea/Popover/Grid/Image and reduced-motion declarations, and mantine-datatable declarations were read; existing declared APIs/design were retained. Context7 was already reported quota-exhausted by the delegation, so installed declarations were used without live documentation/network calls.

Repository-mandated static lint/typecheck were run despite the delegation's no-check exclusion. Scoped oxlint finishes successfully with only the two preserved downloads stylesheet side-effect-import warnings. `tsc --noEmit --incremental false -p packages/widgets/tsconfig.json` reports no errors in these changed files, but fails with nine out-of-scope diagnostics: two legacy icon lookup errors at `packages/api/src/router/app.ts:233`; missing `bun:sqlite` types in `packages/core/src/infrastructure/db/drivers/sqlite.ts`, `packages/db/copied-sqlite.ts`, `packages/db/driver.ts` and `packages/db/transaction-gate.ts`; missing icon-fetch resource arguments at `packages/cron-jobs/src/jobs/icons-updater.ts:22`; and the time-period type at `packages/widgets/src/beszel-system-stats/component.tsx:51`. Those files were not changed.

No tests were added or run. No build, install, import evaluation, browser, listener, live provider, SQL, environment/credential access, network documentation request, Git mutation or nested agent was run. No native consumer was mounted. Coordinator validation and actual producer admission remain necessary.
