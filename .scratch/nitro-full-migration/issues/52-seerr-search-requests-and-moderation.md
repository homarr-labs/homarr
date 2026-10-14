# 52: Seerr search, requests and moderation

**What to build:** Configure/test every Seerr-family kind and search, inspect seasons, request and moderate media through authorized services and real search/request UI consumption.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `overseerr,jellyseerr,seerr`; K with X-Api-Key/recorded inherited auth, native checks, H eligibility and projected pending,approved,available,processing. Preserve search/details/seasons/request/list/Stats/users/approve/decline, pagination/availability/avatar/status mapping, pending/recent merge/dedup and Jellyseerr's independent availability override. Own native Seerr search binding and mediaRequestSearchTargets, searchMediaRequests, getMediaRequestOptions and requestMedia capability wrappers. #39 owns generic integration-search orchestration, not these provider/request services; #42 generic HTTP is not their replacement. Exact evidence: original INTEGRATION-013 and research §§2.2–2.3/4.

## Required contracts

Accept #40 snapshot/query/action/image/trust/operation/results, #41 forms, #39 search orchestration, #77 request-list/moderation and #79/#80 relevant consumer interfaces, #04 policy and #120/#122 local descriptor contracts where exposed. Accepted provider search/result revisions permit parallel work; real secrets/policy/storage/runtime and every managed search/request UI join are release obligations.

## Decision holds

Q11/Q12 apply to concrete persistence/conversion, Q15 applicable session continuity. Runtime/server/auth baseline, native URL/trust changes and state lifetime remain scoped holds. Disposable request/season/approve/decline effects and live minimum privileges require explicit approval; retaining methods does not broaden tool exposure automatically.

## Ownership

Own these three clients, shared Overseerr-derived adapter, native request/list/Stats/search composition and named media-request wrappers. #39 owns generic search orchestration, #77 saved widget queries/actions/presentation, #41 reusable forms and COMPOSITION assembly/manifests. Per-detail resource release is this provider owner's duty; exclusive file allocation is required.

- [ ] Each separately saved kind completes configure/test/masked edit/remove/delete and authorized search/details/request-list/Stats/UI consumption with exact H/native auth and deterministic request target/options selection.
- [ ] Fixtures preserve seasons, paging, nullable availability, avatars/statuses, pending/recent dedup and all native result families; test inherited surfaces per kind and Jellyseerr override independently, not one base-class success.
- [ ] Native search/details/query policy resolves before decrypt; request/approve/decline requires action-specific interact for every selected connection, bypasses read caches and invalidates lists/Stats. No blanket retry after ambiguous write and no arbitrary HTTP shortcut.
- [ ] Preserve native filter/TTL/Date semantics, cancel/fence late old-auth work and finally release per-detail dispatchers. Focused error/denial/abort/config/trust/delete cases redact all private credentials/causes.
- [ ] Demonstrate actual search/request/moderation consumer success and denial for each kind. Later live search/read scope is explicitly approved per deployed server; request/season/moderation uses approved disposable effects and unknown support remains unverified, without an automatic all-provider matrix.
