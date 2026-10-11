# Audit 05: app routes and startup

## Actionable opportunities

### 1. Bound peak memory during SQLite restore

**Files and call path:** `apps/nextjs/src/app/api/backup/import/route.ts` is called by `DatabaseRestoreFlow` at `apps/nextjs/src/components/backup/database-restore-flow.tsx:201`, available from the initialization flow and management backup UI. Admin or onboarding-claim restore is an explicit user action.

**Trigger and cause:** For an upload near the 256 MiB compressed limit, `readBoundedRequestBodyAsync` retains chunks and then allocates a contiguous body. `parseBoundedFormDataAsync` builds a `Response` and parses multipart from that body. The handler then materializes `file.arrayBuffer()`, constructs AdmZip, and `getData()` inflates the SQLite entry (allowed up to 512 MiB) before `writeFileSync`. These representations may overlap. The limits protect disk/zip-bomb bounds but do not establish a safe peak-RAM bound.

**Dimensions:** This is transient server RSS/heap and allocation pressure during restore. It does not affect browser transfer size beyond the user-uploaded archive, JS bundle size, or steady-state retention after the handler returns. No peak RSS/heap measurement or representative compressed/uncompressed fixtures were available, so the actual peak and overlap are unknown. A reasonable baseline is a controlled restore of representative and near-limit archives while recording process RSS and heap by stage; record compressed bytes and uncompressed DB bytes separately.

**Smallest compatible direction:** Stream the multipart file to a temporary file and extract the DB entry to disk through a streaming ZIP reader, retaining the existing compressed/uncompressed limits and path validation. Confirm the selected parser's ZIP64, malformed archive, duplicate entry, and traversal behavior before replacing AdmZip. This is moderate-to-high complexity and changes a security-sensitive restore path; temp-file cleanup and migration/re-encryption ordering must remain intact. Confidence: high that several large buffers are materialized in sequence; medium that they overlap enough to cause user-visible pressure; magnitude unmeasured.

### 2. Avoid serializing full branding into client provider props

**Files and call path:** `apps/nextjs/src/app/[locale]/layout.tsx` fetches server settings for every localized page. It passes all `serverSettings.branding` to both `SettingsProvider` and `CustomMantineProvider`, and separately emits `branding.customCss` in the root `<style>`. `CustomMantineProvider` (`_client-providers/mantine.tsx`) reads only `primaryColor`, `secondaryColor`, and `defaultRadius`. Server settings permit `customCss` up to 16,384 characters. The settings context type includes branding, but no client `useSettings().branding` consumer was found in the assigned app/package search; a broader repository consumer check is needed before removing it.

**Trigger and cause:** Every RSC render/navigation through the locale layout can carry provider props. At maximum CSS size, the same CSS may be serialized as client settings data and as Mantine provider branding in addition to the inline style. RSC may deduplicate/reference repeated values, so the duplication factor is not established from source alone.

**Dimensions:** Potential extra serialized response bytes and per-request serialization/allocation only. This does not imply extra JS bundle bytes or long-lived client RAM after parsing. No RSC capture or encoded byte measurement was available. Measure a locale route with empty CSS and a 16,384-character CSS value, compare raw Flight response bytes and server RSS/heap, and inspect whether repeated values are encoded once or multiple times.

**Smallest compatible direction:** Pass a three-field projection to `CustomMantineProvider`; if complete repository search confirms no client consumer, omit `customCss` (or branding entirely) from the client settings context while keeping the server-rendered inline style. This adds small type plumbing and could affect future settings consumers, so preserve the server layout's CSS/style behavior and verify all package consumers. Confidence: medium that the Mantine prop is over-broad; low-to-medium that it causes material wire/RAM overhead until measured.

## Reviewed but not promoted

- Contributor data imported by the About page and static JSON endpoints totals 62,664 bytes uncompressed (`translators.json` 42,904; `contributors.json` 13,595; `opencollective-contributors.json` 6,165). The About page is the direct consumer and renders contributor cards; no evidence showed that the API endpoints are called by the page. This is a route/page-scoped cost, not startup loading. It is modest and has no measured transfer or hydration impact, so it is not promoted.
- `/api/backup/export` also holds the vacuumed SQLite file and a ZIP buffer before responding. This is an explicit admin action, and peak overlap/RSS was not measured. The import path has a clearer sequence of several full-body and inflated-DB materializations, so export remains a follow-up measurement rather than a separate finding.
- `/api/backup/sql-wasm` lazily caches a 659,730-byte WASM Buffer per process after a client invokes backup analysis. The single retained asset is bounded and explicitly requested; it is distinct from the browser's download and was not considered actionable.
- The root tRPC provider scopes and clears its QueryClient, closes its lazy WebSocket client, and avoids duplicate streamed hydration for RSC-prefetched widget queries. Development tools are loaded dynamically only in development and remove their query/mutation/DOM subscriptions on teardown.
- Startup uses dynamic production-only service imports and starts tasks/WebSocket concurrently. Locale proxy database reads are coalesced only while pending and clear on both resolve and reject. No unbounded retained startup state was found in assigned files.

## Evidence limits

No production changes, tests, builds, or benchmarks were run. Findings are source-backed opportunities with explicit missing measurements; bundle size, serialized bytes, transient RSS/heap, and retained process memory are kept separate. Per-file coverage is in `audit-evidence/2026-10-11/coverage/audit_05.json`.
