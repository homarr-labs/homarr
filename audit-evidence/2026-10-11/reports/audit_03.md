# Audit 03: management tools and administration

## Scope and completion

Read all 109 assigned files in full, including the dedicated complete passes of `docker-table.tsx` (503 lines) and `tasks-table.tsx` (517 lines). The per-file evidence and status are in `audit-evidence/2026-10-11/coverage/audit_03.json`. Traced concrete route callers for Docker, Kubernetes, logs, tasks, settings, search engines, certificates, and the API tools page. No production files were changed. No tests, builds, browser run, heap profile, or performance benchmark was run.

## Findings

### 1. About page mounts all contributor image tags under collapsed panels

`/manage/about` imports GitHub contributors, Open Collective sponsors, and translators and maps every record to `GenericContributorLinkCard` within four accordion panels (`apps/nextjs/src/app/[locale]/manage/about/page.tsx`). Local source assets contain 151 GitHub contributors, 39 sponsors, and 287 translators: 477 Avatar image elements total, backed by 62,664 bytes of JSON. The `Avatar` is passed each remote image URL without `imageProps.loading="lazy"`.

The installed Mantine 9.6 implementation was inspected: Accordion panels inherit `keepMounted`; Collapse defaults to `keepMounted: true` and uses React Activity hidden mode. Thus closed panels retain/render their children, and the Avatar implementation emits a plain `<img>` with the source URL. The user opens the About route with only the contributors panel selected, yet the other panel images are still present in mounted hidden content and can be fetched eagerly. This makes one page visit trigger up to 477 third-party image requests and creates all card/avatar UI nodes before the user opens those sections.

**Dimensions:** DOM/component allocation is O(G), where G is the contributor count (currently 477); potential external transfer is the sum of remote avatar responses, which was not measured. The 62,664-byte JSON figure is the raw local source size, not compressed transfer or browser RAM. No browser network trace or heap snapshot was collected, so actual response bytes, cache hits, decode memory, and timing remain unknown.

**Smallest compatible fix:** mark these Avatar images lazy, or mount contributor panel contents only after activation. Lazy image loading is the narrower change and preserves the current accordion interaction. To validate, compare a cold-cache browser network trace before/after opening `/manage/about`; record initial avatar requests and transferred bytes, then inspect decoded image memory after opening each panel.

**Confidence:** medium-high for all records being rendered and the absent lazy attribute; medium for the exact number fetched immediately because browser scheduling/cache policy was not measured.

### 2. Docker table creates four mutation observers per container row

`/manage/tools/docker/page.tsx` fetches the complete Docker inventory and passes it as `initialData` into `DockerTable`. The table disables pagination and does not enable row virtualization. Its `renderRowActions` creates a `ContainerRowMenu` for each row (`docker-table.tsx`). Each menu calls `useContainerAction` four times, once each for start, stop, restart, and remove, so N visible containers create four idle TanStack mutation observers per row even though only one action is invoked for a row at a time. The action bar also owns four mutation hooks when selection actions are rendered.

This is an avoidable client-side allocation and observer subscription count of O(4N); these hooks do not retain completed mutation results for every container, so the evidence supports per-row observer/React-query state allocation rather than a claim of unbounded mutation-cache retention. Container cardinality is environment-dependent and was not collected, so absolute heap cost and render latency are unknown.

The same module's `showContainerActionResult` filters failures, then finds the matching container by scanning the container list for each failed result. For bulk actions with F failures and C selected containers, the lookup is O(F*C), worst-case O(C²). Action requests cap selected targets at 100 in `packages/api/src/router/docker/docker-router.ts`; that bounds this particular CPU path, though it can still perform up to 10,000 comparisons.

**Smallest compatible fix:** hoist the four operation mutation hooks to `DockerTable` and pass action callbacks into row menus, preserving operation-specific notifications and invalidation. For the lookup, build a `Map` keyed by endpoint ID plus container ID once per result handler. This reduces observers to a constant count and name resolution to O(F+C).

**Dimensions:** observer count scales linearly with inventory rows; the failure-name loop scales quadratically with a selected bulk operation. No React profiler, heap snapshot, representative container inventory, or mutation timing was collected. These are source-derived operation counts, not measured milliseconds or bytes.

**Confidence:** high for the hook count and nested scan; medium for material user impact because a typical configured Docker inventory size was not measured.

### 3. Kubernetes service and ingress child keys change on every render

`ingresses-table.tsx` calls `createId()` for every nested ingress path child, and `services-table.tsx` does the same for each service port and target port. `createId` is re-exported from `@paralleldrive/cuid2` (`packages/common/src/id.ts`), so the keys are newly generated on every cell render instead of identifying the corresponding path or port. Any table rerender therefore replaces those nested DOM children and allocates new IDs, even when the resource data is unchanged. Table search/state changes and query updates are concrete rerender triggers.

**Dimensions:** O(P) new identifiers and child replacements on a render, where P is the number of displayed nested paths/ports. This creates transient allocation and DOM/React reconciliation work, not persistent record retention. Cluster resource and nested path cardinalities were not measured; no browser profiler or mutation count was collected.

**Smallest compatible fix:** use a stable key derived from the resource identity and nested value, with an index only if duplicate values within a resource are valid. Validate with a profiler while changing the table search and confirm unchanged path/port nodes are not remounted.

**Confidence:** high that keys are unstable and cause replacement; medium for meaningful impact at typical cluster sizes.

## Other reviewed paths

- Settings fetches its initial settings and selectable board/search lists concurrently. The client receives the fields used by the settings form; saves send only changed groups in parallel, and the baseline is updated after success. No unnecessary full-record projection was proven.
- The API tools route passes the full grouped MCP tool catalog to `ApiPageTabs` even though the first selected tab is documentation. The MCP group data is required when its tab is selected, but the number/serialized size of tools was not measured and the RSC prop-transfer amount was not captured. This remains a measurement question rather than a finding. Scalar is rendered through a locale iframe and its component/CSS live on the separate reference route, isolating its bundle from this page's direct import graph.
- Kubernetes resource pages pass full returned lists to non-paginated tables, as those tables expose/filter the returned resource fields. Context selection uses linear scans over a small configuration list; no evidence of high cardinality was found.
- Logs retain a bounded history (`LOG_HISTORY_MAX_ENTRIES`), bound terminal scrollback to 20 lines per history entry, clear queued Docker log chunks once the terminal is ready, and dispose terminals/addons/timers on unmount.
- Backup export revokes its object URL after initiating download. Unsaved-change guards return cleanup for their document/window listeners. Certificate pages parse the loaded certificate contents into display metadata and send only filename/hostname/thumbprint values to client actions.
- `MobileAffixButton` and `ManageMobilePrimaryAction` each render desktop and mobile branches, duplicating their child subtree in the DOM. Current callers pass small actions; without evidence that these children create expensive component trees or effects, this is not reported as an actionable issue.

## Large-file notes

### `docker-table.tsx` (503 lines)

Dedicated full-file and caller pass completed. Caller is `/manage/tools/docker`, which preloads all inventory data, and the same table is also opened in the Docker quick-access modal without initial data. Pagination and row virtualization are disabled/not enabled. The four per-row mutation hooks and quadratic failure-name lookup are documented in finding 2. The row data remains necessary for displayed columns, capabilities, logs navigation, and the add-to-Homarr action. No payload projection or cache-retention reduction was established from this file alone.

### `tasks-table.tsx` (517 lines)

Dedicated full-file and caller pass completed. `/manage/tools/tasks` supplies the registered job list once as query initial data. The status map and loading-state map are keyed by job name; statuses arrive from one tRPC subscription, and mutation/loading state is limited to registered jobs and current actions. There is no per-cell subscription or per-row mutation hook. The arrays/map work is bounded by the task registry, whose runtime count was not measured. No actionable memory or CPU issue was established. No subscription teardown issue was visible in the hook usage.

## Measurement limits

Only local source cardinalities/bytes were measured for the About contributor assets. No request payload, compressed transfer size, client bundle size, browser heap, decoded image memory, React render duration, or server RSS was measured. A follow-up runtime pass should use a cold browser cache for About image requests; representative small and large Docker inventories for row observers and selection; and a populated Kubernetes cluster for nested-key remount counts. Do not treat local JSON bytes or operation-count analysis as observed network/RAM/latency results.
