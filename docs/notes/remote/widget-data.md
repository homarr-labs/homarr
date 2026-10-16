# Shared board widget data

`apps/worker/src/widget-data.ts` maps persisted board items to reviewed native reads. The caller is supplied by the worker after share authorization; read shares use a durable local session with only `view` permission on their granted boards. The helper accepts a lazy caller factory so local widgets do not load the integration API.

## Scope and boundaries

The helper accepts saved kind/options/integration IDs/placed item ID/board ID. Its dispatch paths are hardcoded. Extra option fields cannot select another procedure, action, item ID, or integration ID. Integration IDs used by statistics entries must also belong to the placed item. The response is a bounded display DTO with an explicit status; upstream failures return a generic unavailable reason.

All 69 declared widget kinds have an explicit projection or explicit read-only limitation. The mappings include weather/air quality/clock, notebook, countdown/timer settings, bookmarks/apps, feed/timetable/stock/Minecraft reads, monitoring/storage/network/firewall/VPN/UPS, DNS/download/media/calendar, Beszel, Immich metadata, statistics, notifications, Coolify, Paperless/PatchMon/Bazarr, ArchiveTeam Warrior, Tracearr, speed tests/Uptime Kuma, audio/Umami, Traefik/WUD/llama.cpp, Wazuh, and Custom Widget display data.

Security-specific projections:

- Beszel resolves the saved system against scoped discovery results. Canonical integration/system pairs must match. Legacy bare IDs must resolve uniquely; blank selects the first scoped discovered system. Historical reads use exactly that selected integration. Disabled Docker metrics exclude container statistics.
- Immich uses only the saved album selection (`all` means all photos); it does not accept a client-selected album or integration. Worker-local image-proxy capability URLs are replaced only through an optional board-bound media signing callback, or removed if no callback exists.
- Statistics uses a new native `displaySnapshot` query. It performs a non-forced refresh through the existing bounded queue, then returns the snapshot. The shared projection publishes only visible saved metrics belonging to attached integrations. Existing refresh freshness is one hour and the pending queue is bounded at 128.
- Custom Widgets use a new native `getShareData({itemId})` query. It resolves the placed definition with native board access, executes only query/load requests whose permission is exactly `view`, and returns only `data` and `status`. Modify/full load queries, manual queries and actions are excluded even for an owner caller. Request limits, native source authorization and stored-secret response redaction stay in the existing executor. No template, configuration, source manifest, capability or exception text is returned.
- Docker requires explicitly saved endpoint IDs and filters results to those endpoints and the saved container filter. Its DTO includes selected container state/resource columns; environment, labels and endpoint connection configuration are excluded. Native admin permission still applies; a read-only share session cannot access this admin API without a separate reviewed board-bound Docker read contract.
- Bookmarks project only saved entries and visible application fields. Credential-bearing links are rejected. Application ping URLs, headers and integration configuration are never forwarded.
- System disks honor saved volume selection; health monitoring partitions system and cluster integrations by their actual persisted kind.

The JSON projector recursively strips credential/configuration/source fields, username fields, executable templates and capabilities. It removes URL userinfo, credential query URLs, authorization strings, unsupported URL schemes and local `/api/` bearer paths. Output is bounded by depth, array/object lengths, 8,000 visited values and 256 KiB of text per widget. It does not claim arbitrary owner-authored content is nonsensitive: publishing a board intentionally shares its notes, alerts and selected monitoring data.

## Explicit limitations

- Assistant conversation/tool execution and the automation action button are not read-only display APIs; they report unsupported.
- Iframe/video widgets return a safe link. A frontend must explicitly permit embedding rather than execute supplied content automatically.
- The worker root supplies the encrypted share-bound binary transport for Immich photos. The projector accepts only exact native image-proxy paths and replaces them with signed paths for the actual board; raw local bearer URLs, query variants and unrelated API paths are never forwarded. Without the callback, those image URLs are removed.
- Docker admin access is denied to view-only shares until a dedicated scoped read contract exists.
- Calendar displays the current UTC month. Viewer calendar navigation and live Beszel subscription transport need separate bounded read inputs; the snapshot uses saved selectors.
- Timer state is local to each viewer. Countdown returns the saved event definitions and current time for frontend recurrence rendering.
- Existing native access checks can refuse data for integrations that require additional grants. The projector reports unavailable rather than elevating a viewer to owner.

## Focused validation

- `mise exec -- bun test apps/worker/src/widget-data.test.ts`: **11 passed**. Covers lazy local data, fixed query dispatch, attached integration scoping, Beszel system selection/ambiguity, Docker endpoint scoping, saved Immich selection/media redaction, selected statistics, signed media mapping, Custom Widget item scoping, recursive credential sanitization, action denial and generic errors.
- Exact existing Custom Widget router spec plus the new statistics display spec: **10 passed across two files**, including view-only load filtering under an owner caller, private-board view grants, hidden upstream errors, denied anonymous access and non-forced bounded statistics refresh after query authorization.
- API and worker package typechecks pass. Focused lint and whitespace checks pass with no errors or warnings.

Native procedure inventory gains two intentional query paths (`widget.customApi.getShareData`, `widget.stats.displaySnapshot`): baseline 346 paths remain, total 348.
