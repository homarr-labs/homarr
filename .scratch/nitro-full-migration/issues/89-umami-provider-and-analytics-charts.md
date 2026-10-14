# 89: Umami provider and analytics charts

**What to build:** Configure/test cloud or self-hosted Umami, select websites/events/time ranges, persist analytics settings and render all native result/chart families plus the Stats projection as one complete path.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Managed cloud API-key (`x-umami-api-key`) and self-hosted username/password JWT modes configure/test/switch correctly; native trusted-client/auth/generic-HTTP hooks preserve redaction, server-only keys/JWT and revision-fenced session/cache invalidation under use/full/query policy before decrypt.
- [ ] Native website list/by-ID, visitor stats/pageviews/sessions/visits/bounce/duration, active visitors, event discovery/counts/multi-event series and top pages/referrers retain cloud/self-hosted envelopes/date parsing/paging/null/limit semantics; Stats projection `websites` count is registered and consumable by #88, not a second provider implementation.
- [ ] All eight options and primary website/single-/multi-event inputs validate/convert/save/reload with one compatible integration; deleted/unavailable choices have repair states, dependent website changes clear invalid event choices and saved/undefined-preview checks cannot borrow another placement's authority.
- [ ] Every timeframe (`24h`, `today`, `7d`, `30d`, `month`, `lastMonth`) preserves deliberate source server-local range boundaries versus website timezone and UTC event buckets; bounds, limits/truncation and mode-specific result meanings receive separate cloud/self-hosted fixture evidence, not an invented user-local conversion.
- [ ] View-mode queries use exact integration/website/timeframe/event(s)/topCount inputs and actual keys; chart type/style/series/legend/advanced views avoid hidden-view queries or active/chart key collisions. Explicit 60s consumer polling reconciles root no-poll/demo policy with scoped refresh/cancellation and credential revision changes.
- [ ] Partial/missing/upstream/auth errors, stale retention versus forbidden/session clearing and approved request-local hydration/client chart boundaries avoid duplicate calls and secret leaks; future focused two-mode auth/time/paging, persisted selectors and Stats/chart join evidence uses disposable credentials. Real opt-in deployment evidence covers both modes/time ranges or stays honestly unverified under the approved release-evidence scope.

## Coverage

Primary widget `umami` — 8: `websiteId`, `timeFrame`, `viewMode`, `chartType`, `chartStyle`, `eventName`, `eventNames`, `topCount`. Primary inputs `umamiWebsite`, `umamiEventName`, `umamiEventNames`; consumes `select`, `number`. Primary provider `umami` from removed INTEGRATION-024, including native client/SDK adaptation as actually used, configure/test, auth/session hooks, full native results, generic HTTP eligibility/auth projection, Stats `websites`. Primary leaves `widget.umami.getWebsites/getVisitorStats/getEventNames/getTopPages/getTopReferrers/getMultiEventTimeSeries/getActiveVisitors`. `mock` consumer path remains supported. Exact [original widget body](../drafts/widgets.md#widget-umami--websiteevent-selectors-through-analytics-charts), [provider body](../drafts/integrations.md#integration-024--umami-website-selectors-and-time-scoped-analytics-in-both-auth-modes), [source provider/auth/Stats ledger](../../../research_notes/Homarr%20full%20Nitro%20migration/integrations.md).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) and [DESIGN](../DESIGN.md); current placement/kind/type/refinement validation, permission-before-secret, exact identities, cleanup and explicit durable conversion apply.

## Required contracts

Initially unaccepted: #40 trusted native execution/session/credential revision and local provider descriptor; #41 reusable managed forms/test/grant policy; #42 generic HTTP hook consumption (not its executor); #04 full/use/query/preview policy; #03 bounded cache/session/clock; #67 query/error/host; #68 options/editor; #07 time basis; #88 Stats projection consumer; #120 typed selectors/results/errors. Accept narrow revisions independently; real both-mode provider/auth/Stats/chart evidence is a later join, not a completed-provider or all-89 start barrier.

## Decision holds

Q11/Q12 encrypted config/options conversion, Q13 affected saves, Q15 JWT/session continuity paths; Umami server-local versus website timezone redesign cannot be assumed. SSR, cache freshness/time buckets and local polling/demo override remain genuine holds on affected paths; fixture auth does not establish production identity.

## Ownership

#89 solely owns Umami native/client/auth/result/Stats implementation and website/event/widget service/input/charts; INTEGRATION-024 has no separate surviving owner. #41 owns connection-management forms, #42 generic executor, #40 common runtime, #68 option wrapper/#29 placement. COMPOSITION installs descriptors/exports/dependencies; exclusive local allocation precedes dispatch.
