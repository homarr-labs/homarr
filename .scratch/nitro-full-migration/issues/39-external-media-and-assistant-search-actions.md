# 39: External, media and Assistant search actions

**What to build:** Execute external/media/Assistant search modes with safe modifiers, selection/context and real authorized handoffs. Own generic integration-search orchestration and external-bangs lookup services as well as browser consumers; provider-native search/request engines remain their bounded owners.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] External mode honors selected/default engines, shortcut/bang choices, modifier/new-tab preferences and safely encoded targets; #36/#16/#17 mutations refresh choices without leaking private context into external URLs/logs.
- [ ] Own the authorized `integration.searchInIntegration` replacement service/endpoint and generic orchestration: validate exact integration/query-kind capability before secret execution, invoke accepted provider-native search contracts, and preserve source identity/query semantics, bounded cancellation/timeouts, sanitized errors and distinct unavailable/denied/partial/empty states.
- [ ] Own bounded `bangs.search` lookup and external-bangs consumer behavior, including source query/limit 1–50 validation, approved connection/caching policy and safe results/targets; no browser-only rewrite or fabricated lookup success counts as completion.
- [ ] Media mode selection/play/request/confirmation uses real provider consumers and #52's media-request target/search/options/request wrappers where applicable; native upstream requests/actions stay server-owned and are never arbitrary browser fetches or automatically retried ambiguous mutations.
- [ ] Assistant mode reflects actual availability/capability and hands off bounded context to #94/#98's real flow. Unmount/cancel/logout masks private results and terminates seam work without recreating chat/stream/tool/history engines.
- [ ] Focused future safe external target/bangs failure, denied generic search and one real available media/Assistant handoff verify services/endpoints/UI and cleanup; unavailable upstream evidence remains explicitly unverified, not fixture-only parity or an authorized live matrix.

## Coverage

SEARCH-04: external/media/assistant mode descriptors/clients, engines/defaults/new-tab/bangs, primary `integration.searchInIntegration` generic orchestration and primary `bangs.search` external lookup. #52 remains primary for `integration.mediaRequestSearchTargets`, `searchMediaRequests`, `getMediaRequestOptions`, `requestMedia` and native Seerr search/request/moderation; this ticket consumes wrappers rather than owning them. #42's generic HTTP executor is separate, not substituted for search.

## Required contracts

#37's mode/action dispatcher; #36/#16/#17's engine/preferences results; #04/#40's query-kind authorization/trusted execution; each actually selected provider's exact search DTO/error/cancellation contract, especially #52 request wrappers; #51's playback handoff where used; #94/#98's Assistant availability/context and #22's safe targets. Require individually accepted revisions, not whole provider/Assistant completion.

## Decision holds

Search query-kind/public scope, external-connection/bangs bounds/cache, confirmation/mutation and private-context policy need disposition. Detailed locale/SSR/cache/revocation and source-discrepancy decisions stay held where applicable; Q12 governs saved engine/integration references. Candidate recommendations or unavailable providers are not approval.

## Ownership

One local writer owns complete generic-search/bangs services/endpoints, three mode adapters and focused regressions. Providers own native execution; #37 alone writes its registry; #01 alone composes root SSR/providers/central routes/manifests. Descriptive folder-based route contributions/ignored helpers respect layout/pathless/non-nested/dynamic semantics. Record exclusive files/contracts before dispatch; no old URLs/aliases required.
