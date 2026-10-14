# 57: Host health and storage

**What to build:** Configure/test five host-health services and render their full system/storage/history results and authorized volume selectors without expanding administrative rights.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `openmediavault,dashDot,glances,synology,unraid`; native checks/H eligibility and projected cpu (percent),memoryUsed,memoryAvailable (bytes),uptime (seconds). OMV U/P RPC/cookie/login token retains filesystem/health/volumes/session retry. DashDot none retains CPU/storage/memory/network/GPU/info and ordered CPU history/window aggregation. Glances none retains /api/4 optional sensors/SMART/GPU/network, Python uptime parsing and version cache. Synology U/P retains DSM discovery/CGI/maxVersion/login/SID/relogin/error codes/health/SMART/storage/volume selection. Unraid K x-api-key retains GraphQL system/storage/network/GPU and ISO uptime. Exact evidence: original INTEGRATION-018/research §§2.2–2.3/4.

## Required contracts

Accept #40 snapshot/query/session/trust/result/operation, #19 SampleHistoryStore append/window/read contract, #03 bounded atomics/clock/session/invalidation primitives, #41 forms, #83 system/storage/volume options and #04 allowed-kind policy. Narrow accepted ports permit independent fixture work; real backing/identity/secrets/runtime and each management/native-health UI join are release requirements.

## Decision holds

Synology 600-second-versus-no-TTL state policy is unresolved, not normalized silently; history/restart/session lifetime and native URL/trust changes remain scoped. Q11/Q12 apply to physical persistence/conversion and Q15 applicable continuity. Runtime/provider versions/optional plugin/DSM baseline and secure live access remain unverified evidence gates.

## Ownership

Own exactly five clients/host-health composition/descriptors/fixtures, consuming #19's SampleHistoryStore rather than Redis or provider polling. #03 supplies backing atomics/clock/bounds, #40 owns common session/trust bridge, #83 widget/selector consumption, #41 forms and COMPOSITION mounts/manifests. No new OMV/DSM admin RPC is owned or exposed.

- [ ] Each kind completes authorized configure/test/masked edit/remove/delete and health/Stats/volume consumption with exact native/H modes, allowed widget subset, base prefixes and external links.
- [ ] Preserve all native CPU/memory/storage/network/GPU/uptime/selectors, table projections and source units; independent fixtures cover missing GPU/storage/samples, optional-plugin failure, DSM error/relogin and GraphQL application/ISO-duration results.
- [ ] Glances and Synology checks actually use the accepted trusted injected transport rather than retaining bypasses. Fingerprinted auth/version cache and history retain approved TTL/window/sample behavior, with Synology's undecided lifetime explicit.
- [ ] Allowed-kind/query policy precedes decrypt; focused denial/abort/deadline/config/trust/delete/error cases prove sanitized output, session/resource cleanup and stale fencing without granting upstream administration privileges.
- [ ] Demonstrate all five real target health/selector paths. Later explicitly approved bounded live reads may include repeated DashDot samples, Glances plugins on/off and DSM/OMV/Unraid variants with minimal rights; unknown runtime/services remain unverified and no automatic all-provider matrix is required.
