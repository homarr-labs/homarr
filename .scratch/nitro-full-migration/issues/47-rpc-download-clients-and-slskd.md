# 47: RPC download clients and Slskd

**What to build:** Configure/test and drive authorized queue/history/status and real download controls for four direct RPC/HTTP clients, with truthful Slskd no-op capability presentation.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `sabNzbd,nzbGet,aria2,slskd` have existing-client Stats projections, native checks and H eligibility. Every projection is download/upload (bytes/s, upload nullable), paused with source text label even if boolean, using native limit=1. SabNzbd: K query, jobs/status/history and queue/item pause/resume/delete with completed-versus-pending deletion. NzbGet: U/P Basic JSON-RPC, jobs/status/history and six controls. Aria2: none/K, custom JSON-RPC token-prefix params, active/waiting/stopped jobs/global rates and six controls. Slskd: K X-API-Key, directory/file jobs/status, bitwise/time mapping; pause/resume/delete resolve no-ops, not upstream actions. Exact inventory: original INTEGRATION-008/research §§2.2–2.3.

## Required contracts

Accept #40 policy/operation/trust/result/refresh interfaces, #41 forms, #76 queue/control selection and #04 query/interact-before-decrypt. Own shared browser/domain download results/options/action capability contracts consumed by #48; no database schema coupling. Real policy/storage/secrets/runtime and named download UI are release joins, not broad completion prerequisites.

## Decision holds

Slskd no-op presentation is unresolved: retain recorded no-op behavior, disable unsupported controls honestly, or separately specify an extension. Reading/parsing can proceed against accepted interfaces, but changed UX/support claims remain held. Q11/Q12 apply to persistence/conversion and Q15 applicable sessions; deletion/disk effects and secure live scope/version access require explicit approval.

## Ownership

Own these four clients/native download composition and the shared domain download contract, not #48 SDK bridges, #76 widget UI, #41 reusable forms or central registry/manifests. COMPOSITION mounts local descriptors; exclusive files are required before dispatch.

- [ ] Demonstrate authorized configure/test/masked edit/mode/remove/delete and queue/history/Stats consumption for each kind, preserving auth alternatives, H modes, limits, ETA/duration, IDs and units.
- [ ] Preserve real queue/item/global controls, NzbGet application-vs-HTTP errors, disk/removal flags and Aria2 torrent/non-torrent/seeding/bounds; controls check interact for every selected connection before decrypt and bypass read cache with agreed invalidation.
- [ ] Focused state/action/error/ambiguous-timeout/cancellation/revision fixtures prove no automatic write retry, safe credential/query redaction, pending-work ownership and stale-result fences.
- [ ] Record Slskd's no-op fixtures and expose the approved eventual disposition to #76 without fabricating upstream mutation success; the unresolved product choice remains a hold, not a passed control criterion.
- [ ] Target download UI demonstrates each native result and supported action/denial. Any later live listing or disposable controls require explicitly approved deployments/modes/effects and disk confirmation; inspect ambiguous outcomes before retry, restore reversible changes, and leave unknown live support unverified rather than run an automatic all-provider matrix.
