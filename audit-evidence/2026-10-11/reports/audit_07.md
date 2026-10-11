# Audit 07: widget families B

## Scope and completion

Read all 134 assigned files in full and recorded per-file evidence in `audit-evidence/2026-10-11/coverage/audit_07.json`. Completed dedicated full-file passes and caller reviews for `bookmarks-widget.tsx`, `downloads/component.tsx`, `llama-cpp/component.tsx`, `widget-edit-modal.tsx`, and `timer/component.tsx`; see the large-file notes below. Traced the relevant widget definitions, query consumers, server request handlers/integration code, modal reducer, and query cache behavior. No production or test files were changed. No tests, builds, browser runs, heap profiles, or benchmarks were run.

## Findings

### 1. RSS compact mode eagerly loads an image for every feed entry

`packages/widgets/src/rssFeed/component.tsx` calls `getFeeds` with `maximumAmountPosts` from the widget options, defaulting to 100. The compact branch maps every returned entry. For every entry with an enclosure it renders a background `Image` without `loading="lazy"` (lines 180–196), regardless of the `showPosterImage` option. The optional foreground poster is a second image and does use lazy loading (lines 198–208). The definition permits up to 9,999 posts (`packages/widgets/src/rssFeed/index.ts`, lines 47–50); the API accepts up to 100 feed URLs and requests `count` entries from each, then globally slices to `maximumAmountPosts` (`packages/api/src/router/widgets/rssFeed.ts`). Thus a single widget can return and render up to 9,999 compact entries, each potentially causing an offscreen enclosure image request. With `showPosterImage` enabled, a card may create two image elements for the same enclosure.

**Dimensions and cause:** React/DOM and image-element allocation scales with returned entries. Eager image requests can increase image transfer, decode work, and decoded-image memory while the scroll area is mounted. The feed JSON response and React Query cache also retain the entry records; that is a separate payload/cache dimension. The output cap is a hard maximum but still much higher than a typical visible compact list. These are source-derived upper bounds, not observed requests or memory.

**Smallest compatible fix:** Set `loading="lazy"` on the background image. Consider rendering it only when the visual option is enabled, after checking whether the background is intended to be independent of the poster option. Preserve the configured entry count unless product behavior calls for a lower cap.

**Compatibility and tradeoffs:** Native lazy loading preserves scroll content and option behavior, while delaying images until near the viewport. Suppressing the background when `showPosterImage` is false changes current compact-mode appearance and needs a product decision. A lower entry cap would also change visible behavior for users who intentionally configured large feeds.

**Evidence and gaps:** Source cap and render cardinality were inspected; no browser network trace, response-size measurement, compressed-transfer measurement, decoded-image memory measurement, or React profile was collected. Validate with a cold-cache dashboard containing a large feed, recording image requests before and while scrolling, plus the serialized query response separately from transferred/compressed bytes.

**Confidence:** High that every entry with an enclosure emits an eager background image and that the configured maximum is 9,999; medium on practical impact because real feed sizes and browser request/decode behavior were not measured.

### 2. Media request cards eagerly load poster and original-size backdrop images

`packages/widgets/src/media-requests/list/component.tsx` maps all returned requests to cards (lines 77–86). Each card emits a backdrop `Image` with no lazy-loading prop (lines 131–141), and emits another poster `Image` for non-tiny layouts, also without lazy loading (lines 151–161). The Overseerr integration fetches up to 20 pending and 20 recently modified requests, then de-duplicates pending entries; therefore it returns at most 40 records per integration for this path (`packages/integrations/src/overseerr/overseerr-integration.ts`). The backdrop URL uses TMDB's `/original/` image size, while the poster requests a 600-by-900 rendition. A board may select multiple integrations, multiplying the returned cards and image tags.

**Dimensions and cause:** Card and image-element allocation grows with returned records. Images below the visible portion of the scroll area are not explicitly lazy, so the browser may request/decode them before the user scrolls to the cards. The original backdrop size can make transfer/decode cost materially higher than a small thumbnail, but no size or actual request measurement is available. This does not establish long-lived JS retention; it is potential transfer, decode, and transient decoded-image memory.

**Smallest compatible fix:** Add `loading="lazy"` to both card images. If the image provider supports a suitable backdrop thumbnail URL, use that for the background while preserving a larger poster where the UI needs it.

**Compatibility and tradeoffs:** Lazy loading retains the current card appearance as items approach the viewport. Changing the backdrop rendition may alter image quality and depends on the integration's URL contract; implement it only with provider support.

**Evidence and gaps:** The card render path, image URLs, and per-integration request cap were inspected. No configured integration count, browser network trace, actual asset byte size, compressed transfer, or decoded-image memory was measured. Validate on a board with multiple integrations and a cold image cache; compare request count/bytes before and after scrolling.

**Confidence:** High on the eager image tags and 40-record per-integration upper bound; medium on user impact and actual transfer due to unknown integration counts, caching, and browser scheduling.

### 3. Archive Team Warrior sends and caches item details even for compact widgets

`packages/widgets/src/archive-team-warrior/component.tsx` uses a suspense query for `getStatus` and always receives `data.status`. Compact display reads project/status/count/bandwidth fields, while only advanced display consumes and maps `status.items` into individual cards (lines 53–65 and 104–170). The server status handler builds a status snapshot containing the item map and returns the full status object. The query consumer therefore receives and caches item details for compact widgets that do not render them. The common request-handler cache can retain returned results; each load makes a fresh status snapshot, so the observation is per-response/query retention, not an accumulating map across refreshes.

**Dimensions and cause:** Response serialization and network transfer scale with item count and item-field lengths. React Query cache retains the complete response while the query remains cached. In compact mode, there is no corresponding item-card DOM allocation, but the records still occupy response/cache memory. No item-count cap or payload projection is visible in this widget call path.

**Smallest compatible fix:** Provide a compact status projection that excludes `items`, or make item details an advanced-only query. Keep summary counts and status fields identical. Confirm cache keys and invalidation remain separated so compact and advanced queries cannot reuse incompatible shapes.

**Compatibility and tradeoffs:** Splitting/projection reduces compact payload and cached data but adds a query/API contract and could increase request count when switching to advanced mode. If current item lists are small, added complexity may outweigh savings.

**Evidence and gaps:** Full response construction, query use, and compact/advanced rendering were inspected. No item-count distribution, serialized payload size, compressed transfer, cache occupancy, RSS, or user-visible latency was measured. Validate compact and advanced modes against small and large snapshots, measuring response bytes and cache size independently.

**Confidence:** High that compact mode does not use the item details while receiving the full response; medium-low that this is material because typical item count and serialized size are unknown.

### 4. Compact weather statically imports the chart-only advanced subtree

`packages/widgets/src/weather/component.tsx` statically imports both `AdvancedWeather` and `CompactWeather` and chooses between them at render time. `weather/advanced.tsx` imports `CompositeChart` from `@mantine/charts`, while compact mode does not render that subtree. The outer widget definition dynamically loads the entire widget component, so this is not an eager import on every dashboard; it means the weather widget chunk can include the advanced chart dependency even when a user only uses compact mode.

**Dimensions and cause:** Potential client bundle bytes and transfer increase for compact-only weather users. The statically imported chart subtree is also evaluated as part of the widget chunk; the source does not establish a persistent RAM increase attributable to it. No built chunk or compressed network size was measured.

**Smallest compatible fix:** Split `AdvancedWeather` with a dynamic import or a separate lazy boundary selected only for advanced mode. Keep the current outer widget-level lazy loading.

**Compatibility and tradeoffs:** The advanced view may incur an additional chunk request and brief loading state the first time it opens. A split only helps if the production bundler emits a distinct chunk and compact-only routes do not preload it.

**Evidence and gaps:** Static import graph was inspected. No bundle analyzer output, generated chunk mapping, transfer-size report, parse/evaluation timing, or heap measurement was collected. Validate with production build analyzer/network data for a dashboard containing compact weather only and one using advanced weather.

**Confidence:** High that source statically imports the advanced chart graph; medium that it increases delivered bundle bytes because actual chunking and tree shaking were not measured.

## Other reviewed paths

The remaining assigned widgets and shared helpers did not establish a separate actionable allocation, retention, transfer, or lifecycle issue. Timer timeout/audio cleanup and bounded runtime history were confirmed. The modal reducer removes closed modal entries; nested `keepMounted` state preservation therefore does not create accumulation across closes. Downloads transforms query data but the visible result set is bounded by its configured integration limits. Bookmark render work follows the user's configured collection. Wazuh result paths have explicit limits. The other reviewed query consumers render the fields or records they receive; no stronger evidence for avoidable result copies was found.

## Large-file notes

### `packages/widgets/src/bookmarks/bookmarks-widget.tsx` (503 lines)

Dedicated full-file pass completed. Traced the concrete bookmark widget caller and its groups/data, item, layout, add-button, and prefetch helpers. The widget builds grouping and rendering collections from user-configured bookmarks and renders the configured groups/items; no independent unbounded source or retained duplicate cache was established. Any list-size cost follows the user's saved bookmark count. No actionable finding.

### `packages/widgets/src/downloads/component.tsx` (1,449 lines)

Dedicated full-file pass completed. Traced definition/query caller, helper transformations, filtering, sorting, selection, pagination, and actions. The component derives eligible/available and display lists from a result set bounded by per-integration limits; these are render-time projections rather than an accumulating retained history. No missing event/timer cleanup or unbounded client copy was established. No actionable finding.

### `packages/widgets/src/llama-cpp/component.tsx` (571 lines)

Dedicated full-file pass completed. The component consumes scalar/model/server statistics, derives request-speed values, and renders those values; no growing history or repeated full response copy was established in this widget. No actionable finding.

### `packages/widgets/src/modals/widget-edit-modal.tsx` (861 lines)

Dedicated full-file pass completed. Traced the lazy modal caller and modal reducer/close behavior. Resize and mutation observers are cleaned up; integration forms mount on visit to preserve form state. The reducer removes a closed modal from the stack, while nested modals preserve the parent only during the nested interaction. This does not accumulate closed modals across repeated opens. No actionable finding.

### `packages/widgets/src/timer/component.tsx` (610 lines)

Dedicated full-file pass completed. Traced `useWidgetNow`, timer runtime, completion sounds, and component callers. The clock hook clears its timeout and visibility listener on cleanup; completion sound sequences clear scheduled timeouts/audio on cleanup; persisted history is capped at 20 entries. No actionable finding.

## Measurement limits

No runtime performance dimensions were measured. RSS and media-request counts/caps are source-derived; they are not browser-observed requests. Archive response/cache size and weather bundle bytes remain unmeasured. No statement here equates allocations, retained JS memory, compressed transfer, image bytes, decoded image memory, or bundle size.
