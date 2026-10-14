# 53: DNS summaries and controls

**What to build:** Configure/test the three DNS services, render complete summaries/Stats and perform permitted enable/timed/indefinite disable operations with correct versioned sessions.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `piHole,adGuardHome,technitiumDns`, native checks, H eligibility and projected dnsQueriesToday,adsBlockedToday,domainsBeingBlocked,adsBlockedTodayPercentage (percent). Pi-hole K or none preserves v5 query/v6 SID version factory, null/expiry/retry/status/test teardown. Technitium K or U/P preserves lazy version probe/cache, v15 bearer versus legacy query token, login 404 fallback, one token-expired application recovery and test logout. AdGuard U/P Basic preserves three-read stats/status/filtering merge and controls. Exact mode/native evidence: original INTEGRATION-014/research §§2.2–2.3.

## Required contracts

Accept #40 session/snapshot/query/action/trust/results/operation, #03 encrypted state expiry/fencing, #04 policy, #41 forms and #75 DNS controls/options. #42 consumes exact HTTP auth hooks. Only consumed revisions gate start; real encrypted sessions, identity/secrets/runtime and managed native UI/actions join at acceptance, not provider-wide native blockers.

## Decision holds

Provider-specific expiry/restart normalization and native URL/trust changes require explicit decisions; no universal TTL is selected. Q11/Q12 apply to concrete persistence/conversion and Q15 applicable continuity. Supported Pi-hole/Technitium server protocols/auth baseline and live reversible control effects remain explicitly approved evidence scope, not guaranteed versions.

## Ownership

Own three native clients/version factories/auth lifecycles/DNS composition/descriptors and fixtures. #40 owns shared session adapter, #03 backing primitives, #75 widget presentation, #41 forms and COMPOSITION assembly/manifests. Record exclusive local files before dispatch.

- [ ] All three providers complete configure/test/masked edit/mode/remove/delete, exact H/native alternatives including supported no-key branches and authorized summary/Stats/control UI demonstration.
- [ ] Preserve every source summary/status/count and enable/disable duration/default, plus the table projection. Version/probe/null/session/auth-error fixtures cover Pi-hole v5/v6 and Technitium fallback/bearer/query/logout independently.
- [ ] Interact denial precedes decrypt for each control; bypass read caches, invalidate/re-read and retain bounded source auth recovery without replaying ambiguous mutations.
- [ ] Encrypted fingerprinted sessions retain provider expiry and invalidate on credentials/config/trust/delete; focused abort/deadline/revision fixtures prove no cross-connection state, safe redaction and test-session/resource teardown.
- [ ] Collect actual target consumer evidence for each branch. Later explicitly approved live versions/modes/controls use reversible safe targets/minimum rights and restore changes; unknown versions/access stay unverified, not an automatic all-provider live matrix pass.
