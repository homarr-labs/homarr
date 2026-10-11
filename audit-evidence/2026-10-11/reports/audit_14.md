# Audit 14 — Media integrations and clients

## Scope and confidence

All 110 assigned files were read in full. Caller tracing covered the integration factory, request handlers for calendars/downloads/media servers/Immich/media releases, the downloads API input, the Immich carousel consumer, and runtime imports of `@homarr/integrations`. The two specifically requested large-file passes are recorded below. Coverage is in `audit-evidence/2026-10-11/coverage/audit_14.json`.

No production files were changed. No tests, builds, runtime profiles, or heavy benchmarks were run. There are no measured heap, transfer, CPU, startup, or bundle-size results for this audit. Findings below describe source-level allocation/loading behavior and distinguish unavoidable provider response costs from extra copies. No persistent memory leak is claimed.

## Finding: calendar feed parsing has no aggregate input or output bound

**Call path and trigger:** The calendar request handler authorizes/selects an integration, computes a month range with six days of padding on either side, and invokes `ICalIntegration.getCalendarEventsAsync`. Whenever a board loads an iCal calendar, this method downloads the configured private feed.

**Evidence and cause:** `getCalendarEventsAsync` buffers the complete response as a string, parses the complete string into a jCal structure and `ICAL.Component`, retains arrays/maps for all VEVENT components and exceptions, then appends matching recurring occurrences to a result array. A 100,000-iteration limit applies independently to each recurring master; it does not bound response bytes, component count, or total occurrences across all masters. The final result array is returned to the calendar request path.

**Dimensions:** For response size B, VEVENT count C, and expanded occurrences R, the path has O(B + C + R) parsing/mapping work and O(B + C + R) peak data proportional to the raw string, parsed graph, indexes, and output. The raw string and parsed graph are concurrently live during parse/expansion. This is per request and released afterward. Network transfer is the complete feed; nothing here indicates a package-size or process-lifetime leak. No representative feed size, heap peak, or parse time was measured.

**Minimal compatible fix:** Enforce a maximum response byte count while consuming the body, and add a total per-request occurrence/component budget in addition to the current per-master guard. Return a controlled integration error when the feed exceeds the byte budget; define whether occurrence-budget exhaustion returns a partial calendar with a warning or an error. Keep the existing month range, event mapping, and per-master limit unless measurements justify changing them.

**Authorization, cache freshness, and tradeoffs:** Apply bounds inside the integration after the existing integration-selection/authorization path; this does not alter permissions or cache keys/freshness. A byte limit prevents parse amplification but rejects unusually large legitimate feeds; an aggregate occurrence limit can omit valid dense calendars if treated as partial success. Select limits from observed feed distributions before implementation. Compare old/new with representative small, large, exception-heavy, and high-frequency recurrence feeds; measure response bytes, peak heap, parse CPU, and returned event count. No such measurements are available here. Confidence is high in the unbounded source path and medium in user impact because feed-size distribution is unknown.

## Finding: optional SABnzbd archive history scans and materializes far beyond the returned limit

**Call path and trigger:** The downloads widget sends `includeArchivedHistory` (default false), `historyWindowDays` (default 7), and `limitPerIntegration` (default 50) through the API and request handler to `SabnzbdIntegration`. When archive history is enabled, the integration requests archived pages sequentially through `getSabnzbdHistorySlotsAsync`.

**Evidence and cause:** The helper can fetch 100 pages of 100 entries (10,000 archived rows), retaining all rows in `archivedSlots`. It then constructs further arrays for active/archived data, filters, sorts all in-window completed records, deduplicates, and returns the full list. The integration maps every returned history slot, concatenates it with mapped queue slots, then slices to `input.limit`. The API input has no maximum for `limitPerIntegration`; its normal widget default is 50. Archive scanning is opt-in and has an explicit 10,000-row ceiling, so this is bounded work rather than a leak.

**Dimensions:** With N scanned rows (N ≤ 10,000), source work includes O(N) page transfer and parsing plus O(N log N) sort CPU. Several O(N) arrays/sets can coexist during selection, then all selected history rows are mapped before the final limit. The output/cache contains only the final normalized result; the request handler caches that result for 10 seconds, not the archive pages. The main avoidable cost is transient server heap and sort/mapping CPU. Transfer is still needed to find entries inside the requested time window unless the provider contract safely guarantees ordering and the scan can stop. No peak heap or provider response-size measurements were taken.

**Minimal compatible fix:** Keep the sequential page fetch and 10,000-row safety ceiling. Maintain only the most recent completed candidates needed to fill the remaining result slots while scanning, deduplicate against active history, and avoid mapping archived records that cannot be returned. Do not stop early based on presumed page ordering until that contract is verified. Validate a finite API maximum for `limitPerIntegration` separately if large limits are not a supported use case.

**Authorization, cache freshness, and tradeoffs:** Preserve the existing downloads integration middleware, archive opt-in, history-window cutoff, queue-first ordering, and 10-second cache freshness. Bounded top-K retention reduces temporary memory and sort work but does not reduce network transfer when all pages must be inspected. An early stop could reduce transfer but risks dropping newer entries if page ordering differs from assumptions. Compare identical fixtures containing duplicate IDs, active history, in-window/out-of-window rows, and a full 10,000-row scan; record response bytes, heap peak, and CPU. These measurements and verified live ordering evidence are missing. Confidence is high for the extra materialization; medium for practical impact due the explicit cap and opt-in.

## Finding: Aria2 duplicates the full result lists before applying the UI limit

**Call path and trigger:** The downloads API passes `limitPerIntegration` to `Aria2Integration.getClientJobsAndStatusAsync`; the normal widget default is 50. Each call requests active, waiting, stopped, and global status concurrently.

**Evidence and cause:** `tellActive()` returns all active downloads because this API call has no limit argument. The integration then spreads all active rows plus the requested waiting/stopped pages into a new array and calls `slice(0, limit)`, creating another selected array. Only that selected array is mapped. Therefore active response transfer and parsing are provider/API constraints, while the full spread and the additional slice are avoidable.

**Dimensions:** For A active and L requested rows, the response remains O(A + L) and unavoidable. Current extra array copying is O(A + L) transient references before the O(L) slice and O(L) normalized output; mapping CPU is O(L). This is per request and does not establish long-lived retention. `limitPerIntegration` currently has no API maximum. No high-A fixture, heap profile, or CPU measurement was available.

**Minimal compatible fix:** Iterate the three response arrays in their current order and append only the first `limit` rows to one selected array, then map it. Preserve the existing ordering and `paused` calculation over the selected rows. This removes the full concatenated copy without claiming to reduce the provider response or wire transfer.

**Authorization, cache freshness, and tradeoffs:** Keep the current integration authorization path, output ordering, and 10-second downloads cache behavior. The implementation is small and behavior-preserving for positive limits; a separate limit validation change would affect API behavior and needs its own compatibility decision. Measure allocations/CPU against the same fixture with large A and ordinary L; evidence is currently missing. Confidence is high for the avoidable copy and low-to-medium for user impact because active-list sizes are unknown.

## Finding: static package barrel creates an eager import path around the lazy factory

**Call path and trigger:** `packages/integrations/package.json` maps the package root to `index.ts`; that file re-exports `src/index.ts`. The source barrel statically re-exports concrete integration classes, including the assigned media clients. API routers import runtime `mockWidgetData` from the package root in many widget routers. Meanwhile, `base/creator.ts` deliberately uses explicit dynamic imports for concrete integrations so runtime tooling can create lazy chunks.

**Evidence and cause:** The source dependency graph from a runtime root import reaches the broad integration barrel and its concrete implementation exports, even when the importing router only needs mock fixture data. Under native ESM evaluation, static re-export dependencies are loaded with the barrel. Next/Turbopack may prune or split some of this graph, so this audit does not establish that all modules land in one production chunk or are evaluated in the deployed server process.

**Dimensions:** The potential dimensions are cold server module loading, initialization CPU, retained module state, and server bundle bytes. No source-size, generated chunk, startup-time, or heap measurement was taken; no package-byte or RAM reduction is claimed. This is an import-graph finding, not a demonstrated memory leak.

**Minimal compatible fix:** Export mock fixtures through a dedicated subpath and update API runtime imports to that path; move any remaining runtime constants/errors used by the API to narrow subpaths as needed. Keep root exports only where compatibility requires them, and keep concrete instance creation in the dynamic factory. Inspect generated server chunks and module evaluation before deciding whether broader public export changes are warranted.

**Authorization, cache freshness, and tradeoffs:** This does not change integration authorization or data cache semantics. The narrow subpath reduces coupling for internal runtime consumers but adds package exports and may leave external root consumers unchanged. Verify by comparing the exact production server chunk graph and cold-start module load before/after, including whether Jellyfin/Immich/ical.js/Nextcloud modules are reachable from a router importing only mocks. Until that evidence exists, confidence is medium for the static source path and low-to-medium for deployed impact.

## Dedicated large-file passes

### `packages/integrations/src/overseerr/overseerr-integration.ts` (527 lines)

The complete file and request-handler caller were reviewed. Request listing fetches two pages of at most 20 records, combines them while removing pending duplicates, and coalesces media-info requests per unique media only for the current call. At most 40 request records are processed from those page calls. `Promise.allSettled` may issue one metadata request per unique media concurrently, but the page bounds cap that burst. The dispatcher is created per call and closed in `finally`; there is no process-global response cache. Search results are service-sized but passed through JSON parsing before this audit could establish representative response sizes. No actionable retention/concurrency finding or measurements were identified.

### `packages/integrations/src/plex/plex-integration.ts` (624 lines)

The complete file and media-server request-handler caller were reviewed. Current sessions buffer the XML response as text and parse it into a complete object graph, then map every session. This is a full-buffer parser path, but the endpoint represents currently active sessions and no evidence of unusually large session responses was available, so it is not raised as a standalone finding. Media releases use a 100-item output limit and request up to 50 recently added episodes per show library; these caps bound the intended result but transfer/parse size still scales with show-library count. The per-call dispatcher is closed in `finally`. No real response-size, heap, or latency measurements were taken.

## Other inspected paths

The integration factory uses explicit dynamic imports. Audiobookshelf runs one stats request per returned library concurrently; no library-count measurements were available. Immich fetches albums in pages of 1,000 and prefetches at most four speculative pages, but the carousel consumes the full selected album for rotation/count/thumbnails, so full album metadata is part of current behavior. Navidrome album counting stops after 20 pages of 500. Nextcloud fetches calendar objects concurrently per calendar and expands occurrences for the requested range; no configured-calendar or occurrence counts were available. Download integrations with explicit server-side pagination (qBittorrent, Sonarr/Radarr queues, Tdarr) pass limits/pages to providers. No subscription/client lifecycle leak was found in assigned files. Session-store callers persist encrypted session envelopes in Redis and use TTL/clear behavior where applicable; the per-instance configuration string is not a process-global cache.

No generated integration schema or binary data asset was identified in the assigned paths. The large in-source mock fixture is application demo data rather than provider payload or integration client state. The static package import finding above is the only source-level loading concern; generated bundle sizes remain unverified.
